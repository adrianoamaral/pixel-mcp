import { Canvas } from "./canvas.js";

export class HistoryManager {
  private undoStack: Uint8Array[] = [];
  private redoStack: Uint8Array[] = [];
  readonly canvas: Canvas;

  constructor(canvas: Canvas) {
    this.canvas = canvas;
  }

  /** Run a mutation, recording a snapshot for undo. Clears redo stack. */
  apply(mutate: () => void): void {
    this.undoStack.push(this.canvas.snapshot());
    this.redoStack.length = 0;
    mutate();
  }

  undo(): void {
    const snap = this.undoStack.pop();
    if (!snap) {
      throw new Error("nothing to undo");
    }
    this.redoStack.push(this.canvas.snapshot());
    this.canvas.restore(snap);
  }

  redo(): void {
    const snap = this.redoStack.pop();
    if (!snap) {
      throw new Error("nothing to redo");
    }
    this.undoStack.push(this.canvas.snapshot());
    this.canvas.restore(snap);
  }
}
