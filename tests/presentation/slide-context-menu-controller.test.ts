import type { SlideContextMenuAction } from "../../src/presentation/slideContextMenu.js";
import { createSlideContextMenuController } from "../../src/presentation/slideContextMenuController.js";

type FakeButton = {
  dataset: { slideContextAction?: SlideContextMenuAction };
  disabled: boolean;
  textContent: string | null;
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

describe("slide context menu controller", () => {
  it("positions the menu and syncs slide action availability", () => {
    const moveUp = {
      dataset: { slideContextAction: "move-up" },
      disabled: false,
      textContent: "Move up",
    } satisfies FakeButton;
    const moveDown = {
      dataset: { slideContextAction: "move-down" },
      disabled: false,
      textContent: "Move down",
    } satisfies FakeButton;
    const paste = {
      dataset: { slideContextAction: "paste-after" },
      disabled: false,
      textContent: "Paste after",
    } satisfies FakeButton;
    const skip = {
      dataset: { slideContextAction: "toggle-skip" },
      disabled: false,
      textContent: "Skip slide",
    } satisfies FakeButton;
    const element = menu([moveUp, moveDown, paste, skip]);
    const controller = createSlideContextMenuController({
      actions: actions(),
      contextMenu: element as unknown as HTMLElement,
      getState: () => ({
        hasClipboard: false,
        hasSlide: true,
        isFirstSlide: true,
        isLastSlide: false,
        isSkipped: true,
      }),
      viewport: () => ({ height: 200, width: 240 }),
    });

    controller.open("slide-1", 500, 500);

    expect(element.hidden).toBe(false);
    expect(element.style.left).toBe("72px");
    expect(element.style.top).toBe("72px");
    expect(moveUp.disabled).toBe(true);
    expect(moveDown.disabled).toBe(false);
    expect(paste.disabled).toBe(true);
    expect(skip.textContent).toBe("Don't skip slide");
    expect(controller.isOpen()).toBe(true);
  });

  it("closes and runs selected slide actions with the active slide id", () => {
    const calls: string[] = [];
    const button = {
      dataset: { slideContextAction: "duplicate" },
      disabled: false,
      textContent: "Duplicate slide",
    } satisfies FakeButton;
    const element = menu([button]);
    const controller = createSlideContextMenuController({
      actions: actions({ duplicate: (slideId) => calls.push(`duplicate:${slideId}`) }),
      contextMenu: element as unknown as HTMLElement,
      getState: () => ({
        hasClipboard: true,
        hasSlide: true,
        isFirstSlide: false,
        isLastSlide: false,
        isSkipped: false,
      }),
      viewport: () => ({ height: 800, width: 1000 }),
    });

    controller.open("slide-2", 20, 20);
    controller.handleClick({
      target: {
        closest: () => button,
      },
    } as unknown as MouseEvent);

    expect(element.hidden).toBe(true);
    expect(calls).toEqual(["duplicate:slide-2"]);
  });
});

function actions(
  overrides: Partial<Record<SlideContextMenuAction, (slideId: string) => void>> = {},
) {
  const noop = (_slideId: string) => undefined;
  return {
    copy: noop,
    cut: noop,
    delete: noop,
    duplicate: noop,
    "move-down": noop,
    "move-up": noop,
    "paste-after": noop,
    "toggle-skip": noop,
    ...overrides,
  };
}
