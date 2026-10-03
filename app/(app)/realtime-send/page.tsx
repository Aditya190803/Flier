"use client";

import { useState } from "react";

import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageShell, PageHeader } from "@/components/ui/page-shell";
import { Progress } from "@/components/ui/progress";
import { componentLogger } from "@/lib/client-logger";

export default function RealtimeSendPage() {
  const [emailCount, setEmailCount] = useState("50");
  const [isLoading, setIsLoading] = useState(false);
  const [showSendingScreen, setShowSendingScreen] = useState(false);

  // Real-time progress tracking
  const [sendProgress, setSendProgress] = useState(0);
  const [emailsSent, setEmailsSent] = useState(0);
  const [emailsRemaining, setEmailsRemaining] = useState(0);
  const [processingStatus, setProcessingStatus] = useState("");
  const [currentProcessingMethod, setCurrentProcessingMethod] = useState("");

  const simulateEmailSending = async () => {
    const totalEmails = parseInt(emailCount) || 50;

    // Start the sending process
    setIsLoading(true);
    setShowSendingScreen(true);
    setSendProgress(0);
    setEmailsSent(0);
    setEmailsRemaining(totalEmails);

    // Always use sequential sending (no more chunking/batching)
    setCurrentProcessingMethod("📧 Sequential Email Sending");
    setProcessingStatus(`Sending ${totalEmails} emails one by one...`);

    // Simulate sequential sending (one email at a time)
    for (let i = 0; i < totalEmails; i++) {
      setProcessingStatus(`Sending email ${i + 1} of ${totalEmails}`);

      // Simulate the time it takes to send one email
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second per email (realistic)

      // Update counters AFTER the email is "sent"
      const sentCount = i + 1;
      const remainingCount = totalEmails - sentCount;

      componentLogger.debug("Email completed", {
        index: i + 1,
        sentCount,
        remainingCount,
      });

      setEmailsSent(sentCount);
      setEmailsRemaining(remainingCount);
      setSendProgress(Math.round((sentCount / totalEmails) * 90));
    }

    // Finalize with correct counts
    setSendProgress(90);
    setProcessingStatus("Saving campaign data...");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setSendProgress(100);
    setProcessingStatus(`Campaign completed! ${totalEmails} emails sent successfully.`);
    setEmailsSent(totalEmails); // Ensure final count is correct
    setEmailsRemaining(0); // Ensure remaining is 0
    setIsLoading(false);

    // Auto-close after 3 seconds
    setTimeout(() => {
      setShowSendingScreen(false);
    }, 3000);
  };

  return (
    <>
      <PageShell>
        <PageHeader
          title="Real-time Sending"
          description="Simulate real-time email sending progress tracking."
        />
        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Real-time Email Sending Demo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="emailCount">Number of emails to simulate</Label>
                <Input
                  id="emailCount"
                  type="number"
                  value={emailCount}
                  onChange={(e) => setEmailCount(e.target.value)}
                  placeholder="Enter number of emails"
                  min="1"
                  max="1000"
                />
              </div>

              <Button onClick={simulateEmailSending} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" /> Start Sending
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageShell>

      {/* Real-time Sending Screen - Full Screen Overlay */}
      {showSendingScreen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl border-2 border-primary/20">
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Header */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <h2 className="text-2xl font-bold">Sending Your Campaign</h2>
                  </div>
                  <p className="text-muted-foreground">
                    Please keep this window open while we send your emails
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Overall Progress</span>
                    <span className="text-sm font-bold text-primary">{sendProgress}%</span>
                  </div>
                  <Progress value={sendProgress} className="w-full h-4" />
                </div>

                {/* Real-time Statistics */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center p-6 bg-success/10 rounded-lg border-2 border-success/20">
                    <div className="text-4xl font-bold text-success mb-2">{emailsSent}</div>
                    <div className="text-sm font-medium text-success">Emails Sent</div>
                  </div>
                  <div className="text-center p-6 bg-warning/10 rounded-lg border-2 border-warning/20">
                    <div className="text-4xl font-bold text-warning mb-2">{emailsRemaining}</div>
                    <div className="text-sm font-medium text-warning">Remaining</div>
                  </div>
                </div>

                {/* Processing Method Info */}
                {currentProcessingMethod && (
                  <div className="text-center p-4 bg-muted rounded-lg border border-border">
                    <div className="text-lg font-semibold mb-2">{currentProcessingMethod}</div>
                    {processingStatus && (
                      <div className="text-sm text-muted-foreground">{processingStatus}</div>
                    )}
                  </div>
                )}

                {/* Status Message */}
                <div className="text-center p-4 bg-info/10 rounded-lg border border-info/20">
                  <p className="text-lg text-info font-medium">
                    {processingStatus || "Processing your email campaign..."}
                  </p>
                  {!isLoading && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Campaign completed! This screen will close automatically in a few seconds.
                    </p>
                  )}
                </div>

                {/* Close button (only show when not actively sending) */}
                {!isLoading && (
                  <div className="text-center">
                    <Button
                      onClick={() => setShowSendingScreen(false)}
                      variant="outline"
                      className="px-6 py-2"
                    >
                      Close
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
