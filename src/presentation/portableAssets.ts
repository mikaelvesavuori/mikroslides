import { readBlobAsDataUrl } from "../config/index.js";
import type { MikroAssetRecord, MikroDeckRecord, PortableAssetInput } from "../index.js";

export type PortableAssetCollection = {
  assets: PortableAssetInput[];
  failed: number;
};

function isFetchableImageSource(src: string) {
  if (!src || src.startsWith("data:") || src.startsWith("asset:")) {
    return false;
  }

  try {
    const url = new URL(src, window.location.href);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function assetIdFromSrc(src: string) {
  return src.startsWith("asset:") ? src.replace(/^asset:/, "") : null;
}

export async function collectStoredImageAssets(
  deck: MikroDeckRecord,
  loadAsset: (assetId: string) => Promise<MikroAssetRecord | null>,
): Promise<PortableAssetCollection> {
  const assets: PortableAssetInput[] = [];
  let failed = 0;

  for (const slide of deck.slides) {
    for (const element of slide.elements) {
      if (element.kind !== "image") {
        continue;
      }

      const assetId = assetIdFromSrc(element.src);
      if (!assetId) {
        continue;
      }

      const asset = await loadAsset(assetId);
      if (!asset) {
        failed += 1;
        continue;
      }

      assets.push({
        slideId: slide.id,
        elementId: element.id,
        kind: "image",
        mediaType: asset.mediaType,
        dataUrl: await readBlobAsDataUrl(asset.data),
        originalSrc: asset.originalSrc || element.src,
      });
    }
  }

  return { assets, failed };
}

export async function collectStoredFontAssets(
  deck: MikroDeckRecord,
  loadAsset: (assetId: string) => Promise<MikroAssetRecord | null>,
): Promise<PortableAssetCollection> {
  const assets: PortableAssetInput[] = [];
  let failed = 0;

  for (const font of deck.fonts) {
    if (font.source !== "local" || !font.assetId) {
      continue;
    }

    const asset = await loadAsset(font.assetId);
    if (!asset) {
      failed += 1;
      continue;
    }

    assets.push({
      fontId: font.id,
      kind: "font",
      mediaType: asset.mediaType,
      dataUrl: await readBlobAsDataUrl(asset.data),
      originalSrc: asset.originalSrc || font.label,
    });
  }

  return { assets, failed };
}

export async function collectRemoteImageAssets(
  deck: MikroDeckRecord,
): Promise<PortableAssetCollection> {
  const assets: PortableAssetInput[] = [];
  let failed = 0;

  for (const slide of deck.slides) {
    for (const element of slide.elements) {
      if (element.kind !== "image" || !isFetchableImageSource(element.src)) {
        continue;
      }

      try {
        const response = await fetch(element.src);
        if (!response.ok) {
          failed += 1;
          continue;
        }

        const blob = await response.blob();
        const dataUrl = await readBlobAsDataUrl(blob);
        assets.push({
          slideId: slide.id,
          elementId: element.id,
          kind: "image",
          mediaType: blob.type || "application/octet-stream",
          dataUrl,
          originalSrc: element.src,
        });
      } catch {
        failed += 1;
      }
    }
  }

  return { assets, failed };
}
