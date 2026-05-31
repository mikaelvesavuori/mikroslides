import { readBlobAsDataUrl } from "../config/index.js";
import type { MikroDeckRecord, PortableAssetInput } from "../index.js";

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
