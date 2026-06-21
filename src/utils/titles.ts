// Title sanitization — port of cleanTitle in lib/services/ai_service.dart (~line 2193).

export function cleanTitle(raw: string): string {
  const cleaned = raw
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/^title:\s*/gi, '')
    .replace(/[.!?,;:]+$/g, '')
    .split(/\s+/)
    .slice(0, 6)
    .join(' ');
  return cleaned.length > 50 ? cleaned.substring(0, 50).trim() : cleaned;
}
