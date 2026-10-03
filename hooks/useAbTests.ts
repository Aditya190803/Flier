"use client";

import { useCallback, useEffect, useState } from "react";

import { toast } from "sonner";

import { abTestsService, contactsService, type ABTest } from "@/lib/appwrite";
import { componentLogger } from "@/lib/client-logger";
import { CSRF_HEADER_NAME, CSRF_TOKEN_NAME } from "@/lib/constants";
import { getCookie } from "@/lib/utils";

export function useAbTests(userEmail: string | undefined) {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchTests = useCallback(async () => {
    if (!userEmail) {
      return;
    }
    try {
      const response = await abTestsService.listByUser(userEmail);
      setTests(response.documents);
    } catch (error) {
      componentLogger.error("Error fetching A/B tests", error instanceof Error ? error : undefined);
      toast.error("Failed to load A/B tests");
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  const fetchContacts = useCallback(async () => {
    if (!userEmail) {
      return;
    }
    try {
      const response = await contactsService.listByUser(userEmail);
      setContacts(response.documents.map((c) => c.email));
    } catch (error) {
      componentLogger.error("Error fetching contacts", error instanceof Error ? error : undefined);
    }
  }, [userEmail]);

  useEffect(() => {
    fetchTests();
    fetchContacts();
  }, [fetchTests, fetchContacts]);

  const createTest = async (input: {
    name: string;
    testType: "subject" | "content";
    variantASubject: string;
    variantBSubject: string;
    variantAContent: string;
    variantBContent: string;
    selectedContacts: string[];
  }) => {
    if (!userEmail) {
      return false;
    }
    if (!input.name.trim()) {
      toast.error("Please enter a test name");
      return false;
    }
    if (input.selectedContacts.length < 2) {
      toast.error("Please select at least 2 contacts for testing");
      return false;
    }
    if (
      input.testType === "subject" &&
      (!input.variantASubject.trim() || !input.variantBSubject.trim())
    ) {
      toast.error("Please enter both subject line variants");
      return false;
    }
    if (
      input.testType === "content" &&
      (!input.variantAContent.trim() || !input.variantBContent.trim())
    ) {
      toast.error("Please enter both content variants");
      return false;
    }

    setSubmitting(true);
    try {
      const shuffled = [...input.selectedContacts].sort(() => Math.random() - 0.5);
      const midpoint = Math.ceil(shuffled.length / 2);

      await abTestsService.create({
        name: input.name,
        status: "draft",
        test_type: input.testType,
        variant_a_subject:
          input.testType === "subject"
            ? input.variantASubject
            : input.variantASubject || "A/B Test Email",
        variant_b_subject:
          input.testType === "subject"
            ? input.variantBSubject
            : input.variantASubject || "A/B Test Email",
        variant_a_content: input.variantAContent || "<p>Test content for variant A</p>",
        variant_b_content:
          input.testType === "content"
            ? input.variantBContent
            : input.variantAContent || "<p>Test content</p>",
        variant_a_recipients: shuffled.slice(0, midpoint),
        variant_b_recipients: shuffled.slice(midpoint),
        user_email: userEmail,
      });

      toast.success("A/B test created!");
      await fetchTests();
      return true;
    } catch (error) {
      componentLogger.error("Error creating A/B test", error instanceof Error ? error : undefined);
      toast.error("Failed to create A/B test");
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const startTest = async (test: ABTest) => {
    if (!test.$id) {
      return false;
    }
    try {
      const csrfToken = getCookie(CSRF_TOKEN_NAME);
      await abTestsService.update(test.$id, { status: "running" });

      for (const [variant, payload] of [
        [
          "A",
          {
            recipients: test.variant_a_recipients,
            subject: test.variant_a_subject,
            content: test.variant_a_content,
            abTestId: test.$id,
            abVariant: "A",
          },
        ],
        [
          "B",
          {
            recipients: test.variant_b_recipients,
            subject: test.variant_b_subject,
            content: test.variant_b_content,
            abTestId: test.$id,
            abVariant: "B",
          },
        ],
      ] as const) {
        const response = await fetch("/api/send-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
          },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error(`Failed to send variant ${variant}`);
        }
      }

      await abTestsService.updateStats(test.$id, "A", {
        sent: test.variant_a_recipients.length,
      });
      await abTestsService.updateStats(test.$id, "B", {
        sent: test.variant_b_recipients.length,
      });

      toast.success("A/B test started — variants are sending");
      await fetchTests();
      return true;
    } catch (error) {
      componentLogger.error("Error starting A/B test", error instanceof Error ? error : undefined);
      toast.error("Failed to start A/B test");
      try {
        if (test.$id) {
          await abTestsService.update(test.$id, { status: "draft" });
        }
      } catch {
        // ignore rollback failure
      }
      await fetchTests();
      return false;
    }
  };

  return {
    tests,
    loading,
    contacts,
    submitting,
    fetchTests,
    createTest,
    startTest,
  };
}
