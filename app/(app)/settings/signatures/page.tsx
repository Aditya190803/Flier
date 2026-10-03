"use client";

import { useEffect, useState, useCallback } from "react";

import { useRouter } from "next/navigation";

import { Pen, Plus, Trash2, Edit, MoreVertical, Star, ArrowLeft } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { RichTextEditor } from "@/components/rich-text-editor";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageShell, PageHeader, EmptyState } from "@/components/ui/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { signaturesService, type EmailSignature } from "@/lib/appwrite";
import { componentLogger } from "@/lib/client-logger";

export default function SignaturesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [signatures, setSignatures] = useState<EmailSignature[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingSignature, setEditingSignature] = useState<EmailSignature | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [newSignature, setNewSignature] = useState({
    name: "",
    content: "",
    is_default: false,
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  const fetchSignatures = useCallback(async () => {
    if (!session?.user?.email) {
      return;
    }

    try {
      const response = await signaturesService.listByUser(session.user.email);
      setSignatures(response.documents);
    } catch (error) {
      componentLogger.error(
        "Error fetching signatures",
        error instanceof Error ? error : undefined,
      );
      toast.error("Failed to load signatures");
    }
  }, [session?.user?.email]);

  useEffect(() => {
    if (!session?.user?.email) {
      return;
    }
    const loadData = async () => {
      await fetchSignatures();
      setIsLoadingData(false);
    };
    loadData();
  }, [session?.user?.email, fetchSignatures]);

  const createSignature = async () => {
    if (!session?.user?.email || !newSignature.name.trim() || !newSignature.content.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      await signaturesService.create({
        name: newSignature.name.trim(),
        content: newSignature.content,
        is_default: newSignature.is_default,
      });

      setNewSignature({ name: "", content: "", is_default: false });
      setShowCreateDialog(false);
      toast.success("Signature created!");
      fetchSignatures();
    } catch (error) {
      componentLogger.error("Error creating signature", error instanceof Error ? error : undefined);
      toast.error("Failed to create signature");
    }
    setIsLoading(false);
  };

  const updateSignature = async () => {
    if (!editingSignature?.$id) {
      return;
    }

    setIsLoading(true);
    try {
      await signaturesService.update(editingSignature.$id, {
        name: editingSignature.name,
        content: editingSignature.content,
        is_default: editingSignature.is_default,
      });

      setShowEditDialog(false);
      setEditingSignature(null);
      toast.success("Signature updated!");
      fetchSignatures();
    } catch (error) {
      componentLogger.error("Error updating signature", error instanceof Error ? error : undefined);
      toast.error("Failed to update signature");
    }
    setIsLoading(false);
  };

  const deleteSignature = async (signatureId: string) => {
    try {
      await signaturesService.delete(signatureId);
      toast.success("Signature deleted");
      fetchSignatures();
    } catch (error) {
      componentLogger.error("Error deleting signature", error instanceof Error ? error : undefined);
      toast.error("Failed to delete signature");
    }
  };

  const setAsDefault = async (signatureId: string) => {
    if (!session?.user?.email) {
      return;
    }

    try {
      await signaturesService.setAsDefault(session.user.email, signatureId);
      toast.success("Default signature updated");
      fetchSignatures();
    } catch (error) {
      componentLogger.error("Error setting default", error instanceof Error ? error : undefined);
      toast.error("Failed to set default signature");
    }
  };

  if (status === "loading" || !isMounted || isLoadingData) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <main className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Skeleton */}
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="h-10 w-10" />
            <div className="flex-1">
              <Skeleton className="h-7 w-48 mb-2" />
              <Skeleton className="h-5 w-72" />
            </div>
            <Skeleton className="h-10 w-36" />
          </div>

          {/* Signatures List Skeleton */}
          <div className="space-y-4">
            {[...Array(3)].map((_, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <Skeleton className="h-5 w-32 mb-2" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-8 w-8" />
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <>
      <PageShell>
        <PageHeader
          title={
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              Email Signatures
            </div>
          }
          description="Create and manage your email signatures"
          actions={
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Signature
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Signature</DialogTitle>
                  <DialogDescription>
                    Create a reusable email signature. The name is for your reference only — only
                    the content below will be added to your emails.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Signature Name *</Label>
                    <p className="text-xs text-muted-foreground">
                      This name is just for identification and won't appear in your emails
                    </p>
                    <Input
                      id="name"
                      placeholder="e.g., Professional, Casual"
                      value={newSignature.name}
                      onChange={(e) =>
                        setNewSignature({
                          ...newSignature,
                          name: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Signature Content *</Label>
                    <p className="text-xs text-muted-foreground">
                      This rich text content will be added to the bottom of emails when you select
                      this signature
                    </p>
                    <RichTextEditor
                      content={newSignature.content}
                      onChange={(content) => setNewSignature({ ...newSignature, content })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Set as default</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically use this signature for new emails
                      </p>
                    </div>
                    <Switch
                      checked={newSignature.is_default}
                      onCheckedChange={(is_default) =>
                        setNewSignature({ ...newSignature, is_default })
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={createSignature}
                    disabled={isLoading || !newSignature.name || !newSignature.content}
                  >
                    {isLoading ? "Creating..." : "Create Signature"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          }
        />

        {/* Signatures List */}
        {signatures.length > 0 ? (
          <div className="space-y-4">
            {signatures.map((signature) => (
              <Card key={signature.$id} className="group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{signature.name}</h3>
                        {signature.is_default && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <div
                        className="text-sm text-muted-foreground prose-sm max-h-24 overflow-hidden"
                        dangerouslySetInnerHTML={{ __html: signature.content }}
                      />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="opacity-0 group-hover:opacity-100"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingSignature(signature);
                            setShowEditDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        {!signature.is_default && (
                          <DropdownMenuItem onClick={() => setAsDefault(signature.$id!)}>
                            <Star className="h-4 w-4 mr-2" />
                            Set as Default
                          </DropdownMenuItem>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Signature</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{signature.name}"? This action
                                cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteSignature(signature.$id!)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Pen className="h-8 w-8 text-muted-foreground" />}
            title="No signatures yet"
            description="Create email signatures to quickly add to your emails"
            action={
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Signature
              </Button>
            }
          />
        )}

        {/* Tips */}
        <Card className="mt-8 bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2">💡 Signature Tips</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Include your name, title, and contact information</li>
              <li>• Keep it concise - 3-5 lines is ideal</li>
              <li>• Add links to your social profiles or website</li>
              <li>• Set a default signature to automatically add it to all emails</li>
            </ul>
          </CardContent>
        </Card>
      </PageShell>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Signature</DialogTitle>
            <DialogDescription>
              Update your email signature. The name is for your reference only — only the content
              below will be added to your emails.
            </DialogDescription>
          </DialogHeader>
          {editingSignature && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Signature Name *</Label>
                <p className="text-xs text-muted-foreground">
                  This name is just for identification and won't appear in your emails
                </p>
                <Input
                  value={editingSignature.name}
                  onChange={(e) =>
                    setEditingSignature({
                      ...editingSignature,
                      name: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Signature Content</Label>
                <RichTextEditor
                  content={editingSignature.content}
                  onChange={(content) => setEditingSignature({ ...editingSignature, content })}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-is-default"
                  checked={editingSignature.is_default}
                  onChange={(e) =>
                    setEditingSignature({
                      ...editingSignature,
                      is_default: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded"
                />
                <Label htmlFor="edit-is-default" className="cursor-pointer">
                  Set as default signature
                </Label>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={updateSignature}
                  disabled={
                    isLoading || !editingSignature.name.trim() || !editingSignature.content.trim()
                  }
                  className="flex-1"
                >
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditDialog(false);
                    setEditingSignature(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
