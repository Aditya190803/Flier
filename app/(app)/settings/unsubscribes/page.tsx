"use client";

import { useEffect, useState, useCallback } from "react";

import { useRouter } from "next/navigation";

import { format } from "date-fns";
import {
  UserX,
  Plus,
  Search,
  Mail,
  Calendar,
  Download,
  Upload,
  ArrowLeft,
  UserCheck,
} from "lucide-react";
import { useSession } from "next-auth/react";
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
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PageShell,
  PageHeader,
  EmptyState,
  StatCard,
} from "@/components/ui/page-shell";
import { unsubscribesService, type Unsubscribe } from "@/lib/appwrite";
import { componentLogger } from "@/lib/client-logger";

export default function UnsubscribesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [unsubscribes, setUnsubscribes] = useState<Unsubscribe[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newReason, setNewReason] = useState("");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  const fetchUnsubscribes = useCallback(async () => {
    if (!session?.user?.email) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await unsubscribesService.listByUser(session.user.email);
      setUnsubscribes(response.documents);
    } catch (error) {
      componentLogger.error(
        "Error fetching unsubscribes",
        error instanceof Error ? error : undefined,
      );
      toast.error("Failed to load unsubscribe list");
    }
    setIsLoading(false);
  }, [session?.user?.email]);

  useEffect(() => {
    if (!session?.user?.email) {
      return;
    }
    fetchUnsubscribes();
  }, [session?.user?.email, fetchUnsubscribes]);

  const addUnsubscribe = async () => {
    if (!session?.user?.email || !newEmail.trim()) {
      return;
    }

    // Validate email
    if (!newEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    try {
      await unsubscribesService.create({
        email: newEmail.trim().toLowerCase(),
        user_email: session.user.email,
        reason: newReason.trim() || undefined,
      });

      setNewEmail("");
      setNewReason("");
      setShowAddDialog(false);
      toast.success("Email added to unsubscribe list");
      fetchUnsubscribes();
    } catch (error) {
      componentLogger.error(
        "Error adding unsubscribe",
        error instanceof Error ? error : undefined,
      );
      toast.error("Failed to add email");
    }
    setIsLoading(false);
  };

  const resubscribe = async (unsubscribeId: string, email: string) => {
    try {
      await unsubscribesService.delete(unsubscribeId);
      toast.success(`${email} has been resubscribed`);
      fetchUnsubscribes();
    } catch (error) {
      componentLogger.error(
        "Error resubscribing",
        error instanceof Error ? error : undefined,
      );
      toast.error("Failed to resubscribe email");
    }
  };

  const exportUnsubscribes = () => {
    if (unsubscribes.length === 0) {
      toast.error("No emails to export");
      return;
    }

    const csvContent = [
      ["Email", "Reason", "Date"],
      ...unsubscribes.map((u) => [
        u.email,
        u.reason || "",
        u.unsubscribed_at || "",
      ]),
    ]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `unsubscribes_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success("Unsubscribe list exported!");
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !session?.user?.email) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter((line) => line.trim());
        const dataLines = lines.slice(1); // Skip header

        const emails = dataLines
          .map((line) =>
            line.split(",")[0].replace(/"/g, "").trim().toLowerCase(),
          )
          .filter((email) => email && email.includes("@"));

        if (emails.length > 0) {
          let successCount = 0;

          for (const email of emails) {
            try {
              await unsubscribesService.create({
                email,
                user_email: session.user.email!,
                reason: "Imported from CSV",
              });
              successCount++;
            } catch (error) {
              componentLogger.error(
                "Error importing",
                error instanceof Error ? error : undefined,
                {
                  email,
                },
              );
            }
          }

          toast.success(`Imported ${successCount} emails`);
          fetchUnsubscribes();
        } else {
          toast.error("No valid emails found in file");
        }
      } catch (error) {
        componentLogger.error(
          "Import error",
          error instanceof Error ? error : undefined,
        );
        toast.error("Error processing file");
      }
    };

    reader.readAsText(file);
    event.target.value = "";
  };

  if (status === "loading" || !isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground">Loading unsubscribe list...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  const filteredUnsubscribes = unsubscribes.filter((u) =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <PageShell className="max-w-7xl">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="p-2 bg-destructive/10 rounded-lg">
              <UserX className="h-6 w-6 text-destructive" />
            </div>
            Unsubscribe Management
          </div>
        }
        description="Manage emails that have opted out of receiving your campaigns"
        actions={
          <div className="flex gap-2">
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Email
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add to Unsubscribe List</DialogTitle>
                  <DialogDescription>
                    Add an email address to prevent sending campaigns to them
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@example.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason (optional)</Label>
                    <Input
                      id="reason"
                      placeholder="e.g., Requested via email"
                      value={newReason}
                      onChange={(e) => setNewReason(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={addUnsubscribe}
                      disabled={isLoading || !newEmail.trim()}
                      className="flex-1"
                    >
                      Add to List
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowAddDialog(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              onClick={exportUnsubscribes}
              disabled={unsubscribes.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>

            <div className="relative">
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <input
                type="file"
                accept=".csv"
                onChange={handleImport}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          label="Unsubscribed emails"
          value={unsubscribes.length}
          icon={<UserX className="h-4 w-4 text-destructive" />}
          accentClass="bg-destructive/10 text-destructive"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Input
          icon={<Search className="h-4 w-4" />}
          placeholder="Search emails..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Unsubscribe List */}
      {filteredUnsubscribes.length > 0 ? (
        <div className="space-y-3">
          {filteredUnsubscribes.map((unsub) => (
            <Card key={unsub.$id} className="group">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-full bg-muted">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{unsub.email}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        {unsub.reason && <span>{unsub.reason}</span>}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {unsub.unsubscribed_at &&
                            format(new Date(unsub.unsubscribed_at), "PP")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100"
                      >
                        <UserCheck className="h-4 w-4 mr-2" />
                        Resubscribe
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Resubscribe Email</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to resubscribe {unsub.email}?
                          They will start receiving your campaigns again.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => resubscribe(unsub.$id!, unsub.email)}
                        >
                          Resubscribe
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<UserX className="h-12 w-12 text-muted-foreground/50" />}
          title={searchTerm ? "No matches found" : "No unsubscribes yet"}
          description={
            searchTerm
              ? "Try adjusting your search"
              : "Emails added here won't receive your campaigns"
          }
          action={
            !searchTerm && (
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Email
              </Button>
            )
          }
        />
      )}

      {/* Info Card */}
      <Card className="mt-8 bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-2">📧 How Unsubscribe Works</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>
              • Emails in this list are automatically skipped when sending
              campaigns
            </li>
            <li>
              • You'll see a notification showing how many emails were skipped
            </li>
            <li>• Resubscribe an email to start sending to them again</li>
            <li>• Import/export your list as CSV for easy management</li>
          </ul>
        </CardContent>
      </Card>
    </PageShell>
  );
}
