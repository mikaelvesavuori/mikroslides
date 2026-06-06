import {
  isKeyboardInputTarget,
  type KeyboardShortcutState,
  keyboardShortcutActionFromEvent,
  runKeyboardShortcutAction,
} from "../../src/presentation/keyboardShortcuts.js";

const baseState: KeyboardShortcutState = {
  commandPaletteOpen: false,
  contextMenuOpen: false,
  hasSelection: false,
  presenterOpen: false,
};

function shortcut(
  input: Partial<KeyboardEvent> & { key: string },
  state: Partial<KeyboardShortcutState> = {},
) {
  return keyboardShortcutActionFromEvent(
    {
      key: input.key,
      ctrlKey: input.ctrlKey ?? false,
      metaKey: input.metaKey ?? false,
      shiftKey: input.shiftKey ?? false,
      target: input.target ?? null,
    },
    { ...baseState, ...state },
  );
}

describe("keyboard shortcuts", () => {
  it("opens command palette with modifier-k or slash outside typing", () => {
    expect(shortcut({ key: "k", metaKey: true })?.kind).toBe("open-command-palette");
    expect(shortcut({ key: "/" })?.kind).toBe("open-command-palette");
    expect(
      shortcut({ key: "/", target: { tagName: "INPUT" } as unknown as EventTarget }),
    ).toBeNull();
  });

  it("routes presenter shortcuts before regular shortcuts", () => {
    expect(shortcut({ key: "ArrowRight" }, { presenterOpen: true })?.kind).toBe("presenter-next");
    expect(shortcut({ key: "ArrowLeft" }, { presenterOpen: true })?.kind).toBe(
      "presenter-previous",
    );
    expect(shortcut({ key: "Escape" }, { presenterOpen: true })).toEqual({
      kind: "close-presenter",
      preventDefault: false,
    });
  });

  it("handles document and edit shortcuts", () => {
    expect(shortcut({ key: "s", metaKey: true })?.kind).toBe("save-deck");
    expect(shortcut({ key: "n", ctrlKey: true })?.kind).toBe("create-deck");
    expect(shortcut({ key: "z", metaKey: true })?.kind).toBe("undo");
    expect(shortcut({ key: "z", metaKey: true, shiftKey: true })?.kind).toBe("redo");
    expect(shortcut({ key: "y", ctrlKey: true })?.kind).toBe("redo");
  });

  it("protects native text copy and cut while typing", () => {
    const target = { tagName: "TEXTAREA" } as unknown as EventTarget;

    expect(shortcut({ key: "c", metaKey: true, target })).toBeNull();
    expect(shortcut({ key: "x", metaKey: true, target })).toBeNull();
    expect(shortcut({ key: "c", metaKey: true })?.kind).toBe("copy-selection");
    expect(shortcut({ key: "x", metaKey: true })?.kind).toBe("cut-selection");
  });

  it("handles selection-only shortcuts", () => {
    expect(shortcut({ key: "Backspace" })).toBeNull();
    expect(shortcut({ key: "Backspace" }, { hasSelection: true })?.kind).toBe("delete-selection");
    expect(shortcut({ key: "d", metaKey: true })?.kind).toBe("duplicate");
    expect(shortcut({ key: "a", metaKey: true })?.kind).toBe("select-all-elements");
  });

  it("does not delete selected objects while editing text", () => {
    const editor = { isContentEditable: true, tagName: "DIV" } as unknown as EventTarget;
    const nestedTextTarget = {
      parentElement: {
        closest: (selector: string) =>
          selector.includes("[contenteditable") ? { tagName: "DIV" } : null,
        tagName: "SPAN",
      },
    } as unknown as EventTarget;

    expect(shortcut({ key: "Backspace", target: editor }, { hasSelection: true })).toBeNull();
    expect(shortcut({ key: "Delete", target: editor }, { hasSelection: true })).toBeNull();
    expect(
      shortcut({ key: "Backspace", target: nestedTextTarget }, { hasSelection: true }),
    ).toBeNull();
  });

  it("nudges selected elements with arrow keys", () => {
    expect(shortcut({ key: "ArrowDown" })).toBeNull();
    expect(shortcut({ key: "ArrowDown" }, { hasSelection: true })).toEqual({
      dx: 0,
      dy: 1,
      kind: "nudge-selection",
      preventDefault: true,
    });
    expect(shortcut({ key: "ArrowLeft", shiftKey: true }, { hasSelection: true })).toMatchObject({
      dx: -5,
      dy: 0,
    });
  });

  it("recognizes input-like targets", () => {
    expect(isKeyboardInputTarget({ tagName: "SELECT" } as unknown as EventTarget)).toBe(true);
    expect(isKeyboardInputTarget({ isContentEditable: true } as unknown as EventTarget)).toBe(true);
    expect(
      isKeyboardInputTarget({
        closest: () => ({ tagName: "DIV" }),
        tagName: "SPAN",
      } as unknown as EventTarget),
    ).toBe(true);
    expect(isKeyboardInputTarget({ tagName: "DIV" } as unknown as EventTarget)).toBe(false);
  });

  it("dispatches shortcut actions through callbacks", async () => {
    const calls: string[] = [];
    const record = (name: string) => {
      calls.push(name);
    };
    const callbacks = {
      closeContextMenu: () => record("closeContextMenu"),
      closePresenter: () => record("closePresenter"),
      copySelection: () => record("copySelection"),
      createDeck: () => record("createDeck"),
      cutSelection: () => record("cutSelection"),
      deleteSelection: () => record("deleteSelection"),
      duplicate: () => record("duplicate"),
      exportPdf: () => record("exportPdf"),
      nudgeSelection: (dx: number, dy: number) => record(`nudge:${dx},${dy}`),
      openCommandPalette: () => record("openCommandPalette"),
      openPresenter: () => record("openPresenter"),
      presenterNext: () => record("presenterNext"),
      presenterPrevious: () => record("presenterPrevious"),
      redo: () => record("redo"),
      saveDeck: async () => record("saveDeck"),
      selectAllElements: () => record("selectAllElements"),
      undo: () => record("undo"),
    };

    await runKeyboardShortcutAction({ kind: "save-deck", preventDefault: true }, callbacks);
    await runKeyboardShortcutAction(
      { dx: -5, dy: 0, kind: "nudge-selection", preventDefault: true },
      callbacks,
    );
    await runKeyboardShortcutAction({ kind: "presenter-next", preventDefault: true }, callbacks);

    expect(calls).toEqual(["saveDeck", "nudge:-5,0", "presenterNext"]);
  });
});
