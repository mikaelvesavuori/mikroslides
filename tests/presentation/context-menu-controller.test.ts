import type { ContextMenuAction } from "../../src/presentation/contextMenu.js";
import { createContextMenuController } from "../../src/presentation/contextMenuController.js";

type FakeButton = {
  dataset: { contextAction?: ContextMenuAction };
  disabled: boolean;
};

function menu(buttons: FakeButton[]) {
  const style = { left: "", top: "" };
  return {
    getBoundingClientRect: () => ({ height: 120, width: 160 }),
    hidden: true,
    querySelectorAll: () => buttons,
    style,
  };
}

describe("context menu controller", () => {
  it("positions the menu and syncs action availability", () => {
    const copy = { dataset: { contextAction: "copy" }, disabled: false } satisfies FakeButton;
    const paste = { dataset: { contextAction: "paste" }, disabled: false } satisfies FakeButton;
    const element = menu([copy, paste]);
    const controller = createContextMenuController({
      actions: actions(),
      contextMenu: element as unknown as HTMLElement,
      getState: () => availability({ hasClipboard: false, hasSelection: true }),
      viewport: () => ({ height: 200, width: 240 }),
    });

    controller.open(500, 500);

    expect(element.hidden).toBe(false);
    expect(element.style.left).toBe("72px");
    expect(element.style.top).toBe("72px");
    expect(copy.disabled).toBe(false);
    expect(paste.disabled).toBe(true);
    expect(controller.isOpen()).toBe(true);
  });

  it("closes and runs selected actions", () => {
    const calls: string[] = [];
    const button = {
      dataset: { contextAction: "delete" },
      disabled: false,
    } satisfies FakeButton;
    const element = menu([button]);
    const controller = createContextMenuController({
      actions: actions({ delete: () => calls.push("delete") }),
      contextMenu: element as unknown as HTMLElement,
      getState: () => availability({ hasClipboard: true, hasSelection: true }),
      viewport: () => ({ height: 800, width: 1000 }),
    });

    controller.open(20, 20);
    controller.handleClick({
      target: {
        closest: () => button,
      },
    } as unknown as MouseEvent);

    expect(element.hidden).toBe(true);
    expect(calls).toEqual(["delete"]);
  });
});

function actions(overrides: Partial<Record<ContextMenuAction, () => void>> = {}) {
  const noop = () => undefined;
  return {
    "add-image": noop,
    "add-shape": noop,
    "add-text": noop,
    "bring-front": noop,
    copy: noop,
    cut: noop,
    delete: noop,
    duplicate: noop,
    lock: noop,
    paste: noop,
    "send-back": noop,
    unlock: noop,
    ...overrides,
  };
}

function availability(
  overrides: Partial<{
    hasClipboard: boolean;
    hasLockedSelection: boolean;
    hasSelection: boolean;
    hasUnlockedSelection: boolean;
  }> = {},
) {
  return {
    hasClipboard: false,
    hasLockedSelection: false,
    hasSelection: false,
    hasUnlockedSelection: false,
    ...overrides,
  };
}
