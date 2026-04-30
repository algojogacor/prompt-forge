const API_BASE = import.meta.env.DEV
  ? "/api/compose"
  : "https://eea2-34-57-12-120.ngrok-free.app/api/compose";

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

// ─── Helpers ───

async function safeApi<T>(url: string, body?: any): Promise<T> {
  const opts: RequestInit = {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  };

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${url}`, opts);
  } catch (e: any) {
    throw new Error(`Network error: ${e.message || "Could not reach server"}`);
  }

  // Try to parse JSON, fall back to status-based error
  let data: any;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    if (!res.ok) {
      throw new Error(
        res.status === 404
          ? "Backend not available — is the server running on localhost:3001?"
          : `Server error (${res.status}): ${text.slice(0, 100)}`
      );
    }
    return text as any;
  }

  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }

  return data as T;
}

// ─── API Calls ───

export async function getCoreQuestions(idea: string): Promise<Question[]> {
  const data: any = await safeApi("/questions/core", { idea });
  return data.questions;
}

export async function getFollowUpQuestions(
  idea: string,
  answers: { question: string; answer: string }[],
): Promise<Question[]> {
  const data: any = await safeApi("/questions/followup", { idea, answers });
  return data.questions;
}

export async function runPipeline(
  idea: string,
  coreAnswers: { question: string; answer: string }[],
  followUpAnswers: { question: string; answer: string }[],
  outputType = "System Prompt",
): Promise<ComposeResult> {
  return safeApi("/run", { idea, coreAnswers, followUpAnswers, outputType });
}

export async function getHealth() {
  return safeApi("/health");
}
