#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

import { Canvas } from "./canvas.js";
import { parseColor, formatColor } from "./color.js";
import { HistoryManager } from "./history.js";
import { encodePNG } from "./png.js";

// ── State ──────────────────────────────────────────────────────────

interface CanvasState {
  history: HistoryManager;
}

const canvases = new Map<string, CanvasState>();

const exportDir = (() => {
  const idx = process.argv.indexOf("--export-dir");
  return idx !== -1 && process.argv[idx + 1]
    ? resolve(process.argv[idx + 1])
    : process.cwd();
})();

function getOrCreate(name: string, width = 32, height = 32): CanvasState {
  let state = canvases.get(name);
  if (!state) {
    const canvas = new Canvas(width, height);
    state = { history: new HistoryManager(canvas) };
    canvases.set(name, state);
  }
  return state;
}

function getExisting(name: string): CanvasState {
  const state = canvases.get(name);
  if (!state) {
    throw new Error(`canvas "${name}" does not exist — create it first with create_canvas`);
  }
  return state;
}

function ok(text: string): { content: Array<{ type: "text"; text: string }> } {
  return { content: [{ type: "text", text }] };
}

// ── Server ─────────────────────────────────────────────────────────

const server = new McpServer({
  name: "pixel-art",
  version: "0.1.0",
});

// ── Tools ──────────────────────────────────────────────────────────

server.tool(
  "create_canvas",
  "Create a new named canvas with given dimensions. If a canvas with this name exists, it is replaced.",
  {
    name: z.string().default("default").describe("Canvas name"),
    width: z.number().int().min(1).max(256).describe("Width in pixels"),
    height: z.number().int().min(1).max(256).describe("Height in pixels"),
  },
  async ({ name, width, height }) => {
    const canvas = new Canvas(width, height);
    canvases.set(name, { history: new HistoryManager(canvas) });
    return ok(`Created ${width}x${height} canvas "${name}"`);
  }
);

server.tool(
  "list_canvases",
  "List all active canvases with their dimensions.",
  {},
  async () => {
    if (canvases.size === 0) {
      return ok("No canvases. Use create_canvas to make one.");
    }
    const lines = Array.from(canvases.entries()).map(
      ([name, s]) => `${name}: ${s.history.canvas.width}x${s.history.canvas.height}`
    );
    return ok(lines.join("\n"));
  }
);

server.tool(
  "set_pixel",
  "Set a single pixel on the canvas.",
  {
    canvas: z.string().default("default").describe("Canvas name"),
    x: z.number().int().describe("X coordinate"),
    y: z.number().int().describe("Y coordinate"),
    color: z.string().describe("Color: #rgb, #rrggbb, #rrggbbaa, or named (red, blue, transparent, etc.)"),
  },
  async ({ canvas: name, x, y, color }) => {
    const state = getExisting(name);
    const rgba = parseColor(color);
    state.history.apply(() => state.history.canvas.setPixel(x, y, rgba));
    return ok(`Set (${x},${y}) to ${formatColor(rgba)}`);
  }
);

server.tool(
  "get_pixel",
  "Get the color of a single pixel.",
  {
    canvas: z.string().default("default").describe("Canvas name"),
    x: z.number().int().describe("X coordinate"),
    y: z.number().int().describe("Y coordinate"),
  },
  async ({ canvas: name, x, y }) => {
    const state = getExisting(name);
    const rgba = state.history.canvas.getPixel(x, y);
    return ok(formatColor(rgba));
  }
);

server.tool(
  "fill_rect",
  "Fill a rectangle with a solid color.",
  {
    canvas: z.string().default("default").describe("Canvas name"),
    x: z.number().int().describe("Top-left X"),
    y: z.number().int().describe("Top-left Y"),
    width: z.number().int().min(1).describe("Rectangle width"),
    height: z.number().int().min(1).describe("Rectangle height"),
    color: z.string().describe("Fill color"),
  },
  async ({ canvas: name, x, y, width, height, color }) => {
    const state = getExisting(name);
    const rgba = parseColor(color);
    state.history.apply(() => state.history.canvas.fillRect(x, y, width, height, rgba));
    return ok(`Filled rect (${x},${y}) ${width}x${height} with ${formatColor(rgba)}`);
  }
);

server.tool(
  "draw_line",
  "Draw a line between two points using Bresenham's algorithm.",
  {
    canvas: z.string().default("default").describe("Canvas name"),
    x1: z.number().int().describe("Start X"),
    y1: z.number().int().describe("Start Y"),
    x2: z.number().int().describe("End X"),
    y2: z.number().int().describe("End Y"),
    color: z.string().describe("Line color"),
  },
  async ({ canvas: name, x1, y1, x2, y2, color }) => {
    const state = getExisting(name);
    const rgba = parseColor(color);
    state.history.apply(() => state.history.canvas.line(x1, y1, x2, y2, rgba));
    return ok(`Drew line (${x1},${y1})->(${x2},${y2}) in ${formatColor(rgba)}`);
  }
);

server.tool(
  "clear",
  "Clear the entire canvas to a color (default: transparent).",
  {
    canvas: z.string().default("default").describe("Canvas name"),
    color: z.string().default("transparent").describe("Clear color"),
  },
  async ({ canvas: name, color }) => {
    const state = getExisting(name);
    const rgba = parseColor(color);
    state.history.apply(() => state.history.canvas.clear(rgba));
    return ok(`Cleared canvas "${name}" to ${formatColor(rgba)}`);
  }
);

server.tool(
  "export_png",
  "Export a canvas to a PNG file.",
  {
    canvas: z.string().default("default").describe("Canvas name"),
    filename: z.string().describe("Output filename (e.g. hero.png). Saved to --export-dir or CWD."),
  },
  async ({ canvas: name, filename }) => {
    const state = getExisting(name);
    const c = state.history.canvas;
    const png = encodePNG(c.width, c.height, c.getRawPixels());
    const outPath = resolve(exportDir, filename);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, png);
    return ok(`Exported to ${outPath}`);
  }
);

server.tool(
  "get_canvas",
  "Return a readable snapshot of the canvas as a palette-indexed text grid. Transparent pixels are shown as '.'. Includes a color legend. For canvases larger than 64×64, returns a sparse list of non-transparent pixels instead.",
  {
    canvas: z.string().default("default").describe("Canvas name"),
  },
  async ({ canvas: name }) => {
    const state = getExisting(name);
    const c = state.history.canvas;
    const { width, height } = c;

    // Collect unique non-transparent colors
    const TRANSPARENT = "00000000";
    const colorAt = (x: number, y: number): string => {
      const rgba = c.getPixel(x, y);
      return formatColor(rgba).slice(1); // strip '#', 8 hex chars
    };

    if (width > 64 || height > 64) {
      // Sparse mode: list non-transparent pixels grouped by color
      const byColor = new Map<string, string[]>();
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const hex = colorAt(x, y);
          if (hex === TRANSPARENT) continue;
          const key = `#${hex}`;
          if (!byColor.has(key)) byColor.set(key, []);
          byColor.get(key)!.push(`(${x},${y})`);
        }
      }
      if (byColor.size === 0) {
        return ok(`Canvas "${name}" ${width}x${height} — all transparent`);
      }
      const lines = [`Canvas "${name}" ${width}x${height} (sparse — canvas >64×64):`];
      for (const [color, coords] of byColor) {
        lines.push(`  ${color}: ${coords.join(" ")}`);
      }
      return ok(lines.join("\n"));
    }

    // Palette-grid mode
    const CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@$%^&*";
    const palette = new Map<string, string>(); // hex -> char
    let charIdx = 0;

    const grid: string[] = [];
    for (let y = 0; y < height; y++) {
      let row = "";
      for (let x = 0; x < width; x++) {
        const hex = colorAt(x, y);
        if (hex === TRANSPARENT) {
          row += ".";
        } else {
          if (!palette.has(hex)) {
            palette.set(hex, charIdx < CHARS.length ? CHARS[charIdx++] : "?");
          }
          row += palette.get(hex)!;
        }
      }
      grid.push(row);
    }

    const legend = Array.from(palette.entries())
      .map(([hex, ch]) => `  ${ch} = #${hex}`)
      .join("\n");

    const lines = [
      `Canvas "${name}" ${width}x${height}:`,
      ...grid,
      "",
      "Legend (. = transparent):",
      legend || "  (none — canvas is fully transparent)",
    ];
    return ok(lines.join("\n"));
  }
);

server.tool(
  "undo",
  "Undo the last drawing operation on a canvas.",
  {
    canvas: z.string().default("default").describe("Canvas name"),
  },
  async ({ canvas: name }) => {
    const state = getExisting(name);
    state.history.undo();
    return ok("Undone");
  }
);

server.tool(
  "redo",
  "Redo the last undone operation on a canvas.",
  {
    canvas: z.string().default("default").describe("Canvas name"),
  },
  async ({ canvas: name }) => {
    const state = getExisting(name);
    state.history.redo();
    return ok("Redone");
  }
);

// ── Start ──────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
