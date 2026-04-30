// 🔑 API Key Pool — loaded from .env
// Health-tracked round-robin with automatic deprioritization

import "dotenv/config";

export type LLMProvider = "deepseek" | "qwen" | "perplexity" | "glm";

// ─── Key Pools ───
function loadKeys(envVar: string): string[] {
  return (process.env[envVar] || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

const KEY_POOLS: Record<LLMProvider, string[]> = {
  deepseek: loadKeys("DEEPSEEK_KEYS"),
  qwen: loadKeys("QWEN_KEYS"),
  perplexity: loadKeys("PERPLEXITY_KEYS"),
  glm: loadKeys("GLM_KEYS"),
};

// ─── Health Tracking ───
interface KeyHealth {
  key: string;
  successCount: number;
  failureCount: number;
  consecutiveFails: number;
  deprecated: boolean;
}

const keyHealth: Record<LLMProvider, KeyHealth[]> = {
  deepseek: [],
  qwen: [],
  perplexity: [],
  glm: [],
};

// Initialize health trackers
for (const provider of Object.keys(KEY_POOLS) as LLMProvider[]) {
  keyHealth[provider] = KEY_POOLS[provider].map((key) => ({
    key,
    successCount: 0,
    failureCount: 0,
    consecutiveFails: 0,
    deprecated: false,
  }));
}

// ─── LLM Config ───
export const LLM_CONFIG: Record<
  LLMProvider,
  { baseURL: string; model: string; timeout: number; role: string }
> = {
  deepseek: {
    baseURL: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    timeout: 30000,
    role: "composer",
  },
  qwen: {
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-plus",
    timeout: 25000,
    role: "composer",
  },
  perplexity: {
    baseURL: "https://api.perplexity.ai",
    model: "sonar",
    timeout: 20000,
    role: "fact-checker",
  },
  glm: {
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    model: "glm-4-flash",
    timeout: 30000,
    role: "composer",
  },
};

// ─── Round-Robin with Health ───
let keyIndex: Record<LLMProvider, number> = {
  deepseek: 0,
  qwen: 0,
  perplexity: 0,
  glm: 0,
};

export function getNextKey(provider: LLMProvider): string | null {
  const health = keyHealth[provider];
  const allKeys = health.filter((h) => !h.deprecated);
  if (allKeys.length === 0) return null;

  // Simple round-robin among healthy keys
  const idx = keyIndex[provider] % allKeys.length;
  keyIndex[provider] = idx + 1;
  return allKeys[idx].key;
}

export function markKeySuccess(provider: LLMProvider, key: string): void {
  const entry = keyHealth[provider].find((h) => h.key === key);
  if (entry) {
    entry.successCount++;
    entry.consecutiveFails = 0;
  }
}

export function markKeyFailure(provider: LLMProvider, key: string): void {
  const entry = keyHealth[provider].find((h) => h.key === key);
  if (entry) {
    entry.failureCount++;
    entry.consecutiveFails++;
    if (entry.consecutiveFails >= 3) {
      entry.deprecated = true;
      console.warn(
        `⚠️  ${provider} key deprecated after 3 consecutive failures`,
      );
    }
  }
}

export function getKeyHealth(): Record<LLMProvider, { total: number; healthy: number; deprecated: number }> {
  const result: any = {};
  for (const provider of Object.keys(keyHealth) as LLMProvider[]) {
    const h = keyHealth[provider];
    result[provider] = {
      total: h.length,
      healthy: h.filter((k) => !k.deprecated).length,
      deprecated: h.filter((k) => k.deprecated).length,
    };
  }
  return result;
}

export function getProvidersByRole(role: string): LLMProvider[] {
  return (Object.keys(LLM_CONFIG) as LLMProvider[]).filter(
    (p) => LLM_CONFIG[p].role === role,
  );
}

// Composer LLMs (excludes Perplexity)
export const COMPOSER_PROVIDERS: LLMProvider[] = getProvidersByRole("composer");

// Fact-checker LLMs
export const FACT_CHECK_PROVIDERS: LLMProvider[] = getProvidersByRole("fact-checker");
