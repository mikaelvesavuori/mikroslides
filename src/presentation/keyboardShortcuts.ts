export type KeyboardShortcutAction =
  | { kind: "close-context-menu"; preventDefault: true }
  | { kind: "presenter-next"; preventDefault: true }
  | { kind: "presenter-previous"; preventDefault: true }
  | { kind: "close-presenter"; preventDefault: false }
  | { kind: "open-command-palette"; preventDefault: true }
  | { kind: "open-presenter"; preventDefault: true }
  | { kind: "export-pdf"; preventDefault: true }
  | { kind: "save-deck"; preventDefault: true }
  | { kind: "create-deck"; preventDefault: true }
  | { kind: "undo"; preventDefault: true }
  | { kind: "redo"; preventDefault: true }
  | { kind: "copy-selection"; preventDefault: true }
  | { kind: "cut-selection"; preventDefault: true }
  | { kind: "duplicate"; preventDefault: true }
  | { kind: "select-all-elements"; preventDefault: true }
  | { kind: "delete-selection"; preventDefault: true }
  | { dx: number; dy: number; kind: "nudge-selection"; preventDefault: true };

export type KeyboardShortcutState = {
  commandPaletteOpen: boolean;
  contextMenuOpen: boolean;
  hasSelection: boolean;
  presenterOpen: boolean;
};

export type KeyboardShortcutCallbacks = {
  closeContextMenu: () => Promise<void> | void;
  closePresenter: () => Promise<void> | void;
  copySelection: () => Promise<void> | void;
  createDeck: () => Promise<void> | void;
  cutSelection: () => Promise<void> | void;
  deleteSelection: () => Promise<void> | void;
  duplicate: () => Promise<void> | void;
  exportPdf: () => Promise<void> | void;
  nudgeSelection: (dx: number, dy: number) => Promise<void> | void;
  openCommandPalette: () => Promise<void> | void;
  openPresenter: () => Promise<void> | void;
  presenterNext: () => Promise<void> | void;
  presenterPrevious: () => Promise<void> | void;
  redo: () => Promise<void> | void;
  saveDeck: () => Promise<void> | void;
  selectAllElements: () => Promise<void> | void;
  undo: () => Promise<void> | void;
};

type KeyboardEventLike = Pick<KeyboardEvent, "ctrlKey" | "key" | "metaKey" | "shiftKey" | "target">;

export function keyboardShortcutActionFromEvent(
  event: KeyboardEventLike,
  state: KeyboardShortcutState,
): KeyboardShortcutAction | null {
  const isTyping = isKeyboardInputTarget(event.target);
  const key = event.key.toLowerCase();
  const isModifierShortcut = event.metaKey || event.ctrlKey;

  if (state.contextMenuOpen && event.key === "Escape") {
    return { kind: "close-context-menu", preventDefault: true };
  }

  const presenterAction = presenterShortcutAction(event, state.presenterOpen);
  if (presenterAction) {
    return presenterAction;
  }

  if (
    !state.commandPaletteOpen &&
    ((isModifierShortcut && key === "k") || (!isTyping && event.key === "/"))
  ) {
    return { kind: "open-command-palette", preventDefault: true };
  }

  if (state.commandPaletteOpen) {
    return null;
  }

  if (isModifierShortcut && event.key === "Enter") {
    return { kind: "open-presenter", preventDefault: true };
  }

  if (isModifierShortcut && key === "p") {
    return { kind: "export-pdf", preventDefault: true };
  }

  if (isModifierShortcut && key === "s") {
    return { kind: "save-deck", preventDefault: true };
  }

  if (isModifierShortcut && key === "n") {
    return { kind: "create-deck", preventDefault: true };
  }

  if (isModifierShortcut && key === "z" && !event.shiftKey) {
    return { kind: "undo", preventDefault: true };
  }

  if (
    (isModifierShortcut && key === "z" && event.shiftKey) ||
    (isModifierShortcut && key === "y")
  ) {
    return { kind: "redo", preventDefault: true };
  }

  if (isModifierShortcut && key === "c" && !isTyping) {
    return { kind: "copy-selection", preventDefault: true };
  }

  if (isModifierShortcut && key === "x" && !isTyping) {
    return { kind: "cut-selection", preventDefault: true };
  }

  if (isModifierShortcut && key === "d" && !isTyping) {
    return { kind: "duplicate", preventDefault: true };
  }

  if (isModifierShortcut && key === "a" && !isTyping) {
    return { kind: "select-all-elements", preventDefault: true };
  }

  if (isTyping) {
    return null;
  }

  if ((event.key === "Delete" || event.key === "Backspace") && state.hasSelection) {
    return { kind: "delete-selection", preventDefault: true };
  }

  return nudgeShortcutAction(event, state.hasSelection);
}

export function isKeyboardInputTarget(target: EventTarget | null) {
  const candidate = target as {
    isContentEditable?: boolean;
    tagName?: string;
  } | null;
  const tagName = candidate?.tagName?.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    candidate?.isContentEditable === true
  );
}

export async function runKeyboardShortcutAction(
  action: KeyboardShortcutAction,
  callbacks: KeyboardShortcutCallbacks,
) {
  if (action.kind === "close-context-menu") {
    await callbacks.closeContextMenu();
    return;
  }
  if (action.kind === "presenter-next") {
    await callbacks.presenterNext();
    return;
  }
  if (action.kind === "presenter-previous") {
    await callbacks.presenterPrevious();
    return;
  }
  if (action.kind === "close-presenter") {
    await callbacks.closePresenter();
    return;
  }
  if (action.kind === "open-command-palette") {
    await callbacks.openCommandPalette();
    return;
  }
  if (action.kind === "open-presenter") {
    await callbacks.openPresenter();
    return;
  }
  if (action.kind === "export-pdf") {
    await callbacks.exportPdf();
    return;
  }
  if (action.kind === "save-deck") {
    await callbacks.saveDeck();
    return;
  }
  if (action.kind === "create-deck") {
    await callbacks.createDeck();
    return;
  }
  if (action.kind === "undo") {
    await callbacks.undo();
    return;
  }
  if (action.kind === "redo") {
    await callbacks.redo();
    return;
  }
  if (action.kind === "copy-selection") {
    await callbacks.copySelection();
    return;
  }
  if (action.kind === "cut-selection") {
    await callbacks.cutSelection();
    return;
  }
  if (action.kind === "duplicate") {
    await callbacks.duplicate();
    return;
  }
  if (action.kind === "select-all-elements") {
    await callbacks.selectAllElements();
    return;
  }
  if (action.kind === "delete-selection") {
    await callbacks.deleteSelection();
    return;
  }

  await callbacks.nudgeSelection(action.dx, action.dy);
}

function presenterShortcutAction(
  event: KeyboardEventLike,
  presenterOpen: boolean,
): KeyboardShortcutAction | null {
  if (!presenterOpen) {
    return null;
  }

  if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") {
    return { kind: "presenter-next", preventDefault: true };
  }

  if (event.key === "ArrowLeft" || event.key === "PageUp") {
    return { kind: "presenter-previous", preventDefault: true };
  }

  if (event.key === "Escape") {
    return { kind: "close-presenter", preventDefault: false };
  }

  return null;
}

function nudgeShortcutAction(
  event: KeyboardEventLike,
  hasSelection: boolean,
): KeyboardShortcutAction | null {
  if (!hasSelection) {
    return null;
  }

  const step = event.shiftKey ? 5 : 1;
  if (event.key === "ArrowLeft") {
    return { dx: -step, dy: 0, kind: "nudge-selection", preventDefault: true };
  }
  if (event.key === "ArrowRight") {
    return { dx: step, dy: 0, kind: "nudge-selection", preventDefault: true };
  }
  if (event.key === "ArrowUp") {
    return { dx: 0, dy: -step, kind: "nudge-selection", preventDefault: true };
  }
  if (event.key === "ArrowDown") {
    return { dx: 0, dy: step, kind: "nudge-selection", preventDefault: true };
  }

  return null;
}
