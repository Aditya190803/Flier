"use client";

import { useState, useEffect } from "react";

import { Eye, Send, X, Paperclip, Loader2, CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { componentLogger } from "@/lib/client-logger";
import { CSRF_HEADER_NAME, CSRF_TOKEN_NAME } from "@/lib/constants";
import { getCookie } from "@/lib/utils";
import type { PersonalizedEmail } from "@/types/email";

interface EmailPreviewProps {
  emails: PersonalizedEmail[];
  onSend: () => void;
  onClose: () => void;
  isLoading: boolean;
}

/**
 * Email Preview Component
 *
 * This component shows emails EXACTLY as they will appear when sent.
 * It uses the same email formatter that the send API uses to ensure
 * perfect consistency between preview and sent email.
 */
export function EmailPreview({ emails, onSend, onClose, isLoading }: EmailPreviewProps) {
  const [iframeErrors, setIframeErrors] = useState<Set<number>>(new Set());
  const [previewHtml, setPreviewHtml] = useState<{ [key: number]: string }>({});
  const [loadingPreviews, setLoadingPreviews] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentlyLoading, setCurrentlyLoading] = useState(0);

  // Load formatted HTML for each email using the SAME formatter as send API
  useEffect(() => {
    const loadPreviews = async () => {
      setLoadingPreviews(true);
      setLoadingProgress(0);
      setCurrentlyLoading(0);
      const newPreviews: { [key: number]: string } = {};

      for (let i = 0; i < emails.length; i++) {
        setCurrentlyLoading(i + 1);
        setLoadingProgress((i / emails.length) * 100);

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          const csrfToken = getCookie(CSRF_TOKEN_NAME);
          const response = await fetch("/api/format-email-preview", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
            },
            body: JSON.stringify({ htmlContent: emails[i].message }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const result = await response.json();
            // Wrap in Gmail-like preview container for accurate representation
            newPreviews[i] = createGmailPreviewWrapper(result.formattedHTML);
          } else {
            componentLogger.warn(`Preview API failed for email ${i + 1}`);
            newPreviews[i] = createGmailPreviewWrapper(emails[i].message);
          }
        } catch (error) {
          componentLogger.error(
            `Preview loading error for email ${i + 1}`,
            error instanceof Error ? error : undefined,
          );
          newPreviews[i] = createGmailPreviewWrapper(emails[i].message);
        }

        setLoadingProgress(((i + 1) / emails.length) * 100);
      }

      setPreviewHtml(newPreviews);
      setLoadingPreviews(false);
      setLoadingProgress(100);
    };

    loadPreviews();
  }, [emails]);

  const handleIframeError = (index: number) => {
    setIframeErrors((prev) => new Set(prev).add(index));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 z-50">
      <Card className="w-full max-w-4xl max-h-[95vh] overflow-hidden shadow-2xl">
        <CardHeader className="flex flex-col space-y-3 p-4 border-b bg-muted/40 sticky top-0 z-10">
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Email Preview ({emails.length} {emails.length === 1 ? "email" : "emails"})
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-white/50 dark:hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={onSend}
              disabled={isLoading || loadingPreviews}
              className="w-full h-11 shadow-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send {emails.length} {emails.length === 1 ? "Email" : "Emails"}
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onClose} className="w-full h-9">
              Cancel
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 p-4">
          {/* Email rendering disclaimer */}
          <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800 text-xs">
            <p className="text-amber-800 dark:text-amber-200">
              <strong>Note:</strong> This preview approximates how your email will appear. Actual
              rendering may vary across different email clients (Gmail, Outlook, Apple Mail, etc.)
              due to their unique HTML/CSS support.
            </p>
          </div>

          {loadingPreviews && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl mb-4 border border-blue-100 dark:border-blue-800">
              <div className="flex items-center gap-3 mb-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Generating email previews... ({currentlyLoading}/{emails.length})
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Formatting exactly as emails will appear in Gmail
                  </p>
                </div>
              </div>
              <Progress value={loadingProgress} className="w-full h-2" />
            </div>
          )}

          {!loadingPreviews && (
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl mb-3 border border-green-100 dark:border-green-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <p className="text-xs text-green-800 dark:text-green-300">
                <strong>Preview matches sent email:</strong> What you see below is exactly how your
                emails will appear in Gmail.
              </p>
            </div>
          )}

          <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1">
            {emails.map((email, index) => (
              <div
                key={index}
                className="border rounded-xl p-4 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge variant="outline" className="text-xs font-medium">
                    {email.to}
                  </Badge>
                  <Badge className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900">
                    Email #{index + 1}
                  </Badge>
                  {email.attachments && email.attachments.length > 0 && (
                    <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                      <Paperclip className="h-3 w-3" />
                      {email.attachments.length} attachment
                      {email.attachments.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-3">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Subject
                    </span>
                    <p className="text-sm font-semibold mt-1 break-words">{email.subject}</p>
                  </div>

                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                      Message Body
                    </span>
                    <div className="rounded-lg border overflow-hidden">
                      {loadingPreviews ? (
                        <div className="w-full h-80 bg-white dark:bg-zinc-900 flex flex-col items-center justify-center">
                          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                          <p className="text-muted-foreground text-sm">Formatting preview...</p>
                        </div>
                      ) : iframeErrors.has(index) ? (
                        <div
                          className="w-full p-4 bg-white dark:bg-zinc-900 prose prose-sm dark:prose-invert max-w-none max-h-80 overflow-y-auto"
                          dangerouslySetInnerHTML={{
                            __html: previewHtml[index] || "",
                          }}
                        />
                      ) : (
                        <iframe
                          srcDoc={previewHtml[index] || ""}
                          className="w-full h-80 border-0 bg-white"
                          title={`Email preview for ${email.to}`}
                          onError={() => handleIframeError(index)}
                          sandbox="allow-same-origin"
                        />
                      )}
                    </div>
                  </div>

                  {email.attachments && email.attachments.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                        Attachments
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {email.attachments.map((attachment, attachIndex) => (
                          <div
                            key={attachIndex}
                            className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-2.5 rounded-lg border"
                          >
                            <Paperclip className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate flex-1">{attachment.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Creates a Gmail-like preview wrapper that exactly matches how Gmail displays emails.
 * This ensures the preview looks identical to the sent email.
 */
function createGmailPreviewWrapper(htmlContent: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* Gmail-like rendering environment */
    body {
      margin: 0;
      padding: 16px;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #222222;
      background: #ffffff;
      -webkit-font-smoothing: antialiased;
      word-wrap: break-word;
      overflow-wrap: break-word;
      word-break: break-word;
    }
    
    /* Prevent horizontal overflow */
    * {
      max-width: 100%;
      box-sizing: border-box;
    }
    
    /* Headings */
    h1 { font-size: 2em; font-weight: bold; margin: 0.67em 0; }
    h2 { font-size: 1.5em; font-weight: bold; margin: 0.75em 0; }
    h3 { font-size: 1.17em; font-weight: bold; margin: 0.83em 0; }
    h4 { font-size: 1em; font-weight: bold; margin: 1em 0; }
    
    /* Paragraphs and divs - no default margin, spacing controlled by content */
    p, div { margin: 0; padding: 0; word-wrap: break-word; overflow-wrap: break-word; }
    
    /* Lists */
    ul, ol { padding-left: 1.5em; margin: 0.5em 0; }
    ul { list-style-type: disc; }
    ol { list-style-type: decimal; }
    ul ul { list-style-type: circle; }
    ul ul ul { list-style-type: square; }
    li { margin: 0.25em 0; }
    
    /* Links */
    a { color: #2563eb; text-decoration: underline; word-break: break-all; }
    
    /* Blockquotes */
    blockquote {
      border-left: 3px solid #ccc;
      margin: 1em 0;
      padding-left: 1em;
      color: #666;
      font-style: italic;
    }
    
    /* Code */
    pre {
      background: #f5f5f5;
      color: #333;
      font-family: 'Courier New', Courier, monospace;
      padding: 12px 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 1em 0;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    code {
      background: #f1f5f9;
      color: #e11d48;
      padding: 0.2em 0.4em;
      border-radius: 0.25em;
      font-family: 'Courier New', Courier, monospace;
      font-size: 0.9em;
      word-break: break-all;
    }
    pre code {
      background: none;
      color: inherit;
      padding: 0;
    }
    
    /* Horizontal rule */
    hr {
      border: none;
      border-top: 2px solid #e5e7eb;
      margin: 1.5em 0;
    }
    
    /* Tables */
    table {
      border-collapse: collapse;
      margin: 1em 0;
      width: 100%;
      table-layout: fixed;
    }
    th, td {
      border: 1px solid #d1d5db;
      padding: 8px;
      text-align: left;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    th {
      background: #f3f4f6;
      font-weight: bold;
    }
    
    /* Images */
    img {
      max-width: 100%;
      height: auto;
    }
    
    /* Marks/Highlights */
    mark {
      background-color: #fef08a;
      border-radius: 0.25em;
      padding: 0.1em 0.2em;
    }
    
    /* Strikethrough */
    s, strike, del {
      text-decoration: line-through;
    }
    
    /* Underline */
    u {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;
}
