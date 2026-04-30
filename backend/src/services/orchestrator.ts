// 🎯 PromptForge 5-Stage Orchestrator
// Stage 1: Intent Parse → 2: Adaptive QA → 3: Parallel Compose → 4: Cross-Matrix Score → 5: Post-Process

import { callLLM, callAllLLMs, getSuccessful, getFailed, type LLMResponse } from "./llm.js";
import {
  COMPOSER_PROVIDERS,
  FACT_CHECK_PROVIDERS,
  type LLMProvider,
} from "../config/keys.js";
import {
  CORE_QUESTIONS_SYSTEM,
  CORE_QUESTIONS_USER,
  FOLLOWUP_SYSTEM,
  FOLLOWUP_USER,
} from "../prompts/proactive-qa.js";
import { COMPOSE_SYSTEM, COMPOSE_USER } from "../prompts/compose.js";
import {
  getScorerSystem,
  getScorerUser,
  calculateWeightedTotal,
  type OutputType,
  type ScoredResult,
  type CriteriaScores,
} from "../prompts/scorer.js";

// ─── Types ───

export interface StagedOutput extends LLMResponse {
  scores?: ScoredResult;
  rank?: number;
  factCheck?: LLMResponse;
}

export interface ComposeResult {
  idea: string;
  outputType: string;
  coreQuestions: { question: string; hint: string }[];
  followUpQuestions: { question: string; hint: string }[];
  compositions: StagedOutput[];
  winner: StagedOutput | null;
  mergeResult: LLMResponse | null;
  totalLatency: number;
  keyHealth: any;
  partialFailure: boolean;
}

// ─── Scoring Pairs: Full Cross-Matrix (N × (N-1)) ───

function generateCrossMatrix(
  providers: LLMProvider[],
): [LLMProvider, LLMProvider][] {
  const pairs: [LLMProvider, LLMProvider][] = [];
  for (const scorer of providers) {
    for (const target of providers) {
      if (scorer !== target) pairs.push([scorer, target]);
    }
  }
  return pairs;
}

// ─── Stage 1: Intent Parse ───

function classifyOutputType(outputType: string): OutputType {
  const map: Record<string, OutputType> = {
    "System Prompt": "system-prompt",
    "PRD (Product Requirements)": "prd",
    "Technical Spec": "tech-spec",
    "Job Description": "job-description",
    "Content Brief": "system-prompt",
    Custom: "system-prompt",
  };
  return map[outputType] || "system-prompt";
}

// ─── Stage 2: Adaptive QA ───

export async function generateCoreQuestions(
  idea: string,
): Promise<{ question: string; hint: string }[]> {
  const response = await callLLM({
    provider: "deepseek",
    systemPrompt: CORE_QUESTIONS_SYSTEM,
    userPrompt: CORE_QUESTIONS_USER(idea),
    temperature: 0.7,
  });

  if (response.error || !response.output) {
    throw new Error(`Core questions failed: ${response.error}`);
  }

  try {
    const cleaned = response.output
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    return JSON.parse(cleaned);
  } catch {
    // Fallback: generic core questions
    return [
      { question: "What is the primary goal of this prompt?", hint: "e.g., customer service bot, code reviewer, writing assistant" },
      { question: "Who is the target audience and what's their skill level?", hint: "e.g., technical developers, general consumers, executives" },
      { question: "What are the hard constraints and boundaries?", hint: "e.g., never discuss pricing, stay in character, max 200 words" },
    ];
  }
}

export async function generateFollowUpQuestions(
  idea: string,
  answers: { question: string; answer: string }[],
): Promise<{ question: string; hint: string }[]> {
  const response = await callLLM({
    provider: "deepseek",
    systemPrompt: FOLLOWUP_SYSTEM,
    userPrompt: FOLLOWUP_USER(idea, answers),
    temperature: 0.7,
  });

  if (response.error || !response.output) return [];

  try {
    const cleaned = response.output
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    return JSON.parse(cleaned);
  } catch {
    return [];
  }
}

// ─── Stage 3: Parallel Compose ───

async function composeAll(
  idea: string,
  allAnswers: { question: string; answer: string }[],
  outputType: string,
): Promise<LLMResponse[]> {
  const systemPrompt = COMPOSE_SYSTEM;
  const userPrompt = COMPOSE_USER(idea, allAnswers, outputType);

  return callAllLLMs(systemPrompt, userPrompt, COMPOSER_PROVIDERS, 0.7);
}

// ─── Stage 4: Full Cross-Matrix Scoring ───

async function crossMatrixScore(
  compositions: LLMResponse[],
  idea: string,
  outputType: OutputType,
): Promise<StagedOutput[]> {
  const compMap = new Map(compositions.map((c) => [c.provider, c]));
  const pairs = generateCrossMatrix(
    compositions
      .filter((c) => !c.error)
      .map((c) => c.provider),
  );

  // Shuffle pairs to mitigate position bias (MT-Bench finding)
  const shuffled = pairs.sort(() => Math.random() - 0.5);

  const scoringTasks = shuffled.map(async ([scorer, target]) => {
    const targetOutput = compMap.get(target);
    if (!targetOutput?.output) return null;

    const response = await callLLM({
      provider: scorer,
      systemPrompt: getScorerSystem(outputType),
      userPrompt: getScorerUser(targetOutput.output, idea, outputType),
      temperature: 0.3,
    });

    if (response.error || !response.output) return null;

    try {
      const cleaned = response.output
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      const parsed = JSON.parse(cleaned);

      return {
        target,
        score: {
          criteria: parsed.criteria || parsed,
          total: parsed.total || calculateWeightedTotal(parsed.criteria || {}, outputType),
          feedback: parsed.feedback || "",
          scoredBy: scorer,
        },
      };
    } catch {
      return null;
    }
  });

  const allScores = (await Promise.all(scoringTasks)).filter(Boolean) as {
    target: LLMProvider;
    score: ScoredResult;
  }[];

  // Average scores per target
  const scored: StagedOutput[] = compositions.map((comp) => {
    const targetScores = allScores.filter((s) => s.target === comp.provider);

    if (targetScores.length === 0) return comp;

    // Average the criteria across all judges
    const avgCriteria: CriteriaScores = {};
    const allCriteria = targetScores.map((s) => s.score.criteria);
    for (const c of allCriteria) {
      for (const [key, val] of Object.entries(c)) {
        avgCriteria[key] = (avgCriteria[key] || 0) + Number(val);
      }
    }
    for (const key of Object.keys(avgCriteria)) {
      avgCriteria[key] = Math.round((avgCriteria[key] / targetScores.length) * 10) / 10;
    }

    const avgTotal = calculateWeightedTotal(avgCriteria, outputType);
    const combinedFeedback = targetScores.map((s) => s.score.feedback).join(" | ");

    return {
      ...comp,
      scores: {
        criteria: avgCriteria,
        total: avgTotal,
        feedback: combinedFeedback,
        scoredBy: targetScores.map((s) => s.score.scoredBy).join(","),
      },
    };
  });

  // Rank by total score
  scored.sort((a, b) => (b.scores?.total || 0) - (a.scores?.total || 0));
  scored.forEach((s, i) => (s.rank = i + 1));

  return scored;
}

// ─── Stage 5: Post-Processing (Perplexity Fact-Check + Conditional Merge) ───

async function factCheck(
  output: string,
  idea: string,
): Promise<LLMResponse | null> {
  if (FACT_CHECK_PROVIDERS.length === 0) return null;

  const system = `You are a fact-checking and citation layer. Review the following generated prompt/output for:
1. Factual accuracy
2. Recency of information
3. Missing citations or sources
4. Any claims that need verification

If everything looks good, say "VERIFIED: no issues found." and explain briefly.
If there are issues, list them clearly with suggested fixes.`;

  const response = await callLLM({
    provider: FACT_CHECK_PROVIDERS[0], // Perplexity
    systemPrompt: system,
    userPrompt: `Original request: ${idea}\n\nOutput to fact-check:\n${output}`,
    temperature: 0.3,
  });

  return response.error ? null : response;
}

async function conditionalMerge(
  top: StagedOutput[],
  idea: string,
  outputType: string,
): Promise<LLMResponse | null> {
  // Only merge if top 2 within 5% gap
  if (top.length < 2) return null;

  const gap = ((top[0].scores?.total || 0) - (top[1].scores?.total || 0)) / 10;
  if (gap > 0.05) return null; // Gap > 5% → no merge needed

  const system = `You are a master synthesizer. Merge the best elements from the following two ${outputType} outputs into one superior output. 
- Keep the strongest parts from each
- Eliminate redundancy
- Maintain consistent tone and structure
- The result should be BETTER than either input alone`;

  const user = `## Output A (Score: ${top[0].scores?.total}/10)
${top[0].output}

## Output B (Score: ${top[1].scores?.total}/10)
${top[1].output}

Merge these into one superior ${outputType}.`;

  return callLLM({
    provider: "deepseek",
    systemPrompt: system,
    userPrompt: user,
    temperature: 0.5,
  });
}

// ─── Full 5-Stage Pipeline ───

export async function fullPipeline(
  idea: string,
  coreAnswers: { question: string; answer: string }[],
  followUpAnswers: { question: string; answer: string }[],
  outputType = "System Prompt",
): Promise<ComposeResult> {
  const startTotal = Date.now();
  const classifiedType = classifyOutputType(outputType);
  const allAnswers = [...coreAnswers, ...followUpAnswers].filter((a) => a.answer?.trim());

  // Stage 3: Parallel Compose
  const compositionsRaw = await composeAll(idea, allAnswers, outputType);
  const successful = getSuccessful(compositionsRaw);
  const failed = getFailed(compositionsRaw);
  const partialFailure = failed.length > 0;

  // Stage 4: Cross-Matrix Scoring
  const scoredCompositions = await crossMatrixScore(successful, idea, classifiedType);

  // Merge failed into scored (unscored, at bottom)
  const allScored: StagedOutput[] = [
    ...scoredCompositions,
    ...failed.map((f) => ({ ...f, rank: 999 })),
  ];

  const winner = scoredCompositions.find((s) => s.rank === 1) || null;

  // Stage 5: Post-Processing
  let factCheckResult: LLMResponse | null = null;
  let mergeResult: LLMResponse | null = null;

  if (winner?.output) {
    factCheckResult = await factCheck(winner.output, idea);
  }

  mergeResult = await conditionalMerge(
    scoredCompositions.filter((s) => s.rank === 1 || s.rank === 2),
    idea,
    outputType,
  );

  return {
    idea,
    outputType,
    coreQuestions: [],
    followUpQuestions: [],
    compositions: allScored,
    winner,
    mergeResult,
    totalLatency: Date.now() - startTotal,
    keyHealth: await getKeyHealthDynamic(),
    partialFailure,
  };
}

// Dynamic import to avoid circular
import { getKeyHealth } from "../config/keys.js";
async function getKeyHealthDynamic() {
  return getKeyHealth();
}
