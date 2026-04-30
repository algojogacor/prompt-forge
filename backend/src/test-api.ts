import https from "https";

function req(url: string, method = "GET", body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts: https.RequestOptions = {
      hostname: u.hostname,
      path: u.pathname,
      method,
      headers: body ? { "Content-Type": "application/json" } : {},
    };
    const r = https.request(opts, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        try { resolve(JSON.parse(d)); } catch { resolve(d); }
      });
    });
    r.on("error", reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function main() {
  console.log("🧪 Testing PromptForge API...\n");

  // 1. Health
  const health = await req("https://prompt-forge-api.vercel.app/api/health");
  console.log("✅ Health:", health);

  // 2. Core questions
  const q = await req("https://prompt-forge-api.vercel.app/api/compose/questions/core", "POST", {
    idea: "I want to build a customer service AI chatbot for an e-commerce store that sells handmade jewelry",
  });
  console.log("\n✅ Core Questions:", JSON.stringify(q, null, 2));

  // 3. Run full pipeline (small test)
  const result = await req("https://prompt-forge-api.vercel.app/api/compose/run", "POST", {
    idea: "I want to build a customer service AI chatbot for an e-commerce store that sells handmade jewelry",
    coreAnswers: [
      { question: q.questions?.[0]?.question || "", answer: "Small handmade jewelry store with 10-20 daily inquiries" },
      { question: q.questions?.[1]?.question || "", answer: "Warm, friendly, and knowledgeable about gemstones" },
      { question: q.questions?.[2]?.question || "", answer: "Answer questions about products, shipping, returns" },
    ],
    followUpAnswers: [],
    outputType: "System Prompt",
  });
  console.log("\n✅ Pipeline Result:");
  console.log("   Winner:", result.winner?.provider, result.winner?.model, "Score:", result.winner?.scores?.total);
  console.log("   Total latency:", result.totalLatency, "ms");
  console.log("   Compositions:", result.compositions?.length, "results");

  // Print winner output
  if (result.winner) {
    console.log("\n🏆 WINNER OUTPUT:\n");
    console.log(result.winner.output.slice(0, 500));
  }
}

main().catch((e) => console.error("❌ Failed:", e.message));
