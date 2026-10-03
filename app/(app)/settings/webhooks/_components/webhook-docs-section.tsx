import { useState } from "react";

import {
  Check,
  Code,
  CheckCircle,
  Copy,
  ExternalLink,
  Globe,
  Info,
  Key,
  Send,
  Shield,
  Webhook,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WEBHOOK_EVENT_TYPES as EVENT_TYPES } from "@/components/webhooks/event-types";
import { SAMPLE_WEBHOOK_PAYLOAD, SIGNATURE_VERIFICATION_CODE } from "@/lib/webhooks/docs-snippets";

export function WebhookDocsSection() {
  const [showDocsSection, setShowDocsSection] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="mt-10 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Info className="h-5 w-5 text-primary" />
          How Webhooks Work
        </h2>
        <Button variant="ghost" size="sm" onClick={() => setShowDocsSection(!showDocsSection)}>
          {showDocsSection ? "Hide" : "Show"} Documentation
        </Button>
      </div>

      {showDocsSection && (
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-primary/20">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">Real-time Events</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Webhooks send instant HTTP POST requests to your server whenever an event occurs
                  in Flier, enabling real-time integrations.
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">Secure Signatures</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Optional HMAC-SHA256 signatures verify that webhook requests genuinely come from
                  Flier, protecting against spoofed requests.
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Code className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">Easy Integration</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Standard JSON payloads work with any programming language. Connect to Slack,
                  Discord, Zapier, or your custom backend.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Event Types */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Available Event Types
              </CardTitle>
              <CardDescription>
                Subscribe to specific events to receive targeted notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {EVENT_TYPES.map((event) => {
                  const Icon = event.icon;
                  return (
                    <div
                      key={event.value}
                      className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <Icon className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">{event.label}</p>
                        <p className="text-xs text-muted-foreground">{event.description}</p>
                        <code className="text-xs text-primary mt-1 inline-block">
                          {event.value}
                        </code>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Payload Format */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    Webhook Payload Format
                  </CardTitle>
                  <CardDescription>JSON structure sent with each webhook request</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(SAMPLE_WEBHOOK_PAYLOAD)}
                >
                  {copiedCode ? (
                    <Check className="h-4 w-4 mr-1" />
                  ) : (
                    <Copy className="h-4 w-4 mr-1" />
                  )}
                  {copiedCode ? "Copied!" : "Copy"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-zinc-950 text-zinc-100 p-4 rounded-lg overflow-x-auto">
                {SAMPLE_WEBHOOK_PAYLOAD}
              </pre>
            </CardContent>
          </Card>

          {/* HTTP Headers */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="h-5 w-5" />
                HTTP Request Details
              </CardTitle>
              <CardDescription>Headers included with every webhook request</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <code className="text-sm font-semibold">Content-Type</code>
                    <p className="text-xs text-muted-foreground mt-1">application/json</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <code className="text-sm font-semibold">X-Flier-Event</code>
                    <p className="text-xs text-muted-foreground mt-1">
                      The event type (e.g., campaign.sent)
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <code className="text-sm font-semibold">X-Flier-Timestamp</code>
                    <p className="text-xs text-muted-foreground mt-1">
                      Unix timestamp of when the event occurred
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg border border-primary/20">
                  <Key className="h-4 w-4 text-primary mt-0.5" />
                  <div className="flex-1">
                    <code className="text-sm font-semibold">X-Flier-Signature</code>
                    <p className="text-xs text-muted-foreground mt-1">
                      HMAC-SHA256 signature (only if secret is configured). Computed as:{" "}
                      <code className="text-primary">HMAC-SHA256(secret, payload)</code>
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Signature Verification */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Verifying Webhook Signatures
                  </CardTitle>
                  <CardDescription>Example code to verify webhook authenticity</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(SIGNATURE_VERIFICATION_CODE)}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-zinc-950 text-zinc-100 p-4 rounded-lg overflow-x-auto">
                {SIGNATURE_VERIFICATION_CODE}
              </pre>
            </CardContent>
          </Card>

          {/* Use Cases */}
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Popular Use Cases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-primary/10 rounded">
                    <Send className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Slack Notifications</p>
                    <p className="text-xs text-muted-foreground">
                      Get notified when campaigns complete
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-primary/10 rounded">
                    <ExternalLink className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">CRM Updates</p>
                    <p className="text-xs text-muted-foreground">
                      Update contact records when emails are opened
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-primary/10 rounded">
                    <Code className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Zapier/Make Integration</p>
                    <p className="text-xs text-muted-foreground">
                      Trigger automations across 5000+ apps
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-primary/10 rounded">
                    <CheckCircle className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Analytics Tracking</p>
                    <p className="text-xs text-muted-foreground">
                      Log engagement events to your data warehouse
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Best Practices */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">💡 Best Practices</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5" />
                  <span>
                    <strong className="text-foreground">Use HTTPS endpoints</strong> – Always use
                    secure URLs for your webhook endpoints
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5" />
                  <span>
                    <strong className="text-foreground">Verify signatures</strong> – Always verify
                    the X-Flier-Signature header to ensure authenticity
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5" />
                  <span>
                    <strong className="text-foreground">Respond quickly</strong> – Return a 200
                    response within 5 seconds; process asynchronously if needed
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5" />
                  <span>
                    <strong className="text-foreground">Handle duplicates</strong> – Use the
                    webhook_id to deduplicate events in case of retries
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5" />
                  <span>
                    <strong className="text-foreground">Log everything</strong> – Store webhook
                    payloads for debugging and audit purposes
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
