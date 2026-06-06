import type { MikroFontRecord } from "../../src/index.js";
import { MikroDeck } from "../../src/index.js";
import { createFontRuntimeController } from "../../src/presentation/fontRuntimeController.js";

const now = "2026-06-05T00:00:00.000Z";

function font(input: Partial<MikroFontRecord>): MikroFontRecord {
  return {
    id: "brand",
    source: "local",
    label: "Brand Sans",
    family: "Brand Sans",
    assetId: "asset_brand",
    mediaType: "font/woff2",
    remoteUrl: null,
    createdAt: now,
    updatedAt: now,
    ...input,
  };
}

describe("font runtime controller", () => {
  it("resolves deck font tokens for CSS and canvas font stacks", () => {
    const deck = MikroDeck.create({ title: "Fonts" }).toRecord();
    deck.fonts = [font({ id: "brand" })];
    const controller = createFontRuntimeController({
      getDeck: () => deck,
      objectUrlForAsset: (assetId) => (assetId === "asset_brand" ? "blob:brand" : null),
    });

    expect(controller.cssFontStackForTextToken("font:brand")).toContain('"MikroSlides Font brand"');
    expect(controller.canvasFontStackForTextToken("font:brand")).toContain(
      '"MikroSlides Font brand"',
    );
    expect(controller.cssFontStackForTextToken("mono")).toBe("var(--font-mono)");
  });
});
