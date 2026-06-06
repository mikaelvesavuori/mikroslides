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

function harness() {
  let deck = MikroDeck.create({
    slides: [
      {
        ...MikroDeck.create({ title: "Base" }).toRecord().slides[0],
        elements: [createTextElement({ content: "Old", id: "title" })],
      },
    ],
    title: "Canvas",
  }).toRecord();
  let selectedElementIds = ["title"];
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
});
