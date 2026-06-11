import {
  createShapeElement,
  createTextElement,
  MikroDeck,
  type MikroDeckRecord,
  type SlideElement,
} from "../../src/index.js";
import { createDeckActionsController } from "../../src/presentation/deckActionsController.js";

const originalHTMLElement = globalThis.HTMLElement;

class FakeHTMLElement {
  dataset: Record<string, string> = {};

  constructor(private readonly closestMap: Record<string, unknown> = {}) {}

  closest(selector: string) {
    return this.closestMap[selector] ?? null;
  }
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
  const baseDeck = MikroDeck.create({ title: "Deck" }).toRecord();
  const text = createTextElement({ content: "Launch", id: "text", listStyle: "none" });
  const shape = createShapeElement({ id: "shape" });
  let deck: MikroDeckRecord = {
    ...baseDeck,
    activeSlideId: "slide_1",
    slides: [
      {
        ...baseDeck.slides[0],
        elements: [text, shape],
        id: "slide_1",
        title: "One",
      },
      {
        ...baseDeck.slides[0],
        elements: [],
        id: "slide_2",
        title: "Two",
      },
    ],
  };
  let selectedElementIds = ["text"];
  const calls: string[] = [];
  const controller = createDeckActionsController({
    commitDeckMutation: (result, options = {}) => {
      if (!result) {
        return false;
      }

      if ("deck" in result) {
        deck = result.deck;
        if (result.selectedElementIds !== undefined) {
          selectedElementIds = result.selectedElementIds;
        }
      } else {
        deck = result;
      }
      calls.push(`commit:${options.inspector === false ? "no-inspector" : "default"}`);
      return true;
    },
    getDeck: () => deck,
    getSelectedElementIds: () => selectedElementIds,
    getSelectedElements: () => {
      const slide = deck.slides.find((item) => item.id === deck.activeSlideId);
      return selectedElementIds
        .map((id) => slide?.elements.find((element) => element.id === id))
        .filter((element): element is SlideElement => Boolean(element));
    },
    getSlide: () => deck.slides.find((slide) => slide.id === deck.activeSlideId) ?? null,
    renderCanvas: () => calls.push("render-canvas"),
    renderInspector: () => calls.push("render-inspector"),
    selectElements: (ids) => {
      selectedElementIds = ids;
      calls.push(`select:${ids.join(",")}`);
    },
    showToast: (message) => calls.push(`toast:${message}`),
  });

  return {
    calls,
    controller,
    getDeck: () => deck,
    getSelectedElementIds: () => selectedElementIds,
    setSelectedElementIds: (ids: string[]) => {
      selectedElementIds = ids;
    },
  };
}

describe("deck actions controller", () => {
  it("updates deck metadata through committed mutations", () => {
    const test = harness();

    test.controller.updateDeckTitle("New title");
    test.controller.updateDeckAspect("4:3");

    expect(test.getDeck()).toMatchObject({
      aspectRatio: "4:3",
      title: "New title",
    });
    expect(test.calls).toContain("commit:no-inspector");
  });

  it("runs slide and deck actions while clearing object selection when needed", () => {
    const test = harness();

    test.controller.addSlide();
    expect(test.getDeck().slides).toHaveLength(3);
    expect(test.getSelectedElementIds()).toEqual([]);

    test.controller.toggleSlideSkipped("slide_2");
    expect(test.getDeck().slides.find((slide) => slide.id === "slide_2")?.skipped).toBe(true);
    expect(test.getDeck().activeSlideId).not.toBe("slide_2");
  });

  it("copies, pastes, cuts, and deletes slides from the active slide context", () => {
    const test = harness();

    test.controller.copySlide();
    test.controller.pasteSlide();

    const pastedSlide = test.getDeck().slides[1];
    expect(test.getDeck().slides.map((slide) => slide.title)).toEqual(["One", "One copy", "Two"]);
    expect(test.getDeck().activeSlideId).toBe(pastedSlide.id);
    expect(test.getSelectedElementIds()).toEqual([]);
    expect(pastedSlide.id).not.toBe("slide_1");
    expect(pastedSlide.elements.map((element) => element.id)).not.toContain("text");
    expect(pastedSlide.elements.map((element) => element.id)).not.toContain("shape");

    test.controller.cutSlide();
    expect(test.getDeck().slides.map((slide) => slide.title)).toEqual(["One", "Two"]);
    expect(test.calls).toEqual(expect.arrayContaining(["toast:Slide copied", "toast:Slide cut"]));

    test.controller.deleteSlide();
    expect(test.getDeck().slides.map((slide) => slide.title)).toEqual(["One"]);
  });

  it("updates selected elements and text list style", () => {
    const test = harness();

    test.controller.updateSelectedElement({ opacity: 0.5 });
    test.controller.toggleSelectedTextListStyle("bullet");
    test.controller.toggleSelectedTextListStyle("bullet");

    expect(test.getDeck().slides[0].elements[0]).toMatchObject({
      listStyle: "none",
      opacity: 0.5,
    });
  });

  it("aligns selected elements through committed mutations", () => {
    const test = harness();
    test.setSelectedElementIds(["text", "shape"]);

    test.controller.alignSelectedElements("left");

    expect(test.getDeck().slides[0].elements).toMatchObject([
      { id: "text", x: 12 },
      { id: "shape", x: 12 },
    ]);
    expect(test.getSelectedElementIds()).toEqual(["text", "shape"]);
  });

  it("handles layer-list selection and multi-selection", () => {
    const test = harness();
    const layerButton = new FakeHTMLElement();
    layerButton.dataset.layerId = "shape";
    const target = new FakeHTMLElement({ "[data-layer-id]": layerButton });

    test.controller.handleLayerListClick({
      metaKey: true,
      target,
    } as unknown as MouseEvent);

    expect(test.getSelectedElementIds()).toEqual(["shape", "text"]);
    expect(test.calls).toEqual(expect.arrayContaining(["render-canvas", "render-inspector"]));
  });
});
