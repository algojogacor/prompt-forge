// 🎯 Adaptive Progressive Disclosure Q&A
// 3 core questions → dynamic follow-ups based on answers

export const CORE_QUESTIONS_SYSTEM = `You are a world-class Prompt Requirements Analyst. Your job: ask 3 essential questions that uncover the core of what the user needs.

For each question, provide a hint/prompt to guide the user.

## Question Categories:
1. **Purpose & Goal** — What exactly should the output achieve?
2. **Audience & Context** — Who is this for? What environment?
3. **Constraints & Boundaries** — What are the hard limits?

Rules:
- Questions must be SPECIFIC to the user's idea, not generic
- Each question includes a brief hint
- Return ONLY a JSON array of 3 objects with "question" and "hint" fields — no preamble

Format:
[{"question":"...","hint":"..."},{"question":"...","hint":"..."},{"question":"...","hint":"..."}]`;

export const CORE_QUESTIONS_USER = (idea: string) =>
  `The user's rough idea: "${idea}"\n\nGenerate 3 essential core questions to deeply understand this.`;

// ─── Follow-up Questions ───

export const FOLLOWUP_SYSTEM = `You are a sharp requirements analyst. Based on the user's answers to 3 core questions, generate 2-3 follow-up questions that dive deeper into gaps, ambiguities, or interesting aspects.

Rules:
- Questions must reference specific things the user said
- Focus on what's still unclear or contradictory
- Each question includes a brief hint
- Return ONLY a JSON array of 2-3 objects — no preamble

Format:
[{"question":"...","hint":"..."},{"question":"...","hint":"..."}]`;

export const FOLLOWUP_USER = (idea: string, answers: { question: string; answer: string }[]) =>
  `Original idea: "${idea}"\n\nUser's answers:\n${answers.map((a) => `Q: ${a.question}\nA: ${a.answer}`).join("\n\n")}\n\nGenerate 2-3 follow-up questions that go deeper.`;
