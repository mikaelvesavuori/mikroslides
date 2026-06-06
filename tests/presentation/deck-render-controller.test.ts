import { createTextElement, MikroDeck, type SlideElement } from "../../src/index.js";
import type { MikroSlidesElements } from "../../src/presentation/appElements.js";
import { createDeckRenderController } from "../../src/presentation/deckRenderController.js";

function element() {
  return {
    dataset: {} as Record<string, string>,
    disabled: false,
    innerHTML: "",
    style: {
      values: {} as Record<string, string>,
      setProperty(name: string, value: string) {
        this.values[name] = value;
      },
    },
    textContent: "",
    value: "",
  };
}

function harness() {
  const deck = MikroDeck.create({ title: "Render" }).toRecord();
  deck.slides[0] = {
    ...deck.slides[0],
    background: "#123456",
    elements: [createTextElement({ content: "Hello", id: "text" })],
    title: "Slide one",
  };
  const deckTitleInput = element();
  const elements = {
    appShell: element(),
    backgroundSwatches: element(),
    deckAspectSelect: element(),
    deckList: element(),
    deckMeta: element(),
    deckThemeSelect: element(),
    deckTitleInput,
    duplicateElementButton: element(),
    layerBackButton: element(),
    layerBackwardButton: element(),
    layerForwardButton: element(),
    layerFrontButton: element(),
    librarySearch: { ...element(), value: "ren" },
    presenterDialog: element(),
    printDeck: element(),
    redoButton: element(),
    slideCanvas: element(),
    slideList: element(),
    templateSelect: element(),
    textFontSelect: element(),
    undoButton: element(),
    zoomFitButton: element(),
  } as unknown as MikroSlidesElements;
  const selectedIds = ["text"];
  const controller = createDeckRenderController({
    backgroundSwatches: ["#ffffff", "#000000"],
    deckAspects: [{ id: "16:9", name: "16:9" }],
    documentRef: { activeElement: null } as unknown as Document,
    elements,
    getCanvasZoom: () => 1,
    getDeck: () => deck,
    getEditingTextElementId: () => null,
    getSelectedElementIds: () => selectedIds,
    getSelectedElements: () => deck.slides[0].elements as SlideElement[],
    getSlide: () => deck.slides[0],
    getUserTemplates: () => [],
    librarySearch: () => [deck],
    renderFontRuntimeStyles: () => undefined,
    resolveFontStack: () => "Inter, sans-serif",
    resolveImageSource: (src) => src,
    themes: [deck.theme],
    templates: [{ id: "title", name: "Title" }],
  });

  return { controller, elements };
}

describe("deck render controller", () => {
  it("renders deck chrome, header, and option controls", () => {
    const test = harness();

    test.controller.renderDeckChrome();
    test.controller.renderDeckHeader();
    test.controller.renderDeckOptionControls();

    expect(test.elements.deckTitleInput.value).toBe("Render");
    expect(test.elements.deckMeta.textContent).toBe("Slide 1/3");
    expect(test.elements.deckThemeSelect.innerHTML).toContain("Mikro");
    expect(test.elements.deckAspectSelect.innerHTML).toContain("16:9");
  });

  it("renders canvas, slide list, swatches, and history controls", () => {
    const test = harness();

    test.controller.renderCanvas();
    test.controller.renderSlideList();
    test.controller.renderBackgroundSwatches();
    test.controller.renderHistoryControls(true, false);

    expect(test.elements.slideCanvas.innerHTML).toContain("Hello");
    expect(
      (test.elements.slideCanvas.style as unknown as { values: Record<string, string> }).values[
        "--slide-bg"
      ],
    ).toBe("#123456");
    expect(test.elements.slideList.innerHTML).toContain("Slide one");
    expect(test.elements.backgroundSwatches.innerHTML).toContain('data-background="#ffffff"');
    expect(test.elements.undoButton.disabled).toBe(false);
    expect(test.elements.redoButton.disabled).toBe(true);
    expect(test.elements.layerFrontButton.disabled).toBe(false);
  });
});
