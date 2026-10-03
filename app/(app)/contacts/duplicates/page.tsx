"use client";

import { useEffect, useState, useCallback } from "react";

import { useRouter } from "next/navigation";

import {
  Users,
  ArrowLeft,
  Merge,
  Trash2,
  CheckCircle,
  Mail,
  Building,
  Phone,
  RefreshCw,
  AlertTriangle,
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
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageShell, PageHeader, EmptyState, StatCard } from "@/components/ui/page-shell";
import { contactsService } from "@/lib/appwrite";
import { componentLogger } from "@/lib/client-logger";

interface Contact {
  $id: string;
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  created_at: string;
}

interface DuplicateGroup {
  email: string;
  contacts: Contact[];
}

export default function DuplicatesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null);
  const [primaryContact, setPrimaryContact] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  const fetchContacts = useCallback(async () => {
    if (!session?.user?.email) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await contactsService.listByUser(session.user.email);
      const contactsData = response.documents.map((doc) => ({
        $id: doc.$id,
        email: (doc as any).email,
        name: (doc as any).name,
        company: (doc as any).company,
        phone: (doc as any).phone,
        created_at: (doc as any).created_at,
      })) as Contact[];

      setContacts(contactsData);
      findDuplicates(contactsData);
    } catch (error) {
      componentLogger.error("Error fetching contacts", error instanceof Error ? error : undefined);
      toast.error("Failed to load contacts");
    }
    setIsLoading(false);
  }, [session?.user?.email]);

  const findDuplicates = (contactsList: Contact[]) => {
    const emailMap = new Map<string, Contact[]>();

    contactsList.forEach((contact) => {
      const normalizedEmail = contact.email.toLowerCase().trim();
      const existing = emailMap.get(normalizedEmail) || [];
      existing.push(contact);
      emailMap.set(normalizedEmail, existing);
    });

    const duplicateGroups: DuplicateGroup[] = [];
    emailMap.forEach((contacts, email) => {
      if (contacts.length > 1) {
        duplicateGroups.push({ email, contacts });
      }
    });

    // Sort by number of duplicates (most duplicates first)
    duplicateGroups.sort((a, b) => b.contacts.length - a.contacts.length);

    setDuplicates(duplicateGroups);
  };

  useEffect(() => {
    if (!session?.user?.email) {
      return;
    }
    fetchContacts();
  }, [session?.user?.email, fetchContacts]);

  const openMergeDialog = (group: DuplicateGroup) => {
    setSelectedGroup(group);
    // Default to the oldest contact (first created) as primary
    const oldest = [...group.contacts].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )[0];
    setPrimaryContact(oldest.$id);
    setShowMergeDialog(true);
  };

  const mergeDuplicates = async () => {
    if (!selectedGroup || !primaryContact) {
      return;
    }

    setIsProcessing(true);
    try {
      // Delete all contacts except the primary one
      const contactsToDelete = selectedGroup.contacts.filter((c) => c.$id !== primaryContact);

      for (const contact of contactsToDelete) {
        await contactsService.delete(contact.$id);
      }

      toast.success(`Merged ${contactsToDelete.length + 1} duplicates into 1 contact`);
      setShowMergeDialog(false);
      setSelectedGroup(null);
      setPrimaryContact(null);
      fetchContacts();
    } catch (error) {
      componentLogger.error("Error merging duplicates", error instanceof Error ? error : undefined);
      toast.error("Failed to merge duplicates");
    }
    setIsProcessing(false);
  };

  const deleteAllDuplicates = async (group: DuplicateGroup) => {
    setIsProcessing(true);
    try {
      // Keep the oldest one, delete the rest
      const sorted = [...group.contacts].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
      const toDelete = sorted.slice(1);

      for (const contact of toDelete) {
        await contactsService.delete(contact.$id);
      }

      toast.success(`Removed ${toDelete.length} duplicate(s)`);
      fetchContacts();
    } catch (error) {
      componentLogger.error(
        "Error deleting duplicates",
        error instanceof Error ? error : undefined,
      );
      toast.error("Failed to delete duplicates");
    }
    setIsProcessing(false);
  };

  const autoMergeAll = async () => {
    if (duplicates.length === 0) {
      return;
    }

    setIsProcessing(true);
    let totalMerged = 0;

    try {
      for (const group of duplicates) {
        // Keep the oldest contact (most complete data usually)
        const sorted = [...group.contacts].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
        const toDelete = sorted.slice(1);

        for (const contact of toDelete) {
          await contactsService.delete(contact.$id);
          totalMerged++;
        }
      }

      toast.success(`Removed ${totalMerged} duplicate contacts`);
      fetchContacts();
    } catch (error) {
      componentLogger.error("Error auto-merging", error instanceof Error ? error : undefined);
      toast.error("Failed to complete auto-merge");
    }
    setIsProcessing(false);
  };

  if (status === "loading" || !isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground">Scanning for duplicates...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  const totalDuplicates = duplicates.reduce((sum, group) => sum + group.contacts.length - 1, 0);

  return (
    <>
      <PageShell>
        <PageHeader
          title={
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              Duplicate Detection
            </div>
          }
          description="Find and merge duplicate contacts"
          actions={
            <Button variant="outline" onClick={fetchContacts} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Rescan
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            label="Total Contacts"
            value={contacts.length}
            icon={<Users className="h-5 w-5 text-primary" />}
            accentClass="border-primary/20 bg-primary/5"
          />
          <StatCard
            label="Duplicates Found"
            value={totalDuplicates}
            icon={<AlertTriangle className="h-5 w-5 text-warning" />}
            accentClass={totalDuplicates > 0 ? "border-warning/20 bg-warning/5" : ""}
          />
        </div>
        {/* Auto Merge Button */}
        {duplicates.length > 0 && (
          <Card className="mb-6 bg-warning/5 border-warning/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">Quick Fix Available</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically remove {totalDuplicates} duplicate
                    {totalDuplicates > 1 ? "s" : ""}, keeping the oldest entry for each email
                  </p>
                </div>
                <Button onClick={autoMergeAll} disabled={isProcessing}>
                  {isProcessing ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Merge className="h-4 w-4 mr-2" />
                  )}
                  Auto-Merge All
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Duplicate Groups */}
        {duplicates.length > 0 ? (
          <div className="space-y-4">
            {duplicates.map((group) => (
              <Card key={group.email}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-base">{group.email}</CardTitle>
                      <Badge variant="warning">{group.contacts.length} duplicates</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openMergeDialog(group)}
                        disabled={isProcessing}
                      >
                        <Merge className="h-4 w-4 mr-2" />
                        Choose Primary
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteAllDuplicates(group)}
                        disabled={isProcessing}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Quick Merge
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {group.contacts.map((contact, index) => (
                      <div
                        key={contact.$id}
                        className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium truncate">{contact.name || "(No name)"}</p>
                            {index === 0 && (
                              <Badge variant="secondary" className="text-xs">
                                Oldest
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                            {contact.company && (
                              <span className="flex items-center gap-1">
                                <Building className="h-3 w-3" />
                                {contact.company}
                              </span>
                            )}
                            {contact.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {contact.phone}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Added {new Date(contact.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<CheckCircle className="h-8 w-8 text-success" />}
            title="No duplicates found"
            description="Your contact list is clean! All email addresses are unique."
          />
        )}
      </PageShell>

      {/* Merge Dialog */}
      <AlertDialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Select Primary Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Choose which contact to keep. The others will be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 my-4">
            {selectedGroup?.contacts.map((contact) => (
              <label
                key={contact.$id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  primaryContact === contact.$id ? "bg-primary/10 border-primary" : "hover:bg-muted"
                }`}
              >
                <input
                  type="radio"
                  name="primary"
                  checked={primaryContact === contact.$id}
                  onChange={() => setPrimaryContact(contact.$id)}
                  className="sr-only"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{contact.name || "(No name)"}</p>
                  <div className="text-sm text-muted-foreground">
                    {contact.company && <span>{contact.company} • </span>}
                    {contact.phone && <span>{contact.phone} • </span>}
                    Added {new Date(contact.created_at).toLocaleDateString()}
                  </div>
                </div>
                {primaryContact === contact.$id && <CheckCircle className="h-5 w-5 text-primary" />}
              </label>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={mergeDuplicates} disabled={isProcessing}>
              {isProcessing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Merge className="h-4 w-4 mr-2" />
              )}
              Merge Contacts
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
