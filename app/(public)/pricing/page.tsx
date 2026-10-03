"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Check, Minus, Sparkles, Zap } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { startCheckout } from "@/hooks/useBilling";
import {
  formatInr,
  PLAN_ORDER,
  PLANS,
  type BillingInterval,
  type PlanFeature,
  type PlanId,
} from "@/lib/plans";

const LIMIT_ROWS: Array<{
  label: string;
  value: (id: PlanId) => string;
}> = [
  {
    label: "Emails / day",
    value: (id) => (id === "enterprise" ? "Custom" : String(PLANS[id].limits.emailsPerDay)),
  },
  {
    label: "Emails / month",
    value: (id) =>
      id === "enterprise" ? "Custom" : PLANS[id].limits.emailsPerMonth.toLocaleString("en-IN"),
  },
  {
    label: "Contacts",
    value: (id) =>
      id === "enterprise" ? "Custom" : PLANS[id].limits.contacts.toLocaleString("en-IN"),
  },
];

const FEATURE_ROWS: Array<{ label: string; key: PlanFeature }> = [
  { label: "Basic analytics", key: "advancedAnalytics" }, // free has basic; special-cased below
  { label: "Advanced analytics", key: "advancedAnalytics" },
  { label: "Report export", key: "exportReports" },
  { label: "A/B testing", key: "abTesting" },
  { label: "Webhooks", key: "webhooks" },
  { label: "Teams", key: "teams" },
];

function CellYes() {
  return <Check className="mx-auto h-4 w-4 text-emerald-500" aria-label="Included" />;
}

function CellNo() {
  return <Minus className="mx-auto h-4 w-4 text-muted-foreground/40" aria-label="Not included" />;
}

export default function PricingPage() {
  const { status } = useSession();
  const router = useRouter();
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);

  const onSelect = async (planId: PlanId) => {
    if (planId === "free") {
      router.push(status === "authenticated" ? "/dashboard" : "/");
      return;
    }
    if (planId === "enterprise") {
      router.push("/enterprise");
      return;
    }
    if (status !== "authenticated") {
      toast.message("Sign in with Google to upgrade");
      router.push("/");
      return;
    }

    setLoadingPlan(planId);
    try {
      await startCheckout(planId, interval);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setLoadingPlan(null);
    }
  };

  const featureIncluded = (planId: PlanId, key: PlanFeature, label: string) => {
    if (label === "Basic analytics") {
      return true;
    }
    return PLANS[planId].limits.features[key];
  };

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary/5 to-transparent"
      />

      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            Pricing
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
            Simple plans for every sender
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg">
            Free forever to start. Unlock analytics on Insights. Full product on Pro — 500
            emails/day, Gmail&apos;s free-account ceiling. Enterprise is custom.
          </p>

          <div
            className="mt-8 inline-flex items-center rounded-full border bg-muted/50 p-1"
            role="group"
            aria-label="Billing interval"
          >
            <Button
              size="sm"
              variant={interval === "monthly" ? "default" : "ghost"}
              className="rounded-full px-4"
              onClick={() => setInterval("monthly")}
            >
              Monthly
            </Button>
            <Button
              size="sm"
              variant={interval === "annual" ? "default" : "ghost"}
              className="rounded-full px-4"
              onClick={() => setInterval("annual")}
            >
              Annual
              <Badge
                variant="secondary"
                className="ml-2 h-5 border-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold"
              >
                2 mo free
              </Badge>
            </Button>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4 items-stretch">
          {PLAN_ORDER.map((id) => {
            const plan = PLANS[id];
            const price = interval === "annual" ? plan.priceInrAnnual : plan.priceInrMonthly;
            const monthlyEquiv =
              interval === "annual" && plan.priceInrAnnual != null && plan.priceInrAnnual > 0
                ? Math.round(plan.priceInrAnnual / 12)
                : null;
            const isPopular = Boolean(plan.popular);

            return (
              <Card
                key={id}
                className={`relative flex flex-col transition-shadow ${
                  isPopular
                    ? "border-primary shadow-lg shadow-primary/10 ring-1 ring-primary/20 xl:scale-[1.02]"
                    : "hover:border-primary/30"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="gap-1 shadow-sm">
                      <Sparkles className="h-3 w-3" /> Most popular
                    </Badge>
                  </div>
                )}
                <CardHeader className={isPopular ? "pt-8" : undefined}>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {plan.name}
                    {id === "pro" && <Zap className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                  </CardTitle>
                  <CardDescription className="min-h-[2.5rem]">{plan.description}</CardDescription>
                  <div className="pt-4">
                    {price === null ? (
                      <div className="text-3xl font-bold tracking-tight">Custom</div>
                    ) : price === 0 ? (
                      <div className="text-3xl font-bold tracking-tight">Free</div>
                    ) : (
                      <div>
                        <span className="text-3xl font-bold tracking-tight tabular-nums">
                          {formatInr(price)}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          /{interval === "annual" ? "year" : "month"}
                        </span>
                        {monthlyEquiv != null && (
                          <div className="text-xs text-muted-foreground mt-1">
                            ≈ {formatInr(monthlyEquiv)}/mo billed annually
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>
                      {id === "enterprise"
                        ? "Custom send volume"
                        : `${plan.limits.emailsPerDay} emails / day`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>
                      {id === "enterprise"
                        ? "Custom contact cap"
                        : `${plan.limits.contacts.toLocaleString("en-IN")} contacts`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    Basic analytics
                  </div>
                  {FEATURE_ROWS.filter(
                    (r) => r.label !== "Basic analytics" && plan.limits.features[r.key],
                  ).map((r) => (
                    <div key={r.label} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      {r.label}
                    </div>
                  ))}
                  {id === "enterprise" && (
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      SSO, invoice, SLA
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={isPopular ? "default" : "outline"}
                    disabled={loadingPlan === id}
                    onClick={() => void onSelect(id)}
                  >
                    {loadingPlan === id
                      ? "Opening…"
                      : id === "free"
                        ? "Get started"
                        : id === "enterprise"
                          ? "Contact sales"
                          : `Upgrade to ${plan.name}`}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Comparison table */}
        <div className="mt-16 overflow-hidden rounded-2xl border bg-card">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold tracking-tight">Full comparison</h2>
            <p className="text-sm text-muted-foreground">
              Server-enforced limits. UI gates are UX only.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Feature</th>
                  {PLAN_ORDER.map((id) => (
                    <th
                      key={id}
                      className={`px-4 py-3 text-center font-semibold ${
                        PLANS[id].popular ? "text-primary" : ""
                      }`}
                    >
                      {PLANS[id].name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {LIMIT_ROWS.map((row) => (
                  <tr key={row.label} className="border-b last:border-0">
                    <td className="px-6 py-3 text-muted-foreground">{row.label}</td>
                    {PLAN_ORDER.map((id) => (
                      <td key={id} className="px-4 py-3 text-center tabular-nums font-medium">
                        {row.value(id)}
                      </td>
                    ))}
                  </tr>
                ))}
                {FEATURE_ROWS.map((row) => (
                  <tr key={row.label} className="border-b last:border-0">
                    <td className="px-6 py-3 text-muted-foreground">{row.label}</td>
                    {PLAN_ORDER.map((id) => (
                      <td key={id} className="px-4 py-3 text-center">
                        {featureIncluded(id, row.key, row.label) ? <CellYes /> : <CellNo />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-10 text-center space-y-3">
          <p className="text-xs text-muted-foreground">
            Payments via Razorpay (UPI, cards, netbanking). Annual ≈ 2 months free. Cancel anytime —
            paid until period end, then Free.
          </p>
          <p className="text-sm text-muted-foreground">
            Need SSO, invoices, or custom caps?{" "}
            <Link
              href="/enterprise"
              className="font-medium text-foreground underline underline-offset-2"
            >
              Talk to Enterprise
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
