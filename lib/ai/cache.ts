import "server-only";

import { createHash } from "node:crypto";
import { getAIProvider, getOllamaModel } from "@/lib/ai/client";
import { getGeminiModel } from "@/lib/ai/gemini";

const MAX_CACHE_ENTRIES = 50;
const CACHE_TTL_MS = 60 * 60 * 1000;

interface CacheEntry {
  expiresAt: number;
  result: Promise<unknown>;
}

const resultCache = new Map<string, CacheEntry>();

function createCacheKey(promptVersion: string, inputText: string): string {
  const provider = getAIProvider();
  const model =
    provider === "gemini" ? getGeminiModel() : getOllamaModel();
  return createHash("sha256")
    .update(JSON.stringify([provider, model, promptVersion, inputText]))
    .digest("hex");
}

export function cacheAIResult<T>(
  promptVersion: string,
  inputText: string,
  createResult: () => Promise<T>,
): Promise<T> {
  const key = createCacheKey(promptVersion, inputText);
  const now = Date.now();
  const cached = resultCache.get(key);

  if (cached && cached.expiresAt > now) {
    resultCache.delete(key);
    resultCache.set(key, cached);
    return cached.result as Promise<T>;
  }

  if (cached) {
    resultCache.delete(key);
  }

  // This cache is per serverless instance and is not shared across deployments.
  const entry: CacheEntry = {
    expiresAt: now + CACHE_TTL_MS,
    result: createResult(),
  };
  resultCache.set(key, entry);

  while (resultCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = resultCache.keys().next().value;
    if (oldestKey === undefined) break;
    resultCache.delete(oldestKey);
  }

  void entry.result.catch(() => {
    if (resultCache.get(key) === entry) {
      resultCache.delete(key);
    }
  });

  return entry.result as Promise<T>;
}
