import {
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
    return { height: 500, width: 1000 };
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

  it("exits active text editing before handling a single-click object interaction", () => {
    const test = harness();
    const editor = new FakeHTMLElement();
    editor.dataset.textEditor = "title";
    const target = new FakeHTMLElement({
      '[contenteditable="true"]': editor,
      "[data-element-id]": { dataset: { elementId: "title" } },
      "[data-text-editor]": editor,
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
