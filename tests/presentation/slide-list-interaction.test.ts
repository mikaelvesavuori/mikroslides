import {
  createSlideListInteraction,
  dropPlacementFromGeometry,
  slideListKeyboardActionFromEvent,
} from "../../src/presentation/slideListInteraction.js";

function keyboardEvent(
  key: string,
  modifiers: Partial<Pick<KeyboardEvent, "ctrlKey" | "metaKey">> = {},
) {
  const state = { prevented: false, stopped: false };
  const event = {
    ctrlKey: modifiers.ctrlKey ?? false,
    key,
    metaKey: modifiers.metaKey ?? false,
    preventDefault: () => {
      state.prevented = true;
    },
    stopPropagation: () => {
      state.stopped = true;
    },
  } as unknown as KeyboardEvent;

  return { event, state };
}

describe("slide list interaction", () => {
  it("maps thumbnail rail keyboard shortcuts to slide actions", () => {
    expect(slideListKeyboardActionFromEvent({ ctrlKey: false, key: "c", metaKey: true })).toBe(
      "copy-slide",
    );
    expect(slideListKeyboardActionFromEvent({ ctrlKey: true, key: "x", metaKey: false })).toBe(
      "cut-slide",
    );
    expect(slideListKeyboardActionFromEvent({ ctrlKey: false, key: "v", metaKey: true })).toBe(
      "paste-slide",
    );
    expect(
      slideListKeyboardActionFromEvent({ ctrlKey: false, key: "Delete", metaKey: false }),
    ).toBe("delete-slide");
    expect(slideListKeyboardActionFromEvent({ ctrlKey: true, key: "Delete", metaKey: false })).toBe(
      null,
    );
  });

  it("dispatches thumbnail rail keyboard shortcuts and restores active thumbnail focus", () => {
    const calls: string[] = [];
    const slideList = {
      querySelector: () => ({
        focus: () => calls.push("focus"),
      }),
    } as unknown as HTMLElement;
    const windowRef = {
      setTimeout: (callback: TimerHandler) => {
        if (typeof callback === "function") {
          callback();
        }
        return 1;
      },
    } as unknown as Pick<Window, "setTimeout">;
    const interaction = createSlideListInteraction({
      hasDeck: () => true,
      onCopySlide: () => calls.push("copy"),
      onCutSlide: () => calls.push("cut"),
      onDeleteSlide: () => calls.push("delete"),
      onOpenSlideContextMenu: () => calls.push("open-menu"),
      onPasteSlide: () => calls.push("paste"),
      onReorderSlide: () => calls.push("reorder"),
      onSelectSlide: () => calls.push("select"),
      onToggleSlideSkipped: () => calls.push("skip"),
      slideList,
      windowRef,
    });
    const { event, state } = keyboardEvent("v", { metaKey: true });

    interaction.handleKeyDown(event);

    expect(calls).toEqual(["paste", "focus"]);
    expect(state.prevented).toBe(true);
    expect(state.stopped).toBe(true);
  });

  it("opens a slide context menu for the right-clicked thumbnail", () => {
    const calls: string[] = [];
    const previousHTMLElement = globalThis.HTMLElement;
    class FakeElement {
      dataset: { slideId?: string };

      constructor(slideId?: string) {
        this.dataset = { slideId };
      }

      closest() {
        return this;
      }
    }
    Object.defineProperty(globalThis, "HTMLElement", {
      configurable: true,
      value: FakeElement,
    });
    const slideList = {
      querySelector: () => ({
        focus: () => undefined,
      }),
    } as unknown as HTMLElement;
    const windowRef = {
      setTimeout: (callback: TimerHandler) => {
        if (typeof callback === "function") {
          callback();
        }
        return 1;
      },
    } as unknown as Pick<Window, "setTimeout">;
    const interaction = createSlideListInteraction({
      hasDeck: () => true,
      onCopySlide: () => calls.push("copy"),
      onCutSlide: () => calls.push("cut"),
      onDeleteSlide: () => calls.push("delete"),
      onOpenSlideContextMenu: (slideId, clientX, clientY) =>
        calls.push(`open:${slideId}:${clientX}:${clientY}`),
      onPasteSlide: () => calls.push("paste"),
      onReorderSlide: () => calls.push("reorder"),
      onSelectSlide: (slideId) => calls.push(`select:${slideId}`),
      onToggleSlideSkipped: () => calls.push("skip"),
      slideList,
      windowRef,
    });

    try {
      interaction.handleContextMenu({
        clientX: 12,
        clientY: 24,
        preventDefault: () => undefined,
        stopPropagation: () => undefined,
        target: new FakeElement("slide-1"),
      } as unknown as MouseEvent);

      expect(calls).toEqual(["select:slide-1", "open:slide-1:12:24"]);
    } finally {
      if (previousHTMLElement) {
        Object.defineProperty(globalThis, "HTMLElement", {
          configurable: true,
          value: previousHTMLElement,
        });
      } else {
        Reflect.deleteProperty(globalThis, "HTMLElement");
      }
    }
  });

  it("places drops before or after vertical thumbnails", () => {
    const rect = { height: 100, left: 0, top: 20, width: 60 };

    expect(dropPlacementFromGeometry(rect, 20, 40)).toBe("before");
    expect(dropPlacementFromGeometry(rect, 20, 90)).toBe("after");
  });

  it("places drops before or after horizontal thumbnails", () => {
    const rect = { height: 40, left: 10, top: 0, width: 160 };

    expect(dropPlacementFromGeometry(rect, 40, 20)).toBe("before");
    expect(dropPlacementFromGeometry(rect, 120, 20)).toBe("after");
  });
});
