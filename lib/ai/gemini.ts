import "server-only";

import { z, type ZodType } from "zod";
import {
  AIRequestError,
  AIUnavailableError,
  AITimeoutError,
  InvalidAIOutputError,
} from "@/lib/ai/errors";

const GEMINI_TIMEOUT_MS = 120_000;
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const DEFAULT_GEMINI_FALLBACK_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
];
const geminiResponseSchema = z.object({
  candidates: z.array(
    z.object({
      content: z.object({
        parts: z.array(z.object({ text: z.string() })),
      }),
    }),
  ),
});

interface GeminiRateLimit {
  message: string;
  retryAfterSeconds: number | null;
  retryDelay: string | null;
  quotaId: string | null;
  isPerDay: boolean;
}

interface ExhaustedGeminiModel {
  expiresAt: number;
  rateLimit: GeminiRateLimit;
  unavailable?: boolean;
}

const exhaustedModels = new Map<string, ExhaustedGeminiModel>();

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
}

function getFallbackModels(): string[] {
  const configured = process.env.GEMINI_FALLBACK_MODELS;
  return (configured === undefined
    ? DEFAULT_GEMINI_FALLBACK_MODELS
    : configured.split(",")
  )
    .map((model) => model.trim())
    .filter((model) => model.length > 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function getGeminiRateLimit(response: Response): Promise<{
  message: string;
  retryAfterSeconds: number | null;
  retryDelay: string | null;
  quotaId: string | null;
  isPerDay: boolean;
}> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }

  const error = isRecord(body) && isRecord(body.error) ? body.error : undefined;
  const details = error && Array.isArray(error.details) ? error.details : [];
  const quotaIds = details.flatMap((detail) => {
    if (!isRecord(detail) || !Array.isArray(detail.violations)) {
      return [];
    }
    return detail.violations.flatMap((violation) =>
      isRecord(violation) && typeof violation.quotaId === "string"
        ? [violation.quotaId]
        : [],
    );
  });
  const retryDelay =
    details
      .map((detail) =>
        isRecord(detail) && typeof detail.retryDelay === "string"
          ? detail.retryDelay
          : undefined,
      )
      .find((value) => value !== undefined) ?? null;
  const quotaId = quotaIds.find((value) => value.includes("PerDay")) ??
    quotaIds[0] ??
    null;
  const isPerDay = quotaIds.some((value) => value.includes("PerDay"));

  const retryMatch = retryDelay?.trim().match(/^(\d+(?:\.\d+)?)s$/);
  const retryAfterSeconds = retryMatch
    ? Math.max(1, Math.ceil(Number(retryMatch[1])))
    : 60;

  if (isPerDay) {
    return {
      message:
        "Today's free Gemini limit has been used up. It resets daily (midnight Pacific time). Please try again tomorrow.",
      retryAfterSeconds: null,
      retryDelay,
      quotaId,
      isPerDay,
    };
  }

  return {
    message:
      retryAfterSeconds === 60 && !retryMatch
        ? "The free Gemini limit was reached. Try again in a minute."
        : `The free Gemini limit was reached. Try again in ${retryAfterSeconds} seconds.`,
    retryAfterSeconds,
    retryDelay,
    quotaId,
    isPerDay,
  };
}

function pacificDate(timestamp: number): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(timestamp);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function nextPacificMidnight(now: number): number {
  const today = pacificDate(now);
  const [year, month, day] = today.split("-").map(Number);
  const tomorrow = new Date(Date.UTC(year, month - 1, day + 1))
    .toISOString()
    .slice(0, 10);
  let low = now;
  let high = now + 36 * 60 * 60 * 1000;

  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (pacificDate(middle) >= tomorrow) high = middle;
    else low = middle;
  }

  return high;
}

function getActiveExhaustion(model: string): ExhaustedGeminiModel | undefined {
  const exhausted = exhaustedModels.get(model);
  if (!exhausted) return undefined;
  if (exhausted.expiresAt <= Date.now()) {
    exhaustedModels.delete(model);
    return undefined;
  }
  return exhausted;
}

function allModelsExhausted(models: string[]): AIRequestError {
  const active = models
    .map((model) => ({ model, exhaustion: getActiveExhaustion(model) }))
    .filter(
      (entry): entry is {
        model: string;
        exhaustion: ExhaustedGeminiModel;
      } => Boolean(entry.exhaustion),
    );
  const daily = active.filter((entry) => entry.exhaustion.rateLimit.isPerDay);
  const unavailable = active.filter(
    (entry) => entry.exhaustion.unavailable,
  );

  if (active.length === 0) {
    return new AIRequestError(
      429,
      "The free Gemini limit was reached. Try again in a minute.",
      60,
    );
  }

  if (unavailable.length === active.length) {
    return new AIRequestError(
      404,
      "Gemini could not complete the request. Please try again.",
    );
  }

  if (daily.length === active.length) {
    return new AIRequestError(
      429,
      "Today's free Gemini limit has been used up. It resets daily (midnight Pacific time). Please try again tomorrow.",
      null,
    );
  }

  const nearest = active.reduce((first, next) =>
    next.exhaustion.expiresAt < first.exhaustion.expiresAt ? next : first,
  );
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((nearest.exhaustion.expiresAt - Date.now()) / 1000),
  );
  const message =
    retryAfterSeconds === 60 && nearest.exhaustion.rateLimit.retryDelay === null
      ? "The free Gemini limit was reached. Try again in a minute."
      : `The free Gemini limit was reached. Try again in ${retryAfterSeconds} seconds.`;
  return new AIRequestError(429, message, retryAfterSeconds);
}

export async function generateWithGemini<T>({
  prompt,
  schema,
  userMessage,
}: {
  prompt: string;
  schema: ZodType<T>;
  userMessage: string;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AIRequestError(
      0,
      "Gemini is not configured. Check GEMINI_API_KEY.",
    );
  }

  const request = async (
    model: string,
    includeSchema: boolean,
  ): Promise<Response> => {
    const generationConfig: Record<string, unknown> = {
      temperature: 0,
      responseMimeType: "application/json",
    };
    if (includeSchema) {
      generationConfig.responseJsonSchema = z.toJSONSchema(schema);
    }

    try {
      return await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: prompt }] },
            contents: [{ role: "user", parts: [{ text: userMessage }] }],
            generationConfig,
          }),
        },
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "TimeoutError") {
        throw new AITimeoutError();
      }
      throw new AIUnavailableError();
    }
  };

  const models = Array.from(new Set([getGeminiModel(), ...getFallbackModels()]));
  for (const model of models) {
    if (getActiveExhaustion(model)) continue;

    const response = await request(model, true);

    if (response.status === 404) {
      exhaustedModels.set(model, {
        expiresAt: Number.POSITIVE_INFINITY,
        unavailable: true,
        rateLimit: {
          message: "Gemini model is unavailable.",
          retryAfterSeconds: null,
          retryDelay: null,
          quotaId: null,
          isPerDay: false,
        },
      });
      console.error("Gemini model unavailable:", {
        model,
        reason: "model unavailable",
      });
      continue;
    }

    if (response.status === 429) {
      const rateLimit = await getGeminiRateLimit(response);
      const now = Date.now();
      exhaustedModels.set(model, {
        expiresAt: rateLimit.isPerDay
          ? nextPacificMidnight(now)
          : now + (rateLimit.retryAfterSeconds ?? 60) * 1000,
        rateLimit,
      });
      console.error("Gemini model quota exhausted:", {
        model,
        quotaId: rateLimit.quotaId,
        retryDelay: rateLimit.retryDelay,
      });
      continue;
    }

    if (!response.ok) {
      throwGeminiRequestError(response.status);
    }

    let responseBody: unknown;
    try {
      responseBody = await response.json();
    } catch {
      throw new InvalidAIOutputError(
        "The AI provider returned a response in an unexpected format.",
      );
    }

    const parsedResponse = geminiResponseSchema.safeParse(responseBody);
    const text = parsedResponse.success
      ? parsedResponse.data.candidates[0]?.content.parts[0]?.text
      : undefined;
    if (typeof text !== "string") {
      throw new InvalidAIOutputError(
        "The AI provider returned a response in an unexpected format.",
      );
    }

    console.info("Gemini request completed:", { model });
    return text;
  }

  throw allModelsExhausted(models);
}

function throwGeminiRequestError(status: number): never {
  if (status === 401 || status === 403) {
    throw new AIRequestError(
      status,
      "Gemini authentication failed. Check GEMINI_API_KEY.",
    );
  }
  throw new AIRequestError(
    status,
    "Gemini could not complete the request. Please try again.",
  );
}
