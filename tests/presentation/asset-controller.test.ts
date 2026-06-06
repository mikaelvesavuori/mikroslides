import type { MikroAssetRecord } from "../../src/index.js";
import { createImageElement, MikroDeck } from "../../src/index.js";
import { createAssetController } from "../../src/presentation/assetController.js";
import { AssetObjectUrlRegistry, assetSrc } from "../../src/presentation/assetRuntime.js";

const now = "2026-06-04T00:00:00.000Z";

function asset(id: string): MikroAssetRecord {
  return {
    id,
    deckId: "deck",
    kind: "image",
    mediaType: "image/png",
    data: new Blob(["asset"], { type: "image/png" }),
    originalName: `${id}.png`,
    originalSrc: `${id}.png`,
    createdAt: now,
    updatedAt: now,
  };
}

function harness() {
  const deck = { ...MikroDeck.create({ title: "Assets" }).toRecord(), id: "deck" };
  deck.slides[0].elements.push(createImageElement({ id: "image", src: assetSrc("stored") }));
  const saved: MikroAssetRecord[] = [];
  const loaded = new Map([["stored", asset("stored")]]);
  const calls: string[] = [];
  let storageAvailable = true;
  let nextAssetId = 1;
  let nextObjectUrl = 1;
  const registry = new AssetObjectUrlRegistry(
    () => `blob:${nextObjectUrl++}`,
    (url) => calls.push(`revoke:${url}`),
  );
  const controller = createAssetController(
    {
      createAssetId: () => `asset_${nextAssetId++}`,
      getDeck: () => deck,
      getStorageAvailable: () => storageAvailable,
      loadAsset: async (assetId) => loaded.get(assetId) ?? null,
      now: () => now,
      renderFontRuntimeStyles: () => calls.push("render-fonts"),
      saveAsset: async (record) => {
        saved.push(record);
      },
    },
    registry,
  );

  return {
    calls,
    controller,
    getSaved: () => saved,
    setStorageAvailable: (value: boolean) => {
      storageAvailable = value;
    },
  };
}

describe("asset controller", () => {
  it("syncs referenced asset object URLs and resolves asset image sources", async () => {
    const test = harness();

    await test.controller.syncObjectUrls();

    expect(test.controller.objectUrlForAsset("stored")).toBe("blob:1");
    expect(test.controller.resolveImageSource("asset:stored")).toBe("blob:1");
    expect(test.calls).toContain("render-fonts");
  });

  it("creates stored image and font assets with object URLs", async () => {
    const test = harness();

    await expect(
      test.controller.createStoredImageAsset(new Blob(["image"], { type: "image/png" }), "ui.png"),
    ).resolves.toBe("asset:asset_1");
    await expect(
      test.controller.createStoredFontAsset(new Blob(["font"]), "Inter.woff2"),
    ).resolves.toBe("asset_2");

    expect(test.getSaved().map((record) => [record.id, record.kind, record.mediaType])).toEqual([
      ["asset_1", "image", "image/png"],
      ["asset_2", "font", "font/woff2"],
    ]);
    expect(test.controller.objectUrlForAsset("asset_2")).toBe("blob:2");
  });

  it("fails local asset creation when storage is unavailable", async () => {
    const test = harness();
    test.setStorageAvailable(false);

    await expect(
      test.controller.createStoredImageAsset(new Blob(["image"]), "ui.png"),
    ).rejects.toThrow("Browser storage is required to add local images.");
  });
});
