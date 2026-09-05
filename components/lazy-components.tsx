"use client";

import dynamic from "next/dynamic";

import { Loader2 } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

const RichTextEditorSkeleton = () => (
  <div className="space-y-2">
    <Skeleton className="h-10 w-full rounded-md" />
    <Skeleton className="h-48 w-full rounded-md" />
  </div>
);

const EmailPreviewSkeleton = () => (
  <div className="flex items-center justify-center p-8">
    <div className="flex flex-col items-center gap-2">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Loading preview...</span>
    </div>
  </div>
);

const EmailClientPreviewSkeleton = () => (
  <div className="flex items-center justify-center p-8">
    <div className="flex flex-col items-center gap-2">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <span className="text-sm text-muted-foreground">
        Loading email client preview...
      </span>
    </div>
  </div>
);

// TipTap is ~150KB, load on demand.
export const LazyRichTextEditor = dynamic(
  () =>
    import("@/components/rich-text-editor").then((mod) => mod.RichTextEditor),
  {
    loading: () => <RichTextEditorSkeleton />,
    ssr: false,
  },
);

export const LazyEmailPreview = dynamic(
  () => import("@/components/email-preview").then((mod) => mod.EmailPreview),
  {
    loading: () => <EmailPreviewSkeleton />,
    ssr: false,
  },
);

export const LazyEmailClientPreview = dynamic(
  () =>
    import("@/components/email-client-preview").then(
      (mod) => mod.EmailClientPreview,
    ),
  {
    loading: () => <EmailClientPreviewSkeleton />,
    ssr: false,
  },
);

export const LazyCSVUpload = dynamic(
  () => import("@/components/csv-upload").then((mod) => mod.CSVUpload),
  {
    loading: () => <Skeleton className="h-32 w-full rounded-md" />,
    ssr: false,
  },
);

export const LazyKeyboardShortcutsModal = dynamic(
  () =>
    import("@/components/keyboard-shortcuts-modal").then(
      (mod) => mod.KeyboardShortcutsModal,
    ),
  {
    loading: () => null,
    ssr: false,
  },
);
