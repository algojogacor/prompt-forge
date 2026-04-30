// 🏆 Per-Output-Type Scoring Rubrics
// Based on MT-Bench methodology: multi-judge, shuffled order, anti-bias

export type OutputType = "system-prompt" | "prd" | "tech-spec" | "job-description";

// ─── Rubric Definitions ───

interface RubricCriteria {
  name: string;
  weight: number;
  description: string;
}

const RUBRICS: Record<OutputType, RubricCriteria[]> = {
  "system-prompt": [
    { name: "Role Precision", weight: 30, description: "Clear, unambiguous role definition. The AI knows exactly who it is." },
    { name: "Constraint Coverage", weight: 30, description: "All boundaries, limitations, and rules explicitly stated." },
    { name: "Tone Consistency", weight: 20, description: "Voice, personality, and language match the intended use." },
    { name: "Actionability", weight: 20, description: "Ready to copy-paste and deploy. No missing pieces." },
  ],
  "prd": [
    { name: "Requirements Traceability", weight: 25, description: "Every feature ties to a clear user need or business goal." },
    { name: "Scope Clarity", weight: 25, description: "In-scope vs out-of-scope explicitly defined. No ambiguity." },
    { name: "Stakeholder Alignment", weight: 25, description: "All user personas and stakeholders considered." },
    { name: "Measurable Success", weight: 25, description: "Concrete, verifiable acceptance criteria for each requirement." },
  ],
  "tech-spec": [
    { name: "Implementation Clarity", weight: 25, description: "Developer can start coding immediately from this spec." },
    { name: "API Design", weight: 25, description: "Endpoints, data contracts, types, and protocols clearly defined." },
    { name: "Error Handling", weight: 25, description: "Edge cases, failure modes, and error responses covered." },
    { name: "Testability", weight: 25, description: "Each component has verifiable, testable requirements." },
  ],
  "job-description": [
    { name: "Role Definition", weight: 25, description: "Title, level, team, and reporting structure clear." },
    { name: "Qualification Precision", weight: 25, description: "Must-have vs nice-to-have clearly separated." },
    { name: "Culture Add", weight: 25, description: "Values, mission, and team culture alignment articulated." },
    { name: "Inclusivity", weight: 25, description: "No biased or exclusionary language. Accessible to all qualified candidates." },
  ],
};

// ─── Scorer System Prompt ───

export function getScorerSystem(outputType: OutputType): string {
  const rubric = RUBRICS[outputType];

  return `You are an elite Prompt Quality Auditor specializing in ${outputType.replace("-", " ")} evaluation.

## Your Task
Score another AI's output on exactly 4 weighted criteria. Be OBJECTIVE and CALIBRATED — score based on the output alone, not what it "could be."

## Scoring Criteria for ${outputType.replace("-", " ")}:
${rubric.map((c, i) => `${i + 1}. **${c.name}** (${c.weight}%): ${c.description}`).join("\n")}

## Scoring Guide:
- 1-3: Poor — major gaps, unclear, unusable
- 4-6: Average — usable but needs significant revision
- 7-8: Good — solid, minor improvements needed
- 9-10: Excellent — production-ready, exceptional quality

## Important Anti-Bias Rules:
- IGNORE output length — longer is NOT better
- Score based on QUALITY of content, not quantity
- If the output is concise but complete, that's a STRENGTH not a weakness

## Output Format (JSON ONLY — no markdown, no preamble):
{"criteria":{${rubric.map((c) => `"${c.name.toLowerCase().replace(/\s+/g, "_")}": X`).join(", ")}},"total": X,"feedback":"one-line summary"}`;
}

export function getScorerUser(outputToScore: string, originalIdea: string, _outputType: OutputType): string {
  return `# Original Idea
${originalIdea}

# Output to Score
${outputToScore}

---

Score this output on all 4 criteria. Return ONLY a JSON object — no markdown, no explanation.`;
}

// ─── Score Calculation ───

export interface CriteriaScores {
  [criterion: string]: number;
}

export interface ScoredResult {
  criteria: CriteriaScores;
  total: number;
  feedback: string;
  scoredBy: string;
}

export function calculateWeightedTotal(
  criteria: CriteriaScores,
  outputType: OutputType,
): number {
  const rubric = RUBRICS[outputType];
  let total = 0;
  for (const c of rubric) {
    const key = c.name.toLowerCase().replace(/\s+/g, "_");
    total += (criteria[key] || 0) * (c.weight / 100);
  }
  return Math.round(total * 10) / 10; // 1 decimal
}
