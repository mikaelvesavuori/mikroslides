import type { MikroAssetRecord, MikroDeckRecord } from "../index.js";
import {
  AssetObjectUrlRegistry,
  assetSrc,
  createAssetRecord,
  fontAssetMediaType,
  imageAssetMediaType,
  referencedAssetIds,
  resolveAssetImageSource,
} from "./assetRuntime.js";

export type AssetControllerOptions = {
  createAssetId: () => string;
  getDeck: () => MikroDeckRecord | null;
  getStorageAvailable: () => boolean;
  loadAsset: (assetId: string) => Promise<MikroAssetRecord | null>;
  now: () => string;
  renderFontRuntimeStyles: () => void;
  saveAsset: (asset: MikroAssetRecord) => Promise<void>;
};

export function createAssetController(
  options: AssetControllerOptions,
  registry = new AssetObjectUrlRegistry(),
) {
  function setAssetObjectUrl(asset: MikroAssetRecord) {
    registry.set(asset);
  }

  async function createStoredAsset(
    blob: Blob,
    originalName: string,
    kind: MikroAssetRecord["kind"],
  ) {
    const deck = options.getDeck();
    if (!deck || !options.getStorageAvailable()) {
      throw new Error(
        `Browser storage is required to add local ${kind === "font" ? "fonts" : "images"}.`,
      );
    }

    const asset = createAssetRecord({
      blob,
      createAssetId: options.createAssetId,
      deckId: deck.id,
      kind,
      mediaType:
        kind === "font" ? fontAssetMediaType(blob, originalName) : imageAssetMediaType(blob),
      now: options.now(),
      originalName,
    });
    await options.saveAsset(asset);
    setAssetObjectUrl(asset);
    return asset;
  }

  return {
    deleteObjectUrl(assetId: string) {
      registry.delete(assetId);
    },
    objectUrlForAsset(assetId: string) {
      return registry.get(assetId);
    },
    resolveImageSource(src: string) {
      return resolveAssetImageSource(src, (assetId) => registry.get(assetId));
    },
    async syncObjectUrls(deck: MikroDeckRecord | null = options.getDeck()) {
      const referencedIds = referencedAssetIds(deck);
      registry.revokeUnreferenced(referencedIds);

      if (!options.getStorageAvailable()) {
        return;
      }

      for (const assetId of referencedIds) {
        if (registry.has(assetId)) {
          continue;
        }

        const asset = await options.loadAsset(assetId);
        if (asset) {
          setAssetObjectUrl(asset);
        }
      }
      options.renderFontRuntimeStyles();
    },
    async createStoredImageAsset(blob: Blob, originalName: string) {
      const asset = await createStoredAsset(blob, originalName, "image");
      return assetSrc(asset.id);
    },
    async createStoredFontAsset(blob: Blob, originalName: string) {
      const asset = await createStoredAsset(blob, originalName, "font");
      return asset.id;
    },
  };
}
