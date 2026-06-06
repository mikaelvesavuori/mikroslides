import { createTextElement, MikroDeck, type SlideElement } from "../../src/index.js";
import type { MikroSlidesElements } from "../../src/presentation/appElements.js";
import { createCommandController } from "../../src/presentation/commandController.js";

function eventTarget() {
  return {
    addEventListener: () => undefined,
    blur: () => undefined,
    close: () => undefined,
    dataset: {} as Record<string, string>,
    focus: () => undefined,
    open: false,
    replaceChildren: () => undefined,
    showModal: () => undefined,
    value: "",
  };
}

function keyboard(key: string, modifiers: Partial<KeyboardEvent> = {}) {
  const event = {
    ctrlKey: false,
    key,
    metaKey: false,
    preventDefault: () => {
      event.prevented = true;
    },
    prevented: false,
    shiftKey: false,
    target: null,
    ...modifiers,
  };
  return event as unknown as KeyboardEvent & { prevented: boolean };
}

function harness(selectedIds: string[] = ["text"]) {
  const deck = MikroDeck.create({ title: "Commands" }).toRecord();
  deck.slides[0].elements = [createTextElement({ id: "text", x: 10, y: 12 })];
  const calls: string[] = [];
  let selection = selectedIds;
  const elements = {
    commandDialog: eventTarget(),
    commandInput: eventTarget(),
    commandList: eventTarget(),
    presenterDialog: eventTarget(),
    speakerNotes: eventTarget(),
    templateSelect: eventTarget(),
  } as unknown as MikroSlidesElements;
  const controller = createCommandController({
    callbacks: {
      addImage: () => calls.push("add-image"),
      addShape: () => calls.push("add-shape"),
      addSlide: () => calls.push("add-slide"),
      addText: () => calls.push("add-text"),
      applySelectedTemplate: () => calls.push(`template:${elements.templateSelect.value}`),
      closeContextMenu: () => calls.push("close-menu"),
      closePresenter: () => calls.push("close-presenter"),
      copySelection: () => calls.push("copy"),
      createDeck: async () => {
        calls.push("create");
      },
      cutSelection: () => calls.push("cut"),
      deleteSelection: () => calls.push("delete"),
      deleteSlide: () => calls.push("delete-slide"),
      duplicateSelectedElement: () => calls.push("duplicate-object"),
      duplicateSlide: () => calls.push("duplicate-slide"),
      exportJson: () => calls.push("json"),
      exportPdf: () => calls.push("pdf"),
      exportPng: async () => {
        calls.push("png");
      },
      exportPortable: async () => {
        calls.push("portable");
      },
      movePresenter: (direction) => calls.push(`presenter:${direction}`),
      moveSlide: (direction) => calls.push(`slide:${direction}`),
      openExport: () => calls.push("open-export"),
      openLibrary: () => calls.push("open-library"),
      openOutline: () => calls.push("open-outline"),
      openPresenter: () => calls.push("present"),
      polishDeck: () => calls.push("polish"),
      redo: () => calls.push("redo"),
      renderCanvas: () => calls.push("render-canvas"),
      renderInspector: () => calls.push("render-inspector"),
      saveDeck: async () => {
        calls.push("save");
      },
      selectElements: (ids) => {
        selection = ids;
        calls.push(`select:${ids.join(",")}`);
      },
      showToast: (message) => calls.push(`toast:${message}`),
      toggleTheme: () => calls.push("theme"),
      undo: () => calls.push("undo"),
      updateSelectedElementGeometry: (updates) =>
        calls.push(`nudge:${updates[0]?.patch.x},${updates[0]?.patch.y}`),
    },
    contextMenuOpen: () => false,
    elements,
    formatError: (error, fallback) => (error instanceof Error ? error.message : fallback),
    getSelectedElementIds: () => selection,
    getSelectedElements: () => deck.slides[0].elements as SlideElement[],
    getSlide: () => deck.slides[0],
    templates: [{ id: "title", name: "Title" }],
  });

  return { calls, controller, elements, getSelection: () => selection };
}

describe("command controller", () => {
  it("routes duplicate and nudge keyboard shortcuts through callbacks", async () => {
    const test = harness(["text"]);
    const duplicate = keyboard("d", { metaKey: true });
    const nudge = keyboard("ArrowRight");

    await test.controller.handleKeyboard(duplicate);
    await test.controller.handleKeyboard(nudge);

    expect(test.calls).toEqual(["duplicate-object", "nudge:11,12"]);
    expect(duplicate.prevented).toBe(true);
    expect(nudge.prevented).toBe(true);
  });

  it("duplicates slides when there is no object selection", async () => {
    const test = harness([]);

    await test.controller.handleKeyboard(keyboard("d", { metaKey: true }));

    expect(test.calls).toEqual(["duplicate-slide"]);
  });

  it("selects all slide elements and saves decks", async () => {
    const test = harness([]);

    await test.controller.handleKeyboard(keyboard("a", { metaKey: true }));
    await test.controller.handleKeyboard(keyboard("s", { metaKey: true }));

    expect(test.getSelection()).toEqual(["text"]);
    expect(test.calls).toEqual([
      "select:text",
      "render-canvas",
      "render-inspector",
      "save",
      "toast:Deck saved",
    ]);
  });
});
