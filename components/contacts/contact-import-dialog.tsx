"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IMPORT_FIELDS } from "@/lib/contacts/import";
import type { useContactImportExport } from "@/hooks/useContactImportExport";

// Radix Select cannot use "" as an item value; "" in the mapping means "not imported".
const UNMAPPED = "__unmapped__";

export function ContactImportDialog({
  importer,
}: {
  importer: ReturnType<typeof useContactImportExport>["importer"];
}) {
  const { plan, busy, completed } = importer;
  return (
    <Dialog
      open={importer.open}
      onOpenChange={(open) => {
        if (!busy) {
          importer.setOpen(open);
        }
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review contact import</DialogTitle>
          <DialogDescription>
            Map your CSV columns before saving. Blank optional fields preserve existing values when
            updating.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {IMPORT_FIELDS.map((field) => (
            <div key={field} className="space-y-1 text-sm">
              <label htmlFor={`import-column-${field}`}>
                {field === "email" ? "Email column (required)" : `${field} column`}
              </label>
              <Select
                disabled={busy || completed}
                value={importer.mapping[field] || UNMAPPED}
                onValueChange={(value) =>
                  importer.setMapping({
                    ...importer.mapping,
                    [field]: value === UNMAPPED ? "" : value,
                  })
                }
              >
                <SelectTrigger id={`import-column-${field}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNMAPPED}>
                    {field === "email" ? "Choose a column" : "Do not import"}
                  </SelectItem>
                  {importer.headers.map((header) => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <div className="space-y-1 text-sm">
          <label htmlFor="import-existing-mode">Existing contacts</label>
          <Select
            disabled={busy || completed}
            value={importer.mode}
            onValueChange={(value) => importer.setMode(value as "skip" | "update")}
          >
            <SelectTrigger id="import-existing-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="skip">Skip existing email addresses</SelectItem>
              <SelectItem value="update">Update existing email addresses</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p aria-live="polite" className="text-sm">
          {plan.creates} new · {plan.updates} updates · {plan.skipped} skipped ·{" "}
          {importer.rejected.length} rejected{busy ? ` · ${importer.progress} processed` : ""}
        </p>
        {!completed && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="text-left font-medium">Preview (first 5 accepted rows)</caption>
              <thead>
                <tr>
                  <th scope="col">Email</th>
                  <th scope="col">Name</th>
                  <th scope="col">Company</th>
                </tr>
              </thead>
              <tbody>
                {plan.accepted.slice(0, 5).map((item) => (
                  <tr key={item.row}>
                    <td>{item.contact.email}</td>
                    <td>{item.contact.name}</td>
                    <td>{item.contact.company}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!!importer.rejected.length && (
          <Button variant="outline" onClick={importer.downloadRejected}>
            Download rejected rows
          </Button>
        )}
        <Button
          disabled={busy || completed || !importer.mapping.email || !plan.accepted.length}
          onClick={importer.confirm}
        >
          {busy ? "Importing…" : completed ? "Import complete" : "Confirm import"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
