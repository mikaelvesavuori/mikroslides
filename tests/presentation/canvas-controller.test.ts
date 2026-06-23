import {
  createImageElement,
  createTextElement,
  MikroDeck,
  type MikroDeckRecord,
  type SlideElement,
} from "../../src/index.js";
import { createCanvasController } from "../../src/presentation/canvasController.js";

const originalHTMLElement = globalThis.HTMLElement;

class FakeHTMLElement {
  dataset: Record<string, string> = {};
  innerText = "";
  style = { setProperty: () => undefined };

  constructor(private readonly closestMap: Record<string, unknown> = {}) {}

  append() {}
  closest(selector: string) {
    return this.closestMap[selector] ?? null;
  }
  getBoundingClientRect() {
    return { height: 500, left: 0, top: 0, width: 1000 };
  }
  hasPointerCapture() {
    return false;
  }
  querySelector() {
    return null;
  }
  querySelectorAll() {
    return [];
  }
  releasePointerCapture() {}
  remove() {}
  setAttribute() {}
  setPointerCapture() {}
}

beforeAll(() => {
  (globalThis as unknown as { HTMLElement: typeof FakeHTMLElement }).HTMLElement = FakeHTMLElement;
});

afterAll(() => {
  if (originalHTMLElement) {
    globalThis.HTMLElement = originalHTMLElement;
  } else {
    Reflect.deleteProperty(globalThis, "HTMLElement");
  }
});

function harness(options: { elements?: SlideElement[]; selectedElementIds?: string[] } = {}) {
  const elements = options.elements ?? [createTextElement({ content: "Old", id: "title" })];
  let deck = MikroDeck.create({
    slides: [
      {
        ...MikroDeck.create({ title: "Base" }).toRecord().slides[0],
        elements,
      },
    ],
    title: "Canvas",
  }).toRecord();
  let selectedElementIds = options.selectedElementIds ?? ["title"];
  const calls: string[] = [];
  const canvas = new FakeHTMLElement() as unknown as HTMLElement;
  const controller = createCanvasController({
    canvas,
    closeContextMenu: () => calls.push("close-menu"),
    documentRef: {
      createElement: () => new FakeHTMLElement(),
    } as unknown as Document,
    flushHistorySnapshot: () => calls.push("flush-history"),
    getDeck: () => deck,
    getSelectedElementIds: () => selectedElementIds,
    getSelectedElements: () =>
      selectedElementIds
        .map((id) => deck.slides[0].elements.find((element) => element.id === id))
        .filter((element): element is SlideElement => Boolean(element)),
    getSlide: () => deck.slides[0],
    openContextMenu: (x, y) => calls.push(`open-menu:${x}:${y}`),
    persistRecoveryDraft: async () => {
      calls.push("persist-draft");
    },
    renderCanvas: () => calls.push("render-canvas"),
    renderHistoryControls: () => calls.push("render-history"),
    renderInspector: () => calls.push("render-inspector"),
    renderPrintDeck: () => calls.push("render-print"),
    scheduleAutosave: () => calls.push("autosave"),
    selectElements: (ids) => {
      selectedElementIds = ids;
      calls.push(`select:${ids.join(",")}`);
    },
    setDeck: (nextDeck: MikroDeckRecord) => {
      deck = nextDeck;
    },
    stageHistory: () => calls.push("stage-history"),
    updateSelectedElementGeometry: (updates) => {
      deck = {
        ...deck,
        slides: [
          {
            ...deck.slides[0],
            elements: deck.slides[0].elements.map((element) => {
              const update = updates.find((item) => item.id === element.id);
              return update ? ({ ...element, ...update.patch } as SlideElement) : element;
            }),
          },
        ],
      };
      calls.push("geometry");
    },
    windowRef: {
      setTimeout: () => 1,
    } as unknown as Window,
  });

  return {
    calls,
    canvas,
    controller,
    getDeck: () => deck,
    getSelectedElementIds: () => selectedElementIds,
  };
}

describe("canvas controller", () => {
  it("clears selection when clicking the empty canvas", () => {
    const test = harness();

    test.controller.handleCanvasClick({
      target: test.canvas,
    } as unknown as MouseEvent);

    expect(test.getSelectedElementIds()).toEqual([]);
    expect(test.calls).toEqual(expect.arrayContaining(["render-canvas", "render-inspector"]));
  });

  it("keeps object selection when the follow-up click lands on the rerendered canvas", () => {
    const test = harness();
    const target = new FakeHTMLElement({
      "[data-element-id]": { dataset: { elementId: "title" } },
    });

    test.controller.handleCanvasPointerDown({
      button: 0,
      clientX: 100,
      clientY: 100,
      ctrlKey: false,
      detail: 1,
      metaKey: false,
      pointerId: 1,
      preventDefault: () => undefined,
      shiftKey: false,
      target,
    } as unknown as PointerEvent);
    test.controller.handleCanvasClick({
      preventDefault: () => undefined,
      target: test.canvas,
    } as unknown as MouseEvent);

    expect(test.getSelectedElementIds()).toEqual(["title"]);
  });

  it("adds unselected objects to the selection when shift-clicking them", () => {
    const test = harness({
      elements: [
        createTextElement({ content: "Title", id: "title" }),
        createTextElement({ content: "Body", id: "body" }),
      ],
      selectedElementIds: ["title"],
    });
    const target = new FakeHTMLElement({
      "[data-element-id]": { dataset: { elementId: "body" } },
    });

    test.controller.handleCanvasPointerDown({
      button: 0,
      clientX: 100,
      clientY: 100,
      ctrlKey: false,
      detail: 1,
      metaKey: false,
      pointerId: 1,
      preventDefault: () => undefined,
      shiftKey: true,
      target,
    } as unknown as PointerEvent);

    expect(test.getSelectedElementIds()).toEqual(["body", "title"]);
  });

  it("starts editing text when a double-click is retargeted to the canvas", () => {
    const test = harness({
      elements: [
        createTextElement({
          content: "Title",
          height: 20,
          id: "title",
          width: 20,
          x: 10,
          y: 10,
        }),
      ],
      selectedElementIds: ["title"],
    });

    test.controller.handleCanvasPointerDown({
      button: 0,
      clientX: 150,
      clientY: 100,
      ctrlKey: false,
      detail: 2,
      metaKey: false,
      pointerId: 1,
      preventDefault: () => undefined,
      shiftKey: false,
      target: test.canvas,
    } as unknown as PointerEvent);

    expect(test.controller.getEditingTextElementId()).toBe("title");
    expect(test.calls).toEqual(expect.arrayContaining(["stage-history", "render-canvas"]));
  });

  it("does not start text editing through a higher object", () => {
    const test = harness({
      elements: [
        createTextElement({
          content: "Title",
          height: 20,
          id: "title",
          width: 20,
          x: 10,
          y: 10,
        }),
        createImageElement({
          height: 20,
          id: "image",
          src: "data:image/png;base64,a",
          width: 20,
          x: 10,
          y: 10,
        }),
      ],
      selectedElementIds: ["title"],
    });

    test.controller.handleCanvasDoubleClick({
      clientX: 150,
      clientY: 100,
      preventDefault: () => undefined,
      target: test.canvas,
    } as unknown as MouseEvent);

    expect(test.controller.getEditingTextElementId()).toBeNull();
  });

  it("selects locked objects without starting a drag", () => {
    const test = harness({
      elements: [
        createTextElement({
          content: "Background",
          height: 100,
          id: "background",
          locked: true,
          width: 100,
          x: 0,
          y: 0,
        }),
        createTextElement({ content: "Body", id: "body", x: 20, y: 20, width: 20, height: 20 }),
      ],
      selectedElementIds: ["body"],
    });
    const target = new FakeHTMLElement({
      "[data-element-id]": { dataset: { elementId: "background" } },
    });

    test.controller.handleCanvasPointerDown({
      button: 0,
      clientX: 10,
      clientY: 10,
      ctrlKey: false,
      detail: 1,
      metaKey: false,
      pointerId: 1,
      preventDefault: () => undefined,
      shiftKey: false,
      target,
    } as unknown as PointerEvent);

    expect(test.getSelectedElementIds()).toEqual(["background"]);
    expect(test.calls).toEqual(expect.arrayContaining(["select:background", "render-canvas"]));
    expect(test.calls).not.toContain("stage-history");
    expect(test.calls).not.toContain("geometry");
  });

  it("selects object targets before opening the context menu", () => {
    const test = harness();
    const target = new FakeHTMLElement({
      "[data-element-id]": { dataset: { elementId: "title" } },
    });

    test.controller.handleCanvasContextMenu({
      clientX: 12,
      clientY: 24,
      preventDefault: () => undefined,
      stopPropagation: () => undefined,
      target,
    } as unknown as MouseEvent);

    expect(test.getSelectedElementIds()).toEqual(["title"]);
    expect(test.calls).toContain("open-menu:12:24");
  });

  it("updates text content while inline editing", () => {
    const test = harness();
    const editor = new FakeHTMLElement();
    editor.dataset.textEditor = "title";
    editor.innerText = "New text";
    const target = new FakeHTMLElement({ "[data-text-editor]": editor });

    test.controller.beginEditingTextElement("title");
    test.controller.handleCanvasTextInput({
      target,
    } as unknown as Event);

    expect(test.getDeck().slides[0].elements[0]).toMatchObject({ content: "New text" });
    expect(test.calls).toEqual(
      expect.arrayContaining(["persist-draft", "render-inspector", "render-print", "autosave"]),
    );
  });

  it("leaves pointer interactions inside active text editing to the editor", () => {
    const test = harness();
    const editor = new FakeHTMLElement();
    editor.dataset.textEditor = "title";
    const target = new FakeHTMLElement({
      '[contenteditable="true"], [contenteditable="plaintext-only"]': editor,
      "[data-element-id]": { dataset: { elementId: "title" } },
      "[data-text-editor]": editor,
    });
    let prevented = false;

    test.controller.beginEditingTextElement("title");
    expect(test.controller.getEditingTextElementId()).toBe("title");

    test.controller.handleCanvasPointerDown({
      button: 0,
      clientX: 100,
      clientY: 100,
      ctrlKey: false,
      detail: 1,
      metaKey: false,
      pointerId: 1,
      preventDefault: () => {
        prevented = true;
      },
      shiftKey: false,
      target,
    } as unknown as PointerEvent);
    test.controller.handlePointerMove({
      clientX: 140,
      clientY: 120,
      pointerId: 1,
      shiftKey: false,
    } as unknown as PointerEvent);
    test.controller.handlePointerUp({ pointerId: 1 } as PointerEvent);

    expect(test.controller.getEditingTextElementId()).toBe("title");
    expect(prevented).toBe(false);
    expect(test.calls.filter((call) => call === "stage-history")).toHaveLength(1);
    expect(test.calls).not.toContain("geometry");
    expect(test.calls).not.toContain("flush-history");
  });

  it("keeps editing when contenteditable events target a text node", () => {
    const test = harness();
    const editor = new FakeHTMLElement();
    editor.dataset.textEditor = "title";
    const textNodeTarget = { parentElement: editor };
    editor.closest = (selector: string) => {
      if (selector === "[data-text-editor]") {
        return editor;
      }
      if (selector === '[contenteditable="true"], [contenteditable="plaintext-only"]') {
        return editor;
      }
      return null;
    };

    test.controller.beginEditingTextElement("title");
    test.controller.handleCanvasPointerDown({
      button: 0,
      clientX: 100,
      clientY: 100,
      ctrlKey: false,
      detail: 1,
      metaKey: false,
      pointerId: 2,
      preventDefault: () => undefined,
      shiftKey: false,
      target: textNodeTarget,
    } as unknown as PointerEvent);
    test.controller.handlePointerUp({ pointerId: 2 } as PointerEvent);
    test.controller.handleCanvasClick({
      preventDefault: () => undefined,
      target: textNodeTarget,
    } as unknown as MouseEvent);

    expect(test.controller.getEditingTextElementId()).toBe("title");
    expect(test.getSelectedElementIds()).toEqual(["title"]);
    expect(test.calls).not.toContain("flush-history");
  });

  it("keeps editing when pointer events hit the editing overlay around the text", () => {
    const test = harness();
    const overlay = new FakeHTMLElement();
    const target = new FakeHTMLElement({
      "[data-text-edit-overlay]": overlay,
    });

    test.controller.beginEditingTextElement("title");
    test.controller.handleCanvasPointerDown({
      button: 0,
      clientX: 100,
      clientY: 100,
      ctrlKey: false,
      detail: 1,
      metaKey: false,
      pointerId: 3,
      preventDefault: () => undefined,
      shiftKey: false,
      target,
    } as unknown as PointerEvent);
    test.controller.handlePointerUp({ pointerId: 3 } as PointerEvent);

    expect(test.controller.getEditingTextElementId()).toBe("title");
    expect(test.getSelectedElementIds()).toEqual(["title"]);
    expect(test.calls).not.toContain("flush-history");
  });

  it("does not exit text editing when a text-selection drag bubbles through the canvas", () => {
    const test = harness();
    const editor = new FakeHTMLElement();
    editor.dataset.textEditor = "title";
    const target = new FakeHTMLElement({
      '[contenteditable="true"], [contenteditable="plaintext-only"]': editor,
      "[data-element-id]": { dataset: { elementId: "title" } },
      "[data-text-editor]": editor,
    });
    let clickPrevented = false;

    test.controller.beginEditingTextElement("title");
    test.controller.handleCanvasPointerDown({
      button: 0,
      clientX: 100,
      clientY: 100,
      ctrlKey: false,
      detail: 1,
      metaKey: false,
      pointerId: 7,
      preventDefault: () => undefined,
      shiftKey: false,
      target,
    } as unknown as PointerEvent);
    test.controller.handleCanvasFocusOut({ target } as unknown as FocusEvent);
    test.controller.handlePointerUp({ pointerId: 7 } as PointerEvent);
    test.controller.handleCanvasClick({
      preventDefault: () => {
        clickPrevented = true;
      },
      target: test.canvas,
    } as unknown as MouseEvent);

    expect(test.controller.getEditingTextElementId()).toBe("title");
    expect(test.getSelectedElementIds()).toEqual(["title"]);
    expect(clickPrevented).toBe(false);
    expect(test.calls).not.toContain("select:");
    expect(test.calls).not.toContain("flush-history");
  });

  it("leaves double-clicks inside active text editing to the editor", () => {
    const test = harness();
    const editor = new FakeHTMLElement();
    editor.dataset.textEditor = "title";
    const target = new FakeHTMLElement({
      "[data-text-editor]": editor,
    });
    let prevented = false;

    test.controller.beginEditingTextElement("title");
    test.controller.handleCanvasDoubleClick({
      clientX: 100,
      clientY: 100,
      preventDefault: () => {
        prevented = true;
      },
      target,
    } as unknown as MouseEvent);

    expect(test.controller.getEditingTextElementId()).toBe("title");
    expect(prevented).toBe(false);
    expect(test.calls.filter((call) => call === "stage-history")).toHaveLength(1);
  });

  it("exits active text editing before handling another object interaction", () => {
    const test = harness({
      elements: [
        createTextElement({ content: "Title", id: "title" }),
        createTextElement({ content: "Body", id: "body" }),
      ],
      selectedElementIds: ["title"],
    });
    const editor = new FakeHTMLElement();
    editor.dataset.textEditor = "title";
    const target = new FakeHTMLElement({
      "[data-element-id]": { dataset: { elementId: "body" } },
    });

    test.controller.beginEditingTextElement("title");
    expect(test.controller.getEditingTextElementId()).toBe("title");

    test.controller.handleCanvasPointerDown({
      button: 0,
      clientX: 100,
      clientY: 100,
      ctrlKey: false,
      detail: 1,
      metaKey: false,
      pointerId: 1,
      preventDefault: () => undefined,
      shiftKey: false,
      target,
    } as unknown as PointerEvent);

    expect(test.controller.getEditingTextElementId()).toBeNull();
    expect(test.calls).toEqual(expect.arrayContaining(["flush-history", "stage-history"]));
    expect(test.getSelectedElementIds()).toEqual(["body"]);
  });

  it("duplicates selected objects before option-dragging them", () => {
    const test = harness();
    const target = new FakeHTMLElement({
      "[data-element-id]": { dataset: { elementId: "title" } },
    });
    const original = test.getDeck().slides[0].elements[0];

    test.controller.handleCanvasPointerDown({
      altKey: true,
      button: 0,
      clientX: 100,
      clientY: 100,
      ctrlKey: false,
      detail: 1,
      metaKey: false,
      pointerId: 1,
      preventDefault: () => undefined,
      shiftKey: false,
      target,
    } as unknown as PointerEvent);

    expect(test.getDeck().slides[0].elements).toHaveLength(2);
    expect(test.getSelectedElementIds()).toHaveLength(1);
    expect(test.getSelectedElementIds()).not.toEqual(["title"]);

    const duplicateId = test.getSelectedElementIds()[0];
    test.controller.handlePointerMove({
      clientX: 200,
      clientY: 150,
      shiftKey: false,
    } as unknown as PointerEvent);
    test.controller.handlePointerUp({} as PointerEvent);

    const elements = test.getDeck().slides[0].elements;
    expect(elements.find((element) => element.id === "title")).toMatchObject({
      x: original.x,
      y: original.y,
    });
    expect(elements.find((element) => element.id === duplicateId)).toMatchObject({
      x: original.x + 10,
      y: original.y + 10,
    });
    expect(test.calls).toEqual(expect.arrayContaining(["stage-history", "flush-history"]));
  });
});
