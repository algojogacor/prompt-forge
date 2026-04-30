const API_BASE = "/api/compose";

// ─── Types ───

export interface Question {
  question: string;
  hint: string;
}

export interface Score {
  criteria: Record<string, number>;
  total: number;
  feedback: string;
  scoredBy: string;
}

export interface StagedOutput {
  provider: string;
  model: string;
  output: string;
  latency: number;
  error?: string;
  timedOut?: boolean;
  scores?: Score;
  rank?: number;
  factCheck?: {
    provider: string;
    output: string;
    latency: number;
    error?: string;
  };
}

export interface ComposeResult {
  idea: string;
  outputType: string;
  coreQuestions: Question[];
  followUpQuestions: Question[];
  compositions: StagedOutput[];
  winner: StagedOutput | null;
  mergeResult: { provider: string; model: string; output: string; latency: number } | null;
  totalLatency: number;
  keyHealth: Record<string, { total: number; healthy: number; deprecated: number }>;
  partialFailure: boolean;
}

// ─── API Calls ───

export async function getCoreQuestions(idea: string): Promise<Question[]> {
  const res = await fetch(`${API_BASE}/questions/core`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idea }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  const data = await res.json();
  return data.questions;
}

export async function getFollowUpQuestions(
  idea: string,
  answers: { question: string; answer: string }[],
): Promise<Question[]> {
  const res = await fetch(`${API_BASE}/questions/followup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idea, answers }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  const data = await res.json();
  return data.questions;
}

export async function runPipeline(
  idea: string,
  coreAnswers: { question: string; answer: string }[],
  followUpAnswers: { question: string; answer: string }[],
  outputType = "System Prompt",
): Promise<ComposeResult> {
  const res = await fetch(`${API_BASE}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idea, coreAnswers, followUpAnswers, outputType }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function getHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}
