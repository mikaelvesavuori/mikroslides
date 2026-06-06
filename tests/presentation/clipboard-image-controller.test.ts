import { createTextElement, MikroDeck, type MikroDeckRecord } from "../../src/index.js";
import { createClipboardImageController } from "../../src/presentation/clipboardImageController.js";

function deckWithText() {
  const text = createTextElement({ id: "title", x: 10, y: 12 });
  return MikroDeck.create({
    slides: [{ ...MikroDeck.create({ title: "Base" }).toRecord().slides[0], elements: [text] }],
    title: "Clipboard",
  }).toRecord();
}

function input(value = "") {
  return {
    files: null as FileList | null,
    value,
  };
}

function harness(initialDeck: MikroDeckRecord = deckWithText()) {
  let deck = initialDeck;
  const toast: string[] = [];
  const outlineImports: string[] = [];
  const imageUrlInput = input();
  const imageFileInput = input();
  const imageDialog = { close: () => toast.push("dialog-closed") };
  const controller = createClipboardImageController({
    commitDeckMutation: (result) => {
      if (!result) {
        return false;
      }
      deck = "deck" in result ? result.deck : result;
      return true;
    },
    createDeckFromOutlineText: async (markdown) => {
      outlineImports.push(markdown);
    },
    createStoredImageAsset: async (_blob, originalName) => `asset:${originalName}`,
    deleteSelectedElement: () => {
      deck = {
        ...deck,
        slides: [
          {
            ...deck.slides[0],
            elements: deck.slides[0].elements.filter((element) => element.id !== "title"),
          },
        ],
      };
    },
    elements: {
      imageDialog: imageDialog as unknown as HTMLDialogElement,
      imageFileInput: imageFileInput as unknown as HTMLInputElement,
      imageUrlInput: imageUrlInput as unknown as HTMLInputElement,
    },
    formatError: (error, fallback) => (error instanceof Error ? error.message : fallback),
    getDeck: () => deck,
    getSelectedElements: () => deck.slides[0].elements.filter((element) => element.id === "title"),
    getSlide: () => deck.slides[0],
    looksLikeOutline: (text) => text.startsWith("#"),
    showToast: (message) => toast.push(message),
  });

  return {
    controller,
    getDeck: () => deck,
    imageFileInput,
    imageUrlInput,
    outlineImports,
    toast,
  };
}

describe("clipboard image controller", () => {
  it("copies and pastes selected elements", () => {
    const test = harness();

    test.controller.copySelectedElements();
    test.controller.pasteElements();

    expect(test.controller.hasClipboard()).toBe(true);
    expect(test.getDeck().slides[0].elements).toHaveLength(2);
    expect(test.toast).toContain("1 object copied");
  });

  it("cuts selected elements through the supplied delete callback", () => {
    const test = harness();

    test.controller.cutSelectedElements();

    expect(test.getDeck().slides[0].elements).toEqual([]);
  });

  it("inserts URL and local file images from the dialog", async () => {
    const test = harness();
    test.imageUrlInput.value = " https://example.test/image.png ";

    await test.controller.insertImageFromDialog();

    expect(test.getDeck().slides[0].elements.at(-1)).toMatchObject({
      alt: "",
      kind: "image",
      src: "https://example.test/image.png",
    });
    expect(test.toast).toContain("dialog-closed");

    const file = new File(["image"], "catalog.png", { type: "image/png" });
    test.imageFileInput.files = [file] as unknown as FileList;

    await test.controller.insertImageFromDialog();

    expect(test.getDeck().slides[0].elements.at(-1)).toMatchObject({
      alt: "catalog.png",
      kind: "image",
      src: "asset:catalog.png",
    });
  });

  it("routes outline paste into outline import", async () => {
    const test = harness();
    let prevented = false;

    await test.controller.handlePaste({
      clipboardData: {
        getData: () => "# Deck\n\n## Slide",
      },
      preventDefault: () => {
        prevented = true;
      },
      target: null,
    } as unknown as ClipboardEvent);

    expect(prevented).toBe(true);
    expect(test.outlineImports).toEqual(["# Deck\n\n## Slide"]);
  });
});
