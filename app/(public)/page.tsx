"use client";

import { useEffect, useRef } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Users,
  Send,
  Sparkles,
  Zap,
  Shield,
  BarChart3,
  CheckCircle,
  ArrowRight,
  Lock,
  FileSpreadsheet,
} from "lucide-react";
import { useSession } from "next-auth/react";

import { AuthButton } from "@/components/auth-button";
import { ProductDemo } from "@/components/product-demo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/* ─── data ───────────────────────────────────────────────── */
const features = [
  {
    icon: FileSpreadsheet,
    title: "CSV Personalization",
    description:
      "Upload any CSV and auto-map columns to template variables. Unlimited custom fields, zero config.",
    accent: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Sparkles,
    title: "Rich Text Editor",
    description:
      "WYSIWYG editor with real-time personalization preview. Format, link, and embed images effortlessly.",
    accent: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    icon: Send,
    title: "Gmail Integration",
    description:
      "Send directly via your Gmail account through Google's official API. Protect your sender reputation.",
    accent: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    icon: Zap,
    title: "Bulk Sending",
    description:
      "Send thousands of personalised emails in one click with live progress tracking built in.",
    accent: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description:
      "OAuth 2.0 authentication. Your data never leaves your account. Fully GDPR-compliant.",
    accent: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: BarChart3,
    title: "Real-time Analytics",
    description:
      "Track delivery, opens, and clicks live. Export detailed campaign reports anytime.",
    accent: "text-pink-500",
    bg: "bg-pink-500/10",
  },
];

const steps = [
  {
    step: "01",
    icon: Lock,
    title: "Connect Gmail",
    description: "Sign in with Google — your account connects securely via OAuth in seconds.",
  },
  {
    step: "02",
    icon: Users,
    title: "Upload Recipients",
    description:
      "Drag & drop your CSV. Column names become personalisation variables automatically.",
  },
  {
    step: "03",
    icon: Send,
    title: "Send & Track",
    description: "Compose, preview every email, then send. Watch delivery happen in real-time.",
  },
];

/* ─── scroll reveal ──────────────────────────────────────── */
function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          timeoutRef.current = setTimeout(() => el.classList.add("is-visible"), delay);
          obs.disconnect();
        }
      },
      { threshold: 0.08 },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [delay]);

  return (
    <div ref={ref} className={`reveal-block ${className}`}>
      {children}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────── */
export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session && !session.error) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-9 w-9 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* ── reveal animation styles ──────────────────────── */}
      <style>{`
        .reveal-block { opacity: 0; transform: translateY(24px); transition: opacity 0.6s ease, transform 0.6s ease; }
        .reveal-block.is-visible { opacity: 1; transform: translateY(0); }
      `}</style>

      <div className="min-h-screen">
        {/* ══ HERO — split layout ══════════════════════════ */}
        <section className="relative overflow-hidden">
          {/* mesh glow */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-primary/5" />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* left: text */}
              <div className="space-y-7">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08] text-balance">
                  Send your <span className="text-primary">Flier</span>{" "}
                  <br className="hidden sm:block" />
                  to the whole list
                </h1>

                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-md">
                  Upload your contacts, write with{" "}
                  <code className="text-[13px] font-mono bg-muted/80 px-1.5 py-0.5 rounded text-foreground border">
                    {"{{variables}}"}
                  </code>
                  , and reach your audience through Gmail — in three clicks.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 sm:[&>*]:flex-1">
                  <AuthButton size="lg" className="w-full" />
                  <Button variant="outline" size="lg" asChild>
                    <Link
                      href="#features"
                      className="w-full flex items-center justify-center gap-2"
                    >
                      Explore features <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground pt-1">
                  {[
                    "No credit card required",
                    "Free to start",
                    "GDPR compliant",
                    "Open source",
                  ].map((t) => (
                    <div key={t} className="flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      {t}
                    </div>
                  ))}
                </div>
              </div>

              {/* right: live demo */}
              <div className="relative">
                {/* glow behind demo */}
                <div
                  aria-hidden
                  className="absolute -inset-6 -z-10 rounded-3xl blur-3xl opacity-15 bg-primary"
                />
                <ProductDemo />
              </div>
            </div>
          </div>
        </section>

        {/* ══ FEATURES ════════════════════════════════════ */}
        <section id="features" className="py-20 lg:py-28 border-t bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal className="text-center mb-14">
              <Badge variant="outline" className="mb-4">
                Features
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Everything you need to succeed
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Powerful tools designed to make your email campaigns more effective and efficient.
              </p>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((f, i) => {
                const Icon = f.icon;
                return (
                  <Reveal key={i} delay={i * 60}>
                    <div className="h-full rounded-xl border bg-card p-6 hover:border-primary/40 hover:shadow-md transition-all duration-200">
                      <div className={`inline-flex p-2.5 rounded-lg ${f.bg} mb-4`}>
                        <Icon className={`h-5 w-5 ${f.accent}`} />
                      </div>
                      <h3 className="text-base font-semibold mb-2">{f.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {f.description}
                      </p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ══ HOW IT WORKS ════════════════════════════════ */}
        <section id="how-it-works" className="py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal className="text-center mb-14">
              <Badge variant="outline" className="mb-4">
                How It Works
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Start sending in minutes</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Three simple steps — no technical knowledge required.
              </p>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {steps.map((item, i) => {
                const Icon = item.icon;
                return (
                  <Reveal key={i} delay={i * 80}>
                    <div className="relative flex flex-col gap-4">
                      {i < steps.length - 1 && (
                        <div className="hidden md:block absolute top-5 left-[calc(50%+3rem)] right-[-3rem] h-px border-t border-dashed border-border/60" />
                      )}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-10 w-10 rounded-full border-2 border-primary/40 bg-primary/10 shrink-0">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-4xl font-black text-muted/20 tabular-nums leading-none">
                          {item.step}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-1.5">{item.title}</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ══ CTA ═════════════════════════════════════════ */}
        <section className="py-20 lg:py-28 border-t bg-muted/20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <div className="relative rounded-2xl border bg-card overflow-hidden text-center p-10 md:p-16">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -z-10 bg-primary/5"
                />

                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-6">
                  <Send className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  Ready to reach your audience?
                </h2>
                <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                  Sign in with Google and send your first personalised campaign in under five
                  minutes.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:[&>*]:flex-1">
                  <AuthButton size="lg" className="w-full" />
                  <Button variant="outline" size="lg" asChild>
                    <Link
                      href="#features"
                      className="w-full flex items-center justify-center gap-2"
                    >
                      Explore features <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-5 text-sm text-muted-foreground">
                  {["No credit card", "Free forever tier", "Open source"].map((t) => (
                    <div key={t} className="flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </div>
    </>
  );
}
