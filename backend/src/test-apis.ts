// Quick API tester — finds which keys/endpoints work
// Usage: npx tsx src/test-apis.ts
import "dotenv/config";
import OpenAI from "openai";

const KEYS = {
  DEEPSEEK: (process.env.DEEPSEEK_KEYS || "").split(",")[0]?.trim(),
  QWEN: (process.env.QWEN_KEYS || "").split(",")[0]?.trim(),
  PERPLEXITY: (process.env.PERPLEXITY_KEYS || "").split(",")[0]?.trim(),
  GLM: (process.env.GLM_KEYS || "").split(",")[0]?.trim(),
  GROQ: (process.env.GROQ_KEYS || "").split(",")[0]?.trim(),
};

const TESTS = [
  { name: "DeepSeek", baseURL: "https://api.deepseek.com/v1", key: KEYS.DEEPSEEK, model: "deepseek-chat" },
  { name: "Qwen Intl", baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1", key: KEYS.QWEN, model: "qwen-plus" },
  { name: "Qwen CN", baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1", key: KEYS.QWEN, model: "qwen-plus" },
  { name: "Perplexity", baseURL: "https://api.perplexity.ai", key: KEYS.PERPLEXITY, model: "sonar" },
  { name: "GLM", baseURL: "https://open.bigmodel.cn/api/paas/v4", key: KEYS.GLM, model: "glm-4-flash" },
  { name: "Groq", baseURL: "https://api.groq.com/openai/v1", key: KEYS.GROQ, model: "llama-3.3-70b-versatile" },
];

async function test() {
  for (const t of TESTS) {
    if (!t.key) { console.log(`⚠️  ${t.name.padEnd(14)} | No key configured`); continue; }
    try {
      const client = new OpenAI({ apiKey: t.key, baseURL: t.baseURL, timeout: 10000 });
      const start = Date.now();
      const r = await client.chat.completions.create({
        model: t.model, messages: [{ role: "user", content: "Say hi in 3 words" }], max_tokens: 10,
      });
      const ms = Date.now() - start;
      console.log(`✅ ${t.name.padEnd(14)} | ${ms}ms | ${r.choices[0]?.message?.content?.slice(0, 40)}`);
    } catch (e: any) {
      console.log(`❌ ${t.name.padEnd(14)} | ${e.message?.slice(0, 60)}`);
    }
  }
}

test();
