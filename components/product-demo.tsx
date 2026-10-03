"use client";

import { useState, useEffect, useRef } from "react";

import { Upload, Mail, Eye, Send, FileSpreadsheet, CheckCircle, Play, Pause } from "lucide-react";

/* ─── types ───────────────────────────────────────────────────── */
type StepId = "upload" | "compose" | "preview" | "send";

interface Step {
  id: StepId;
  label: string;
  icon: React.ElementType;
  dotColor: string;
}

const STEPS: Step[] = [
  { id: "upload", label: "Upload CSV", icon: Upload, dotColor: "#3b82f6" },
  { id: "compose", label: "Compose", icon: Mail, dotColor: "#8b5cf6" },
  { id: "preview", label: "Preview", icon: Eye, dotColor: "#10b981" },
  { id: "send", label: "Send", icon: Send, dotColor: "#f97316" },
];

const CONTACTS = [
  { name: "Sarah Chen", email: "sarah@acme.com", company: "Acme Inc" },
  { name: "John Miller", email: "john@startup.io", company: "Startup.io" },
  { name: "Anna Park", email: "anna@design.co", company: "Design Co" },
];

/* ─── useTypewriter ──────────────────────────────────────────── */
function useTypewriter(text: string, trigger: boolean, speed = 22) {
  const [out, setOut] = useState("");
  const iv = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!trigger) {
      setOut("");
      return;
    }
    setOut("");
    let i = 0;
    iv.current = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length && iv.current) {
        clearInterval(iv.current);
      }
    }, speed);
    return () => {
      if (iv.current) {
        clearInterval(iv.current);
      }
    };
  }, [text, trigger, speed]);
  return out;
}

/* ─── Panel: Upload ──────────────────────────────────────────── */
function UploadPanel({ active }: { active: boolean }) {
  const [visible, setVisible] = useState(0);
  useEffect(() => {
    if (!active) {
      setVisible(0);
      return;
    }
    const ts = CONTACTS.map((_, i) => setTimeout(() => setVisible(i + 1), 280 + i * 340));
    return () => ts.forEach(clearTimeout);
  }, [active]);

  return (
    <div className="rounded-lg border overflow-hidden text-xs">
      <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/50 border-b">
        <FileSpreadsheet className="h-3.5 w-3.5 text-blue-500" />
        <span className="font-medium">recipients.csv</span>
        <span className="ml-auto text-muted-foreground">
          {visible}/{CONTACTS.length} rows
        </span>
      </div>
      <table className="w-full">
        <thead className="bg-muted/30">
          <tr>
            {["Name", "Email", "Company"].map((h) => (
              <th key={h} className="text-left px-3 py-1.5 font-medium text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CONTACTS.map((r, i) => (
            <tr
              key={i}
              className={`border-t transition-all duration-500 ${i < visible ? "opacity-100" : "opacity-0 translate-y-1"}`}
            >
              <td className="px-3 py-2 font-medium">{r.name}</td>
              <td className="px-3 py-2 text-muted-foreground">{r.email}</td>
              <td className="px-3 py-2 text-muted-foreground">{r.company}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Panel: Compose ─────────────────────────────────────────── */
const SUBJECT = "Hey {{name}}, explore a partnership 🤝";
const BODY =
  "Hi {{name}},\n\nI love what {{company}} is building.\nWould love to connect!\n\nBest,\nAlex";

function ComposePanel({ active }: { active: boolean }) {
  const subject = useTypewriter(SUBJECT, active, 30);
  const body = useTypewriter(BODY, active && subject.length > 10, 20);
  const cursor = (
    <span className="inline-block w-0.5 h-3 bg-current align-middle animate-pulse ml-0.5" />
  );

  return (
    <div className="rounded-lg border overflow-hidden text-xs">
      <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/50 border-b">
        <Mail className="h-3.5 w-3.5 text-violet-500" />
        <span className="font-medium">New Campaign</span>
        <div className="ml-auto flex gap-1">
          {["#f87171", "#fbbf24", "#34d399"].map((c) => (
            <span key={c} className="h-2 w-2 rounded-full inline-block" style={{ background: c }} />
          ))}
        </div>
      </div>
      <div className="p-3 space-y-2">
        <div className="flex gap-2 border-b pb-2">
          <span className="text-muted-foreground w-12 shrink-0">Subject:</span>
          <span className="font-medium text-violet-600 dark:text-violet-400 break-all">
            {subject}
            {active && subject.length < SUBJECT.length ? cursor : null}
          </span>
        </div>
        <pre className="whitespace-pre-wrap font-sans leading-relaxed text-foreground/90 min-h-[80px]">
          {body.split("{{").map((part, i) => {
            if (i === 0) {
              return part;
            }
            const [tag, rest] = part.split("}}");
            return (
              <span key={i}>
                <span className="text-violet-500 font-medium">
                  {"{{"}
                  {tag}
                  {"}}"}
                </span>
                {rest}
              </span>
            );
          })}
          {active && body.length < BODY.length ? cursor : null}
        </pre>
      </div>
    </div>
  );
}

/* ─── Panel: Preview ─────────────────────────────────────────── */
function PreviewPanel({ active }: { active: boolean }) {
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(false);
  useEffect(() => {
    if (!active) {
      setIdx(0);
      return;
    }
    let innerT: NodeJS.Timeout;
    const t = setInterval(() => {
      setFade(true);
      innerT = setTimeout(() => {
        setIdx((i) => (i + 1) % CONTACTS.length);
        setFade(false);
      }, 280);
    }, 1600);
    return () => {
      clearInterval(t);
      if (innerT) {
        clearTimeout(innerT);
      }
    };
  }, [active]);

  const c = CONTACTS[idx];
  return (
    <div
      className={`rounded-lg border overflow-hidden text-xs transition-opacity duration-300 ${fade ? "opacity-0" : "opacity-100"}`}
    >
      <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/50 border-b">
        <Eye className="h-3.5 w-3.5 text-emerald-500" />
        <span className="font-medium">Preview</span>
        <span className="ml-auto text-muted-foreground">
          {idx + 1}/{CONTACTS.length}
        </span>
      </div>
      <div className="p-3 space-y-1.5">
        <div className="flex gap-2">
          <span className="text-muted-foreground w-8 shrink-0">To:</span>
          <span className="font-medium">{c.name}</span>
          <span className="text-muted-foreground">&lt;{c.email}&gt;</span>
        </div>
        <div className="flex gap-2 border-b pb-1.5">
          <span className="text-muted-foreground w-8 shrink-0">Sub:</span>
          <span className="font-medium">Hey {c.name}, explore a partnership 🤝</span>
        </div>
        <pre className="whitespace-pre-wrap font-sans leading-relaxed text-foreground/90 pt-1">
          {`Hi ${c.name},\n\nI love what ${c.company} is building.\nWould love to connect!\n\nBest, Alex`}
        </pre>
      </div>
    </div>
  );
}

/* ─── Panel: Send ────────────────────────────────────────────── */
function SendPanel({ active }: { active: boolean }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    if (!active) {
      setPct(0);
      return;
    }
    let p = 0;
    const t = setInterval(() => {
      p += 2;
      if (p > 100) {
        p = 100;
        clearInterval(t);
      }
      setPct(p);
    }, 50);
    return () => clearInterval(t);
  }, [active]);

  const done = Math.round((pct / 100) * CONTACTS.length);

  return (
    <div className="rounded-lg border overflow-hidden text-xs">
      <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/50 border-b">
        <Send className="h-3.5 w-3.5 text-orange-500" />
        <span className="font-medium">Sending Campaign</span>
        {pct === 100 && <span className="ml-auto text-emerald-600 font-medium">✓ Complete</span>}
      </div>
      <div className="p-3 space-y-3">
        <div className="text-center py-1">
          <span className="text-3xl font-bold tabular-nums">{done}</span>
          <span className="text-muted-foreground ml-1">/ {CONTACTS.length} sent</span>
        </div>
        <div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 rounded-full transition-all duration-75"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-muted-foreground mt-1">
            <span>Progress</span>
            <span>{pct}%</span>
          </div>
        </div>
        <div className="space-y-1.5">
          {CONTACTS.slice(0, done).map((c, i) => (
            <div key={i} className="flex items-center gap-2 animate-in fade-in duration-300">
              <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />
              <span className="text-muted-foreground truncate flex-1">{c.email}</span>
              <span className="text-emerald-600 font-medium">Sent</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main export ────────────────────────────────────────────── */
export function ProductDemo() {
  const [active, setActive] = useState<StepId>("upload");
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) {
      return;
    }
    const t = setInterval(() => {
      setActive((cur) => STEPS[(STEPS.findIndex((s) => s.id === cur) + 1) % STEPS.length].id);
    }, 4000);
    return () => clearInterval(t);
  }, [playing]);

  function go(id: StepId) {
    setActive(id);
    setPlaying(false);
  }

  return (
    <div className="w-full select-none">
      {/* browser chrome */}
      <div className="rounded-xl border bg-card shadow-xl overflow-hidden">
        {/* title bar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-muted/60 border-b">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-yellow-400" />
            <span className="h-3 w-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 mx-3" />
          <button
            onClick={() => setPlaying((p) => !p)}
            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle autoplay"
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* step tabs */}
        <div className="flex border-b bg-muted/30">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = s.id === active;
            return (
              <button
                key={s.id}
                onClick={() => go(s.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-all duration-200 border-b-2 ${
                  isActive
                    ? "border-primary text-foreground bg-background/60"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-background/40"
                }`}
              >
                <Icon className="h-4 w-4" style={isActive ? { color: s.dotColor } : {}} />
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden text-[10px]">{i + 1}</span>
              </button>
            );
          })}
        </div>

        {/* panel */}
        <div className="p-4 min-h-[220px]">
          {active === "upload" && <UploadPanel active={active === "upload"} />}
          {active === "compose" && <ComposePanel active={active === "compose"} />}
          {active === "preview" && <PreviewPanel active={active === "preview"} />}
          {active === "send" && <SendPanel active={active === "send"} />}
        </div>

        {/* progress bar */}
        {playing && (
          <div className="h-0.5 bg-muted">
            <div
              key={active}
              className="h-full bg-primary"
              style={{ animation: "demo-progress 4s linear forwards" }}
            />
          </div>
        )}
      </div>

      {/* dot indicators */}
      <div className="flex items-center justify-center gap-1.5 mt-3">
        {STEPS.map((s) => (
          <button
            key={s.id}
            onClick={() => go(s.id)}
            aria-label={`Go to step: ${s.label}`}
            className={`rounded-full transition-all duration-300 ${
              s.id === active ? "w-5 h-1.5" : "w-1.5 h-1.5 bg-muted-foreground/30"
            }`}
            style={s.id === active ? { background: s.dotColor } : {}}
          />
        ))}
      </div>

      <style>{`@keyframes demo-progress { from { width:0 } to { width:100% } }`}</style>
    </div>
  );
}
