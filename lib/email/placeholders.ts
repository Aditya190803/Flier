/**
 * Shared personalization for preview and send.
 * Supports {{name}} and {name}; keys match case-insensitively.
 */
export function replacePlaceholders(template: string, data: Record<string, string>): string {
  const fields = new Map(Object.entries(data).map(([key, value]) => [key.toLowerCase(), value]));
  const lookup = (key: string) => fields.get(key.toLowerCase());

  return template
    .replace(/\{\{(\w+)\}\}/g, (match, key: string) => lookup(key) || match)
    .replace(/\{(\w+)\}/g, (match, key: string) => lookup(key) || match);
}
