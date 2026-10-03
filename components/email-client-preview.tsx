"use client";

import React, { useState } from "react";

import { Monitor, Smartphone, Tablet, Mail, Apple, X, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface EmailClientPreviewProps {
  subject: string;
  htmlContent: string;
  senderName?: string;
  senderEmail?: string;
  isOpen: boolean;
  onClose: () => void;
}

type EmailClient = "gmail" | "outlook" | "apple-mail" | "yahoo" | "mobile-ios" | "mobile-android";
type DeviceType = "desktop" | "tablet" | "mobile";

interface ClientConfig {
  name: string;
  icon: React.ElementType;
  bgColor: string;
  headerBg: string;
  headerText: string;
  bodyBg: string;
  fontFamily: string;
  maxWidth: string;
  borderRadius: string;
  shadowStyle: string;
}

const EMAIL_CLIENTS: Record<EmailClient, ClientConfig> = {
  gmail: {
    name: "Gmail",
    icon: Mail,
    bgColor: "bg-white dark:bg-zinc-800",
    headerBg: "bg-[#f2f6fc] dark:bg-[#1a1a2e]",
    headerText: "text-gray-900 dark:text-gray-100",
    bodyBg: "bg-white",
    fontFamily: "font-[Roboto,Arial,sans-serif]",
    maxWidth: "680px",
    borderRadius: "rounded-lg",
    shadowStyle: "shadow-sm",
  },
  outlook: {
    name: "Outlook",
    icon: Mail,
    bgColor: "bg-white dark:bg-zinc-800",
    headerBg: "bg-[#0078d4] dark:bg-[#0a5a8c]",
    headerText: "text-white",
    bodyBg: "bg-white",
    fontFamily: "font-[Segoe UI,Arial,sans-serif]",
    maxWidth: "620px",
    borderRadius: "rounded-none",
    shadowStyle: "shadow-md",
  },
  "apple-mail": {
    name: "Apple Mail",
    icon: Apple,
    bgColor: "bg-gray-50 dark:bg-zinc-900",
    headerBg: "bg-[#f5f5f7] dark:bg-[#2d2d2d]",
    headerText: "text-gray-900 dark:text-gray-100",
    bodyBg: "bg-white",
    fontFamily: "font-[-apple-system,BlinkMacSystemFont,Helvetica,sans-serif]",
    maxWidth: "640px",
    borderRadius: "rounded-xl",
    shadowStyle: "shadow-lg",
  },
  yahoo: {
    name: "Yahoo Mail",
    icon: Mail,
    bgColor: "bg-white dark:bg-zinc-800",
    headerBg: "bg-[#6001d2] dark:bg-[#4a0099]",
    headerText: "text-white",
    bodyBg: "bg-white",
    fontFamily: "font-[Helvetica,Arial,sans-serif]",
    maxWidth: "600px",
    borderRadius: "rounded-md",
    shadowStyle: "shadow-sm",
  },
  "mobile-ios": {
    name: "iOS Mail",
    icon: Smartphone,
    bgColor: "bg-gray-100 dark:bg-zinc-900",
    headerBg: "bg-[#f2f2f7] dark:bg-[#1c1c1e]",
    headerText: "text-gray-900 dark:text-gray-100",
    bodyBg: "bg-white",
    fontFamily: "font-[-apple-system,BlinkMacSystemFont,sans-serif]",
    maxWidth: "375px",
    borderRadius: "rounded-xl",
    shadowStyle: "shadow-xl",
  },
  "mobile-android": {
    name: "Android Gmail",
    icon: Smartphone,
    bgColor: "bg-white dark:bg-zinc-800",
    headerBg: "bg-[#1a73e8] dark:bg-[#1557b0]",
    headerText: "text-white",
    bodyBg: "bg-white",
    fontFamily: "font-[Roboto,sans-serif]",
    maxWidth: "375px",
    borderRadius: "rounded-lg",
    shadowStyle: "shadow-lg",
  },
};

const DEVICE_SIZES: Record<DeviceType, { width: string; height: string; icon: React.ElementType }> =
  {
    desktop: { width: "max-w-4xl", height: "h-[600px]", icon: Monitor },
    tablet: { width: "max-w-2xl", height: "h-[700px]", icon: Tablet },
    mobile: { width: "max-w-[375px]", height: "h-[667px]", icon: Smartphone },
  };

export function EmailClientPreview({
  subject,
  htmlContent,
  senderName = "Sender Name",
  senderEmail = "sender@example.com",
  isOpen,
  onClose,
}: EmailClientPreviewProps) {
  const [selectedClient, setSelectedClient] = useState<EmailClient>("gmail");
  const [deviceType, setDeviceType] = useState<DeviceType>("desktop");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) {
    return null;
  }

  const clientConfig = EMAIL_CLIENTS[selectedClient];
  const deviceConfig = DEVICE_SIZES[deviceType];

  // Generate client-specific email wrapper HTML
  const generateClientPreviewHTML = (): string => {
    // Apply client-specific CSS adjustments
    let clientStyles = "";

    switch (selectedClient) {
      case "gmail":
        clientStyles = `
          body { font-family: Roboto, Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #222; }
          a { color: #1a0dab; }
          table { border-collapse: collapse; }
          img { max-width: 100%; height: auto; }
        `;
        break;
      case "outlook":
        clientStyles = `
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 14px; line-height: 1.4; color: #323130; }
          a { color: #0078d4; }
          table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
          img { -ms-interpolation-mode: bicubic; border: 0; outline: none; }
          /* Outlook line-height fix */
          p { mso-line-height-rule: exactly; line-height: 1.4; margin: 0 0 1em 0; }
        `;
        break;
      case "apple-mail":
        clientStyles = `
          body { font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, sans-serif; font-size: 14px; line-height: 1.6; color: #1d1d1f; }
          a { color: #0066cc; }
          img { max-width: 100%; height: auto; }
        `;
        break;
      case "yahoo":
        clientStyles = `
          body { font-family: Helvetica, Arial, sans-serif; font-size: 13px; line-height: 1.5; color: #1d2228; }
          a { color: #1d4fcc; }
          table { border-collapse: collapse; }
        `;
        break;
      case "mobile-ios":
        clientStyles = `
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; line-height: 1.5; color: #000; -webkit-text-size-adjust: 100%; }
          a { color: #007aff; }
          img { max-width: 100%; height: auto; }
        `;
        break;
      case "mobile-android":
        clientStyles = `
          body { font-family: Roboto, sans-serif; font-size: 15px; line-height: 1.5; color: #202124; }
          a { color: #1a73e8; }
          img { max-width: 100%; height: auto; }
        `;
        break;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          ${clientStyles}
        </style>
      </head>
      <body style="margin: 0; padding: 16px; background: #fff;">
        ${htmlContent}
      </body>
      </html>
    `;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-6xl max-h-[95vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between p-4 border-b bg-muted/40">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Monitor className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Email Client Preview
            </CardTitle>
            <CardDescription className="mt-1">
              See how your email will look in different email clients
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-4">
          {/* Controls */}
          <div className="flex flex-wrap gap-4 mb-4">
            {/* Email Client Selection */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Email Client
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(EMAIL_CLIENTS) as [EmailClient, ClientConfig][]).map(
                  ([key, config]) => (
                    <Button
                      key={key}
                      variant={selectedClient === key ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setIsLoading(true);
                        setSelectedClient(key);
                        // Reset device type if selecting mobile client
                        if (key.startsWith("mobile-")) {
                          setDeviceType("mobile");
                        } else if (deviceType === "mobile" && !key.startsWith("mobile-")) {
                          setDeviceType("desktop");
                        }
                        setTimeout(() => setIsLoading(false), 300);
                      }}
                      className="gap-1.5"
                    >
                      <config.icon className="h-3.5 w-3.5" />
                      {config.name}
                    </Button>
                  ),
                )}
              </div>
            </div>

            {/* Device Size Selection */}
            {!selectedClient.startsWith("mobile-") && (
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Device
                </label>
                <div className="flex gap-2">
                  {(
                    Object.entries(DEVICE_SIZES) as [
                      DeviceType,
                      (typeof DEVICE_SIZES)[DeviceType],
                    ][]
                  ).map(([key, config]) => (
                    <Button
                      key={key}
                      variant={deviceType === key ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setIsLoading(true);
                        setDeviceType(key);
                        setTimeout(() => setIsLoading(false), 200);
                      }}
                      className="gap-1.5"
                    >
                      <config.icon className="h-3.5 w-3.5" />
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Preview Container */}
          <div
            className={`bg-gray-100 dark:bg-zinc-900 rounded-lg p-6 flex items-center justify-center overflow-auto ${deviceConfig.height}`}
          >
            {isLoading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading preview...</p>
              </div>
            ) : (
              <div
                className={`${clientConfig.bgColor} ${clientConfig.borderRadius} ${clientConfig.shadowStyle} overflow-hidden w-full ${
                  selectedClient.startsWith("mobile-") ? "max-w-[375px]" : deviceConfig.width
                }`}
                style={{ maxWidth: clientConfig.maxWidth }}
              >
                {/* Client Header */}
                <div className={`${clientConfig.headerBg} ${clientConfig.headerText} p-4`}>
                  <div className="flex items-center gap-3">
                    <clientConfig.icon className="h-5 w-5" />
                    <span className="font-semibold">{clientConfig.name}</span>
                  </div>
                </div>

                {/* Email Header */}
                <div className={`border-b p-4 ${clientConfig.bgColor}`}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h2 className={`font-semibold text-lg ${clientConfig.headerText}`}>
                        {subject || "(No Subject)"}
                      </h2>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">{senderName}</span>
                      <span className="ml-2 text-xs">&lt;{senderEmail}&gt;</span>
                    </div>
                    <div className="text-xs text-muted-foreground">To: recipient@example.com</div>
                  </div>
                </div>

                {/* Email Body */}
                <div className="bg-white overflow-auto" style={{ maxHeight: "400px" }}>
                  <iframe
                    srcDoc={generateClientPreviewHTML()}
                    className="w-full h-[400px] border-0"
                    title={`Email preview - ${clientConfig.name}`}
                    sandbox="allow-same-origin"
                  />
                </div>

                {/* Client Footer (optional) */}
                {selectedClient === "gmail" && (
                  <div className="border-t p-3 bg-gray-50 dark:bg-zinc-800 text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <button className="hover:underline">Reply</button>
                      <button className="hover:underline">Forward</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> This is a simulation of how your email might appear in{" "}
              {clientConfig.name}. Actual rendering may vary slightly due to email client updates
              and user settings. For the most accurate preview, send a test email to yourself.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
