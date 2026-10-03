"use client";

import Link from "next/link";

import { Building2, Mail, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function EnterprisePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center mb-10">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-4">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-3">Enterprise</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Custom send limits, invoice billing, SSO, SLAs, and multi-seat workspaces. No public price
          — we scope it with you.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What you get</CardTitle>
          <CardDescription>Everything in Pro, plus whatever your team needs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex gap-2">
            <Shield className="h-4 w-4 text-primary mt-0.5" />
            Custom daily/monthly email caps (incl. Workspace-scale)
          </div>
          <div className="flex gap-2">
            <Shield className="h-4 w-4 text-primary mt-0.5" />
            Invoice / net-30 and GST paperwork
          </div>
          <div className="flex gap-2">
            <Shield className="h-4 w-4 text-primary mt-0.5" />
            Priority support and onboarding
          </div>
          <div className="flex gap-2">
            <Shield className="h-4 w-4 text-primary mt-0.5" />
            Security reviews and custom retention
          </div>

          <div className="pt-6 flex flex-col sm:flex-row gap-3">
            <Button asChild className="flex-1">
              <a href="mailto:adityamer.work@gmail.com?subject=Flier%20Enterprise">
                <Mail className="h-4 w-4 mr-2" />
                Email sales
              </a>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/pricing">Compare plans</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
