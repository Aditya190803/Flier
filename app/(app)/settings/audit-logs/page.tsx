"use client";

import { useEffect, useState, useCallback } from "react";

import { useRouter } from "next/navigation";

import { format } from "date-fns";
import {
  FileText,
  Search,
  Filter,
  Calendar,
  Activity,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  Mail,
  Users,
  Settings,
  Shield,
  LogIn,
  Trash2,
  Edit,
  Plus,
  Send,
  Eye,
} from "lucide-react";
import { useSession } from "next-auth/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageShell, PageHeader } from "@/components/ui/page-shell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { componentLogger } from "@/lib/client-logger";

interface AuditLogEntry {
  $id: string;
  user_email: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

const resourceTypeIcons: Record<string, any> = {
  contact: Users,
  campaign: Mail,
  template: FileText,
  draft: Edit,
  signature: Edit,
  group: Users,
  settings: Settings,
  auth: LogIn,
  export: Download,
  team: Users,
};

const actionColors: Record<string, string> = {
  create: "success",
  update: "info",
  delete: "destructive",
  send: "secondary",
  login: "default",
  export: "warning",
};

function getActionColor(action: string): string {
  for (const [key, color] of Object.entries(actionColors)) {
    if (action.includes(key)) {
      return color;
    }
  }
  return "default";
}

function getActionIcon(action: string) {
  if (action.includes("create") || action.includes("invite")) {
    return Plus;
  }
  if (action.includes("update") || action.includes("change")) {
    return Edit;
  }
  if (action.includes("delete") || action.includes("remove")) {
    return Trash2;
  }
  if (action.includes("send")) {
    return Send;
  }
  if (action.includes("login") || action.includes("logout")) {
    return LogIn;
  }
  if (action.includes("export")) {
    return Download;
  }
  if (action.includes("consent")) {
    return Shield;
  }
  return Activity;
}

function formatAction(action: string): string {
  return action
    .split(".")
    .map((part) => part.replace(/_/g, " "))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" → ");
}

export default function AuditLogsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({
    action: "",
    resource_type: "",
    search: "",
  });
  const limit = 20;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString(),
      });

      if (filters.action) {
        params.append("action", filters.action);
      }
      if (filters.resource_type) {
        params.append("resource_type", filters.resource_type);
      }

      const response = await fetch(`/api/gdpr/audit-logs?${params}`);
      const data = await response.json();

      if (data.documents) {
        setLogs(data.documents);
        setTotal(data.total);
      } else {
        setLogs([]);
        setTotal(0);
      }
    } catch (error) {
      componentLogger.error(
        "Failed to fetch audit logs",
        error instanceof Error ? error : undefined,
      );
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    if (session?.user?.email) {
      fetchLogs();
    }
  }, [session?.user?.email, fetchLogs]);

  const totalPages = Math.ceil(total / limit);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({ action: "", resource_type: "", search: "" });
    setPage(0);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <PageShell className="max-w-6xl">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            Audit Logs
          </div>
        }
        description="Track all actions performed on your account"
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select
              value={filters.resource_type || "all"}
              onValueChange={(value: string) =>
                handleFilterChange("resource_type", value === "all" ? "" : value)
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Resource" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                <SelectItem value="contact">Contacts</SelectItem>
                <SelectItem value="campaign">Campaigns</SelectItem>
                <SelectItem value="template">Templates</SelectItem>
                <SelectItem value="draft">Drafts</SelectItem>
                <SelectItem value="settings">Settings</SelectItem>
                <SelectItem value="auth">Authentication</SelectItem>
                <SelectItem value="team">Teams</SelectItem>
                <SelectItem value="export">Exports</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={clearFilters} className="gap-2">
              <Filter className="h-4 w-4" />
              Clear
            </Button>

            <Button variant="outline" size="sm" onClick={fetchLogs} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Activity History</CardTitle>
            <Badge variant="secondary">{total} entries</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No activity yet</h3>
              <p className="text-muted-foreground">Your account activity will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const ResourceIcon = resourceTypeIcons[log.resource_type] || Activity;
                const ActionIcon = getActionIcon(log.action);
                const actionColor = getActionColor(log.action);

                return (
                  <div
                    key={log.$id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-muted">
                      <ResourceIcon className="h-5 w-5 text-muted-foreground" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <ActionIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{formatAction(log.action)}</span>
                        <Badge variant={actionColor as any} className="text-xs">
                          {log.resource_type}
                        </Badge>
                      </div>

                      {log.details && Object.keys(log.details).length > 0 && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                          {JSON.stringify(log.details)}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(log.created_at), "MMM d, yyyy HH:mm")}
                        </span>
                        {log.ip_address && log.ip_address !== "unknown" && (
                          <span className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            {log.ip_address}
                          </span>
                        )}
                      </div>
                    </div>

                    {log.resource_id && (
                      <Button variant="ghost" size="sm" className="gap-1">
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {page * limit + 1}-{Math.min((page + 1) * limit, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
