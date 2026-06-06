import type { MikroDeckRecord } from "../index.js";

export function cloneDeckRecord(record: MikroDeckRecord) {
  return structuredClone(record);
}

export class DeckHistory {
  private pendingSnapshot: MikroDeckRecord | null = null;
  private redoStack: MikroDeckRecord[] = [];
  private undoStack: MikroDeckRecord[] = [];

  constructor(private readonly limit = 80) {}

  get canRedo() {
    return this.redoStack.length > 0;
  }

  get canUndo() {
    return this.undoStack.length > 0;
  }

  get pending() {
    return Boolean(this.pendingSnapshot);
  }

  clear() {
    this.pendingSnapshot = null;
    this.redoStack = [];
    this.undoStack = [];
  }

  clearPending() {
    this.pendingSnapshot = null;
  }

  stage(record: MikroDeckRecord | null) {
    if (!record || this.pendingSnapshot) {
      return false;
    }

    this.pendingSnapshot = cloneDeckRecord(record);
    return true;
  }

  flush() {
    if (!this.pendingSnapshot) {
      return false;
    }

    this.undoStack = [...this.undoStack, this.pendingSnapshot].slice(-this.limit);
    this.redoStack = [];
    this.pendingSnapshot = null;
    return true;
  }

  undo(current: MikroDeckRecord | null) {
    if (!current || this.undoStack.length === 0) {
      return null;
    }

    const previous = this.undoStack[this.undoStack.length - 1];
    this.undoStack = this.undoStack.slice(0, -1);
    this.redoStack = [...this.redoStack, cloneDeckRecord(current)].slice(-this.limit);
    this.pendingSnapshot = null;
    return cloneDeckRecord(previous);
  }

  redo(current: MikroDeckRecord | null) {
    if (!current || this.redoStack.length === 0) {
      return null;
    }

    const next = this.redoStack[this.redoStack.length - 1];
    this.redoStack = this.redoStack.slice(0, -1);
    this.undoStack = [...this.undoStack, cloneDeckRecord(current)].slice(-this.limit);
    this.pendingSnapshot = null;
    return cloneDeckRecord(next);
  }
}
