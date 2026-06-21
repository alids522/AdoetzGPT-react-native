// JSON coercion helpers — direct port of the helpers in lib/models.dart.
// These preserve the exact fallback + dual camelCase/snake_case tolerance that
// the Dart app relies on for round-tripping persisted state.

export type Json = Record<string, any>;

/** Dart `value?.toString() ?? fallback`. */
export function stringValue(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

/** Dart intValue: int -> as-is, num -> trunc, else strict integer-string parse. */
export function intValue(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') {
    if (/^-?\d+$/.test(value)) return parseInt(value, 10);
    return fallback;
  }
  return fallback;
}

/** Dart doubleValue: num -> as-is, else strict double-string parse. */
export function doubleValue(value: unknown, fallback = 0.0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const s = value.trim();
    if (/^[+-]?\d*\.?\d+(?:[eE][+-]?\d+)?$/.test(s)) return parseFloat(s);
    return fallback;
  }
  return fallback;
}

/** Dart boolValue: bool -> as-is, string -> lowercase === 'true', else fallback. */
export function boolValue(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return fallback;
}

/** Dart mapList: keep only object items, shallow-copy each to a plain record. */
export function mapList(value: unknown): Json[] {
  if (Array.isArray(value)) {
    return value
      .filter((v): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v))
      .map((item) => ({ ...item }));
  }
  return [];
}

/** Dart _intMap: {key: intValue}, drop empty keys or values <= 0. */
export function intMap(value: unknown): Record<string, number> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [key, item] of Object.entries(value as Json)) {
    const n = intValue(item);
    if (key.trim().length > 0 && n > 0) out[key] = n;
  }
  return out;
}

/** Dart _doubleMap: {key: doubleValue}, drop empty keys or values < 0. */
export function doubleMap(value: unknown): Record<string, number> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [key, item] of Object.entries(value as Json)) {
    const n = doubleValue(item);
    if (key.trim().length > 0 && n >= 0) out[key] = n;
  }
  return out;
}

export type AppLanguage = 'en' | 'id';

export function normalizeLanguage(value: unknown): AppLanguage {
  return value === 'en' || value === ('en' as AppLanguage) ? 'en' : 'id';
}

export function languageCode(language: AppLanguage): string {
  return language === 'en' ? 'en' : 'id';
}
