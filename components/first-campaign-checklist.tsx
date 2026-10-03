"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { contactsService, templatesService } from "@/lib/appwrite";

export function FirstCampaignChecklist({ userEmail, sent }: { userEmail: string; sent: boolean }) {
  const [contacts, setContacts] = useState<boolean | null>(null);
  const [templates, setTemplates] = useState<boolean | null>(null);
  const [tested, setTested] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.allSettled([
      contactsService.listByUser(userEmail),
      templatesService.listByUser(userEmail),
    ]).then(([people, copy]) => {
      if (!active) {
        return;
      }
      if (people.status === "fulfilled") {
        setContacts(people.value.documents.length > 0);
      }
      if (copy.status === "fulfilled") {
        setTemplates(copy.value.documents.length > 0);
      }
    });
    try {
      setTested(localStorage.getItem(`flier:test-sent:${userEmail}`) === "true");
    } catch {
      setTested(false);
    }
    return () => {
      active = false;
    };
  }, [userEmail]);
  if (sent) {
    return null;
  }
  const steps = [
    { label: "Add or import your contacts", href: "/contacts", done: contacts },
    { label: "Choose or save a template (optional)", href: "/templates", done: templates },
    { label: "Compose, check and send yourself a test", href: "/compose", done: tested },
    { label: "Queue your first campaign and follow its progress", href: "/scheduled", done: false },
  ];
  return (
    <section aria-label="First campaign checklist" className="rounded-lg border p-4 space-y-3">
      <h2 className="font-medium">Your first campaign</h2>
      <p className="text-sm text-muted-foreground">
        Follow these steps at your own pace. Test completion is recorded in this browser.
      </p>
      <ol className="grid gap-2 sm:grid-cols-2 text-sm">
        {steps.map((step) => (
          <li key={step.label}>
            <Link className="underline underline-offset-4" href={step.href}>
              {step.done ? "✓ " : "○ "}
              {step.label}
            </Link>
            {step.done === null && (
              <span className="text-muted-foreground"> · status unavailable</span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
