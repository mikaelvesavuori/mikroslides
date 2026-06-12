import { createImageElement, MikroDeck } from "../../src/index.js";
import {
  exportDialogState,
  jsonExportModel,
  toFileSlug,
} from "../../src/presentation/deckFileFlows.js";

describe("deck file flows", () => {
  it("enables export actions without active-deck status copy", () => {
    const deck = MikroDeck.create({ title: "Ship It" }).toRecord();
    deck.slides[0].elements.push(
      createImageElement({ id: "stored", src: "asset:local_image" }),
      createImageElement({ id: "embedded", src: "data:image/png;base64,abc" }),
      createImageElement({ id: "remote", src: "https://example.test/image.png" }),
    );
    deck.fonts.push({
      id: "font",
      source: "local",
      label: "Brand",
      family: "Brand",
      assetId: "asset_font",
      mediaType: "font/woff2",
      remoteUrl: null,
      createdAt: "2026-06-04T00:00:00.000Z",
      updatedAt: "2026-06-04T00:00:00.000Z",
    });

    const state = exportDialogState(deck, deck.slides[0]);

    expect(state.canExportPng).toBe(true);
    expect(state.statusText).toBe("");
  });

  it("builds json export metadata and local asset warning", () => {
    const deck = MikroDeck.create({ title: "Ship It!" }).toRecord();
    deck.slides[0].elements.push(createImageElement({ src: "asset:image" }));
    const model = jsonExportModel(deck, () => "{}");

    expect(model.filename).toBe("ship-it.mikroslides.json");
    expect(model.toast).toContain("Portable");
    expect(toFileSlug("  !!! ")).toBe("mikroslides");
  });
});
