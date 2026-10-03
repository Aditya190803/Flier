import type { ContactGroup } from "@/lib/appwrite";

export const GROUP_COLORS = [
  { value: "blue", label: "Blue", class: "bg-blue-500" },
  { value: "green", label: "Green", class: "bg-green-500" },
  { value: "purple", label: "Purple", class: "bg-purple-500" },
  { value: "orange", label: "Orange", class: "bg-orange-500" },
  { value: "pink", label: "Pink", class: "bg-pink-500" },
  { value: "red", label: "Red", class: "bg-red-500" },
  { value: "yellow", label: "Yellow", class: "bg-yellow-500" },
  { value: "gray", label: "Gray", class: "bg-gray-500" },
];

export function getContactGroups(groups: ContactGroup[], contactId: string): ContactGroup[] {
  return groups.filter((group) => group.contact_ids.includes(contactId));
}

export function getGroupColor(color?: string): string {
  return GROUP_COLORS.find((c) => c.value === color)?.class || "bg-gray-500";
}

export function getAllTags(contacts: { tags?: string[] }[]): string[] {
  const tagSet = new Set<string>();
  contacts.forEach((contact) => {
    contact.tags?.forEach((tag) => tagSet.add(tag));
  });
  return Array.from(tagSet).sort();
}
