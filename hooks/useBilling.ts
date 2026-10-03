"use client";

import { useCallback, useEffect, useState } from "react";

import type { EffectiveLimits, UsageSnapshot } from "@/lib/billing/types";
import type { PlanId, PlanLimits } from "@/lib/plans";
import { APP_NAME } from "@/lib/brand";

export interface BillingCatalogItem {
  id: PlanId;
  name: string;
  description: string;
  priceInrMonthly: number | null;
  priceInrAnnual: number | null;
  popular: boolean;
  selfServe: boolean;
  limits: PlanLimits;
}

export interface BillingSnapshot {
  plan: EffectiveLimits;
  usage: UsageSnapshot;
  contacts: { used: number; max: number; remaining: number };
  catalog: BillingCatalogItem[];
}

export function useBilling() {
  const [data, setData] = useState<BillingSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/plan");
      if (!res.ok) {
        throw new Error("Failed to load plan");
      }
      const json = (await res.json()) as BillingSnapshot;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load billing");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    data,
    loading,
    error,
    refresh,
    plan: data?.plan ?? null,
    isPremiumAnalytics: Boolean(data?.plan.features.advancedAnalytics),
  };
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, cb: (response: unknown) => void) => void;
    };
  }
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(script);
  });
}

export async function startCheckout(planId: PlanId, interval: "monthly" | "annual"): Promise<void> {
  const res = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId, interval }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || "Checkout failed");
  }

  await loadRazorpayScript();
  if (!window.Razorpay) {
    throw new Error("Razorpay unavailable");
  }

  const rzp = new window.Razorpay({
    key: data.razorpayKeyId,
    subscription_id: data.subscriptionId,
    name: APP_NAME,
    description: `${data.planName} plan`,
    prefill: data.prefill,
    theme: { color: "#4f46e5" },
    handler: () => {
      window.location.href = "/settings/billing?upgraded=1";
    },
  });

  rzp.open();
}
