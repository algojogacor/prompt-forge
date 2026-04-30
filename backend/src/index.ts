import express from "express";
import cors from "cors";
import composeRouter from "./routes/compose.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Routes
app.use("/api/compose", composeRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Only listen when running locally (not on Vercel serverless)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 PromptForge API running on http://localhost:${PORT}`);
    console.log(`📡 Endpoints:`);
    console.log(`   POST /api/compose/questions/core     — 3 core questions`);
    console.log(`   POST /api/compose/questions/followup  — dynamic follow-ups`);
    console.log(`   POST /api/compose/run                — full 5-stage pipeline`);
    console.log(`   GET  /api/compose/health             — key health status`);
  });
}

export default app;
