import OpenAI from "openai";
import {
  LLM_CONFIG,
  getNextKey,
  markKeySuccess,
  markKeyFailure,
  type LLMProvider,
} from "../config/keys.js";

const clientCache = new Map<string, OpenAI>();

function getClient(provider: LLMProvider): { client: OpenAI; key: string } | null {
  const key = getNextKey(provider);
  if (!key) return null;

  const cacheKey = `${provider}:${key}`;
  if (clientCache.has(cacheKey)) {
    return { client: clientCache.get(cacheKey)!, key };
  }

  const config = LLM_CONFIG[provider];
  const client = new OpenAI({
    apiKey: key,
    baseURL: config.baseURL,
    timeout: config.timeout,
  });

  clientCache.set(cacheKey, client);
  return { client, key };
}

export interface LLMCall {
  provider: LLMProvider;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}

export interface LLMResponse {
  provider: LLMProvider;
  model: string;
  output: string;
  latency: number;
  error?: string;
  timedOut?: boolean;
}

// Single LLM call with timeout & health tracking
export async function callLLM({
  provider,
  systemPrompt,
  userPrompt,
  temperature = 0.7,
}: LLMCall): Promise<LLMResponse> {
  const config = LLM_CONFIG[provider];
  const conn = getClient(provider);

  // No healthy keys available
  if (!conn) {
    return {
      provider,
      model: config.model,
      output: "",
      latency: 0,
      error: "No healthy keys available",
      timedOut: true,
    };
  }

  const { client, key } = conn;
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    const response = await client.chat.completions.create(
      {
        model: config.model,
        temperature,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 4000,
      },
      { signal: controller.signal },
    );

    clearTimeout(timeoutId);
    markKeySuccess(provider, key);

    return {
      provider,
      model: config.model,
      output: response.choices[0]?.message?.content || "",
      latency: Date.now() - start,
    };
  } catch (err: any) {
    markKeyFailure(provider, key);
    const isTimeout =
      err.name === "AbortError" || err.message?.includes("timeout");

    return {
      provider,
      model: config.model,
      output: "",
      latency: Date.now() - start,
      error: isTimeout ? "Timeout" : err.message || "Unknown error",
      timedOut: isTimeout,
    };
  }
}

// Call multiple LLMs in parallel with timeout
export async function callAllLLMs(
  systemPrompt: string,
  userPrompt: string,
  providers: LLMProvider[],
  temperature = 0.7,
): Promise<LLMResponse[]> {
  const calls = providers.map((provider) =>
    callLLM({ provider, systemPrompt, userPrompt, temperature }),
  );
  return Promise.all(calls);
}

// Get only successful responses
export function getSuccessful(responses: LLMResponse[]): LLMResponse[] {
  return responses.filter((r) => !r.error && r.output);
}

// Get timed out / failed
export function getFailed(responses: LLMResponse[]): LLMResponse[] {
  return responses.filter((r) => !!r.error);
}
