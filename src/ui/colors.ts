// Color helpers that mirror Flutter's Color / withValues(alpha:) semantics.
// Palette colors are stored as CSS strings ("#RRGGBB" or "rgba(r,g,b,a)") so
// they can be passed straight to StyleSheet. `withAlpha` reproduces Dart's
// `Color.withValues(alpha: x)` (absolute alpha in 0..1, replacing the base alpha).

export type ColorToken = string;

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Reproduce Flutter `Color.withValues(alpha:)` — set absolute alpha 0..1. */
export function withAlpha(color: ColorToken, alpha: number): ColorToken {
  if (color.startsWith('#')) {
    const [r, g, b] = hexToRgb(color);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const parts = m[1].split(',').map((s) => s.trim());
    return `rgba(${parts[0]},${parts[1]},${parts[2]},${alpha})`;
  }
  return color;
}

export const white = (alpha = 1): ColorToken => `rgba(255,255,255,${alpha})`;
export const black = (alpha = 1): ColorToken => `rgba(0,0,0,${alpha})`;
export const rgb = (r: number, g: number, b: number, a = 1): ColorToken =>
  `rgba(${r},${g},${b},${a})`;

/** Opaque hex helper (no-op, kept for parity with the port notes). */
export const opaque = (hex: string): ColorToken => hex;
