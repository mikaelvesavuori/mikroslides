import { createImageElement, MikroDeck } from "../../src/index.js";
import {
  exportDialogState,
  isRemoteImageSource,
  jsonExportModel,
  toFileSlug,
} from "../../src/presentation/deckFileFlows.js";

describe("deck file flows", () => {
  it("summarizes export status for stored, embedded, and remote assets", () => {
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

    const state = exportDialogState(deck, deck.slides[0], "https://app.test/");

    expect(state.canExportPng).toBe(true);
    expect(state.statusText).toContain("1 stored image");
    expect(state.statusText).toContain("1 embedded image");
    expect(state.statusText).toContain("1 remote image");
    expect(state.statusText).toContain("1 local font");
  });

  it("builds json export metadata and local asset warning", () => {
    const deck = MikroDeck.create({ title: "Ship It!" }).toRecord();
    deck.slides[0].elements.push(createImageElement({ src: "asset:image" }));
    const model = jsonExportModel(deck, () => "{}");

    expect(model.filename).toBe("ship-it.mikroslides.json");
    expect(model.toast).toContain("Portable");
    expect(toFileSlug("  !!! ")).toBe("mikroslides");
  });

  it("recognizes only http remote image sources", () => {
    expect(isRemoteImageSource("https://example.test/image.png", "https://app.test")).toBe(true);
    expect(isRemoteImageSource("asset:image", "https://app.test")).toBe(false);
    expect(isRemoteImageSource("data:image/png;base64,abc", "https://app.test")).toBe(false);
  });
});
