import { publicPageMetadata } from "@/lib/seo";

import { Shield, Eye, Lock, Database, UserCheck, Mail } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const metadata = publicPageMetadata("/privacy");

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main Content */}
      <div className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center pb-2">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">Privacy Policy</h1>
              <p className="text-sm text-muted-foreground">Last updated: June 11, 2025</p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-8">
                {/* Introduction */}
                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Eye className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold">Introduction</h2>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    At Flier, we take your privacy seriously. This Privacy Policy explains how we
                    collect, use, and protect your information when you use our Gmail API
                    integration service for sending personalized bulk emails.
                  </p>
                </section>

                {/* Information We Collect */}
                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Database className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold">Information We Collect</h2>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">Google Account Information</h3>
                      <p className="text-muted-foreground">
                        When you sign in with Google, we receive your basic profile information
                        including your name, email address, and profile picture.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-medium mb-2">Email Data</h3>
                      <p className="text-muted-foreground">
                        We access your Gmail account only to send emails on your behalf. We do not
                        read, store, or analyze your existing emails.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-medium mb-2">Campaign Data</h3>
                      <p className="text-muted-foreground">
                        We temporarily process the email content, recipient lists, and campaign
                        settings you provide to send your emails.
                      </p>
                    </div>
                  </div>
                </section>

                {/* How We Use Your Information */}
                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <UserCheck className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold">How We Use Your Information</h2>
                  </div>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-3">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                      To send emails through your Gmail account as requested
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                      To personalize email content based on your recipient data
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                      To provide email delivery reports and analytics
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                      To improve our service quality and user experience
                    </li>
                  </ul>
                </section>

                {/* Data Storage and Security */}
                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-success/10">
                      <Lock className="h-5 w-5 text-success" />
                    </div>
                    <h2 className="text-lg font-semibold">Data Storage and Security</h2>
                  </div>
                  <div className="space-y-3 text-muted-foreground">
                    <p>
                      <strong className="text-foreground">No Permanent Storage:</strong> We do not
                      permanently store your email content, recipient lists, or campaign data.
                      Information is processed temporarily during email sending only.
                    </p>
                    <p>
                      <strong className="text-foreground">Secure Transmission:</strong> All data
                      transmission between your browser and our servers is encrypted using
                      industry-standard TLS encryption.
                    </p>
                    <p>
                      <strong className="text-foreground">OAuth Security:</strong> We use Google's
                      secure OAuth 2.0 authentication, which means we never have access to your
                      Gmail password.
                    </p>
                    <p>
                      <strong className="text-foreground">Limited Access:</strong> We only request
                      the minimum necessary permissions to send emails through your Gmail account.
                    </p>
                  </div>
                </section>

                {/* Third-Party Services */}
                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold">Third-Party Services</h2>
                  </div>
                  <p className="text-muted-foreground">
                    Flier integrates with Google Gmail API to send emails. Your use of Gmail is
                    subject to Google's Privacy Policy and Terms of Service. We do not share your
                    data with any other third-party services.
                  </p>
                </section>

                {/* Contact Us */}
                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold">Contact Us</h2>
                  </div>
                  <p className="text-muted-foreground">
                    If you have any questions about this Privacy Policy or our data practices,
                    please contact us at:
                  </p>
                  <div className="bg-muted/50 p-4 rounded-lg mt-3">
                    <p className="text-sm">
                      <strong>Email:</strong>{" "}
                      <span className="text-muted-foreground">adityamer.work@gmail.com</span>
                    </p>
                  </div>
                </section>

                {/* Updates */}
                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold">Policy Updates</h2>
                  </div>
                  <p className="text-muted-foreground">
                    We may update this Privacy Policy from time to time. We will notify you of any
                    changes by posting the new Privacy Policy on this page and updating the "Last
                    updated" date.
                  </p>
                </section>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
