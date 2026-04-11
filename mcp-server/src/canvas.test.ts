import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { Canvas } from "./canvas.js";
import { parseColor, formatColor, type RGBA } from "./color.js";
import { HistoryManager } from "./history.js";
import { encodePNG } from "./png.js";

describe("Canvas", () => {
  it("sets and gets pixels", () => {
    const c = new Canvas(4, 4);
    const red: RGBA = [255, 0, 0, 255];
    c.setPixel(1, 2, red);
    assert.deepStrictEqual(c.getPixel(1, 2), red);
    assert.deepStrictEqual(c.getPixel(0, 0), [0, 0, 0, 0]); // default transparent
  });

  it("rejects out-of-bounds", () => {
    const c = new Canvas(4, 4);
    assert.throws(() => c.setPixel(-1, 0, [0, 0, 0, 0]), /out of bounds/);
    assert.throws(() => c.setPixel(4, 0, [0, 0, 0, 0]), /out of bounds/);
    assert.throws(() => c.getPixel(0, 4), /out of bounds/);
  });

  it("fills a rectangle", () => {
    const c = new Canvas(8, 8);
    const blue: RGBA = [0, 0, 255, 255];
    c.fillRect(2, 3, 3, 2, blue);
    assert.deepStrictEqual(c.getPixel(2, 3), blue);
    assert.deepStrictEqual(c.getPixel(4, 4), blue);
    assert.deepStrictEqual(c.getPixel(1, 3), [0, 0, 0, 0]); // outside
    assert.deepStrictEqual(c.getPixel(5, 3), [0, 0, 0, 0]); // outside
  });

  it("draws a horizontal line", () => {
    const c = new Canvas(8, 8);
    const red: RGBA = [255, 0, 0, 255];
    c.line(0, 0, 3, 0, red);
    for (let x = 0; x <= 3; x++) {
      assert.deepStrictEqual(c.getPixel(x, 0), red);
    }
    assert.deepStrictEqual(c.getPixel(4, 0), [0, 0, 0, 0]);
  });

  it("draws a diagonal line", () => {
    const c = new Canvas(8, 8);
    const green: RGBA = [0, 128, 0, 255];
    c.line(0, 0, 3, 3, green);
    for (let i = 0; i <= 3; i++) {
      assert.deepStrictEqual(c.getPixel(i, i), green);
    }
  });

  it("clears canvas", () => {
    const c = new Canvas(4, 4);
    c.setPixel(0, 0, [255, 0, 0, 255]);
    c.clear([0, 0, 0, 0]);
    assert.deepStrictEqual(c.getPixel(0, 0), [0, 0, 0, 0]);
  });
});

describe("Color", () => {
  it("parses #rgb", () => {
    assert.deepStrictEqual(parseColor("#f00"), [255, 0, 0, 255]);
  });

  it("parses #rrggbb", () => {
    assert.deepStrictEqual(parseColor("#ff0000"), [255, 0, 0, 255]);
  });

  it("parses #rrggbbaa", () => {
    assert.deepStrictEqual(parseColor("#ff000080"), [255, 0, 0, 128]);
  });

  it("parses named colors", () => {
    assert.deepStrictEqual(parseColor("red"), [255, 0, 0, 255]);
    assert.deepStrictEqual(parseColor("transparent"), [0, 0, 0, 0]);
  });

  it("rejects invalid colors", () => {
    assert.throws(() => parseColor("#12"), /invalid color/);
    assert.throws(() => parseColor("notacolor"), /invalid color/);
  });

  it("formats color as #rrggbbaa", () => {
    assert.strictEqual(formatColor([255, 0, 0, 255]), "#ff0000ff");
    assert.strictEqual(formatColor([0, 0, 0, 0]), "#00000000");
  });
});

describe("History", () => {
  it("undoes and redoes", () => {
    const canvas = new Canvas(4, 4);
    const history = new HistoryManager(canvas);
    const red: RGBA = [255, 0, 0, 255];

    history.apply(() => canvas.setPixel(0, 0, red));
    assert.deepStrictEqual(canvas.getPixel(0, 0), red);

    history.undo();
    assert.deepStrictEqual(canvas.getPixel(0, 0), [0, 0, 0, 0]);

    history.redo();
    assert.deepStrictEqual(canvas.getPixel(0, 0), red);
  });

  it("clears redo on new mutation", () => {
    const canvas = new Canvas(4, 4);
    const history = new HistoryManager(canvas);

    history.apply(() => canvas.setPixel(0, 0, [255, 0, 0, 255]));
    history.undo();
    history.apply(() => canvas.setPixel(0, 0, [0, 255, 0, 255]));
    assert.throws(() => history.redo(), /nothing to redo/);
  });

  it("throws on empty undo/redo", () => {
    const canvas = new Canvas(4, 4);
    const history = new HistoryManager(canvas);
    assert.throws(() => history.undo(), /nothing to undo/);
    assert.throws(() => history.redo(), /nothing to redo/);
  });
});

describe("PNG", () => {
  it("encodes a valid PNG", () => {
    const c = new Canvas(2, 2);
    c.setPixel(0, 0, [255, 0, 0, 255]);
    c.setPixel(1, 1, [0, 0, 255, 255]);
    const png = encodePNG(c.width, c.height, c.getRawPixels());

    // Check PNG signature
    assert.deepStrictEqual(
      [...png.subarray(0, 8)],
      [137, 80, 78, 71, 13, 10, 26, 10]
    );
    // Should be non-trivial size
    assert.ok(png.length > 50, `PNG too small: ${png.length} bytes`);
  });
});
