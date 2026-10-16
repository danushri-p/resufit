import {
  AIRequestError,
  AIUnavailableError,
  AITimeoutError,
  InvalidAIOutputError,
} from "@/lib/ai/errors";
import { getOllamaModel } from "@/lib/ai/client";

const isOllama = () => process.env.AI_PROVIDER !== "gemini";

export function getAIError(error: unknown, action: string): {
  message: string;
  status: number;
  retryAfterSeconds?: number | null;
} | undefined {
  if (error instanceof InvalidAIOutputError) {
    return {
      message: "The AI returned data in an unexpected format. Please try again.",
      status: 502,
    };
  }

  if (error instanceof AIUnavailableError) {
    return isOllama()
      ? {
          message: `Ollama is not running. Start Ollama and make sure the ${getOllamaModel()} model is installed.`,
          status: 503,
        }
      : {
          message: "Gemini is unavailable. Check your connection and try again.",
          status: 503,
        };
  }

  if (error instanceof AITimeoutError) {
    return {
      message: isOllama()
        ? `Ollama took too long to respond during ${action}. Try again, or use shorter text.`
        : `Gemini took too long to respond during ${action}. Please try again.`,
      status: 504,
    };
  }

  if (error instanceof AIRequestError) {
    if (error.status === 429) {
      return {
        message: error.message.includes("free Gemini limit")
          ? error.message
          : "You've made too many AI requests. Please wait a minute and try again.",
        status: 429,
        retryAfterSeconds: error.retryAfterSeconds,
      };
    }

    if (!isOllama() && error.message.includes("GEMINI_API_KEY")) {
      return { message: error.message, status: 503 };
    }

    if (isOllama() && error.status === 404) {
      return {
        message: `The ${getOllamaModel()} model is not installed. Run \`ollama pull ${getOllamaModel()}\`, then try again.`,
        status: 503,
      };
    }

    console.error("AI provider request failed:", { status: error.status });
    return {
      message: isOllama()
        ? `Ollama could not complete the ${action} request. Check that the local Ollama service is running and try again.`
        : error.message,
      status: 502,
    };
  }

  return undefined;
}
