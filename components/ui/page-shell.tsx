import React from "react";

import Link from "next/link";

import { ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";

/* ─────────────────────────────────────────────────────────── *
 *  PageShell — outermost constraint for every protected page  *
 * ─────────────────────────────────────────────────────────── */
export function PageShell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8 ${className}`}>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── *
 *  PageHeader — consistent title / description / actions row  *
 * ─────────────────────────────────────────────────────────── */
interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Parent page link shown above the title, e.g. settings sub-pages. */
  back?: { href: string; label: string };
  className?: string;
}
export function PageHeader({ title, description, actions, back, className = "" }: PageHeaderProps) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}>
      <div className="space-y-1 min-w-0">
        {back && (
          <Link
            href={back.href}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && <div className="text-sm text-muted-foreground">{description}</div>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── *
 *  EmptyState — shared zero-state display                     *
 * ─────────────────────────────────────────────────────────── */
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}
export function EmptyState({ icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-20 text-center ${className}`}>
      <div className="h-14 w-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-5 text-muted-foreground">
        {icon}
      </div>
      <h3 className="text-base font-semibold mb-1.5">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-xs mb-5">{description}</p>}
      {action}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── *
 *  StatCard — unified accented KPI card                       *
 * ─────────────────────────────────────────────────────────── */
interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  trend?: { direction: "up" | "down" | "same"; label: string };
  accentClass?: string; // e.g. "bg-chart-1/5 border-chart-1/20"
  children?: React.ReactNode; // slot for sparkline
}
export function StatCard({
  label,
  value,
  sub,
  icon,
  trend,
  accentClass = "border-border bg-card",
  children,
}: StatCardProps) {
  const isUp = trend?.direction === "up";
  const isDown = trend?.direction === "down";

  const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;

  const trendBaseClass =
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset";
  const trendColour = isUp
    ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400"
    : isDown
      ? "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400"
      : "bg-gray-50 text-gray-600 ring-gray-500/20 dark:bg-gray-400/10 dark:text-gray-400";

  return (
    <div
      className={`relative overflow-hidden rounded-xl border p-5 shadow-sm transition-all duration-200 hover:shadow-md ${accentClass}`}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="p-2 bg-background/50 backdrop-blur-sm rounded-lg shrink-0 border border-border/50">
          {icon}
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-3xl font-bold tracking-tight tabular-nums">{value}</p>
        <div className="flex items-center gap-2 pt-2">
          {trend && (
            <span className={`${trendBaseClass} ${trendColour}`}>
              <TrendIcon className="h-3 w-3" />
              {trend.label}
            </span>
          )}
          {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
        </div>
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── *
 *  SectionHeader — card-internal section label               *
 * ─────────────────────────────────────────────────────────── */
export function SectionHeader({
  title,
  action,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {action}
    </div>
  );
}
