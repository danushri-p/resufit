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

const geminiResponseSchema = z.object({
  candidates: z.array(
    z.object({
      content: z.object({
        parts: z.array(z.object({ text: z.string() })),
      }),
    }),
  ),
});

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
}

function isSchemaRejection(message: string): boolean {
  return /schema|responseJsonSchema|response json schema/i.test(message);
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "object" &&
      body.error !== null &&
      "message" in body.error &&
      typeof body.error.message === "string"
    ) {
      return body.error.message;
    }
  } catch {
    return "";
  }

  return "";
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

  const model = encodeURIComponent(getGeminiModel());
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const request = async (includeSchema: boolean): Promise<Response> => {
    const generationConfig: Record<string, unknown> = {
      temperature: 0,
      responseMimeType: "application/json",
    };
    if (includeSchema) {
      generationConfig.responseJsonSchema = z.toJSONSchema(schema);
    }

    try {
      return await fetch(url, {
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
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "TimeoutError") {
        throw new AITimeoutError();
      }
      throw new AIUnavailableError();
    }
  };

  let response = await request(true);
  if (!response.ok) {
    const message = await getErrorMessage(response);
    if (response.status === 400 && isSchemaRejection(message)) {
      response = await request(false);
    } else {
      throwGeminiRequestError(response.status);
    }
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

  return text;
}

function throwGeminiRequestError(status: number): never {
  if (status === 401 || status === 403) {
    throw new AIRequestError(
      status,
      "Gemini authentication failed. Check GEMINI_API_KEY.",
    );
  }
  if (status === 429) {
    throw new AIRequestError(
      status,
      "The free Gemini limit was reached, try again in a minute",
    );
  }
  throw new AIRequestError(
    status,
    "Gemini could not complete the request. Please try again.",
  );
}
