import {
  fontWeightsLabel,
  matchesFontCategory,
  readBunnyFontCatalogItem,
  sortBunnyFontCatalog,
} from "../../src/presentation/fontCatalog.js";

describe("font catalog", () => {
  it("normalizes Bunny catalog records into supported families", () => {
    const font = readBunnyFontCatalogItem("jetbrains-mono", {
      category: "monospace",
      familyName: "JetBrains Mono",
      isVariable: true,
      styles: ["normal", "italic"],
      weights: ["400", "700"],
    });

    expect(font).toMatchObject({
      category: "monospace",
      family: "JetBrains Mono",
      isVariable: true,
      weights: [400, 700],
    });
    expect(font ? matchesFontCategory(font, "monospace") : false).toBe(true);
    expect(font ? fontWeightsLabel(font) : "").toBe("Variable");
  });

  it("sorts recommended Bunny families before the rest", () => {
    const zed = readBunnyFontCatalogItem("zed", {
      category: "sans-serif",
      familyName: "Zed Sans",
      weights: [400],
    });
    const inter = readBunnyFontCatalogItem("manrope", {
      category: "sans-serif",
      familyName: "Manrope",
      weights: [400],
    });

    expect(
      sortBunnyFontCatalog([zed, inter].filter(Boolean) as NonNullable<typeof zed>[]).at(0),
    ).toMatchObject({
      family: "Manrope",
    });
  });
});
