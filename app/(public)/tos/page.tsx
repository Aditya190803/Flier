"use client";

import { FileText, Shield, AlertTriangle, Users, Mail, Gavel } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main Content */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl sm:text-3xl font-bold mb-2">
                Terms of Service
              </CardTitle>
              <p className="text-sm text-muted-foreground">Last updated: June 11, 2025</p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-8">
                {/* Introduction */}
                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold">Agreement to Terms</h2>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    By accessing and using Flier ("the Service"), you agree to be bound by these
                    Terms of Service ("Terms"). If you do not agree to these Terms, please do not
                    use our Service.
                  </p>
                </section>

                {/* Service Description */}
                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold">Service Description</h2>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Flier is a web-based service that allows users to send personalized bulk emails
                    through their Gmail accounts using Google's Gmail API. The Service includes
                    features for uploading recipient lists via CSV, composing rich text emails, and
                    tracking email analytics.
                  </p>
                </section>

                {/* User Accounts */}
                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold">User Accounts</h2>
                  </div>
                  <div className="space-y-3 text-muted-foreground">
                    <p>
                      <strong className="text-foreground">Account Creation:</strong> You must sign
                      in with a valid Google account to use our Service. You are responsible for
                      maintaining the security of your account.
                    </p>
                    <p>
                      <strong className="text-foreground">Accurate Information:</strong> You agree
                      to provide accurate, current, and complete information about yourself as
                      prompted by our sign-in process.
                    </p>
                    <p>
                      <strong className="text-foreground">Account Responsibility:</strong> You are
                      responsible for all activities that occur under your account and for
                      maintaining the confidentiality of your account credentials.
                    </p>
                  </div>
                </section>

                {/* Acceptable Use */}
                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold">Acceptable Use Policy</h2>
                  </div>
                  <div className="space-y-3">
                    <p className="text-muted-foreground">
                      You agree to use Flier only for lawful purposes and in accordance with these
                      Terms. You agree NOT to use the Service:
                    </p>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-3">
                        <span className="w-1.5 h-1.5 bg-destructive rounded-full mt-2 flex-shrink-0" />
                        To send spam, unsolicited emails, or emails to recipients who have not
                        consented to receive them
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="w-1.5 h-1.5 bg-destructive rounded-full mt-2 flex-shrink-0" />
                        To send content that is illegal, harmful, threatening, abusive, or violates
                        any laws
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="w-1.5 h-1.5 bg-destructive rounded-full mt-2 flex-shrink-0" />
                        To impersonate any person or entity or falsely represent your affiliation
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="w-1.5 h-1.5 bg-destructive rounded-full mt-2 flex-shrink-0" />
                        To violate any applicable anti-spam laws or regulations, including CAN-SPAM
                        Act, GDPR, or CASL
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="w-1.5 h-1.5 bg-destructive rounded-full mt-2 flex-shrink-0" />
                        To send emails containing malware, viruses, or other harmful code
                      </li>
                    </ul>
                  </div>
                </section>

                {/* Email Compliance */}
                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Gavel className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold">Email Compliance Requirements</h2>
                  </div>
                  <div className="space-y-3 text-muted-foreground">
                    <p>
                      <strong className="text-foreground">Consent:</strong> You must have explicit
                      consent from all email recipients before sending them emails through our
                      Service.
                    </p>
                    <p>
                      <strong className="text-foreground">Unsubscribe:</strong> You must provide a
                      clear and easy way for recipients to unsubscribe from your emails and honor
                      all unsubscribe requests promptly.
                    </p>
                    <p>
                      <strong className="text-foreground">Identification:</strong> Your emails must
                      clearly identify you as the sender and include accurate contact information.
                    </p>
                    <p>
                      <strong className="text-foreground">Content Guidelines:</strong> Email content
                      must be truthful and not misleading. Subject lines must accurately reflect the
                      content of the email.
                    </p>
                  </div>
                </section>

                {/* Service Limitations */}
                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-warning/10">
                      <AlertTriangle className="h-5 w-5 text-warning" />
                    </div>
                    <h2 className="text-lg font-semibold">Service Limitations</h2>
                  </div>
                  <div className="space-y-3 text-muted-foreground">
                    <p>
                      <strong className="text-foreground">Gmail API Limits:</strong> Our Service is
                      subject to Google Gmail API rate limits and quotas. We cannot guarantee
                      unlimited email sending capacity.
                    </p>
                    <p>
                      <strong className="text-foreground">Account Suspension:</strong> We reserve
                      the right to suspend or terminate accounts that violate these Terms or engage
                      in abusive behavior.
                    </p>
                    <p>
                      <strong className="text-foreground">Service Availability:</strong> While we
                      strive for high availability, we do not guarantee that the Service will be
                      available 100% of the time.
                    </p>
                  </div>
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
                    If you have any questions about these Terms of Service, please contact us at:
                  </p>
                  <div className="bg-muted/50 p-4 rounded-lg mt-3">
                    <p className="text-sm">
                      <strong>Email:</strong>{" "}
                      <span className="text-muted-foreground">adityamer.work@gmail.com</span>
                    </p>
                  </div>
                </section>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
