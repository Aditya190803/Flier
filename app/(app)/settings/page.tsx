"use client";

import Link from "next/link";

import {
  User,
  Building2,
  Send,
  PenSquare,
  Globe2,
  Plug,
  Link2,
  UserMinus,
  ChevronRight,
  ShieldCheck,
  Shield,
  Users,
  FileText,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageShell, PageHeader } from "@/components/ui/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthGuard } from "@/hooks/useAuthGuard";

interface SettingsItem {
  name: string;
  description: string;
  icon: LucideIcon;
  /** Items without an href are not built yet and are listed under "Coming soon". */
  href?: string;
}

const settingsCategories: { title: string; items: SettingsItem[] }[] = [
  {
    title: "Account & Workspace",
    items: [
      {
        name: "Profile & Preferences",
        description: "Update your personal profile and default preferences",
        icon: User,
      },
      {
        name: "Workspace",
        description: "Manage workspace details, branding, and defaults",
        icon: Building2,
      },
      {
        name: "Team & Roles",
        description: "Manage teams, membership, and collaboration access",
        icon: Users,
        href: "/settings/teams",
      },
    ],
  },
  {
    title: "Sending",
    items: [
      {
        name: "Sending Setup",
        description: "Configure sender defaults and delivery behavior",
        icon: Send,
      },
      {
        name: "Signatures",
        description: "Create and manage reusable email signatures",
        icon: PenSquare,
        href: "/settings/signatures",
      },
      {
        name: "Domains & Authentication",
        description: "Set up domains and email authentication records",
        icon: Globe2,
      },
    ],
  },
  {
    title: "Integrations & Automation",
    items: [
      {
        name: "Integrations",
        description: "Connect Flier with external tools and services",
        icon: Plug,
      },
      {
        name: "Webhooks",
        description: "Configure webhook notifications for email events",
        icon: Link2,
        href: "/settings/webhooks",
      },
      {
        name: "Unsubscribes",
        description: "Manage suppression lists and unsubscribe records",
        icon: UserMinus,
        href: "/settings/unsubscribes",
      },
    ],
  },
  {
    title: "Privacy & Security",
    items: [
      {
        name: "Privacy & Data",
        description: "Manage exports, retention, and privacy controls",
        icon: Shield,
        href: "/settings/gdpr",
      },
      {
        name: "Audit Logs",
        description: "Review workspace activity and security-related actions",
        icon: FileText,
        href: "/settings/audit-logs",
      },
    ],
  },
];

const comingSoon = settingsCategories.flatMap((category) =>
  category.items.filter((item) => !item.href),
);

function SettingsSkeleton() {
  return (
    <PageShell className="max-w-4xl">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-80" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-5 w-48" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        </div>
      ))}
    </PageShell>
  );
}

export default function SettingsPage() {
  const { isLoading, session } = useAuthGuard();

  if (isLoading) {
    return <SettingsSkeleton />;
  }

  return (
    <PageShell className="max-w-4xl">
      <PageHeader
        title="Settings"
        description="Manage your Flier account, sending setup, and workspace controls"
      />

      <div className="space-y-8">
        {settingsCategories.map((category) => {
          const available = category.items.filter((item) => item.href);
          if (available.length === 0) {
            return null;
          }
          return (
            <section key={category.title}>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">{category.title}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {available.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href!}
                    className="group rounded-xl border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-lg bg-primary/10 shrink-0">
                        <item.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-5 w-5 text-success" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3">
            <div className="flex items-center justify-between gap-4 py-2 border-b">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium truncate">{session?.user?.email}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2 border-b">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium truncate">{session?.user?.name || "Not set"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2">
              <dt className="text-muted-foreground">Authentication</dt>
              <dd className="font-medium">Google OAuth</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {comingSoon.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Coming soon</h2>
          <ul className="flex flex-wrap gap-2">
            {comingSoon.map((item) => (
              <li
                key={item.name}
                title={item.description}
                className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1 text-xs text-muted-foreground"
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.name}
              </li>
            ))}
          </ul>
        </section>
      )}
    </PageShell>
  );
}
