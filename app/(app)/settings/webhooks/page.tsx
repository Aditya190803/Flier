"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { ArrowLeft, Globe } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PageShell, PageHeader } from "@/components/ui/page-shell";
import { generateWebhookSecret } from "@/components/webhooks/event-types";
import { useWebhooks } from "@/hooks/useWebhooks";
import { type Webhook as WebhookType } from "@/lib/appwrite";

import { CreateWebhookDialog, type NewWebhookState } from "./_components/create-webhook-dialog";
import { EditWebhookDialog } from "./_components/edit-webhook-dialog";
import { WebhookDocsSection } from "./_components/webhook-docs-section";
import { WebhookList } from "./_components/webhook-list";

export default function WebhooksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const {
    webhooks,
    isLoading,
    createWebhook: createWebhookApi,
    updateWebhook: updateWebhookApi,
    toggleWebhookActive,
    deleteWebhook,
  } = useWebhooks(session?.user?.email ?? undefined);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookType | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [newWebhook, setNewWebhook] = useState<NewWebhookState>({
    name: "",
    url: "",
    events: [],
    secret: "",
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  const createWebhook = async () => {
    if (!newWebhook.name.trim() || !newWebhook.url.trim() || newWebhook.events.length === 0) {
      return;
    }
    try {
      new URL(newWebhook.url);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }
    const ok = await createWebhookApi({
      name: newWebhook.name,
      url: newWebhook.url,
      events: newWebhook.events,
      secret: newWebhook.secret,
    });
    if (ok) {
      setNewWebhook({ name: "", url: "", events: [], secret: "" });
      setShowCreateDialog(false);
    }
  };

  const updateWebhook = async () => {
    if (!editingWebhook?.$id) {
      return;
    }
    const ok = await updateWebhookApi(editingWebhook);
    if (ok) {
      setShowEditDialog(false);
      setEditingWebhook(null);
    }
  };

  if (status === "loading" || !isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground">Loading webhooks...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <>
      <PageShell className="max-w-7xl">
        <PageHeader
          title={
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="p-2 bg-primary/10 rounded-lg">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              Webhooks
            </div>
          }
          description="Integrate Flier with your apps and services in real-time"
          actions={
            <CreateWebhookDialog
              open={showCreateDialog}
              onOpenChange={setShowCreateDialog}
              newWebhook={newWebhook}
              setNewWebhook={setNewWebhook}
              isLoading={isLoading}
              onCreateWebhook={createWebhook}
              onGenerateSecret={generateWebhookSecret}
            />
          }
        />

        <WebhookList
          webhooks={webhooks}
          onEdit={(webhook) => {
            setEditingWebhook(webhook);
            setShowEditDialog(true);
          }}
          onToggleActive={toggleWebhookActive}
          onDelete={deleteWebhook}
          onAddWebhook={() => setShowCreateDialog(true)}
        />

        <WebhookDocsSection />
      </PageShell>

      <EditWebhookDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        editingWebhook={editingWebhook}
        setEditingWebhook={setEditingWebhook}
        isLoading={isLoading}
        onUpdateWebhook={updateWebhook}
        onCancel={() => {
          setShowEditDialog(false);
          setEditingWebhook(null);
        }}
      />
    </>
  );
}
