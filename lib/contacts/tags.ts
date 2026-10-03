export function addTagToContact(tagList: string[], tag: string): string[] {
  const trimmedTag = tag.trim().toLowerCase();
  if (trimmedTag && !tagList.includes(trimmedTag)) {
    return [...tagList, trimmedTag];
  }
  return tagList;
}

export function removeTagFromContact(tagList: string[], tag: string): string[] {
  return tagList.filter((t) => t !== tag);
}
