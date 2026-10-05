import Link from "next/link";

import { publicPageMetadata } from "@/lib/seo";

export const metadata = publicPageMetadata("/guides/gmail-mail-merge");

export default function GmailMailMergeGuide() {
  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 py-12 space-y-10">
      <header className="space-y-4">
        <Link href="/" className="text-primary underline">
          Flier email campaigns
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold">
          How to send a Gmail mail merge from a CSV with Flier
        </h1>
        <p className="text-lg text-muted-foreground">
          Mail merge turns one email template into a separate, personalized message for each
          contact. Flier connects to your Gmail account, imports CSV recipients, and lets you
          preview the messages before sending.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">1. Prepare your recipient CSV</h2>
        <p>
          Use a header row with an email column and the fields you want to personalize. Keep one
          recipient per row. Export your spreadsheet as CSV and check that every email address is
          correct.
        </p>
        <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
          <code>
            {
              "email,name,company\nalex@example.com,Alex,Example Co\nsam@example.com,Sam,Sample Studio"
            }
          </code>
        </pre>
        <p>
          Import the file in Flier's contact workflow, review the field mapping, and remove
          duplicates. Only include people who have agreed to receive your messages or otherwise
          expect them.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">2. Connect your Gmail account</h2>
        <p>
          Sign in with Google and authorize the requested access. Flier sends messages through
          Google's Gmail API using your connected account. You do not need to give Flier your Google
          password.
        </p>
        <p>
          Review the{" "}
          <Link href="/privacy" className="text-primary underline">
            privacy policy
          </Link>{" "}
          for how account access and campaign data are handled.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">3. Compose and personalize the message</h2>
        <p>
          Open the email composer and select your recipients. Insert variables that match your CSV
          column names into the subject or message. For example:
        </p>
        <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
          <code>
            {
              "Subject: An update for {{company}}\n\nHi {{name}},\n\nHere is this month's update for your team."
            }
          </code>
        </pre>
        <p>
          Use the rich text editor for links and formatting. Save a reusable template when you send
          similar messages regularly.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">4. Preview and check before sending</h2>
        <p>
          Preview the email for individual recipients. Check names, custom fields, links, and
          attachments. An empty CSV cell can leave missing personalization, so review your data
          before starting the campaign.
        </p>
        <p>
          Send a test email to yourself and check it on desktop and mobile. Confirm the recipients
          and subject before sending the full campaign.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">5. Send or schedule, then review results</h2>
        <p>
          Send the campaign now or schedule it for later. Scheduled delivery runs in the background
          after the campaign is queued. Review campaign progress and analytics in Flier.
        </p>
        <p>
          Open tracking depends on the recipient's email client loading a tracking image. Image
          blocking and privacy protections can affect the results, so treat open counts as
          estimates.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Gmail limits and responsible sending</h2>
        <p>
          Flier does not bypass Gmail sending limits. Limits depend on your Google account type and
          can change. If you exceed them, Google may temporarily stop sending from your account.
        </p>
        <p>
          Check Google's current{" "}
          <a href="https://support.google.com/mail/answer/22839" className="text-primary underline">
            personal Gmail limits
          </a>{" "}
          or{" "}
          <a href="https://support.google.com/a/answer/166852" className="text-primary underline">
            Google Workspace sending limits
          </a>
          . Keep your list accurate, respect opt-outs, and follow the{" "}
          <Link href="/tos" className="text-primary underline">
            acceptable use terms
          </Link>
          .
        </p>
      </section>

      <section className="space-y-4 border-t pt-8">
        <h2 className="text-2xl font-semibold">Start your first personalized campaign</h2>
        <p>
          <Link href="/auth/signin" className="text-primary underline">
            Connect Gmail to Flier
          </Link>{" "}
          to import your contacts and compose a message. For integrations, see the{" "}
          <Link href="/api-docs" className="text-primary underline">
            API and webhooks reference
          </Link>
          .
        </p>
      </section>
    </article>
  );
}
