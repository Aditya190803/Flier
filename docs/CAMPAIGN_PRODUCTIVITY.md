# Campaign productivity

Contacts CSV imports support header mapping, a preview, existing-address skip/update, and rejected-row export. Imports are limited to 5,000 rows and 8 MB. Quoted commas and multiline cells are parsed by Papa Parse. Empty optional cells preserve existing contact fields on update. Rejected exports include mapped fields and the reason; downloads escape spreadsheet formulas and revoke their object URLs. The importer reloads existing addresses before saving, but overlapping imports are not a database transaction.

Saved audiences store filters in PostgreSQL (`vp run db:migrate` before deployment). Tag, company and group filters all have to match. The recipe is resolved against the sender's current contacts when used, then replaces the composer recipient list. Queued recipients and fields are frozen; later contact changes do not alter a campaign. Audiences over 1,000 recipients require narrower filters. Contact reads paginate and refuse directories exceeding 50,000 records instead of silently truncating them.

The dashboard checklist links to real contact/template steps, sample sending and delivery progress. Sample completion is recorded per account in this browser; it is not a cross-device audit trail.

Campaign Library searches loaded drafts, queue jobs and sent history with status and local-date filters. Queue/history copies of the same campaign are combined. The queue source currently loads the latest 100 jobs. Partial source failures remain visible. Duplicate and edit creates a new draft with the frozen recipient fields, Cc/Bcc and attachment references; it never sends automatically.
