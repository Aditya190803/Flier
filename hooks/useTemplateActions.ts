"use client";

import { useState } from "react";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { toast } from "sonner";

import {
  templatesService,
  type EmailTemplate,
  type TemplateVersion,
} from "@/lib/appwrite";
import { componentLogger } from "@/lib/client-logger";
import { DEFAULT_TEMPLATES } from "@/lib/templates/default-templates";

interface UseTemplateActionsArgs {
  userEmail: string | undefined | null;
  router: AppRouterInstance;
  templates: EmailTemplate[];
  setTemplates: (updater: (prev: EmailTemplate[]) => EmailTemplate[]) => void;
  fetchTemplates: () => void | Promise<void>;
}

/**
 * Template CRUD mutations, starter-template seeding, and version-history
 * actions used by the Templates page.
 */
export function useTemplateActions({
  userEmail,
  router,
  templates,
  setTemplates,
  fetchTemplates,
}: UseTemplateActionsArgs) {
  const [isLoading, setIsLoading] = useState(false);
  const [showVersionsDialog, setShowVersionsDialog] = useState(false);
  const [versioningTemplate, setVersioningTemplate] =
    useState<EmailTemplate | null>(null);
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);

  const createTemplate = async (newTemplate: {
    name: string;
    subject: string;
    content: string;
    category: string;
  }) => {
    if (!userEmail || !newTemplate.name.trim() || !newTemplate.subject.trim()) {
      return;
    }

    // Create an optimistic template with a temporary ID
    const tempId = `temp-${Date.now()}`;
    const optimisticTemplate: EmailTemplate = {
      $id: tempId,
      name: newTemplate.name.trim(),
      subject: newTemplate.subject.trim(),
      content: newTemplate.content,
      category: newTemplate.category,
      user_email: userEmail,
      created_at: new Date().toISOString(),
    };

    // Optimistically update UI
    setTemplates((prev) => [optimisticTemplate, ...prev]);
    toast.success("Template created successfully!");

    try {
      await templatesService.create({
        name: optimisticTemplate.name,
        subject: optimisticTemplate.subject,
        content: optimisticTemplate.content,
        category: optimisticTemplate.category,
        user_email: userEmail,
      });

      // Refetch to get actual ID
      fetchTemplates();
    } catch (error) {
      // Revert on error
      setTemplates((prev) => prev.filter((t) => t.$id !== tempId));
      componentLogger.error(
        "Error creating template",
        error instanceof Error ? error : undefined,
      );
      toast.error("Failed to create template - changes reverted");
    }
  };

  // Add a default template to user's collection
  const addDefaultTemplate = async (
    defaultTemplate: (typeof DEFAULT_TEMPLATES)[0],
  ) => {
    if (!userEmail) {
      return;
    }

    try {
      await templatesService.create({
        name: defaultTemplate.name,
        subject: defaultTemplate.subject,
        content: defaultTemplate.content,
        user_email: userEmail,
      });

      toast.success(`"${defaultTemplate.name}" template added!`);
      fetchTemplates();
    } catch (error) {
      componentLogger.error(
        "Error adding default template",
        error instanceof Error ? error : undefined,
      );
      toast.error("Failed to add template");
    }
  };

  // Add all default templates
  const addAllDefaultTemplates = async () => {
    if (!userEmail) {
      return;
    }

    setIsLoading(true);
    try {
      // Filter out templates that already exist (by name)
      const existingNames = templates.map((t) => t.name.toLowerCase());
      const templatesToAdd = DEFAULT_TEMPLATES.filter(
        (dt) => !existingNames.includes(dt.name.toLowerCase()),
      );

      if (templatesToAdd.length === 0) {
        toast.info("All starter templates are already in your collection!");
        setIsLoading(false);
        return;
      }

      const toastId = toast.loading(
        `Adding ${templatesToAdd.length} starter templates...`,
      );
      let addedCount = 0;

      for (const defaultTemplate of templatesToAdd) {
        await templatesService.create({
          name: defaultTemplate.name,
          subject: defaultTemplate.subject,
          content: defaultTemplate.content,
          user_email: userEmail,
        });
        addedCount++;
        toast.loading(
          `Adding templates... (${addedCount}/${templatesToAdd.length})`,
          {
            id: toastId,
          },
        );
      }

      toast.success(`Added ${templatesToAdd.length} starter templates!`, {
        id: toastId,
      });
      fetchTemplates();
    } catch (error) {
      componentLogger.error(
        "Error adding default templates",
        error instanceof Error ? error : undefined,
      );
      toast.error("Failed to add some templates");
    }
    setIsLoading(false);
  };

  // Apply a default template directly (without saving)
  const applyDefaultTemplate = (
    defaultTemplate: (typeof DEFAULT_TEMPLATES)[0],
  ) => {
    sessionStorage.setItem(
      "selectedTemplate",
      JSON.stringify({
        subject: defaultTemplate.subject,
        content: defaultTemplate.content,
      }),
    );
    router.push("/compose");
    toast.success("Template loaded in composer");
  };

  const updateTemplate = async (
    editingTemplate: EmailTemplate,
    saveVersion: boolean,
    changeNote: string,
  ) => {
    if (!editingTemplate?.$id) {
      return;
    }

    setIsLoading(true);
    try {
      await templatesService.update(editingTemplate.$id, {
        name: editingTemplate.name,
        subject: editingTemplate.subject,
        content: editingTemplate.content,
        category: editingTemplate.category,
        saveVersion,
        changeNote: changeNote.trim() || undefined,
      });

      toast.success(
        saveVersion ? "Template updated (version saved)" : "Template updated!",
      );
      fetchTemplates();
    } catch (error) {
      componentLogger.error(
        "Error updating template",
        error instanceof Error ? error : undefined,
      );
      toast.error("Failed to update template");
    }
    setIsLoading(false);
  };

  const deleteTemplate = async (templateId: string) => {
    // Store for potential rollback
    const templateToDelete = templates.find((t) => t.$id === templateId);
    if (!templateToDelete) {
      return;
    }

    // Optimistically remove from UI
    setTemplates((prev) => prev.filter((t) => t.$id !== templateId));
    toast.success("Template deleted");

    try {
      await templatesService.delete(templateId);
      // Real-time subscription will handle sync
    } catch (error) {
      // Revert on error
      setTemplates((prev) => [...prev, templateToDelete]);
      componentLogger.error(
        "Error deleting template",
        error instanceof Error ? error : undefined,
      );
      toast.error("Failed to delete template - restored");
    }
  };

  const duplicateTemplate = async (template: EmailTemplate) => {
    if (!userEmail) {
      return;
    }

    try {
      await templatesService.create({
        name: `${template.name} (Copy)`,
        subject: template.subject,
        content: template.content,
        category: template.category,
        user_email: userEmail,
      });

      toast.success("Template duplicated!");
      fetchTemplates();
    } catch (error) {
      componentLogger.error(
        "Error duplicating template",
        error instanceof Error ? error : undefined,
      );
      toast.error("Failed to duplicate template");
    }
  };

  const applyTemplate = (template: EmailTemplate) => {
    // Store template in sessionStorage and redirect to compose
    sessionStorage.setItem(
      "selectedTemplate",
      JSON.stringify({
        subject: template.subject,
        content: template.content,
      }),
    );
    router.push("/compose");
    toast.success("Template loaded in composer");
  };

  // Fetch version history for a template
  const fetchVersions = async (template: EmailTemplate) => {
    if (!template.$id) {
      return;
    }

    setIsLoadingVersions(true);
    setVersioningTemplate(template);
    setShowVersionsDialog(true);

    try {
      const response = await templatesService.getVersions(template.$id);
      setVersions(response.documents as unknown as TemplateVersion[]);
    } catch (error) {
      componentLogger.error(
        "Error fetching template versions",
        error instanceof Error ? error : undefined,
      );
      // Collection might not exist yet
      setVersions([]);
    }
    setIsLoadingVersions(false);
  };

  // Restore a previous version
  const restoreVersion = async (version: TemplateVersion) => {
    if (!versioningTemplate?.$id) {
      return;
    }

    setIsLoading(true);
    try {
      await templatesService.restoreVersion(
        versioningTemplate.$id,
        version.$id!,
      );
      toast.success(`Restored to version ${version.version}`);
      setShowVersionsDialog(false);
      setVersioningTemplate(null);
      fetchTemplates();
    } catch (error) {
      componentLogger.error(
        "Error restoring template version",
        error instanceof Error ? error : undefined,
      );
      toast.error("Failed to restore version");
    }
    setIsLoading(false);
  };

  return {
    isLoading,
    showVersionsDialog,
    setShowVersionsDialog,
    versioningTemplate,
    setVersioningTemplate,
    versions,
    setVersions,
    isLoadingVersions,
    createTemplate,
    addDefaultTemplate,
    addAllDefaultTemplates,
    applyDefaultTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    applyTemplate,
    fetchVersions,
    restoreVersion,
  };
}
