export type RGBA = [number, number, number, number];

const NAMED_COLORS: Record<string, RGBA> = {
  red: [255, 0, 0, 255],
  green: [0, 128, 0, 255],
  blue: [0, 0, 255, 255],
  white: [255, 255, 255, 255],
  black: [0, 0, 0, 255],
  transparent: [0, 0, 0, 0],
  yellow: [255, 255, 0, 255],
  cyan: [0, 255, 255, 255],
  magenta: [255, 0, 255, 255],
  orange: [255, 165, 0, 255],
  purple: [128, 0, 128, 255],
  gray: [128, 128, 128, 255],
  grey: [128, 128, 128, 255],
  pink: [255, 192, 203, 255],
  brown: [139, 69, 19, 255],
  lime: [0, 255, 0, 255],
  navy: [0, 0, 128, 255],
  teal: [0, 128, 128, 255],
  maroon: [128, 0, 0, 255],
  olive: [128, 128, 0, 255],
};

export function parseColor(input: string): RGBA {
  const lower = input.toLowerCase().trim();

  if (NAMED_COLORS[lower]) {
    return [...NAMED_COLORS[lower]];
  }

  if (!lower.startsWith("#")) {
    throw new Error(`invalid color: "${input}" (use #rgb, #rrggbb, #rrggbbaa, or a named color)`);
  }

  const hex = lower.slice(1);

  if (hex.length === 3) {
    // #rgb -> #rrggbb
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return [r, g, b, 255];
  }

  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return [r, g, b, 255];
  }

  if (hex.length === 8) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = parseInt(hex.slice(6, 8), 16);
    return [r, g, b, a];
  }

  throw new Error(`invalid color: "${input}" (hex must be #rgb, #rrggbb, or #rrggbbaa)`);
}

export function formatColor(rgba: RGBA): string {
  const [r, g, b, a] = rgba;
  const hex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}${hex(a)}`;
}
