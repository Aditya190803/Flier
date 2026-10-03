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
  Settings,
  ChevronRight,
  ShieldCheck,
  Shield,
  Users,
  FileText,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageShell, PageHeader } from "@/components/ui/page-shell";
import { useAuthGuard } from "@/hooks/useAuthGuard";

const settingsCategories = [
  {
    title: "Account & Workspace",
    items: [
      {
        name: "Profile & Preferences",
        description: "Update your personal profile and default preferences",
        icon: User,
        color: "text-info",
        bgColor: "bg-info/10",
        comingSoon: true,
      },
      {
        name: "Workspace",
        description: "Manage workspace details, branding, and defaults",
        icon: Building2,
        color: "text-primary",
        bgColor: "bg-primary/10",
        comingSoon: true,
      },
      {
        name: "Team & Roles",
        description: "Manage teams, membership, and collaboration access",
        icon: Users,
        href: "/settings/teams",
        color: "text-success",
        bgColor: "bg-success/10",
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
        color: "text-secondary",
        bgColor: "bg-secondary/10",
        comingSoon: true,
      },
      {
        name: "Signatures",
        description: "Create and manage reusable email signatures",
        icon: PenSquare,
        href: "/settings/signatures",
        color: "text-primary",
        bgColor: "bg-primary/10",
      },
      {
        name: "Domains & Authentication",
        description: "Set up domains and email authentication records",
        icon: Globe2,
        color: "text-warning",
        bgColor: "bg-warning/10",
        comingSoon: true,
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
        color: "text-info",
        bgColor: "bg-info/10",
        comingSoon: true,
      },
      {
        name: "Webhooks",
        description: "Configure webhook notifications for email events",
        icon: Link2,
        href: "/settings/webhooks",
        color: "text-secondary",
        bgColor: "bg-secondary/10",
      },
      {
        name: "Unsubscribes",
        description: "Manage suppression lists and unsubscribe records",
        icon: UserMinus,
        href: "/settings/unsubscribes",
        color: "text-destructive",
        bgColor: "bg-destructive/10",
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
        color: "text-success",
        bgColor: "bg-success/10",
      },
      {
        name: "Audit Logs",
        description: "Review workspace activity and security-related actions",
        icon: FileText,
        href: "/settings/audit-logs",
        color: "text-muted-foreground",
        bgColor: "bg-muted",
      },
    ],
  },
];

export default function SettingsPage() {
  const { status: _status, isLoading, session } = useAuthGuard();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <PageShell className="max-w-4xl">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            Settings
          </div>
        }
        description="Manage your Flier account, sending setup, and workspace controls"
      />

      {/* Settings Categories */}
      <div className="space-y-8">
        {settingsCategories.map((category) => (
          <div key={category.title}>
            <h2 className="text-lg font-semibold mb-4">{category.title}</h2>
            <div className="grid gap-4">
              {category.items.map((item) => (
                <Card key={item.name} className="transition-all duration-200 hover:shadow-md">
                  {item.href ? (
                    <Link href={item.href}>
                      <CardContent className="p-5">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl ${item.bgColor}`}>
                            <item.icon className={`h-6 w-6 ${item.color}`} />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold">{item.name}</h3>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Link>
                  ) : (
                    <CardContent className="p-5">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${item.bgColor}`}>
                          <item.icon className={`h-6 w-6 ${item.color}`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold flex items-center gap-2">
                            {item.name}
                            {item.comingSoon ? (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                Coming soon
                              </span>
                            ) : null}
                          </h3>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Account Info */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-5 w-5 text-success" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{session?.user?.email}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{session?.user?.name || "Not set"}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Authentication</span>
              <span className="font-medium">Google OAuth</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
