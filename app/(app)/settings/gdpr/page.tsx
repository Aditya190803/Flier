"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import {
  Shield,
  Download,
  Trash2,
  FileText,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ExternalLink,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PageShell, PageHeader } from "@/components/ui/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { componentLogger } from "@/lib/client-logger";
import { CSRF_HEADER_NAME, CSRF_TOKEN_NAME } from "@/lib/constants";
import { getCookie } from "@/lib/utils";

interface ConsentRecord {
  $id: string;
  consent_type: string;
  granted: boolean;
  granted_at?: string;
  revoked_at?: string;
}

const consentTypes = [
  {
    type: "data_processing",
    title: "Data Processing",
    description:
      "Required for the core functionality of Flier. This allows us to store and process your email campaigns, contacts, and templates.",
    required: true,
  },
  {
    type: "analytics",
    title: "Analytics & Tracking",
    description:
      "Help us improve Flier by allowing anonymous usage analytics. This includes feature usage statistics and performance metrics.",
    required: false,
  },
  {
    type: "marketing",
    title: "Marketing Communications",
    description:
      "Receive updates about new features, tips, and promotional offers from Flier.",
    required: false,
  },
  {
    type: "third_party",
    title: "Third-Party Integrations",
    description:
      "Allow data sharing with integrated third-party services you connect to Flier.",
    required: false,
  },
];

export default function GDPRPage() {
  const { session, status, router } = useAuthGuard();
  const [consents, setConsents] = useState<Record<string, boolean>>({
    data_processing: true,
    analytics: true,
    marketing: false,
    third_party: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingConsent, setUpdatingConsent] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.email) {
      fetchConsents();
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.email]);

  const fetchConsents = async () => {
    try {
      const response = await fetch("/api/gdpr/consent");
      const data = await response.json();

      if (data.documents) {
        const consentMap: Record<string, boolean> = { ...consents };
        data.documents.forEach((doc: ConsentRecord) => {
          consentMap[doc.consent_type] = doc.granted;
        });
        setConsents(consentMap);
      } else if (data.defaults) {
        setConsents({
          ...consents,
          ...Object.fromEntries(
            Object.entries(data.defaults).map(([k, v]: [string, any]) => [
              k,
              v.given,
            ]),
          ),
        });
      }
    } catch (error) {
      componentLogger.error(
        "Failed to fetch consents",
        error instanceof Error ? error : undefined,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleConsentChange = async (consentType: string, given: boolean) => {
    setUpdatingConsent(consentType);
    try {
      const csrfToken = getCookie(CSRF_TOKEN_NAME);
      const response = await fetch("/api/gdpr/consent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
        },
        body: JSON.stringify({ consent_type: consentType, given }),
      });

      if (!response.ok) {
        throw new Error("Failed to update consent");
      }

      setConsents((prev) => ({ ...prev, [consentType]: given }));
      toast.success(`Consent ${given ? "granted" : "revoked"} successfully`);
    } catch (_error) {
      toast.error("Failed to update consent. Please try again.");
    } finally {
      setUpdatingConsent(null);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/gdpr/export");

      if (!response.ok) {
        throw new Error("Export failed");
      }

      // Get the blob and create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `flier-data-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Your data has been exported successfully!");
    } catch (_error) {
      toast.error("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteData = async () => {
    setIsDeleting(true);
    try {
      const csrfToken = getCookie(CSRF_TOKEN_NAME);
      const response = await fetch("/api/gdpr/delete", {
        method: "DELETE",
        headers: csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {},
      });

      if (!response.ok) {
        throw new Error("Deletion failed");
      }

      const result = await response.json();
      toast.success(result.message || "Your data has been deleted.");

      // Redirect to home after deletion
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (_error) {
      toast.error("Failed to delete data. Please try again.");
      setIsDeleting(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <main className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96 mb-8" />
          <div className="space-y-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-4" />
                  <Skeleton className="h-10 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <PageShell className="max-w-4xl">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            Privacy & Data
          </div>
        }
        description="Manage your data, privacy preferences, and GDPR rights"
      />

      <div className="space-y-6">
        {/* Data Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Export Your Data
            </CardTitle>
            <CardDescription>
              Download a copy of all your data stored in Flier
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Your export will include contacts, email campaigns, templates,
              drafts, signatures, and all other data associated with your
              account in JSON format.
            </p>
            <Button
              onClick={handleExportData}
              disabled={isExporting}
              className="gap-2"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download My Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Consent Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Consent Preferences
            </CardTitle>
            <CardDescription>Control how your data is used</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {consentTypes.map((consent) => (
              <div
                key={consent.type}
                className="flex items-start justify-between gap-4 p-4 rounded-lg border bg-muted/30"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Label htmlFor={consent.type} className="font-semibold">
                      {consent.title}
                    </Label>
                    {consent.required && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {consent.description}
                  </p>
                </div>
                <Switch
                  id={consent.type}
                  checked={consents[consent.type] ?? false}
                  onCheckedChange={(checked: boolean) =>
                    handleConsentChange(consent.type, checked)
                  }
                  disabled={
                    consent.required || updatingConsent === consent.type
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Audit Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-secondary" />
              Activity History
            </CardTitle>
            <CardDescription>
              View a log of all actions performed on your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Access a detailed audit trail of all activities including logins,
              data modifications, exports, and more.
            </p>
            <Button variant="outline" asChild>
              <Link href="/settings/audit-logs" className="gap-2">
                <FileText className="h-4 w-4" />
                View Audit Logs
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Data Deletion */}
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Your Data
            </CardTitle>
            <CardDescription>
              Permanently delete all your data from Flier
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive mb-1">
                    Warning: This action cannot be undone
                  </p>
                  <p className="text-sm text-muted-foreground">
                    All your contacts, campaigns, templates, drafts, and other
                    data will be permanently deleted. You will not be able to
                    recover this data.
                  </p>
                </div>
              </div>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete All My Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>This will permanently delete all your data including:</p>
                    <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                      <li>All contacts and contact groups</li>
                      <li>All email campaigns and history</li>
                      <li>All templates and drafts</li>
                      <li>All signatures and settings</li>
                      <li>All uploaded attachments</li>
                    </ul>
                    <p className="font-semibold mt-4">
                      This action cannot be undone.
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteData}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Yes, Delete Everything"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Legal Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              Legal Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button variant="link" asChild className="h-auto p-0">
                <Link href="/privacy" className="gap-1">
                  Privacy Policy
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
              <Button variant="link" asChild className="h-auto p-0">
                <Link href="/tos" className="gap-1">
                  Terms of Service
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
