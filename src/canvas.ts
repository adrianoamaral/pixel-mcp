import { type RGBA } from "./color.js";

export class Canvas {
  readonly width: number;
  readonly height: number;
  private pixels: Uint8Array;

  constructor(width: number, height: number) {
    if (width <= 0 || height <= 0) {
      throw new Error(`invalid canvas size: ${width}x${height}`);
    }
    this.width = width;
    this.height = height;
    this.pixels = new Uint8Array(width * height * 4); // RGBA, initialized to transparent
  }

  private offset(x: number, y: number): number {
    return (y * this.width + x) * 4;
  }

  private checkBounds(x: number, y: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      throw new Error(`out of bounds: (${x}, ${y}) on ${this.width}x${this.height} canvas`);
    }
  }

  setPixel(x: number, y: number, color: RGBA): void {
    this.checkBounds(x, y);
    const o = this.offset(x, y);
    this.pixels[o] = color[0];
    this.pixels[o + 1] = color[1];
    this.pixels[o + 2] = color[2];
    this.pixels[o + 3] = color[3];
  }

  getPixel(x: number, y: number): RGBA {
    this.checkBounds(x, y);
    const o = this.offset(x, y);
    return [this.pixels[o], this.pixels[o + 1], this.pixels[o + 2], this.pixels[o + 3]];
  }

  fillRect(x: number, y: number, w: number, h: number, color: RGBA): void {
    if (w <= 0 || h <= 0) {
      throw new Error(`invalid dimensions: width=${w}, height=${h} (must be positive)`);
    }
    this.checkBounds(x, y);
    this.checkBounds(x + w - 1, y + h - 1);
    for (let py = y; py < y + h; py++) {
      for (let px = x; px < x + w; px++) {
        const o = this.offset(px, py);
        this.pixels[o] = color[0];
        this.pixels[o + 1] = color[1];
        this.pixels[o + 2] = color[2];
        this.pixels[o + 3] = color[3];
      }
    }
  }

  line(x1: number, y1: number, x2: number, y2: number, color: RGBA): void {
    this.checkBounds(x1, y1);
    this.checkBounds(x2, y2);

    // Bresenham's line algorithm
    let dx = Math.abs(x2 - x1);
    let dy = -Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx + dy;

    let cx = x1;
    let cy = y1;

    for (;;) {
      const o = this.offset(cx, cy);
      this.pixels[o] = color[0];
      this.pixels[o + 1] = color[1];
      this.pixels[o + 2] = color[2];
      this.pixels[o + 3] = color[3];

      if (cx === x2 && cy === y2) break;

      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        cx += sx;
      }
      if (e2 <= dx) {
        err += dx;
        cy += sy;
      }
    }
  }

  clear(color: RGBA = [0, 0, 0, 0]): void {
    for (let i = 0; i < this.pixels.length; i += 4) {
      this.pixels[i] = color[0];
      this.pixels[i + 1] = color[1];
      this.pixels[i + 2] = color[2];
      this.pixels[i + 3] = color[3];
    }
  }

  snapshot(): Uint8Array {
    return new Uint8Array(this.pixels);
  }

  restore(data: Uint8Array): void {
    this.pixels.set(data);
  }

  /** Returns raw RGBA buffer for PNG encoding */
  getRawPixels(): Uint8Array {
    return new Uint8Array(this.pixels);
  }
}
