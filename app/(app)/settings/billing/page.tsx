"use client";

import { Suspense, useEffect, useState } from "react";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { CreditCard, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { Progress } from "@/components/ui/progress";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { startCheckout, useBilling } from "@/hooks/useBilling";
import { formatInr, type BillingInterval, type PlanId } from "@/lib/plans";

function BillingLoading() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function BillingSettingsInner() {
  const { isLoading: authLoading } = useAuthGuard();
  const { data, loading, refresh, plan } = useBilling();
  const searchParams = useSearchParams();
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (searchParams.get("upgraded") === "1") {
      toast.success("Payment received — plan updates within a minute.");
      void refresh();
    }
  }, [searchParams, refresh]);

  if (authLoading || loading) {
    return <BillingLoading />;
  }

  const usage = data?.usage;
  const contacts = data?.contacts;
  const dailyPct = plan && usage ? Math.min(100, (usage.emailsToday / plan.emailsPerDay) * 100) : 0;
  const monthPct =
    plan && usage ? Math.min(100, (usage.emailsThisMonth / plan.emailsPerMonth) * 100) : 0;
  const contactPct =
    contacts && contacts.max > 0 ? Math.min(100, (contacts.used / contacts.max) * 100) : 0;

  const upgrade = async (planId: PlanId) => {
    setBusy(true);
    try {
      await startCheckout(planId, interval);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || json.error || "Cancel failed");
      }
      toast.success(json.message || "Cancelled at period end");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell className="max-w-3xl">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            Billing
          </div>
        }
        description="Plan, usage, and payment"
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 flex-wrap">
              Current plan
              <Badge variant="secondary">{plan?.planName ?? "Free"}</Badge>
              {plan?.interval && plan.planId !== "free" && (
                <Badge variant="outline" className="capitalize">
                  {plan.interval}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Status: {plan?.status === "none" ? "active" : plan?.status}
              {plan?.cancelAtPeriodEnd && plan.currentPeriodEnd
                ? ` · cancels ${new Date(plan.currentPeriodEnd).toLocaleDateString()}`
                : plan?.currentPeriodEnd
                  ? ` · renews ${new Date(plan.currentPeriodEnd).toLocaleDateString()}`
                  : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Emails today</span>
                <span className="tabular-nums">
                  {usage?.emailsToday ?? 0} / {plan?.emailsPerDay ?? 100}
                </span>
              </div>
              <Progress value={dailyPct} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Emails this month</span>
                <span className="tabular-nums">
                  {usage?.emailsThisMonth ?? 0} / {plan?.emailsPerMonth ?? 2000}
                </span>
              </div>
              <Progress value={monthPct} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Contacts</span>
                <span className="tabular-nums">
                  {contacts?.used ?? 0} / {contacts?.max ?? 1000}
                </span>
              </div>
              <Progress value={contactPct} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change plan</CardTitle>
            <CardDescription>
              Payments via Razorpay (UPI, cards, netbanking).{" "}
              <Link href="/pricing" className="underline underline-offset-2">
                Full comparison
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="inline-flex rounded-full border p-1 bg-muted/40">
              <Button
                size="sm"
                className="rounded-full"
                variant={interval === "monthly" ? "default" : "ghost"}
                onClick={() => setInterval("monthly")}
              >
                Monthly
              </Button>
              <Button
                size="sm"
                className="rounded-full"
                variant={interval === "annual" ? "default" : "ghost"}
                onClick={() => setInterval("annual")}
              >
                Annual
                <span className="ml-1.5 text-[10px] opacity-80">2 mo free</span>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {data?.catalog
                .filter((p) => p.selfServe && p.id !== "free")
                .map((p) => {
                  const price = interval === "annual" ? p.priceInrAnnual : p.priceInrMonthly;
                  const current = plan?.planId === p.id;
                  return (
                    <div
                      key={p.id}
                      className={`rounded-xl border p-4 flex flex-col gap-2 ${
                        p.popular ? "border-primary/50 bg-primary/5" : ""
                      }`}
                    >
                      <div className="font-semibold flex items-center gap-2">
                        {p.name}
                        {p.popular && (
                          <Zap className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {price != null ? formatInr(price) : "Custom"}/
                        {interval === "annual" ? "yr" : "mo"} · {p.limits.emailsPerDay}/day
                      </div>
                      <Button
                        size="sm"
                        disabled={busy || current}
                        onClick={() => void upgrade(p.id)}
                      >
                        {current ? "Current plan" : `Upgrade to ${p.name}`}
                      </Button>
                    </div>
                  );
                })}
            </div>

            <Button variant="outline" asChild>
              <Link href="/enterprise">Talk to Enterprise</Link>
            </Button>

            {plan && plan.planId !== "free" && plan.status === "active" && (
              <Button
                variant="ghost"
                className="text-destructive"
                disabled={busy || plan.cancelAtPeriodEnd}
                onClick={() => void cancel()}
              >
                {plan.cancelAtPeriodEnd ? "Cancellation scheduled" : "Cancel at period end"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

export default function BillingSettingsPage() {
  return (
    <Suspense fallback={<BillingLoading />}>
      <BillingSettingsInner />
    </Suspense>
  );
}
