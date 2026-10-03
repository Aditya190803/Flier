"use client";

/**
 * Dashboard Widget Components
 * Reusable widgets for analytics dashboards
 */

import { useState, useMemo } from "react";

import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  Mail,
  Send,
  CheckCircle,
  XCircle,
  MousePointerClick,
  Eye,
  Clock,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type {
  WidgetSize,
  ChangeValue,
  CampaignAnalytics,
  ComparisonReport,
  LinkClickData,
} from "@/types/activity";

// ============================================
// Stats Card Widget
// ============================================

interface StatsCardWidgetProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: ChangeValue;
  size?: WidgetSize;
  loading?: boolean;
  className?: string;
  gradientFrom?: string;
  gradientTo?: string;
}

export function StatsCardWidget({
  title,
  value,
  subtitle,
  icon,
  trend,
  size = "small",
  loading = false,
  className,
}: StatsCardWidgetProps) {
  if (loading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-5">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = () => {
    if (!trend) {
      return null;
    }
    switch (trend.direction) {
      case "up":
        return <TrendingUp className="h-3 w-3" />;
      case "down":
        return <TrendingDown className="h-3 w-3" />;
      default:
        return <Minus className="h-3 w-3" />;
    }
  };

  const getTrendVariant = () => {
    if (!trend) {
      return "secondary";
    }
    switch (trend.direction) {
      case "up":
        return "success" as const;
      case "down":
        return "destructive" as const;
      default:
        return "secondary" as const;
    }
  };

  return (
    <Card className={cn("bg-card border-border/80", className)}>
      <CardContent className={cn("p-5", size === "large" && "p-6")}>
        <div className="flex items-center justify-between mb-3">
          {icon && <div className="p-2 bg-background/50 rounded-lg backdrop-blur-sm">{icon}</div>}
          {trend && (
            <Badge variant={getTrendVariant()} className="flex items-center gap-1">
              {getTrendIcon()}
              {trend.direction !== "same"
                ? `${trend.direction === "up" ? "+" : "-"}${trend.percentage.toFixed(1)}%`
                : "No change"}
            </Badge>
          )}
        </div>
        <div className={cn("text-2xl font-bold", size === "large" && "text-3xl")}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
        <p className="text-sm text-muted-foreground">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

// ============================================
// Line Chart Widget
// ============================================

interface LineChartWidgetProps {
  title: string;
  data: { name: string; [key: string]: string | number }[];
  dataKey?: string;
  label?: string;
  color?: string;
  size?: WidgetSize;
  loading?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
  className?: string;
}

export function LineChartWidget({
  title,
  data,
  dataKey = "value",
  label,
  color = "var(--color-chart-1)",
  size = "medium",
  loading = false,
  showGrid = true,
  showLegend = false,
  className,
}: LineChartWidgetProps) {
  const height = size === "small" ? 150 : size === "large" ? 300 : 200;

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full" style={{ height }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" opacity={0.3} />}
            <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-background)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
              }}
            />
            {showLegend && <Legend />}
            <Line
              type="monotone"
              dataKey={dataKey}
              name={label || (dataKey === "value" ? "Value" : dataKey)}
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ============================================
// Bar Chart Widget
// ============================================

interface BarChartWidgetProps {
  title: string;
  data: { name: string; [key: string]: string | number }[];
  dataKey?: string;
  label?: string;
  color?: string;
  size?: WidgetSize;
  loading?: boolean;
  horizontal?: boolean;
  className?: string;
}

export function BarChartWidget({
  title,
  data,
  dataKey = "value",
  label,
  color = "var(--color-chart-2)",
  size = "medium",
  loading = false,
  horizontal = false,
  className,
}: BarChartWidgetProps) {
  const height = size === "small" ? 150 : size === "large" ? 300 : 200;

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full" style={{ height }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            {horizontal ? (
              <>
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
              </>
            ) : (
              <>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
              </>
            )}
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-background)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
              }}
            />
            <Bar
              dataKey={dataKey}
              name={label || (dataKey === "value" ? "Value" : dataKey)}
              fill={color}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ============================================
// Pie Chart Widget
// ============================================

interface PieChartWidgetProps {
  title: string;
  data: { name: string; value: number; color?: string }[];
  size?: WidgetSize;
  loading?: boolean;
  showLabels?: boolean;
  className?: string;
}

const DEFAULT_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

export function PieChartWidget({
  title,
  data,
  size = "medium",
  loading = false,
  showLabels = true,
  className,
}: PieChartWidgetProps) {
  const height = size === "small" ? 150 : size === "large" ? 300 : 200;

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full rounded-full" style={{ height }} />
        </CardContent>
      </Card>
    );
  }

  const hasData = data?.some((d) => d.value > 0);

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {!hasData ? (
          <div
            className="flex items-center justify-center text-muted-foreground text-sm"
            style={{ height }}
          >
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={size === "small" ? 30 : 50}
                outerRadius={size === "small" ? 50 : 80}
                paddingAngle={2}
                dataKey="value"
                label={
                  showLabels
                    ? ({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                    : undefined
                }
                labelLine={showLabels}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-background)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Comparison Widget
// ============================================

interface ComparisonWidgetProps {
  report: ComparisonReport;
  size?: WidgetSize;
  loading?: boolean;
  className?: string;
}

export function ComparisonWidget({
  report,
  size: _size = "medium",
  loading = false,
  className,
}: ComparisonWidgetProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    {
      label: "Campaigns",
      current: report.current.campaigns,
      change: report.changes.campaigns,
      icon: <Mail className="h-4 w-4 text-primary" />,
    },
    {
      label: "Emails Sent",
      current: report.current.sent,
      change: report.changes.sent,
      icon: <Send className="h-4 w-4 text-secondary" />,
    },
    {
      label: "Success Rate",
      current: `${report.current.successRate.toFixed(1)}%`,
      change: report.changes.successRate,
      icon: <CheckCircle className="h-4 w-4 text-success" />,
    },
  ];

  if (report.current.opens !== undefined && report.changes.opens) {
    metrics.push({
      label: "Opens",
      current: report.current.opens,
      change: report.changes.opens,
      icon: <Eye className="h-4 w-4 text-accent" />,
    });
  }

  if (report.current.clicks !== undefined && report.changes.clicks) {
    metrics.push({
      label: "Clicks",
      current: report.current.clicks,
      change: report.changes.clicks,
      icon: <MousePointerClick className="h-4 w-4 text-orange-500" />,
    });
  }

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2">
          <CardTitle className="text-base">
            {report.period === "week"
              ? "Week over Week"
              : report.period === "month"
                ? "Month over Month"
                : "Campaign Comparison"}
          </CardTitle>
          <Badge variant="outline" className="w-fit font-normal text-[10px]">
            {report.current.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 pt-4">
        <div className="space-y-5 flex-1">
          {metrics.map((metric) => (
            <div key={metric.label} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-md">{metric.icon}</div>
                <span className="text-sm font-medium text-muted-foreground">{metric.label}</span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-base font-bold">
                  {typeof metric.current === "number"
                    ? metric.current.toLocaleString()
                    : metric.current}
                </span>
                {metric.change && (
                  <Badge
                    variant={
                      metric.change.direction === "up"
                        ? "success"
                        : metric.change.direction === "down"
                          ? "destructive"
                          : "secondary"
                    }
                    className="text-[10px] px-1.5 py-0 h-5"
                  >
                    {metric.change.direction === "up" && <TrendingUp className="h-3 w-3 mr-1" />}
                    {metric.change.direction === "down" && (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {metric.change.direction !== "same"
                      ? `${metric.change.percentage.toFixed(1)}%`
                      : "0%"}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 pt-4 border-t text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>Compared to: {report.previous.label}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Heatmap Widget
// ============================================

interface HeatmapWidgetProps {
  title: string;
  links: LinkClickData[];
  totalClicks: number;
  size?: WidgetSize;
  loading?: boolean;
  className?: string;
}

export function HeatmapWidget({
  title,
  links,
  totalClicks,
  size: _size = "medium",
  loading = false,
  className,
}: HeatmapWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const displayLinks = expanded ? links : links.slice(0, 5);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const getHeatClass = (percentage: number) => {
    if (percentage >= 50) {
      return "bg-red-500/20 border-l-red-500";
    }
    if (percentage >= 30) {
      return "bg-orange-500/20 border-l-orange-500";
    }
    if (percentage >= 15) {
      return "bg-yellow-500/20 border-l-yellow-500";
    }
    if (percentage >= 5) {
      return "bg-green-500/20 border-l-green-500";
    }
    return "bg-blue-500/20 border-l-blue-500";
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MousePointerClick className="h-4 w-4" />
            {title}
          </CardTitle>
          <Badge variant="secondary">{totalClicks} clicks</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No click data available</p>
        ) : (
          <>
            <div className="space-y-2">
              {displayLinks.map((link, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-3 rounded-lg border-l-4 transition-colors",
                    getHeatClass(link.percentage),
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{link.displayText || link.url}</p>
                      <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{link.clicks}</p>
                      <p className="text-xs text-muted-foreground">{link.percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {links.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? "Show less" : `Show ${links.length - 5} more`}
                <ChevronDown
                  className={cn("h-4 w-4 ml-1 transition-transform", expanded && "rotate-180")}
                />
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Recent Campaigns Widget
// ============================================

interface RecentCampaignsWidgetProps {
  campaigns: CampaignAnalytics[];
  size?: WidgetSize;
  loading?: boolean;
  limit?: number;
  onViewCampaign?: (campaignId: string) => void;
  className?: string;
}

export function RecentCampaignsWidget({
  campaigns,
  size: _size = "medium",
  loading = false,
  limit = 5,
  onViewCampaign,
  className,
}: RecentCampaignsWidgetProps) {
  const displayCampaigns = useMemo(
    () =>
      [...campaigns]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit),
    [campaigns, limit],
  );

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded" />
              <div className="flex-1">
                <Skeleton className="h-4 w-48 mb-2" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Recent Campaigns
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {displayCampaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No campaigns yet</p>
        ) : (
          <div className="space-y-3">
            {displayCampaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => onViewCampaign?.(campaign.id)}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded flex items-center justify-center",
                    campaign.status === "completed"
                      ? "bg-success/10"
                      : campaign.status === "failed"
                        ? "bg-destructive/10"
                        : "bg-muted",
                  )}
                >
                  {campaign.status === "completed" ? (
                    <CheckCircle className="h-5 w-5 text-success" />
                  ) : campaign.status === "failed" ? (
                    <XCircle className="h-5 w-5 text-destructive" />
                  ) : (
                    <Send className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{campaign.subject}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDate(campaign.createdAt)}</span>
                    <span>•</span>
                    <span>{campaign.sent} sent</span>
                    {campaign.opens !== undefined && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {campaign.opens}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <Badge
                  variant={
                    campaign.successRate >= 90
                      ? "success"
                      : campaign.successRate >= 70
                        ? "secondary"
                        : "destructive"
                  }
                >
                  {campaign.successRate.toFixed(0)}%
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Quick Actions Widget
// ============================================

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "outline" | "ghost";
}

interface QuickActionsWidgetProps {
  actions: QuickAction[];
  size?: WidgetSize;
  loading?: boolean;
  className?: string;
}

export function QuickActionsWidget({
  actions,
  size: _size = "small",
  loading = false,
  className,
}: QuickActionsWidgetProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9 w-28" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || "outline"}
              size="sm"
              onClick={action.onClick}
            >
              {action.icon}
              <span className="ml-2">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
