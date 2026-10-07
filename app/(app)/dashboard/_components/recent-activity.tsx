"use client";

import Link from "next/link";

import { format, isValid } from "date-fns";
import {
  Clock,
  Mail,
  MoreVertical,
  Users,
  CheckCircle,
  XCircle,
  ArrowRight,
  Copy,
  Eye,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/page-shell";
import type { EmailCampaign } from "@/lib/appwrite";
import { parseRecipients } from "@/lib/utils/recipients";

interface Props {
  campaigns: EmailCampaign[];
  onViewDetails: (c: EmailCampaign) => void;
  onDuplicate: (c: EmailCampaign) => void;
  isDuplicating?: boolean;
}

function getRecipientCount(c: EmailCampaign) {
  return parseRecipients(c.recipients).length;
}

function formatCampaignDate(value?: string) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  if (!isValid(date)) {
    return "Unknown";
  }

  return format(date, "MMM d, yyyy");
}

function statusConfig(status: string) {
  switch (status) {
    case "completed":
      return {
        label: "Completed",
        class: "bg-success/10 text-success border-success/30",
      };
    case "sending":
      return {
        label: "Sending",
        class: "bg-warning/10 text-warning border-warning/30",
      };
    case "failed":
      return {
        label: "Failed",
        class: "bg-destructive/10 text-destructive border-destructive/30",
      };
    default:
      return { label: status, class: "bg-muted text-muted-foreground" };
  }
}

export function RecentActivityFeed({
  campaigns,
  onViewDetails,
  onDuplicate,
  isDuplicating = false,
}: Props) {
  const recent = campaigns.slice(0, 6);

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/20">
        <div>
          <h2 className="text-base font-semibold">Recent Campaigns</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your latest email campaign activity
          </p>
        </div>
        <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex gap-1.5">
          <Link href="/insights">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {/* empty state */}
      {campaigns.length === 0 ? (
        <EmptyState
          icon={<Mail className="h-7 w-7" />}
          title="No campaigns yet"
          description="Ready to reach your audience? Create your first personalised email campaign."
          action={
            <Button asChild size="sm">
              <Link href="/compose">New Campaign</Link>
            </Button>
          }
        />
      ) : (
        <>
          {/* table header */}
          <div className="hidden md:grid grid-cols-[1fr_80px_64px_64px_120px_40px] gap-4 px-6 py-2.5 border-b bg-muted/10 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span>Campaign</span>
            <span className="text-right">Recipients</span>
            <span className="text-right">Sent</span>
            <span className="text-right">Failed</span>
            <span>Date</span>
            <span />
          </div>

          {/* rows */}
          <div className="divide-y">
            {recent.map((c) => {
              const recCount = getRecipientCount(c);
              const deliveredCount = Math.max(0, c.sent || 0);
              const deliverPct = recCount
                ? Math.min(100, Math.round((deliveredCount / recCount) * 100))
                : 0;
              const { label, class: cls } = statusConfig(c.status || "");

              return (
                <div
                  key={c.$id}
                  className="group grid grid-cols-1 md:grid-cols-[1fr_80px_64px_64px_120px_40px] gap-4 items-center px-6 py-4 hover:bg-muted/30 transition-colors"
                >
                  {/* subject + status */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm truncate">
                        {c.subject || "Untitled Campaign"}
                      </span>
                      <span
                        className={`hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] border font-medium ${cls}`}
                      >
                        {label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatCampaignDate(c.created_at)}
                      </span>
                      <span className="flex items-center gap-1 md:hidden">
                        <Users className="h-3 w-3" />
                        {recCount}
                      </span>
                    </div>
                    {/* inline delivery bar (mobile + small screens) */}
                    <div className="mt-2 md:hidden">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <CheckCircle className="h-3 w-3 text-success" />
                        <span>
                          {c.sent || 0} sent · {deliverPct}%
                        </span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-success rounded-full"
                          style={{ width: `${deliverPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* desktop columns */}
                  <div className="hidden md:flex justify-end items-center gap-1 text-sm font-medium">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    {recCount}
                  </div>
                  <div className="hidden md:flex justify-end items-center gap-1 text-sm font-medium text-success">
                    <CheckCircle className="h-3.5 w-3.5" />
                    {c.sent || 0}
                  </div>
                  <div
                    className={`hidden md:flex justify-end items-center gap-1 text-sm font-medium ${(c.failed || 0) > 0 ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    {c.failed || 0}
                  </div>
                  <div className="hidden md:block text-xs text-muted-foreground">
                    {formatCampaignDate(c.created_at)}
                  </div>

                  {/* actions */}
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Campaign actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => onViewDetails(c)}>
                          <Eye className="h-3.5 w-3.5 mr-2" />
                          View Report
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onDuplicate(c)} disabled={isDuplicating}>
                          <Copy className="h-3.5 w-3.5 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>

          {/* view all footer */}
          {campaigns.length > 6 && (
            <div className="px-6 py-3 border-t bg-muted/10">
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="w-full text-muted-foreground hover:text-foreground gap-1.5"
              >
                <Link href="/insights">
                  View all {campaigns.length} campaigns <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
