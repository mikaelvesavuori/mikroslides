import type { MikroFontRecord } from "../../src/index.js";
import {
  createBunnyFontRecord,
  createLocalFontRecord,
  createSourceFontRecord,
  findExistingBunnyFont,
  findExistingSourceFont,
} from "../../src/presentation/deckFonts.js";
import type { SourceFontChoice } from "../../src/presentation/fontCatalog.js";

const now = "2026-06-04T00:00:00.000Z";

function font(input: Partial<MikroFontRecord>): MikroFontRecord {
  return {
    assetId: null,
    createdAt: now,
    family: "Brand",
    id: "font",
    label: "Brand",
    mediaType: null,
    remoteUrl: null,
    source: "bunny",
    updatedAt: now,
    ...input,
  };
}

const sourceFont: SourceFontChoice = {
  family: "Inter",
  id: "inter",
  label: "Inter",
  mediaType: "font/woff2",
  remoteUrl: "https://example.test/inter.woff2",
};

describe("deck fonts", () => {
  it("creates local, Bunny, and source font records", () => {
    expect(
      createLocalFontRecord({
        assetId: "asset",
        createFontId: () => "local",
        label: "Brand",
        mediaType: "font/woff2",
        now,
      }),
    ).toMatchObject({ assetId: "asset", family: "Brand", id: "local", source: "local" });

    expect(
      createBunnyFontRecord({ createFontId: () => "bunny", family: " Manrope ", now }),
    ).toMatchObject({
      family: "Manrope",
      id: "bunny",
      label: "Manrope",
      remoteUrl: expect.stringContaining("fonts.bunny.net"),
      source: "bunny",
    });

    expect(createSourceFontRecord({ createFontId: () => "source", now, sourceFont })).toMatchObject(
      {
        family: "Inter",
        id: "source",
        remoteUrl: sourceFont.remoteUrl,
        source: "source",
      },
    );
  });

  it("finds existing remote fonts case-insensitively", () => {
    const bunny = font({ family: "Manrope", id: "bunny", source: "bunny" });
    const source = font({
      family: "Inter",
      id: "source",
      remoteUrl: sourceFont.remoteUrl,
      source: "source",
    });

    expect(findExistingBunnyFont([bunny], " manrope ")?.id).toBe("bunny");
    expect(findExistingSourceFont([source], { ...sourceFont, family: "inter" })?.id).toBe("source");
  });
});
