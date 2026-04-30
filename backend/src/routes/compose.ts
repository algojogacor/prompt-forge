import { Router, Request, Response } from "express";
import {
  generateCoreQuestions,
  generateFollowUpQuestions,
  fullPipeline,
} from "../services/orchestrator.js";
import { getKeyHealth } from "../config/keys.js";

const router = Router();

// POST /api/compose/questions/core — 3 core questions
router.post("/questions/core", async (req: Request, res: Response) => {
  try {
    const { idea } = req.body;
    if (!idea || typeof idea !== "string") {
      return res.status(400).json({ error: "Missing 'idea' in request body" });
    }
    const questions = await generateCoreQuestions(idea);
    res.json({ idea, questions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/compose/questions/followup — dynamic follow-ups
router.post("/questions/followup", async (req: Request, res: Response) => {
  try {
    const { idea, answers } = req.body;
    if (!idea || !answers) {
      return res.status(400).json({ error: "Missing 'idea' or 'answers'" });
    }
    const questions = await generateFollowUpQuestions(idea, answers);
    res.json({ questions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/compose/run — Full 5-stage pipeline
router.post("/run", async (req: Request, res: Response) => {
  try {
    const { idea, coreAnswers, followUpAnswers, outputType } = req.body;
    if (!idea || !coreAnswers) {
      return res.status(400).json({
        error: "Missing 'idea' or 'coreAnswers'",
      });
    }

    const result = await fullPipeline(
      idea,
      coreAnswers,
      followUpAnswers || [],
      outputType || "System Prompt",
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/compose/health — Key health status
router.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    keyHealth: getKeyHealth(),
  });
});

export default router;
