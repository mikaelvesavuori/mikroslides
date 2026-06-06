import type { MikroAssetRecord, MikroFontRecord } from "../../src/index.js";
import { createImageElement, MikroDeck } from "../../src/index.js";
import {
  AssetObjectUrlRegistry,
  assetIdFromSrc,
  assetSrc,
  createAssetRecord,
  fontAssetMediaType,
  imageAssetMediaType,
  materializeSlideAssetSources,
  mediaTypeFromFileName,
  referencedAssetIds,
  resolveAssetImageSource,
} from "../../src/presentation/assetRuntime.js";

const now = "2026-06-03T00:00:00.000Z";

function asset(id: string): MikroAssetRecord {
  return {
    id,
    deckId: "deck",
    kind: "image",
    mediaType: "image/png",
    data: new Blob(["asset"]),
    originalName: `${id}.png`,
    originalSrc: `${id}.png`,
    createdAt: now,
    updatedAt: now,
  };
}

function font(input: Partial<MikroFontRecord>): MikroFontRecord {
  return {
    id: "brand",
    source: "local",
    label: "Brand",
    family: "Brand",
    assetId: null,
    mediaType: null,
    remoteUrl: null,
    createdAt: now,
    updatedAt: now,
    ...input,
  };
}

describe("asset runtime", () => {
  it("resolves asset URLs through the object URL registry", () => {
    const revoked: string[] = [];
    let count = 0;
    const registry = new AssetObjectUrlRegistry(
      () => {
        count += 1;
        return `blob:${count}`;
      },
      (url) => revoked.push(url),
    );

    expect(registry.set(asset("asset_a"))).toBe("blob:1");
    expect(registry.get("asset_a")).toBe("blob:1");
    expect(registry.set(asset("asset_a"))).toBe("blob:2");
    expect(revoked).toEqual(["blob:1"]);

    registry.revokeUnreferenced(new Set(["asset_b"]));
    expect(registry.has("asset_a")).toBe(false);
    expect(revoked).toEqual(["blob:1", "blob:2"]);
  });

  it("tracks slide image assets and local font assets referenced by a deck", () => {
    const deck = MikroDeck.create({ title: "Assets" }).toRecord();
    deck.slides[0].elements.push(createImageElement({ id: "image", src: assetSrc("asset_image") }));
    deck.fonts = [font({ id: "font", assetId: "asset_font" })];

    expect([...referencedAssetIds(deck)].sort()).toEqual(["asset_font", "asset_image"]);
  });

  it("creates stored asset records with stable metadata", () => {
    const blob = new Blob(["image"], { type: "image/png" });
    const record = createAssetRecord({
      blob,
      createAssetId: () => "asset_image",
      deckId: "deck",
      kind: "image",
      mediaType: imageAssetMediaType(blob),
      now,
      originalName: "catalog.png",
    });

    expect(record).toMatchObject({
      id: "asset_image",
      deckId: "deck",
      kind: "image",
      mediaType: "image/png",
      originalName: "catalog.png",
      originalSrc: "catalog.png",
      createdAt: now,
      updatedAt: now,
    });
    expect(record.data).toBe(blob);
  });

  it("derives media types for image and font assets", () => {
    expect(imageAssetMediaType(new Blob(["image"]))).toBe("application/octet-stream");
    expect(fontAssetMediaType(new Blob(["font"]), "brand.woff2")).toBe("font/woff2");
    expect(fontAssetMediaType(new Blob(["font"], { type: "font/otf" }), "brand.woff2")).toBe(
      "font/otf",
    );
  });

  it("materializes asset image sources without touching remote images", () => {
    const slide = MikroDeck.create({ title: "Materialize" }).toRecord().slides[0];
    slide.elements = [
      createImageElement({ id: "local", src: assetSrc("asset_image") }),
      createImageElement({ id: "remote", src: "https://example.test/image.png" }),
    ];

    expect(assetIdFromSrc("asset:asset_image")).toBe("asset_image");
    expect(resolveAssetImageSource("asset:asset_image", () => "blob:image")).toBe("blob:image");
    expect(mediaTypeFromFileName("brand.woff2")).toBe("font/woff2");
    expect(
      materializeSlideAssetSources(slide, (src) =>
        src === "asset:asset_image" ? "blob:image" : src,
      ).elements.map((element) => (element.kind === "image" ? element.src : "")),
    ).toEqual(["blob:image", "https://example.test/image.png"]);
  });
});
