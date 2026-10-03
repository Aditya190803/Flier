# Team campaigns and measurement

Choose a team in the composer Preview step. The server reads active membership and the team's current `require_approval` setting. Viewers cannot submit or dispatch team campaigns. When approval is required, another owner/admin must review the sender's exact subject, body, recipient fields, attachments, Cc/Bcc, tracking, message type and scheduled time. Self-approval is refused. Rejection requires a comment. A single-owner team needs another admin reviewer or an explicit policy change before using mandatory team review.

Campaign Reviews exposes the frozen recipient data and a personalized sample. Scripts and remote images are blocked in that preview. A decision only records approval; it does not send mail or notify anybody by email. The original sender dispatches with their Google account. Changes require a fresh review, and an approved scheduled job cannot be rescheduled in place. PostgreSQL consumes approval and creates its job in one transaction; concurrent requests cannot reuse it. A lost-response retry with the same request ID returns that original job.

Team policy is checked when a campaign is admitted to the queue. Later policy changes do not retroactively revoke an accepted job. Active sender membership is checked again when its worker pass starts. Personal campaigns remain a separate workspace. Legacy browser send routes refuse explicitly declared team campaigns; team campaigns use the queue. Review IDs and team IDs are assigned/checked server-side rather than trusting client role labels.

Apply `vp run db:migrate` before deploying this layer. Reviews and comments are stored in PostgreSQL; memberships and team settings remain in Appwrite. List pages load the latest 100 reviews. Existing queue concurrency verification also checks approval consumption, rollback and lost-response recovery against a disposable PostgreSQL database.

## Metrics

Account export includes the sender's queued jobs, delivery results, saved audiences, submitted reviews and authored comments, excluding offline OAuth credentials and other submitters' snapshots. Account deletion removes those records and anonymizes the departing reviewer on retained teammates' reviews.

Sent means Gmail accepted a request, rather than verified inbox delivery. Failures are send failures, not bounce reports. Inbox placement and bounce ingestion are unavailable in this project. The [Gmail send API](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send) returns a Message on success; treating that as inbox placement would be an unsupported inference.

Open/click rates count distinct recorded recipients per campaign/type, case-insensitively, divided by accepted sends. Repeat pixels and link visits are counted once. Missing tracking responses remain unavailable rather than becoming zero, and incomplete event loads are explicitly labeled. A recorded zero means no events were observed in the loaded data, which can also occur with disabled tracking or blocked images.

[Apple Mail Privacy Protection](https://www.apple.com/legal/privacy/data/en/mail-privacy-protection/) can retrieve remote content in the background without a reader opening the message. [Microsoft Safe Links](https://learn.microsoft.com/en-us/defender-office-365/safe-links-about) scans and rewrites email URLs. These behaviors mean tracked events cannot reliably prove human reading or clicks. This is an inference about tracking limits; Flier does not attempt to infer or promise human intent from those events.

Offline refresh tokens are encrypted at rest for background delivery. API transport uses HTTPS; that is not end-to-end encryption of every application payload. README claims were corrected accordingly.
