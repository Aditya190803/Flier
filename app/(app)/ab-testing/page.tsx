"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import {
  Beaker,
  Plus,
  Trash2,
  Play,
  CheckCircle2,
  Trophy,
  BarChart3,
  Mail,
  MousePointerClick,
  Eye,
  Users,
  ArrowRight,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { RichTextEditor } from "@/components/rich-text-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageShell, PageHeader, EmptyState } from "@/components/ui/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useAbTests } from "@/hooks/useAbTests";
import type { ABTest } from "@/lib/appwrite";
import { abTestsService } from "@/lib/appwrite";
import { componentLogger } from "@/lib/client-logger";

export default function ABTestingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { tests, loading, contacts, submitting, fetchTests, createTest, startTest } = useAbTests(
    session?.user?.email ?? undefined,
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null);

  // Form state
  const [testName, setTestName] = useState("");
  const [testType, setTestType] = useState<"subject" | "content">("subject");
  const [variantASubject, setVariantASubject] = useState("");
  const [variantBSubject, setVariantBSubject] = useState("");
  const [variantAContent, setVariantAContent] = useState("");
  const [variantBContent, setVariantBContent] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  const resetForm = () => {
    setTestName("");
    setTestType("subject");
    setVariantASubject("");
    setVariantBSubject("");
    setVariantAContent("");
    setVariantBContent("");
    setSelectedContacts([]);
  };

  const handleCreateTest = async () => {
    const ok = await createTest({
      name: testName,
      testType,
      variantASubject,
      variantBSubject,
      variantAContent,
      variantBContent,
      selectedContacts,
    });
    if (ok) {
      setShowCreateDialog(false);
      resetForm();
    }
  };

  const handleCompleteTest = async (test: ABTest) => {
    if (!test.$id) {
      return;
    }

    try {
      await abTestsService.complete(test.$id);
      toast.success("A/B test completed!");
      fetchTests();
    } catch (error) {
      componentLogger.error(
        "Error completing A/B test",
        error instanceof Error ? error : undefined,
      );
      toast.error("Failed to complete A/B test");
    }
  };

  const handleDeleteTest = async (testId: string) => {
    try {
      await abTestsService.delete(testId);
      toast.success("A/B test deleted");
      fetchTests();
    } catch (error) {
      componentLogger.error("Error deleting A/B test", error instanceof Error ? error : undefined);
      toast.error("Failed to delete A/B test");
    }
  };

  const viewTestDetails = (test: ABTest) => {
    setSelectedTest(test);
    setShowDetailsDialog(true);
  };

  const getStatusBadge = (status: string, winner?: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "running":
        return <Badge variant="warning">Running</Badge>;
      case "completed":
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <Trophy className="h-3 w-3" />
            {winner ? `Variant ${winner} wins` : "Completed"}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const calculateRate = (numerator: number, denominator: number) => {
    if (denominator === 0) {
      return "0%";
    }
    return `${((numerator / denominator) * 100).toFixed(1)}%`;
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Skeleton */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-5 w-64" />
            </div>
            <Skeleton className="h-11 w-32" />
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, idx) => (
              <Card key={idx} className="border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-7 w-12" />
                    </div>
                    <Skeleton className="h-10 w-10 rounded-lg" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tests List Skeleton */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-56" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(3)].map((_, idx) => (
                  <div key={idx} className="border rounded-xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-5 w-48" />
                          <Skeleton className="h-5 w-20 rounded-full" />
                        </div>
                        <div className="flex items-center gap-4">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-28" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-20" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg border">
                        <Skeleton className="h-4 w-20 mb-2" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                      <div className="p-3 rounded-lg border">
                        <Skeleton className="h-4 w-20 mb-2" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <>
      <PageShell>
        <PageHeader
          title="A/B Testing"
          description="Test different email variants to optimize your campaigns"
          actions={
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Test
            </Button>
          }
        />

        {/* Tests List */}
        {tests.length === 0 ? (
          <EmptyState
            icon={<Beaker className="w-8 h-8" />}
            title="No A/B Tests Yet"
            description="Create your first A/B test to compare different subject lines or email content."
            action={
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create A/B Test
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {tests.map((test) => (
              <Card key={test.$id} className="hover:shadow-md transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{test.name}</h3>
                        {getStatusBadge(test.status, test.winner)}
                        <Badge variant="outline" className="capitalize">
                          {test.test_type} test
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-6 mt-4">
                        {/* Variant A */}
                        <div
                          className={`p-4 rounded-lg border-2 ${test.winner === "A" ? "border-success bg-success/5" : "border-border"}`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-medium">Variant A</span>
                            {test.winner === "A" && <Trophy className="h-4 w-4 text-success" />}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {test.variant_a_subject}
                          </p>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <div className="text-lg font-semibold">
                                {test.variant_a_recipients?.length || 0}
                              </div>
                              <div className="text-xs text-muted-foreground">Recipients</div>
                            </div>
                            <div>
                              <div className="text-lg font-semibold">{test.variant_a_opens}</div>
                              <div className="text-xs text-muted-foreground">Opens</div>
                            </div>
                            <div>
                              <div className="text-lg font-semibold">
                                {calculateRate(test.variant_a_opens, test.variant_a_sent)}
                              </div>
                              <div className="text-xs text-muted-foreground">Rate</div>
                            </div>
                          </div>
                        </div>

                        {/* Variant B */}
                        <div
                          className={`p-4 rounded-lg border-2 ${test.winner === "B" ? "border-success bg-success/5" : "border-border"}`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-medium">Variant B</span>
                            {test.winner === "B" && <Trophy className="h-4 w-4 text-success" />}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {test.variant_b_subject}
                          </p>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <div className="text-lg font-semibold">
                                {test.variant_b_recipients?.length || 0}
                              </div>
                              <div className="text-xs text-muted-foreground">Recipients</div>
                            </div>
                            <div>
                              <div className="text-lg font-semibold">{test.variant_b_opens}</div>
                              <div className="text-xs text-muted-foreground">Opens</div>
                            </div>
                            <div>
                              <div className="text-lg font-semibold">
                                {calculateRate(test.variant_b_opens, test.variant_b_sent)}
                              </div>
                              <div className="text-xs text-muted-foreground">Rate</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {test.status === "draft" && (
                        <Button size="sm" onClick={() => startTest(test)}>
                          <Play className="h-4 w-4 mr-1" />
                          Start
                        </Button>
                      )}
                      {test.status === "running" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCompleteTest(test)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => viewTestDetails(test)}>
                        <BarChart3 className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteTest(test.$id!)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </PageShell>

      {/* Create Test Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Beaker className="h-5 w-5 text-primary" />
              Create A/B Test
            </DialogTitle>
            <DialogDescription>Set up a split test to compare two email variants</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Test Name */}
            <div className="space-y-2">
              <Label htmlFor="testName">Test Name</Label>
              <Input
                id="testName"
                placeholder="e.g., Subject Line Test - Newsletter"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
              />
            </div>

            {/* Test Type */}
            <div className="space-y-2">
              <Label>Test Type</Label>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={testType === "subject" ? "default" : "outline"}
                  onClick={() => setTestType("subject")}
                  className="flex-1"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Subject Line
                </Button>
                <Button
                  type="button"
                  variant={testType === "content" ? "default" : "outline"}
                  onClick={() => setTestType("content")}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Content
                </Button>
              </div>
            </div>

            {/* Variants */}
            <div className="grid grid-cols-2 gap-4">
              {/* Variant A */}
              <div className="space-y-3 p-4 border rounded-lg bg-primary/5">
                <h4 className="font-medium flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    A
                  </span>
                  Variant A
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="subjectA">Subject Line</Label>
                  <Input
                    id="subjectA"
                    placeholder="Enter subject line A"
                    value={variantASubject}
                    onChange={(e) => setVariantASubject(e.target.value)}
                  />
                </div>
                {testType === "content" && (
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <div className="min-h-[150px] border rounded-lg overflow-hidden">
                      <RichTextEditor
                        content={variantAContent}
                        onChange={setVariantAContent}
                        placeholder="Write variant A content..."
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Variant B */}
              <div className="space-y-3 p-4 border rounded-lg bg-secondary/5">
                <h4 className="font-medium flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-sm font-bold">
                    B
                  </span>
                  Variant B
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="subjectB">Subject Line</Label>
                  <Input
                    id="subjectB"
                    placeholder="Enter subject line B"
                    value={variantBSubject}
                    onChange={(e) => setVariantBSubject(e.target.value)}
                    disabled={testType === "content"}
                  />
                </div>
                {testType === "content" && (
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <div className="min-h-[150px] border rounded-lg overflow-hidden">
                      <RichTextEditor
                        content={variantBContent}
                        onChange={setVariantBContent}
                        placeholder="Write variant B content..."
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recipients */}
            <div className="space-y-3">
              <Label>Test Recipients ({selectedContacts.length} selected)</Label>
              <p className="text-sm text-muted-foreground">
                Recipients will be randomly split between variants A and B
              </p>
              <div className="max-h-[200px] overflow-y-auto border rounded-lg p-2">
                {contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4 text-center">
                    No contacts found. Add contacts first.
                  </p>
                ) : (
                  <div className="space-y-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start mb-2"
                      onClick={() => {
                        if (selectedContacts.length === contacts.length) {
                          setSelectedContacts([]);
                        } else {
                          setSelectedContacts([...contacts]);
                        }
                      }}
                    >
                      {selectedContacts.length === contacts.length ? "Deselect All" : "Select All"}
                    </Button>
                    {contacts.map((email) => (
                      <label
                        key={email}
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedContacts.includes(email)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedContacts([...selectedContacts, email]);
                            } else {
                              setSelectedContacts(selectedContacts.filter((c) => c !== email));
                            }
                          }}
                          className="rounded border-input"
                        />
                        <span className="text-sm">{email}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {selectedContacts.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <span>Variant A: {Math.ceil(selectedContacts.length / 2)} recipients</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-secondary" />
                    <span>Variant B: {Math.floor(selectedContacts.length / 2)} recipients</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTest} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Test Results: {selectedTest?.name}
            </DialogTitle>
            <DialogDescription>Detailed comparison of both variants</DialogDescription>
          </DialogHeader>

          {selectedTest && (
            <div className="space-y-6 py-4">
              {/* Status */}
              <div className="flex items-center gap-3">
                {getStatusBadge(selectedTest.status, selectedTest.winner)}
                <Badge variant="outline" className="capitalize">
                  {selectedTest.test_type} test
                </Badge>
                {selectedTest.created_at && (
                  <span className="text-sm text-muted-foreground">
                    Created {new Date(selectedTest.created_at).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Comparison Cards */}
              <div className="grid grid-cols-2 gap-6">
                {/* Variant A */}
                <Card className={selectedTest.winner === "A" ? "border-success border-2" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                          A
                        </span>
                        Variant A
                      </CardTitle>
                      {selectedTest.winner === "A" && (
                        <Badge variant="success" className="flex items-center gap-1">
                          <Trophy className="h-3 w-3" />
                          Winner
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="line-clamp-2">
                      {selectedTest.variant_a_subject}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                          <div className="text-2xl font-bold">
                            {selectedTest.variant_a_recipients?.length || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">Recipients</div>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <Mail className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                          <div className="text-2xl font-bold">{selectedTest.variant_a_sent}</div>
                          <div className="text-xs text-muted-foreground">Sent</div>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <Eye className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                          <div className="text-2xl font-bold">{selectedTest.variant_a_opens}</div>
                          <div className="text-xs text-muted-foreground">Opens</div>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <MousePointerClick className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                          <div className="text-2xl font-bold">{selectedTest.variant_a_clicks}</div>
                          <div className="text-xs text-muted-foreground">Clicks</div>
                        </div>
                      </div>
                      <div className="pt-2 border-t">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Open Rate</span>
                          <span className="font-semibold">
                            {calculateRate(
                              selectedTest.variant_a_opens,
                              selectedTest.variant_a_sent,
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-muted-foreground">Click Rate</span>
                          <span className="font-semibold">
                            {calculateRate(
                              selectedTest.variant_a_clicks,
                              selectedTest.variant_a_sent,
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Variant B */}
                <Card className={selectedTest.winner === "B" ? "border-success border-2" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-sm font-bold">
                          B
                        </span>
                        Variant B
                      </CardTitle>
                      {selectedTest.winner === "B" && (
                        <Badge variant="success" className="flex items-center gap-1">
                          <Trophy className="h-3 w-3" />
                          Winner
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="line-clamp-2">
                      {selectedTest.variant_b_subject}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                          <div className="text-2xl font-bold">
                            {selectedTest.variant_b_recipients?.length || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">Recipients</div>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <Mail className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                          <div className="text-2xl font-bold">{selectedTest.variant_b_sent}</div>
                          <div className="text-xs text-muted-foreground">Sent</div>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <Eye className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                          <div className="text-2xl font-bold">{selectedTest.variant_b_opens}</div>
                          <div className="text-xs text-muted-foreground">Opens</div>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <MousePointerClick className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                          <div className="text-2xl font-bold">{selectedTest.variant_b_clicks}</div>
                          <div className="text-xs text-muted-foreground">Clicks</div>
                        </div>
                      </div>
                      <div className="pt-2 border-t">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Open Rate</span>
                          <span className="font-semibold">
                            {calculateRate(
                              selectedTest.variant_b_opens,
                              selectedTest.variant_b_sent,
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-muted-foreground">Click Rate</span>
                          <span className="font-semibold">
                            {calculateRate(
                              selectedTest.variant_b_clicks,
                              selectedTest.variant_b_sent,
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Statistical Summary */}
              {selectedTest.status === "completed" && (
                <Card>
                  <CardContent className="p-5">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Statistical Summary
                    </h4>
                    {selectedTest.winner === "tie" ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <AlertTriangle className="h-4 w-4" />
                        Results were too close to determine a clear winner (within 5% difference)
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p>
                          <strong>Variant {selectedTest.winner}</strong> performed better with a{" "}
                          {Math.abs(
                            (selectedTest.variant_a_opens / (selectedTest.variant_a_sent || 1)) *
                              100 -
                              (selectedTest.variant_b_opens / (selectedTest.variant_b_sent || 1)) *
                                100,
                          ).toFixed(1)}
                          % difference in open rates.
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Consider using {selectedTest.winner === "A" ? "Variant A" : "Variant B"}
                          's approach for future campaigns.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
