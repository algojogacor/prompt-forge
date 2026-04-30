import React, { useState, useCallback } from "react";
import {
  getCoreQuestions,
  getFollowUpQuestions,
  runPipeline,
  type Question,
  type ComposeResult,
  type StagedOutput,
} from "./lib/api";

type Stage = "idea" | "qa-core" | "qa-followup" | "composing" | "result";
const OUTPUT_TYPES = ["System Prompt", "PRD (Product Requirements)", "Technical Spec", "Job Description", "Content Brief"];

// ─── Design System ───
const YELLOW = "#E8FF47";
const BG = "#0a0a0a";
const SURFACE = "rgba(255,255,255,0.03)";
const BORDER = "rgba(255,255,255,0.07)";
const TEXT = "rgba(255,255,255,0.9)";
const TEXT_MUTED = "rgba(255,255,255,0.35)";
const TEXT_FAINT = "rgba(255,255,255,0.2)";
const MONO = '"DM Mono", "JetBrains Mono", monospace';
const SANS = '"Inter", "Geist", system-ui, -apple-system, sans-serif';

export default function App() {
  const [stage, setStage] = useState<Stage>("idea");
  const [idea, setIdea] = useState("");
  const [outputType, setOutputType] = useState("System Prompt");
  const [coreQuestions, setCoreQuestions] = useState<Question[]>([]);
  const [followUpQs, setFollowUpQs] = useState<Question[]>([]);
  const [coreAnswers, setCoreAnswers] = useState<string[]>([]);
  const [followUpAnswers, setFollowUpAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<ComposeResult | null>(null);
  const [error, setError] = useState("");
  const [selectedOutput, setSelectedOutput] = useState("");

  const handleGetCore = async () => {
    if (!idea.trim()) return;
    setError("");
    try {
      const qs = await getCoreQuestions(idea);
      setCoreQuestions(qs);
      setCoreAnswers(new Array(qs.length).fill(""));
      setStage("qa-core");
    } catch (e: any) { setError(e.message); }
  };

  const handleCoreSubmit = async (skipFollowUp: boolean) => {
    setError("");
    const qa = coreQuestions.map((q, i) => ({ question: q.question, answer: coreAnswers[i] || "" }));
    try {
      if (!skipFollowUp) {
        const fqs = await getFollowUpQuestions(idea, qa);
        if (fqs.length > 0) { setFollowUpQs(fqs); setFollowUpAnswers(new Array(fqs.length).fill("")); setStage("qa-followup"); return; }
      }
      await runCompose(qa, []);
    } catch (e: any) { setError(e.message); }
  };

  const handleFollowUpSubmit = async () => {
    const coreQA = coreQuestions.map((q, i) => ({ question: q.question, answer: coreAnswers[i] || "" }));
    const fuQA = followUpQs.map((q, i) => ({ question: q.question, answer: followUpAnswers[i] || "" }));
    await runCompose(coreQA, fuQA);
  };

  const runCompose = async (coreQA: { question: string; answer: string }[], fuQA: { question: string; answer: string }[]) => {
    setError(""); setStage("composing");
    try {
      const res = await runPipeline(idea, coreQA, fuQA, outputType);
      setResult(res);
      setSelectedOutput(res.mergeResult?.output || res.winner?.output || res.compositions[0]?.output || "");
      setStage("result");
    } catch (e: any) { setError(e.message); setStage("qa-core"); }
  };

  const reset = () => { setStage("idea"); setResult(null); setCoreQuestions([]); setFollowUpQs([]); };

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, fontFamily: SANS }}>
      <Header />
      <div style={{ maxWidth: 840, margin: "0 auto", padding: "32px 20px" }}>
        {error && <ErrorBanner msg={error} onDismiss={() => setError("")} />}

        {stage === "idea" && <IdeaStage idea={idea} setIdea={setIdea} outputType={outputType} setOutputType={setOutputType} onSubmit={handleGetCore} />}
        {stage === "qa-core" && <QAStage questions={coreQuestions} answers={coreAnswers} setAnswers={setCoreAnswers} onBack={() => setStage("idea")} onSkip={() => handleCoreSubmit(true)} onContinue={() => handleCoreSubmit(false)} label="Core Questions" />}
        {stage === "qa-followup" && <QAStage questions={followUpQs} answers={followUpAnswers} setAnswers={setFollowUpAnswers} onBack={() => setStage("qa-core")} onSkip={handleFollowUpSubmit} onContinue={handleFollowUpSubmit} label="Follow-up" />}
        {stage === "composing" && <ComposingStage />}
        {stage === "result" && result && <ResultStage result={result} selectedOutput={selectedOutput} onSelect={setSelectedOutput} onReset={reset} />}
      </div>
    </div>
  );
}

// ─── HEADER ───
function Header() {
  return (
    <header style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "24px 32px 16px", borderBottom: `1px solid ${BORDER}` }}>
      <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: YELLOW, letterSpacing: "0.12em", textTransform: "uppercase" }}>PF</span>
      <h1 style={{ fontFamily: SANS, fontSize: 15, fontWeight: 500, color: TEXT, letterSpacing: "-0.01em", margin: 0 }}>PromptForge</h1>
      <span style={{ fontFamily: MONO, fontSize: 10, color: TEXT_MUTED, letterSpacing: "0.06em", marginLeft: "auto" }}>ensemble · v2</span>
    </header>
  );
}

// ─── ERROR BANNER ───
function ErrorBanner({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  return (
    <div style={{ background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.25)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 13, color: "#FF6B6B", fontFamily: MONO }}>{msg}</span>
      <button onClick={onDismiss} style={{ background: "none", border: "none", color: "#FF6B6B", cursor: "pointer", fontSize: 16 }}>×</button>
    </div>
  );
}

// ─── STAGE 1: IDEA ───
function IdeaStage({ idea, setIdea, outputType, setOutputType, onSubmit }: any) {
  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <span style={{ fontFamily: MONO, fontSize: 10, color: YELLOW, letterSpacing: "0.1em", textTransform: "uppercase" }}>New Project</span>
        <h2 style={{ fontSize: 28, fontWeight: 600, margin: "8px 0 4px", letterSpacing: "-0.02em" }}>What are we forging?</h2>
        <p style={{ fontSize: 14, color: TEXT_MUTED, lineHeight: 1.6 }}>Describe your idea. Our ensemble of 3 LLMs will craft it into production-ready output, then cross-score each other.</p>
      </div>
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
        <textarea
          style={{ width: "100%", background: "transparent", border: "none", color: TEXT, fontSize: 15, fontFamily: "inherit", resize: "vertical", outline: "none", lineHeight: 1.6, minHeight: 100 }}
          placeholder='e.g. "Customer support bot for SaaS — handles refunds, password resets, feature discovery..."'
          value={idea} onChange={(e: any) => setIdea(e.target.value)} rows={4}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
          <select style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT, fontSize: 12, fontFamily: MONO, padding: "6px 10px", outline: "none" }} value={outputType} onChange={(e: any) => setOutputType(e.target.value)}>
            {OUTPUT_TYPES.map((t: string) => <option key={t}>{t}</option>)}
          </select>
          <button onClick={onSubmit} disabled={!idea.trim()} style={{ background: idea.trim() ? YELLOW : "rgba(255,255,255,0.08)", color: idea.trim() ? BG : TEXT_FAINT, border: "none", borderRadius: 10, padding: "10px 22px", fontSize: 13, fontWeight: 600, fontFamily: MONO, cursor: idea.trim() ? "pointer" : "default", letterSpacing: "0.04em", transition: "all 0.2s" }}>
            FORGE →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── STAGE 2: Q&A ───
function QAStage({ questions, answers, setAnswers, onBack, onSkip, onContinue, label }: any) {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <span style={{ fontFamily: MONO, fontSize: 10, color: YELLOW, letterSpacing: "0.1em" }}>{label}</span>
        <h2 style={{ fontSize: 22, fontWeight: 600, margin: "6px 0 2px" }}>Deep Dive</h2>
        <p style={{ fontSize: 13, color: TEXT_MUTED }}>Answer what you can. Skip the rest.</p>
      </div>
      {questions.map((q: Question, i: number) => (
        <div key={i} style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 4 }}>{i + 1}. {q.question}</label>
          <span style={{ fontSize: 11, color: TEXT_FAINT, fontFamily: MONO, display: "block", marginBottom: 6 }}>{q.hint}</span>
          <textarea style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE, color: TEXT, fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none" }} placeholder="..." value={answers[i]} onChange={(e: any) => { const n = [...answers]; n[i] = e.target.value; setAnswers(n); }} rows={2} />
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
        <button onClick={onBack} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT_MUTED, padding: "8px 18px", fontSize: 12, fontFamily: MONO, cursor: "pointer" }}>← Back</button>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onSkip} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT_MUTED, padding: "8px 18px", fontSize: 12, fontFamily: MONO, cursor: "pointer" }}>Skip</button>
          <button onClick={onContinue} style={{ background: YELLOW, color: BG, border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 12, fontWeight: 600, fontFamily: MONO, cursor: "pointer" }}>Continue →</button>
        </div>
      </div>
    </div>
  );
}

// ─── STAGE 3: COMPOSING (SHIMMER SKELETON) ───
function ComposingStage() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <span style={{ fontFamily: MONO, fontSize: 10, color: YELLOW, letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 8 }}>
          <PulsingDot /> Composing
        </span>
        <h2 style={{ fontSize: 22, fontWeight: 600, margin: "6px 0 2px" }}>Ensemble at work</h2>
        <p style={{ fontSize: 13, color: TEXT_MUTED }}>DeepSeek, Qwen, and GLM composing in parallel. Cross-matrix scoring follows.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {["DeepSeek", "Qwen", "GLM"].map((name, i) => (
          <SkeletonCard key={name} delay={i * 150} name={name} />
        ))}
      </div>
    </div>
  );
}

function SkeletonCard({ delay, name }: { delay: number; name: string }) {
  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, opacity: 0.7 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 4 }}>{name}</div>
          <Shimmer w="60%" h={10} />
        </div>
        <span style={{ fontFamily: MONO, fontSize: 10, color: TEXT_FAINT, display: "flex", alignItems: "center", gap: 5 }}>
          <PulsingDot /> scoring
        </span>
      </div>
      <Shimmer w="100%" h={3} style={{ marginBottom: 8 }} />
      <Shimmer w="30%" h={24} style={{ marginBottom: 14 }} />
      <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 10 }}>
        <Shimmer w="45%" h={10} />
      </div>
    </div>
  );
}

function Shimmer({ w, h, style = {} }: { w: string; h: number; style?: any }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 4, marginBottom: 4,
      background: "linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.03) 75%)",
      backgroundSize: "200% 100%", animation: "shimmer 1.6s infinite", ...style,
    }} />
  );
}

function PulsingDot() {
  return <span style={{ width: 6, height: 6, borderRadius: "50%", background: YELLOW, display: "inline-block", animation: "pulse 1.2s ease-in-out infinite", flexShrink: 0 }} />;
}

// ─── STAGE 4: RESULTS ───
function ResultStage({ result, selectedOutput, onSelect, onReset }: { result: ComposeResult; selectedOutput: string; onSelect: (s: string) => void; onReset: () => void }) {
  const hasFailures = result.compositions.some(c => c.error || c.timedOut);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <span style={{ fontFamily: MONO, fontSize: 10, color: YELLOW, letterSpacing: "0.1em" }}>Results</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ fontSize: 22, fontWeight: 600, margin: "6px 0 0" }}>Forged</h2>
          {hasFailures && <span style={{ fontFamily: MONO, fontSize: 10, color: "#FF6B6B", background: "rgba(255,80,80,0.1)", padding: "2px 8px", borderRadius: 100 }}>{result.compositions.filter(c => c.error || c.timedOut).length} failed</span>}
        </div>
      </div>

      {/* Scoreboard */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 28 }}>
        {result.compositions.map(comp => (
          <LLMCard key={comp.provider} comp={comp} isSelected={selectedOutput === comp.output} onSelect={() => comp.output && onSelect(comp.output)} />
        ))}
      </div>

      {/* Winner / Merged */}
      {result.mergeResult && (
        <OutputBlock label="Merged (Synthesized)" output={result.mergeResult.output} onCopy={() => navigator.clipboard.writeText(result.mergeResult!.output)} />
      )}

      {/* Selected */}
      {selectedOutput && (
        <OutputBlock label="Selected Output" output={selectedOutput} onCopy={() => navigator.clipboard.writeText(selectedOutput)} />
      )}

      {/* Key Health */}
      <details style={{ marginTop: 24, color: TEXT_FAINT, fontSize: 12, fontFamily: MONO, cursor: "pointer" }}>
        <summary>Key Health</summary>
        <pre style={{ background: SURFACE, padding: 12, borderRadius: 8, marginTop: 8, fontSize: 11, overflow: "auto" }}>
          {JSON.stringify(result.keyHealth, null, 2)}
        </pre>
      </details>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 28, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
        <button onClick={onReset} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT_MUTED, padding: "8px 18px", fontSize: 12, fontFamily: MONO, cursor: "pointer" }}>← New Project</button>
        <span style={{ fontFamily: MONO, fontSize: 11, color: TEXT_FAINT }}>{result.totalLatency}ms</span>
      </div>
    </div>
  );
}

// ─── LLM CARD ───
function LLMCard({ comp, isSelected, onSelect }: { comp: StagedOutput; isSelected: boolean; onSelect: () => void }) {
  const isWinner = comp.rank === 1;
  const status = comp.timedOut ? "timeout" : comp.error ? "failed" : "scored";

  return (
    <div
      onClick={comp.output ? onSelect : undefined}
      style={{
        background: isWinner ? "rgba(232,255,71,0.04)" : SURFACE,
        border: isWinner ? `1px solid rgba(232,255,71,0.25)` : isSelected ? `1px solid rgba(255,255,255,0.15)` : `1px solid ${BORDER}`,
        borderRadius: 12, padding: 20, cursor: comp.output ? "pointer" : "default",
        transition: "border-color 0.2s, transform 0.2s", position: "relative",
      }}
      onMouseEnter={e => { if (comp.output) e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
    >
      {isWinner && (
        <span style={{ position: "absolute", top: -1, right: 16, background: YELLOW, color: BG, fontSize: 10, fontWeight: 700, fontFamily: MONO, padding: "2px 8px", borderRadius: "0 0 6px 6px", letterSpacing: "0.08em" }}>WINNER</span>
      )}

      {/* Identity */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 2 }}>{comp.provider.toUpperCase()}</div>
          <div style={{ fontSize: 11, color: TEXT_FAINT, fontFamily: MONO }}>{comp.model}</div>
        </div>
        <StatusPill status={status} />
      </div>

      {/* Score or Empty */}
      {comp.scores ? (
        <div style={{ marginBottom: 14 }}>
          <ScoreBar score={comp.scores.total} maxScore={10} />
          <div style={{ fontSize: 32, fontWeight: 700, color: "#fff", lineHeight: 1, marginTop: 6, fontFamily: SANS, letterSpacing: "-0.03em" }}>
            {comp.scores.total.toFixed(1)}
            <span style={{ fontSize: 14, fontWeight: 400, color: TEXT_MUTED, marginLeft: 3 }}>/10</span>
          </div>
          {/* Criteria breakdown */}
          <div style={{ marginTop: 8 }}>
            {Object.entries(comp.scores.criteria).slice(0, 3).map(([k, v]) => (
              <div key={k} style={{ display: "grid", gridTemplateColumns: "70px 1fr 20px", gap: 6, alignItems: "center", marginBottom: 3 }}>
                <span style={{ fontSize: 10, color: TEXT_FAINT, fontFamily: MONO, textTransform: "uppercase" }}>{k.replace(/_/g, " ")}</span>
                <ScoreBar score={v as number} maxScore={10} height={2} />
                <span style={{ fontSize: 10, color: TEXT_MUTED, textAlign: "right", fontFamily: MONO }}>{v as number}</span>
              </div>
            ))}
          </div>
        </div>
      ) : comp.timedOut ? (
        <EmptyState icon="⏱" title="Timed out" sub="Exceeded 30s limit" />
      ) : comp.error ? (
        <EmptyState icon="✕" title="Failed" sub={comp.error.substring(0, 40)} />
      ) : null}

      {/* Meta */}
      <div style={{ fontSize: 11, color: TEXT_FAINT, fontFamily: MONO, borderTop: `1px solid ${BORDER}`, paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
        <span>{comp.latency}ms</span>
        <span>#{comp.rank ?? "—"}</span>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const s: any = {
    scored: { label: "scored", bg: "rgba(232,255,71,0.12)", c: YELLOW },
    failed: { label: "failed", bg: "rgba(255,80,80,0.1)", c: "#FF6B6B" },
    timeout: { label: "timeout", bg: "rgba(255,160,50,0.1)", c: "#FFA030" },
  }[status] || { label: status, bg: SURFACE, c: TEXT_FAINT };

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 100, background: s.bg, color: s.c, fontSize: 10, fontFamily: MONO, letterSpacing: "0.04em" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.c, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

function ScoreBar({ score, maxScore = 10, height = 3 }: { score: number; maxScore?: number; height?: number }) {
  const pct = Math.min((score / maxScore) * 100, 100);
  const color = score >= 8 ? YELLOW : score >= 6 ? "#7EE8A2" : "rgba(255,255,255,0.25)";
  return (
    <div style={{ height, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)" }} />
    </div>
  );
}

function EmptyState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{ padding: "12px 0", margin: "8px 0 14px", borderTop: `1px dashed ${BORDER}`, borderBottom: `1px dashed ${BORDER}`, textAlign: "center" }}>
      <span style={{ fontSize: 20, display: "block", marginBottom: 4 }}>{icon}</span>
      <div style={{ fontSize: 12, fontWeight: 500, color: TEXT_MUTED }}>{title}</div>
      <div style={{ fontSize: 10, color: TEXT_FAINT, fontFamily: MONO, marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function OutputBlock({ label, output, onCopy }: { label: string; output: string; onCopy: () => void }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontFamily: MONO, fontSize: 10, color: YELLOW, letterSpacing: "0.08em" }}>{label}</span>
        <button onClick={onCopy} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 6, color: TEXT_MUTED, padding: "4px 10px", fontSize: 11, fontFamily: MONO, cursor: "pointer" }}>Copy</button>
      </div>
      <pre style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, fontSize: 13, lineHeight: 1.7, color: TEXT, whiteSpace: "pre-wrap", maxHeight: "50vh", overflowY: "auto", fontFamily: "inherit" }}>
        {output}
      </pre>
    </div>
  );
}

// Inject animations
const css = document.createElement("style");
css.textContent = `
  @keyframes shimmer { to { background-position: -200% 0; } }
  @keyframes pulse { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600;700&display=swap');
`;
document.head.appendChild(css);
