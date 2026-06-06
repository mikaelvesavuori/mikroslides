import { vi } from "vitest";

vi.mock("../../src/config/index.js", () => ({
  readBlobAsDataUrl: vi.fn(async (blob: Blob) => {
    const mediaType = blob.type || "application/octet-stream";
    return `data:${mediaType};base64,${await blob.text()}`;
  }),
}));

import type { MikroAssetRecord, MikroFontRecord } from "../../src/index.js";
import { createImageElement, MikroDeck } from "../../src/index.js";
import { assetSrc } from "../../src/presentation/assetRuntime.js";
import {
  collectRemoteImageAssets,
  collectStoredFontAssets,
  collectStoredImageAssets,
} from "../../src/presentation/portableAssets.js";

const now = "2026-06-05T00:00:00.000Z";

function asset(input: Partial<MikroAssetRecord>): MikroAssetRecord {
  return {
    id: "asset_image",
    deckId: "deck",
    kind: "image",
    mediaType: "image/png",
    data: new Blob(["asset"], { type: "image/png" }),
    originalName: "asset.png",
    originalSrc: "asset.png",
    createdAt: now,
    updatedAt: now,
    ...input,
  };
}

function font(input: Partial<MikroFontRecord>): MikroFontRecord {
  return {
    id: "font_brand",
    source: "local",
    label: "Brand",
    family: "Brand",
    assetId: "asset_font",
    mediaType: "font/woff2",
    remoteUrl: null,
    createdAt: now,
    updatedAt: now,
    ...input,
  };
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("portable assets", () => {
  it("collects stored image assets referenced by deck images", async () => {
    const deck = MikroDeck.create({ title: "Images" }).toRecord();
    deck.slides[0].elements = [
      createImageElement({ id: "image", src: assetSrc("asset_image") }),
      createImageElement({ id: "remote", src: "https://example.test/image.png" }),
    ];

    const result = await collectStoredImageAssets(deck, async (assetId) =>
      assetId === "asset_image" ? asset({ id: assetId }) : null,
    );

    expect(result.failed).toBe(0);
    expect(result.assets).toEqual([
      {
        slideId: deck.slides[0].id,
        elementId: "image",
        kind: "image",
        mediaType: "image/png",
        dataUrl: "data:image/png;base64,asset",
        originalSrc: "asset.png",
      },
    ]);
  });

  it("counts missing stored image assets without throwing", async () => {
    const deck = MikroDeck.create({ title: "Missing Image" }).toRecord();
    deck.slides[0].elements = [createImageElement({ id: "missing", src: assetSrc("missing") })];

    const result = await collectStoredImageAssets(deck, async () => null);

    expect(result).toEqual({ assets: [], failed: 1 });
  });

  it("collects local font assets and ignores remote font records", async () => {
    const deck = MikroDeck.create({ title: "Fonts" }).toRecord();
    deck.fonts = [
      font({ id: "font_brand", assetId: "asset_font" }),
      font({ id: "font_remote", source: "source", assetId: null }),
    ];

    const result = await collectStoredFontAssets(deck, async (assetId) =>
      assetId === "asset_font"
        ? asset({
            id: assetId,
            kind: "font",
            mediaType: "font/woff2",
            data: new Blob(["font"], { type: "font/woff2" }),
            originalName: "brand.woff2",
            originalSrc: "brand.woff2",
          })
        : null,
    );

    expect(result.failed).toBe(0);
    expect(result.assets).toEqual([
      {
        fontId: "font_brand",
        kind: "font",
        mediaType: "font/woff2",
        dataUrl: "data:font/woff2;base64,font",
        originalSrc: "brand.woff2",
      },
    ]);
  });

  it("fetches remote image assets and reports fetch failures", async () => {
    const deck = MikroDeck.create({ title: "Remote Images" }).toRecord();
    deck.slides[0].elements = [
      createImageElement({ id: "remote", src: "https://example.test/image.png" }),
      createImageElement({ id: "failed", src: "https://example.test/missing.png" }),
      createImageElement({ id: "stored", src: assetSrc("asset_image") }),
    ];
    const fetchMock = vi.fn(async (url: string) => ({
      ok: url.endsWith("/image.png"),
      blob: async () => new Blob(["remote"], { type: "image/png" }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", { location: { href: "https://app.test/" } });

    const result = await collectRemoteImageAssets(deck);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.failed).toBe(1);
    expect(result.assets).toEqual([
      {
        slideId: deck.slides[0].id,
        elementId: "remote",
        kind: "image",
        mediaType: "image/png",
        dataUrl: "data:image/png;base64,remote",
        originalSrc: "https://example.test/image.png",
      },
    ]);
  });
});
