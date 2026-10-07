"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/appwrite/api-request";
import type { ContactGroup } from "./compose-types";
import type { CSVRow } from "@/types/email";
import type { AudienceFilters } from "@/lib/contacts/audiences";
type Audience = { id: string; name: string; filters: AudienceFilters };

// Radix Select cannot use "" as an item value.
const ANY_GROUP = "__any__";
export function SavedAudiences({
  groups,
  onApply,
}: {
  groups: ContactGroup[];
  onApply: (rows: CSVRow[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [company, setCompany] = useState("");
  const [group, setGroup] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async () => {
    const response = await apiRequest<{ documents: Audience[] }>("/api/audiences");
    setAudiences(response.documents);
  };
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Audience action failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section aria-label="Saved audiences" className="border-b px-4 md:px-6 lg:px-8 py-4 space-y-3">
      <Button
        variant="outline"
        disabled={busy}
        onClick={() =>
          run(async () => {
            await load();
            setOpen(!open);
          })
        }
      >
        Saved audiences
      </Button>
      {open && (
        <>
          <p className="text-sm text-muted-foreground">
            All filters must match. Using an audience replaces the recipient list with current
            matches; that snapshot stays fixed when queued.
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            <Input
              aria-label="Audience name"
              placeholder="Audience name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Input
              aria-label="Audience tag"
              placeholder="Exact tag (optional)"
              value={tag}
              onChange={(event) => setTag(event.target.value)}
            />
            <Input
              aria-label="Audience company"
              placeholder="Exact company (optional)"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
            />
            <Select
              value={group || ANY_GROUP}
              onValueChange={(value) => setGroup(value === ANY_GROUP ? "" : value)}
            >
              <SelectTrigger aria-label="Audience group">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY_GROUP}>Any group</SelectItem>
                {groups
                  .filter((item) => item.$id)
                  .map((item) => (
                    <SelectItem key={item.$id} value={item.$id as string}>
                      {item.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            disabled={busy || !name.trim()}
            onClick={() =>
              run(async () => {
                await apiRequest("/api/audiences", {
                  method: "POST",
                  body: JSON.stringify({
                    name,
                    filters: {
                      tag: tag || undefined,
                      company: company || undefined,
                      group_id: group || undefined,
                    },
                  }),
                });
                setName("");
                await load();
                toast.success("Audience saved");
              })
            }
          >
            Save audience
          </Button>
          <ul className="space-y-2">
            {audiences.map((audience) => (
              <li key={audience.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="flex-1">{audience.name}</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const result = await apiRequest<{ rows: CSVRow[] }>(
                        `/api/audiences?id=${encodeURIComponent(audience.id)}`,
                      );
                      if (!result.rows.length) {
                        toast.info("No contacts match this audience");
                        return;
                      }
                      onApply(result.rows);
                      toast.success(`${result.rows.length} current matches added`);
                    })
                  }
                >
                  Use current matches
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  aria-label={`Delete audience ${audience.name}`}
                  onClick={() =>
                    run(async () => {
                      await apiRequest(`/api/audiences?id=${encodeURIComponent(audience.id)}`, {
                        method: "DELETE",
                      });
                      await load();
                    })
                  }
                >
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
