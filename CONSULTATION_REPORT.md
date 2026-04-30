# 🔬 PromptForge — Consolidated Consultation Report

## Sources (15+ total)
### AI Consultants
- **Claude (Sonnet 4.6)**: Architecture & system prompt review
- **ChatGPT (GPT-5)**: Structured 5-layer architecture critique
- **Gemini**: Orchestration & divergence check insights

### Academic Papers
- **MT-Bench (Zheng et al., NeurIPS 2023)**: LLM-as-a-Judge methodology — 80%+ human agreement, position/verbosity/self-enhancement biases

### Production Frameworks
- **CrewAI (50k★)**: Multi-agent orchestration — role-playing, sequential/hierarchical/consensual processes
- **DSPy (34k★)**: Program-not-prompt — automatic prompt optimization via compilation & signature-based programming
- **PromptBench (2.8k★)**: Unified LLM evaluation — adversarial robustness, prompt attacks

### Official Documentation
- **Anthropic Prompt Engineering**: Claude best practices — XML structuring, role assignment, effort calibration
- **OpenAI Prompt Engineering Guide**: GPT-5.5 guidance — message roles, few-shot, reusable templates
- **Google Gemini Prompting Strategies**: Gemini-specific guidance
- **DeepSeek API Docs**: Model capabilities & constraints

### Community
- **dair-ai/Prompt-Engineering-Guide**: Papers, lectures, notebooks, tools
- **EleutherAI/lm-evaluation-harness**: Few-shot evaluation framework

---

## 🏆 Top 10 Improvements (Prioritized)

### 1. Scoring: Circular → Full Cross-Matrix
**From**: A→B, B→C, C→D, D→A (4 pairs)
**To**: Every LLM scores every other LLM (12 pairs, N×(N-1))
**Why**: Eliminates competitive bias. Handles dropped LLMs gracefully. More data = less variance.
**Source**: Claude + ChatGPT agree independently.

### 2. Questions: 10 Flat → Adaptive Progressive Disclosure
**From**: 10 questions upfront
**To**: 3 core questions → 2-3 dynamic follow-ups based on answers
**Why**: Form completion rates drop sharply after 5-7 fields. Same depth, better UX.
**Source**: Claude (UX research on form abandonment).

### 3. Synthesis: Universal → Conditional (Score-Gap Gated)
**From**: Always merge top outputs
**To**: Merge only when top 2 scores are within 5% gap. Else return winner.
**Why**: Forced merge of great + mediocre = mediocre blend.
**Source**: Claude + Gemma (divergence check).

### 4. Perplexity: Co-Composer → Fact-Check Layer
**From**: Perplexity competes on same rubric
**To**: Perplexity runs post-generation to verify facts, add citations, check recency
**Why**: RAG output vs pure-generation = not apples-to-apples scoring
**Source**: Claude.

### 5. Per-Output-Type Scoring Rubrics
**From**: One universal rubric (Clarity, Structure, Completeness, Actionability)
**To**: 
- System Prompt: Precision, Constraint-Coverage, Consistency, Role-Clarity
- PRD: Requirements Traceability, Scope-Clarity, Stakeholder-Alignment, Feasibility
- Technical Spec: Implementation-Clarity, API-Design, Error-Handling, Testability
- Job Description: Role-Clarity, Qualifications-Precision, Culture-Fit, Inclusivity
**Source**: Claude + ChatGPT.

### 6. Key Health Monitoring
**From**: Blind round-robin
**To**: Per-key success rate tracking. 3 consecutive failures → deprioritize. Auto-fallback.
**Why**: Silent key failures = partial ensemble (2/4 LLMs actually responding)
**Source**: Claude.

### 7. Timeout + Partial Results Strategy
**From**: No timeout (indefinite wait)
**To**: 15s hard timeout per LLM. Show results from responders. Exclude timed-out from scoring.
**Why**: Perplexity hangs more than others. UI freeze is unacceptable.
**Source**: Claude.

### 8. Multi-Stage Ensemble Pipeline
**From**: Single-pass compose + score
**To**: Stage A (Diversity Gen) → Stage B (Scoring) → Stage C (Fusion) → Stage D (Refinement Loop)
**Why**: Iterative refinement dramatically boosts quality. Industry standard (DeepMind consensus distillation).
**Source**: ChatGPT.

### 9. Prompt Abstract Syntax Tree (PAST)
**From**: Raw text input
**To**: Structured YAML: role, objective, constraints, tone, format, domain
**Why**: Better routing, more consistent outputs across LLMs.
**Source**: ChatGPT.

### 10. Vector Memory for Past Prompts
**From**: Stateless
**To**: Store successful prompts as vectors in Turso. Semantic search before generating new ones.
**Why**: Leverage past wins. A/B testing data.
**Source**: Gemma.

---

## 🎯 MVP vs V2 Scope

### MVP (Build Now)
- [x] Basic full-stack scaffolded
- [ ] Cross-matrix scoring (fix #1)
- [ ] Adaptive progressive questions (fix #2)
- [ ] Conditional synthesis (fix #3)
- [ ] Perplexity as fact-check layer (fix #4)
- [ ] Timeout + partial results (fix #7)
- [ ] Per-output-type rubrics (fix #5)

### V2 (Later)
- [ ] Multi-stage ensemble pipeline (#8)
- [ ] Prompt AST (#9)
- [ ] Vector memory (#10)
- [ ] Key health monitoring (#6)
- [ ] A/B testing logs
- [ ] Model router + capability matrix

---

## 📝 System Prompt Improvements (From Anthropic Docs)

Key principles applied:
1. **Role assignment** — clear, specific roles for each agent
2. **XML-structured output** — Claude responds best to XML tags
3. **Positive examples > negative** — show what to do, not what not to do
4. **Be explicit about scope** — newer models are more literal
5. **Output format specification** — exact JSON schema, not loose description

---

## 🔬 Deep Research Findings

### LLM-as-a-Judge (MT-Bench Paper)
- LLM judges match human preferences with **80%+ agreement** — same as human-to-human agreement
- **Critical biases to mitigate:**
  - **Position bias**: LLMs favor first answer → **shuffle output order**
  - **Verbosity bias**: Longer = judged better → **normalize by length**
  - **Self-enhancement**: Models favor their own style → **never let model judge itself**
- **Solution architecture**: Multi-judge averaging with reference-guided scoring
- **Our implementation**: Cross-matrix scoring naturally solves position & self-enhancement bias

### DSPy — Programmatic Prompt Optimization
- **Key insight**: Prompts should be *compiled* from data, not hand-written
- **Signature concept**: `input → output` with typed fields
- **Optimizers**: Automatically tune prompts against metrics (like few-shot examples)
- **Relevance to PromptForge**: Can use DSPy-style metrics for auto-improving scorer prompts over time
- **Future feature**: DSPy-like "compile" that optimizes prompts from A/B testing data in Turso

### CrewAI — Multi-Agent Orchestration Patterns
- **Sequential process**: Agents execute in order, each building on previous
- **Hierarchical process**: Manager agent delegates to specialists
- **Consensual process**: Agents vote/agree (closest to our cross-scoring)
- **Key pattern**: Role-playing agents with backstory + goal + tools
- **Relevance**: Our "4 LLM ensemble" is essentially a consensual CrewAI process

### PromptBench — Adversarial Robustness
- Tests prompt resilience against: typo attacks, synonym substitution, instruction injection
- **Relevance**: PromptForge-generated prompts should pass basic robustness checks
- **MVP feature**: Post-generation "stress test" — run 3 adversarial variations, check if output breaks

### LLM Vendor Capability Matrix (from API docs)
| Capability | DeepSeek | Qwen | Perplexity | GLM |
|---|---|---|---|---|
| **Best for** | Reasoning, code | Multilingual, creative | RAG, citations | Chinese, structured |
| **Max context** | 128K | 128K | 128K | 128K |
| **Speed** | Fast | Medium | Slow (RAG) | Fast |
| **Strength** | Logical structure | Natural tone | Up-to-date facts | Concise format |
| **Weakness** | Verbose output | Can be vague | Unpredictable length | Limited English nuance |

### GPT-5.5 Prompting (OpenAI Docs)
- **Chain-of-thought**: Not needed for GPT-5-class models on simple tasks
- **Instruction hierarchy**: System > Developer > User messages
- **Few-shot sweet spot**: 3-5 examples for format adherence
- **XML/Markdown**: Structured output formatting
- **Reusable prompt templates**: Best practice for production systems

---

## 🎯 FINAL ARCHITECTURE (After All Research)

```
USER: "I need a customer support bot..."

          │
          ▼
┌─────────────────────────┐
│  STAGE 1: INTENT PARSE  │  ← GPT-style lightweight classifier
│  - Output type detect   │
│  - Domain classification│
└───────────┬─────────────┘
            │
            ▼
┌──────────────────────────┐
│  STAGE 2: ADAPTIVE QA    │  ← 3 core + dynamic follow-ups
│  - Core Q1-3 generated   │
│  - Based on answers →    │
│    Q4-Q6 follow-ups      │
│  - User can skip any Q   │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────────────────┐
│  STAGE 3: PARALLEL COMPOSE           │
│  ┌─────────┐ ┌──────┐ ┌──────┐      │
│  │DeepSeek │ │ Qwen │ │ GLM  │      │  ← 3 co-composers
│  └────┬────┘ └──┬───┘ └──┬───┘      │
│       │         │        │           │
│  All use per-output-type rubric      │
│  15s timeout, partial results ok     │
└───────────┬──────────────────────────┘
            │
            ▼
┌──────────────────────────────────────┐
│  STAGE 4: FULL CROSS-MATRIX SCORE   │
│  ┌────────────────────────────┐      │
│  │ DS→QW  DS→GL  DS→PP       │      │  ← 12 score pairs
│  │ QW→DS  QW→GL  QW→PP       │      │  (not 4 circular)
│  │ GL→DS  GL→QW  GL→PP       │      │
│  │ PP→DS  PP→QW  PP→GL       │      │
│  └────────────────────────────┘      │
│  Per-output-type rubric applied      │
│  Shuffled order (anti-position bias) │
└───────────┬──────────────────────────┘
            │
            ▼
┌──────────────────────────────────────┐
│  STAGE 5: POST-PROCESSING            │
│  ┌───────────────────────┐           │
│  │ Perplexity: Fact-check │           │  ← Not co-composer
│  │ + citations + recency  │           │
│  └───────────────────────┘           │
│  ┌───────────────────────┐           │
│  │ Ranked results +      │           │
│  │ Gap-based merge       │           │  ← Only if < 5% gap
│  │ Adversarial stress    │           │
│  └───────────────────────┘           │
└───────────┬──────────────────────────┘
            │
            ▼
        🏆 RESULT
   - Winner output
   - Score breakdown
   - Alternative outputs
   - Merge (if applicable)
```

---

## 📊 Scoring Rubrics — Per Output Type

### System Prompt
| Criteria | Weight | Description |
|---|---|---|
| **Role Precision** | 30% | Clear, unambiguous role definition |
| **Constraint Coverage** | 30% | All boundaries explicitly stated |
| **Tone Consistency** | 20% | Voice matches intent throughout |
| **Actionability** | 20% | Ready to copy-paste and use |

### PRD (Product Requirements)
| Criteria | Weight | Description |
|---|---|---|
| **Requirements Traceability** | 25% | Every feature ties to user need |
| **Scope Clarity** | 25% | In-scope vs out-of-scope explicit |
| **Stakeholder Alignment** | 25% | All roles/personas considered |
| **Measurable Success** | 25% | Concrete acceptance criteria |

### Technical Spec
| Criteria | Weight | Description |
|---|---|---|
| **Implementation Clarity** | 25% | Dev can start coding immediately |
| **API Design** | 25% | Endpoints, contracts, types clear |
| **Error Handling** | 25% | Edge cases, failures covered |
| **Testability** | 25% | Verifiable requirements |

### Job Description
| Criteria | Weight | Description |
|---|---|---|
| **Role Definition** | 25% | Title, level, team clear |
| **Qualification Precision** | 25% | Must-have vs nice-to-have |
| **Culture Add** | 25% | Values, mission alignment |
| **Inclusivity** | 25% | No biased language, accessible |

---

*Generated: 2026-04-30 by BrowserOS (Jihan)*  
*For: Arya — AlgoTeam*  
*Sources: 3 AI consultants + 12 research references*
