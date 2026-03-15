# pixel-mcp

An MCP (Model Context Protocol) server that lets AI coding agents (Claude Code, Cursor, Windsurf, etc.) create pixel art programmatically. No daemon, no sockets, no Go runtime — just a lightweight TypeScript server that runs via `npx`.

## Install

### Use with Claude Code

Add to your project's `.claude/settings.json`:

```json
{
  "mcpServers": {
    "pixel-art": {
      "command": "npx",
      "args": ["pxcli-mcp", "--export-dir", "./assets/sprites"]
    }
  }
}
```

### Use with any MCP client

```bash
npx pxcli-mcp --export-dir ./output
```

### From source

```bash
npm install
npm run build
node dist/index.js --export-dir ./output
```

## Quick start

Once configured, Claude (or any MCP client) can use these tools directly:

```
create_canvas(name: "hero", width: 16, height: 16)
fill_rect(canvas: "hero", x: 0, y: 0, width: 16, height: 16, color: "black")
set_pixel(canvas: "hero", x: 8, y: 4, color: "#ff0000")
draw_line(canvas: "hero", x1: 0, y1: 15, x2: 15, y2: 15, color: "white")
export_png(canvas: "hero", filename: "hero.png")
```

## Tools

| Tool | Description |
|------|-------------|
| `create_canvas` | Create a named canvas with given dimensions (max 256x256) |
| `list_canvases` | List all active canvases and their sizes |
| `set_pixel` | Set a single pixel color |
| `get_pixel` | Read a pixel's color |
| `fill_rect` | Fill a rectangle with a solid color |
| `draw_line` | Draw a line between two points (Bresenham's algorithm) |
| `clear` | Clear entire canvas to a color (default: transparent) |
| `export_png` | Export canvas to a PNG file |
| `undo` | Undo the last drawing operation |
| `redo` | Redo the last undone operation |

All drawing tools accept a `canvas` parameter (defaults to `"default"`), so you can work on multiple sprites simultaneously.

## Color formats

- Hex: `#rgb`, `#rrggbb`, `#rrggbbaa`
- Named: `red`, `green`, `blue`, `white`, `black`, `transparent`, `yellow`, `cyan`, `magenta`, `orange`, `purple`, `gray`, `grey`, `pink`, `brown`, `lime`, `navy`, `teal`, `maroon`, `olive`

## CLI options

| Flag | Description |
|------|-------------|
| `--export-dir <path>` | Directory for exported PNGs (defaults to CWD) |

## Development

```bash
npm install
npm run build
npm test        # runs 22 tests (unit + MCP integration)
npm run dev     # watch mode for TypeScript compilation
```

## Credits

Inspired by and built on top of [vossenwout/pixel-art-cli](https://github.com/vossenwout/pixel-art-cli) — thank you for the original Go daemon-based pixel art CLI that made this possible.
