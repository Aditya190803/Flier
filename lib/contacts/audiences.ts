export interface AudienceFilters {
  tag?: string;
  company?: string;
  group_id?: string;
}
export interface AudienceContact {
  $id: string;
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  tags?: string | string[] | null;
}

export function selectAudience(
  contacts: AudienceContact[],
  filters: AudienceFilters,
  groupIds?: string[],
) {
  const seen = new Set<string>();
  return contacts
    .filter((contact) => {
      const email = contact.email.trim().toLowerCase();
      if (seen.has(email)) {
        return false;
      }
      let tags: string[] = [];
      try {
        tags = typeof contact.tags === "string" ? JSON.parse(contact.tags) : contact.tags || [];
      } catch {
        tags = [];
      }
      if (!Array.isArray(tags)) {
        tags = [];
      }
      if (filters.tag && !tags.some((tag) => tag.toLowerCase() === filters.tag!.toLowerCase())) {
        return false;
      }
      if (
        filters.company &&
        (contact.company || "").toLowerCase() !== filters.company.toLowerCase()
      ) {
        return false;
      }
      if (filters.group_id && !groupIds?.includes(contact.$id)) {
        return false;
      }
      seen.add(email);
      return true;
    })
    .map((contact) => ({
      email: contact.email.trim().toLowerCase(),
      name: contact.name || "",
      company: contact.company || "",
      phone: contact.phone || "",
    }));
}
