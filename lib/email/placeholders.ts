/**
 * Shared personalization for preview and send.
 * Supports {{name}} and {name}; keys match case-insensitively.
 */
export function replacePlaceholders(template: string, data: Record<string, string>): string {
  const lookup = (key: string) => data[key] ?? data[key.toLowerCase()] ?? data[key.toUpperCase()];

  return template
    .replace(/\{\{(\w+)\}\}/g, (match, key: string) => lookup(key) || match)
    .replace(/\{(\w+)\}/g, (match, key: string) => lookup(key) || match);
}
