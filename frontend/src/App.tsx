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

  // Stage 1 → 2: Get core questions
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

  // Stage 2 → followup or compose
  const handleCoreSubmit = async (skipFollowUp: boolean) => {
    setError("");
    const qa = coreQuestions.map((q, i) => ({ question: q.question, answer: coreAnswers[i] || "" }));
    try {
      if (!skipFollowUp) {
        const fqs = await getFollowUpQuestions(idea, qa);
        if (fqs.length > 0) {
          setFollowUpQs(fqs);
          setFollowUpAnswers(new Array(fqs.length).fill(""));
          setStage("qa-followup");
          return;
        }
      }
      // Skip follow-up: go straight to compose
      await runCompose(qa, []);
    } catch (e: any) { setError(e.message); }
  };

  // Stage 3 → compose
  const handleFollowUpSubmit = async () => {
    const coreQA = coreQuestions.map((q, i) => ({ question: q.question, answer: coreAnswers[i] || "" }));
    const fuQA = followUpQs.map((q, i) => ({ question: q.question, answer: followUpAnswers[i] || "" }));
    await runCompose(coreQA, fuQA);
  };

  const runCompose = async (
    coreQA: { question: string; answer: string }[],
    fuQA: { question: string; answer: string }[],
  ) => {
    setError("");
    setStage("composing");
    try {
      const res = await runPipeline(idea, coreQA, fuQA, outputType);
      setResult(res);
      setSelectedOutput(res.mergeResult?.output || res.winner?.output || res.compositions[0]?.output || "");
      setStage("result");
    } catch (e: any) {
      setError(e.message);
      setStage("qa-core");
    }
  };

  const reset = () => { setStage("idea"); setResult(null); setCoreQuestions([]); setFollowUpQs([]); };

  return (
    <div style={s.container}>
      <header style={s.header}>
        <h1 style={s.title}>⚡ PromptForge</h1>
        <span style={s.sub}>Multi-LLM Ensemble · DeepSeek · Qwen · Perplexity · GLM</span>
      </header>
      {error && <div style={s.error}>{error}</div>}

      {/* Stage 1: Idea */}
      {stage === "idea" && (
        <div style={s.card}>
          <h2 style={s.h2}>What do you want to build?</h2>
          <p style={s.desc}>Describe your rough idea. Our ensemble will craft it into production-ready output.</p>
          <textarea style={s.ta} placeholder='e.g. "Customer support bot for SaaS, handles refunds, password resets, and feature questions..."' value={idea} onChange={e => setIdea(e.target.value)} rows={4} />
          <div style={s.row}>
            <select style={s.sel} value={outputType} onChange={e => setOutputType(e.target.value)}>
              {OUTPUT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <button style={s.btn} onClick={handleGetCore} disabled={!idea.trim()}>Generate Questions →</button>
          </div>
        </div>
      )}

      {/* Stage 2: Core Questions */}
      {stage === "qa-core" && (
        <div style={s.card}>
          <h2 style={s.h2}>📋 Core Questions</h2>
          <p style={s.desc}>Answer at least the first question. The more detail, the better.</p>
          {coreQuestions.map((q, i) => (
            <div key={i} style={s.qa}>
              <label style={s.qLabel}>{i + 1}. {q.question}</label>
              <span style={s.hint}>{q.hint}</span>
              <textarea style={s.ans} placeholder="Your answer..." value={coreAnswers[i]} onChange={e => { const n = [...coreAnswers]; n[i] = e.target.value; setCoreAnswers(n); }} rows={2} />
            </div>
          ))}
          <div style={s.btnRow}>
            <button style={s.btnOut} onClick={() => setStage("idea")}>← Back</button>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={s.btnOut} onClick={() => handleCoreSubmit(true)}>Skip & Compose →</button>
              <button style={s.btn} onClick={() => handleCoreSubmit(false)}>Continue →</button>
            </div>
          </div>
        </div>
      )}

      {/* Stage 2b: Follow-up */}
      {stage === "qa-followup" && (
        <div style={s.card}>
          <h2 style={s.h2}>🔍 Follow-up Questions</h2>
          <p style={s.desc}>Based on your answers, here are deeper questions.</p>
          {followUpQs.map((q, i) => (
            <div key={i} style={s.qa}>
              <label style={s.qLabel}>{i + 1}. {q.question}</label>
              <span style={s.hint}>{q.hint}</span>
              <textarea style={s.ans} placeholder="Your answer..." value={followUpAnswers[i]} onChange={e => { const n = [...followUpAnswers]; n[i] = e.target.value; setFollowUpAnswers(n); }} rows={2} />
            </div>
          ))}
          <div style={s.btnRow}>
            <button style={s.btnOut} onClick={() => setStage("qa-core")}>← Back</button>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={s.btnOut} onClick={handleFollowUpSubmit}>Skip & Compose →</button>
              <button style={s.btn} onClick={handleFollowUpSubmit}>🚀 Compose →</button>
            </div>
          </div>
        </div>
      )}

      {/* Stage 3: Composing */}
      {stage === "composing" && (
        <div style={s.card}>
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={s.spinner} />
            <h2 style={s.h2}>⚙️ Ensemble at Work</h2>
            <p style={s.desc}>DeepSeek, Qwen, and GLM composing in parallel. Cross-matrix scoring follows.</p>
            <div style={s.progressDots}>
              {["DeepSeek", "Qwen", "GLM"].map(name => (
                <div key={name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, fontSize: 12, color: "#94a3b8" }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#818cf8", animation: "pulse 1s ease-in-out infinite" }} />
                  <span>{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stage 4: Results */}
      {stage === "result" && result && (
        <div style={s.card}>
          <h2 style={s.h2}>🏆 Results</h2>
          {result.partialFailure && <div style={s.warn}>⚠️ Some LLMs failed — showing partial results</div>}
          {result.mergeResult && <div style={s.mergeBanner}>🔀 Top 2 outputs merged (score gap &lt; 5%)</div>}

          {/* Scoreboard */}
          <div style={s.scoreboard}>
            {result.compositions.map(comp => (
              <ScoreCard key={comp.provider} comp={comp} isSelected={selectedOutput === comp.output} onSelect={() => setSelectedOutput(comp.output)} />
            ))}
          </div>

          {/* Merge Result */}
          {result.mergeResult && (
            <div style={s.section}>
              <div style={s.previewHeader}>
                <h3>🔀 Merged Output (Synthesized)</h3>
                <button style={s.btnSm} onClick={() => navigator.clipboard.writeText(result.mergeResult!.output)}>📋 Copy</button>
              </div>
              <pre style={s.preview}>{result.mergeResult.output}</pre>
            </div>
          )}

          {/* Selected Output */}
          <div style={s.section}>
            <div style={s.previewHeader}>
              <h3>📝 Selected Output</h3>
              <button style={s.btnSm} onClick={() => navigator.clipboard.writeText(selectedOutput)}>📋 Copy</button>
            </div>
            <pre style={s.preview}>{selectedOutput}</pre>
          </div>

          {/* Key Health */}
          <details style={{ marginTop: 20, color: "#64748b", fontSize: 12 }}>
            <summary style={{ cursor: "pointer" }}>🔑 Key Health</summary>
            <pre style={{ background: "#0f172a", padding: 10, borderRadius: 8, marginTop: 8 }}>
              {JSON.stringify(result.keyHealth, null, 2)}
            </pre>
          </details>

          <div style={s.btnRow}>
            <button style={s.btnOut} onClick={reset}>← New Prompt</button>
            <span style={{ fontSize: 13, color: "#64748b" }}>⚡ {result.totalLatency}ms</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ScoreCard Component ───

function ScoreCard({ comp, isSelected, onSelect }: { comp: StagedOutput; isSelected: boolean; onSelect: () => void }) {
  const isWinner = comp.rank === 1;
  return (
    <div
      onClick={comp.output ? onSelect : undefined}
      style={{
        ...s.sc,
        ...(isWinner ? s.scWin : {}),
        ...(isSelected ? s.scSel : {}),
        opacity: comp.error ? 0.5 : 1,
        cursor: comp.output ? "pointer" : "default",
      }}
    >
      <div style={s.scHead}>
        <span style={s.scName}>{isWinner && "👑 "}{comp.provider.toUpperCase()}</span>
        <span style={s.scModel}>{comp.model}</span>
      </div>
      {comp.timedOut && <div style={{ fontSize: 11, color: "#f59e0b" }}>⏱ Timed out</div>}
      {comp.error && !comp.timedOut && <div style={{ fontSize: 11, color: "#fca5a5" }}>❌ {comp.error}</div>}
      {comp.scores && (
        <>
          <div style={s.scGrid}>
            {Object.entries(comp.scores.criteria).map(([k, v]) => (
              <SBadge key={k} label={k.replace(/_/g, " ")} value={v} />
            ))}
          </div>
          <div style={s.totalBadge}>
            {comp.scores.total}/10
            <span style={{ fontSize: 9, fontWeight: 400, color: "#818cf8", display: "block" }}>by {comp.scores.scoredBy}</span>
          </div>
        </>
      )}
      <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>⏱ {comp.latency}ms</div>
    </div>
  );
}

function SBadge({ label, value }: { label: string; value: number }) {
  const color = value >= 8 ? "#22c55e" : value >= 6 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "#1e293b", borderRadius: 6, padding: "4px 8px" }}>
      <span style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: 16, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

// ─── Styles ───
const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: 900, margin: "0 auto", padding: "24px 16px", fontFamily: "'Inter', system-ui, sans-serif", background: "#0f172a", minHeight: "100vh", color: "#e2e8f0" },
  header: { textAlign: "center", marginBottom: 32, padding: "24px 0", borderBottom: "1px solid #1e293b" },
  title: { fontSize: 36, fontWeight: 800, margin: 0, background: "linear-gradient(135deg, #818cf8, #c084fc, #38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  sub: { fontSize: 13, color: "#64748b", display: "block", marginTop: 4 },
  card: { background: "#1e293b", borderRadius: 16, padding: 32, border: "1px solid #334155" },
  h2: { fontSize: 22, fontWeight: 700, margin: "0 0 8px", color: "#f1f5f9" },
  desc: { fontSize: 14, color: "#94a3b8", margin: "0 0 20px", lineHeight: 1.6 },
  ta: { width: "100%", padding: 14, borderRadius: 10, border: "1px solid #475569", background: "#0f172a", color: "#e2e8f0", fontSize: 14, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" },
  row: { display: "flex", gap: 12, marginTop: 16, alignItems: "center" },
  sel: { padding: "10px 14px", borderRadius: 10, border: "1px solid #475569", background: "#0f172a", color: "#e2e8f0", fontSize: 14, fontFamily: "inherit" },
  btn: { padding: "12px 24px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  btnOut: { padding: "12px 20px", background: "transparent", color: "#94a3b8", border: "1px solid #475569", borderRadius: 10, fontSize: 14, cursor: "pointer", fontFamily: "inherit" },
  btnSm: { padding: "6px 14px", background: "#334155", color: "#e2e8f0", border: "1px solid #475569", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
  btnRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 },
  error: { background: "#7f1d1d", color: "#fca5a5", padding: "12px 16px", borderRadius: 10, marginBottom: 16, fontSize: 14 },
  warn: { background: "#422006", color: "#fbbf24", padding: "10px 14px", borderRadius: 8, marginBottom: 12, fontSize: 13 },
  mergeBanner: { background: "#1e3a5f", color: "#93c5fd", padding: "10px 14px", borderRadius: 8, marginBottom: 12, fontSize: 13 },
  qa: { display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 },
  qLabel: { fontSize: 13, fontWeight: 600, color: "#c4b5fd", lineHeight: 1.4 },
  hint: { fontSize: 11, color: "#64748b", fontStyle: "italic" },
  ans: { padding: 10, borderRadius: 8, border: "1px solid #475569", background: "#0f172a", color: "#e2e8f0", fontSize: 13, fontFamily: "inherit", resize: "vertical", marginTop: 4 },
  spinner: { width: 48, height: 48, border: "4px solid #334155", borderTopColor: "#818cf8", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 20px" },
  progressDots: { display: "flex", justifyContent: "center", gap: 24, marginTop: 20 },
  scoreboard: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 },
  sc: { background: "#0f172a", borderRadius: 12, padding: 16, border: "1px solid #334155", transition: "border-color 0.2s" },
  scWin: { borderColor: "#818cf8", boxShadow: "0 0 20px rgba(99, 102, 241, 0.15)" },
  scSel: { borderColor: "#38bdf8" },
  scHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  scName: { fontWeight: 700, fontSize: 14, color: "#e2e8f0" },
  scModel: { fontSize: 11, color: "#64748b" },
  scGrid: { display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 },
  totalBadge: { display: "flex", flexDirection: "column", alignItems: "center", background: "#312e81", borderRadius: 6, padding: "4px 10px", fontSize: 14, fontWeight: 700, color: "#c7d2fe", textAlign: "center" as any },
  section: { marginTop: 20 },
  previewHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  preview: { background: "#0f172a", borderRadius: 12, padding: 20, border: "1px solid #334155", fontSize: 13, lineHeight: 1.7, color: "#e2e8f0", whiteSpace: "pre-wrap", maxHeight: "50vh", overflowY: "auto", fontFamily: "'JetBrains Mono', monospace" },
};

// Inject keyframes
const sty = document.createElement("style");
sty.textContent = `@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%,100% { opacity:1;transform:scale(1); } 50% { opacity:0.4;transform:scale(0.8); } }`;
document.head.appendChild(sty);
