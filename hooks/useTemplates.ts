"use client";

import { useCallback, useEffect, useState } from "react";

import { toast } from "sonner";

import { templatesService, type EmailTemplate } from "@/lib/appwrite";
import { componentLogger } from "@/lib/client-logger";

export function useTemplates(userEmail: string | undefined) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const fetchTemplates = useCallback(async () => {
    if (!userEmail) {
      return;
    }
    try {
      const response = await templatesService.listByUser(userEmail);
      const templatesData = response.documents.map((doc) => {
        const d = doc as EmailTemplate & { $id: string };
        return {
          $id: d.$id,
          name: d.name,
          subject: d.subject,
          content: d.content,
          category: d.category,
          user_email: d.user_email,
          created_at: d.created_at,
          updated_at: d.updated_at,
        } as EmailTemplate;
      });
      setTemplates(templatesData);
    } catch (error) {
      componentLogger.error("Error fetching templates", error instanceof Error ? error : undefined);
      toast.error("Failed to load templates");
    }
  }, [userEmail]);

  useEffect(() => {
    if (!userEmail) {
      return;
    }
    const load = async () => {
      await fetchTemplates();
      setIsLoadingData(false);
    };
    load();
    const unsubscribe = templatesService.subscribeToUserTemplates(userEmail, () => {
      fetchTemplates();
    });
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userEmail, fetchTemplates]);

  return {
    templates,
    setTemplates,
    isLoadingData,
    fetchTemplates,
  };
}
