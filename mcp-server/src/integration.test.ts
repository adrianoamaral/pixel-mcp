import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { existsSync, unlinkSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function createClient(): Promise<Client> {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["dist/index.js", "--export-dir", tmpdir()],
  });
  const client = new Client({ name: "test-client", version: "1.0.0" });
  await client.connect(transport);
  return client;
}

describe("MCP Integration", () => {
  it("lists tools", async () => {
    const client = await createClient();
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    assert.ok(names.includes("create_canvas"), "should have create_canvas");
    assert.ok(names.includes("set_pixel"), "should have set_pixel");
    assert.ok(names.includes("get_pixel"), "should have get_pixel");
    assert.ok(names.includes("fill_rect"), "should have fill_rect");
    assert.ok(names.includes("draw_line"), "should have draw_line");
    assert.ok(names.includes("clear"), "should have clear");
    assert.ok(names.includes("export_png"), "should have export_png");
    assert.ok(names.includes("undo"), "should have undo");
    assert.ok(names.includes("redo"), "should have redo");
    assert.ok(names.includes("list_canvases"), "should have list_canvases");
    await client.close();
  });

  it("creates canvas, draws pixel, reads it back", async () => {
    const client = await createClient();

    let result = await client.callTool({
      name: "create_canvas",
      arguments: { name: "test", width: 8, height: 8 },
    });
    assert.ok(textOf(result).includes("8x8"));

    result = await client.callTool({
      name: "set_pixel",
      arguments: { canvas: "test", x: 3, y: 4, color: "#ff0000" },
    });
    assert.ok(textOf(result).includes("ff0000"));

    result = await client.callTool({
      name: "get_pixel",
      arguments: { canvas: "test", x: 3, y: 4 },
    });
    assert.strictEqual(textOf(result), "#ff0000ff");

    await client.close();
  });

  it("fill_rect and draw_line", async () => {
    const client = await createClient();
    await client.callTool({
      name: "create_canvas",
      arguments: { name: "draw", width: 16, height: 16 },
    });

    await client.callTool({
      name: "fill_rect",
      arguments: { canvas: "draw", x: 0, y: 0, width: 4, height: 4, color: "blue" },
    });

    let result = await client.callTool({
      name: "get_pixel",
      arguments: { canvas: "draw", x: 2, y: 2 },
    });
    assert.strictEqual(textOf(result), "#0000ffff");

    await client.callTool({
      name: "draw_line",
      arguments: { canvas: "draw", x1: 0, y1: 0, x2: 7, y2: 7, color: "red" },
    });

    result = await client.callTool({
      name: "get_pixel",
      arguments: { canvas: "draw", x: 3, y: 3 },
    });
    assert.strictEqual(textOf(result), "#ff0000ff");

    await client.close();
  });

  it("undo and redo", async () => {
    const client = await createClient();
    await client.callTool({
      name: "create_canvas",
      arguments: { name: "hist", width: 4, height: 4 },
    });

    await client.callTool({
      name: "set_pixel",
      arguments: { canvas: "hist", x: 0, y: 0, color: "red" },
    });

    await client.callTool({ name: "undo", arguments: { canvas: "hist" } });
    let result = await client.callTool({
      name: "get_pixel",
      arguments: { canvas: "hist", x: 0, y: 0 },
    });
    assert.strictEqual(textOf(result), "#00000000"); // back to transparent

    await client.callTool({ name: "redo", arguments: { canvas: "hist" } });
    result = await client.callTool({
      name: "get_pixel",
      arguments: { canvas: "hist", x: 0, y: 0 },
    });
    assert.strictEqual(textOf(result), "#ff0000ff"); // red again

    await client.close();
  });

  it("exports valid PNG", async () => {
    const outFile = join(tmpdir(), `pxcli-test-${Date.now()}.png`);
    const client = await createClient();

    await client.callTool({
      name: "create_canvas",
      arguments: { name: "export", width: 4, height: 4 },
    });
    await client.callTool({
      name: "set_pixel",
      arguments: { canvas: "export", x: 0, y: 0, color: "red" },
    });

    const result = await client.callTool({
      name: "export_png",
      arguments: { canvas: "export", filename: outFile },
    });
    assert.ok(textOf(result).includes(outFile));
    assert.ok(existsSync(outFile), "PNG file should exist");

    // Verify PNG signature
    const buf = readFileSync(outFile);
    assert.deepStrictEqual([...buf.subarray(0, 4)], [137, 80, 78, 71]);
    assert.ok(buf.length > 50);

    unlinkSync(outFile);
    await client.close();
  });

  it("clear resets canvas", async () => {
    const client = await createClient();
    await client.callTool({
      name: "create_canvas",
      arguments: { name: "clr", width: 4, height: 4 },
    });
    await client.callTool({
      name: "set_pixel",
      arguments: { canvas: "clr", x: 0, y: 0, color: "red" },
    });
    await client.callTool({
      name: "clear",
      arguments: { canvas: "clr", color: "blue" },
    });

    const result = await client.callTool({
      name: "get_pixel",
      arguments: { canvas: "clr", x: 0, y: 0 },
    });
    assert.strictEqual(textOf(result), "#0000ffff");
    await client.close();
  });
});

function textOf(result: Awaited<ReturnType<Client["callTool"]>>): string {
  const content = result.content as Array<{ type: string; text?: string }>;
  const item = content[0];
  if (item && item.text !== undefined) return item.text;
  throw new Error("No text content in result");
}
