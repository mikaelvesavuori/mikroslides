import type { MikroFontRecord } from "../../src/index.js";
import { bunnyStylesheetUrl, sourceFontChoices } from "../../src/presentation/fontCatalog.js";

const now = "2026-06-03T00:00:00.000Z";

function font(input: Partial<MikroFontRecord>): MikroFontRecord {
  return {
    id: "font",
    source: "bunny",
    label: "Font",
    family: "Font",
    assetId: null,
    mediaType: null,
    remoteUrl: null,
    createdAt: now,
    updatedAt: now,
    ...input,
  };
}

describe("font manager helpers", () => {
  it("keeps direct source fonts as curated choices until the user adds them", () => {
    expect(sourceFontChoices.map((choice) => choice.id)).toEqual([
      "inter",
      "geist-sans",
      "geist-mono",
    ]);
    expect(sourceFontChoices.every((choice) => choice.remoteUrl.startsWith("https://"))).toBe(true);
    expect(sourceFontChoices.every((choice) => choice.mediaType === "font/woff2")).toBe(true);
  });

  it("only builds Bunny stylesheet URLs for Bunny deck fonts", () => {
    expect(bunnyStylesheetUrl([])).toBeNull();
    expect(
      bunnyStylesheetUrl([
        font({ source: "local", family: "Local Sans" }),
        font({ source: "bunny", family: "Plus Jakarta Sans" }),
      ]),
    ).toBe(
      "https://fonts.bunny.net/css?family=Plus+Jakarta+Sans:300,400,500,600,700,800,900&display=swap",
    );
  });
});
