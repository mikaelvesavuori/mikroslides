import { createTextElement, MikroDeck, type MikroDeckRecord } from "../../src/index.js";
import type { SourceFontChoice } from "../../src/presentation/fontCatalog.js";
import { createFontDeckController } from "../../src/presentation/fontDeckController.js";

const sourceFont: SourceFontChoice = {
  family: "Inter",
  id: "inter",
  label: "Inter",
  mediaType: "font/woff2",
  meta: "source",
  remoteUrl: "https://example.test/inter.woff2",
  sample: "Sample",
};

function deckWithText() {
  const text = createTextElement({ fontFamily: "system", id: "title" });
  return MikroDeck.create({
    slides: [{ ...MikroDeck.create({ title: "Base" }).toRecord().slides[0], elements: [text] }],
    title: "Fonts",
  }).toRecord();
}

function controllerHarness(initialDeck: MikroDeckRecord = deckWithText()) {
  let deck = initialDeck;
  const toast: string[] = [];
  const deletedAssets: string[] = [];
  const deletedObjectUrls: string[] = [];
  const selectedElementIds = ["title"];
  const controller = createFontDeckController({
    commitDeckMutation: (result) => {
      if (!result) {
        return false;
      }
      deck = "deck" in result ? result.deck : result;
      return true;
    },
    createStoredFontAsset: async () => "asset_local",
    deleteAsset: async (assetId) => {
      deletedAssets.push(assetId);
    },
    deleteObjectUrl: (assetId) => deletedObjectUrls.push(assetId),
    getDeck: () => deck,
    getSelectedElementIds: () => selectedElementIds,
    getSelectedElements: () =>
      selectedElementIds
        .map((id) => deck.slides[0].elements.find((element) => element.id === id))
        .filter((element): element is NonNullable<typeof element> => Boolean(element)),
    setDeck: (nextDeck) => {
      deck = nextDeck;
    },
    showToast: (message) => toast.push(message),
  });

  return {
    controller,
    deletedAssets,
    deletedObjectUrls,
    getDeck: () => deck,
    toast,
  };
}

describe("font deck controller", () => {
  it("adds and applies Bunny fonts to selected text", () => {
    const harness = controllerHarness();

    harness.controller.addBunnyFontFamily(" Manrope ");

    const deck = harness.getDeck();
    expect(deck.fonts[0]).toMatchObject({ family: "Manrope", source: "bunny" });
    expect(deck.slides[0].elements[0]).toMatchObject({ fontFamily: `font:${deck.fonts[0].id}` });
    expect(harness.toast).toContain("Bunny font added and applied");
  });

  it("applies existing source fonts instead of duplicating them", () => {
    const harness = controllerHarness();

    harness.controller.addSourceFont(sourceFont);
    const fontId = harness.getDeck().fonts[0].id;
    harness.controller.addSourceFont(sourceFont);

    expect(harness.getDeck().fonts).toHaveLength(1);
    expect(harness.getDeck().slides[0].elements[0]).toMatchObject({ fontFamily: `font:${fontId}` });
    expect(harness.toast).toContain("Font applied");
  });

  it("imports and removes local fonts with asset cleanup", async () => {
    const harness = controllerHarness();
    const file = Object.assign(new Blob(["font"], { type: "font/woff2" }), {
      name: "Brand.woff2",
    }) as File;

    await harness.controller.importLocalFont(file, "Brand");
    const fontId = harness.getDeck().fonts[0].id;

    expect(harness.getDeck().fonts[0]).toMatchObject({
      assetId: "asset_local",
      family: "Brand",
      mediaType: "font/woff2",
      source: "local",
    });

    harness.controller.deleteDeckFont(fontId);

    expect(harness.getDeck().fonts).toEqual([]);
    expect(harness.deletedObjectUrls).toEqual(["asset_local"]);
    expect(harness.deletedAssets).toEqual(["asset_local"]);
    expect(harness.toast).toContain("Font removed");
  });
});
