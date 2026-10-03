import Link from "next/link";

import { Lock, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";

interface PremiumGateProps {
  children: React.ReactNode;
  featureName: string;
  isPremium: boolean;
  onUpgrade?: () => void;
  /** Default: Insights (analytics tier) */
  ctaLabel?: string;
  href?: string;
}

export function PremiumGate({
  children,
  featureName,
  isPremium,
  onUpgrade,
  ctaLabel = "Upgrade to Insights",
  href = "/pricing",
}: PremiumGateProps) {
  if (isPremium) {
    return children;
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/40 w-full h-full min-h-[350px]">
      <div className="blur-sm select-none pointer-events-none opacity-20 w-full h-full">
        {children}
      </div>
      <div className="absolute inset-0 bg-background/55 backdrop-blur-[6px] flex flex-col items-center justify-center text-center p-8 z-10">
        <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center relative mb-4 shadow-sm border border-primary/20">
          <Lock className="h-5 w-5 text-primary" />
          <div className="absolute -top-0.5 -right-0.5 bg-yellow-400 rounded-full p-0.5 shadow-md">
            <Zap className="h-3 w-3 text-yellow-950 fill-yellow-950" />
          </div>
        </div>
        <h3 className="text-base font-bold tracking-tight text-foreground mb-1">
          Unlock {featureName}
        </h3>
        <p className="text-xs text-muted-foreground max-w-xs mb-5">
          Advanced tracking and export are on Insights (₹299/mo) and above. Same send volume as Free
          — just the data.
        </p>
        {onUpgrade ? (
          <Button
            size="sm"
            onClick={onUpgrade}
            className="shadow-lg shadow-primary/25 hover:shadow-primary/35"
          >
            <Zap className="h-3.5 w-3.5 mr-2 text-yellow-300 fill-yellow-300" />
            {ctaLabel}
          </Button>
        ) : (
          <Button size="sm" asChild className="shadow-lg shadow-primary/25 hover:shadow-primary/35">
            <Link href={href}>
              <Zap className="h-3.5 w-3.5 mr-2 text-yellow-300 fill-yellow-300" />
              {ctaLabel}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
