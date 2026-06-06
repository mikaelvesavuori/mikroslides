import type { MikroAssetRecord, MikroDeckRecord, MikroSlideRecord } from "../index.js";
import { fontAssetId } from "./fontRuntime.js";

type ObjectUrlFactory = (blob: Blob) => string;
type ObjectUrlRevoker = (url: string) => void;

const defaultObjectUrlFactory: ObjectUrlFactory = (blob) => URL.createObjectURL(blob);
const defaultObjectUrlRevoker: ObjectUrlRevoker = (url) => URL.revokeObjectURL(url);

interface CreateAssetRecordOptions {
  blob: Blob;
  createAssetId: () => string;
  deckId: string;
  kind: MikroAssetRecord["kind"];
  mediaType: string;
  now: string;
  originalName: string;
}

export class AssetObjectUrlRegistry {
  private readonly urls = new Map<string, string>();

  constructor(
    private readonly createObjectUrl: ObjectUrlFactory = defaultObjectUrlFactory,
    private readonly revokeObjectUrl: ObjectUrlRevoker = defaultObjectUrlRevoker,
  ) {}

  entries() {
    return [...this.urls.entries()];
  }

  get(assetId: string) {
    return this.urls.get(assetId) ?? null;
  }

  has(assetId: string) {
    return this.urls.has(assetId);
  }

  set(asset: MikroAssetRecord) {
    this.delete(asset.id);
    const objectUrl = this.createObjectUrl(asset.data);
    this.urls.set(asset.id, objectUrl);
    return objectUrl;
  }

  delete(assetId: string) {
    const objectUrl = this.urls.get(assetId);
    if (!objectUrl) {
      return false;
    }

    this.revokeObjectUrl(objectUrl);
    this.urls.delete(assetId);
    return true;
  }

  revokeUnreferenced(referencedAssetIds: Set<string>) {
    for (const [assetId] of this.urls) {
      if (!referencedAssetIds.has(assetId)) {
        this.delete(assetId);
      }
    }
  }
}

export function assetSrc(assetId: string) {
  return `asset:${assetId}`;
}

export function assetIdFromSrc(src: string) {
  return src.startsWith("asset:") ? src.replace(/^asset:/, "") : null;
}

export function resolveAssetImageSource(
  src: string,
  resolveObjectUrl: (assetId: string) => string | null,
) {
  const assetId = assetIdFromSrc(src);
  return assetId ? (resolveObjectUrl(assetId) ?? "") : src;
}

export function createAssetRecord({
  blob,
  createAssetId,
  deckId,
  kind,
  mediaType,
  now,
  originalName,
}: CreateAssetRecordOptions): MikroAssetRecord {
  return {
    id: createAssetId(),
    deckId,
    kind,
    mediaType,
    data: blob,
    originalName,
    originalSrc: originalName,
    createdAt: now,
    updatedAt: now,
  };
}

export function imageAssetMediaType(blob: Blob) {
  return blob.type || "application/octet-stream";
}

export function fontAssetMediaType(blob: Blob, originalName: string) {
  return blob.type || mediaTypeFromFileName(originalName);
}

export function referencedAssetIds(deck: MikroDeckRecord | null) {
  const assetIds = new Set<string>();
  for (const slide of deck?.slides ?? []) {
    for (const element of slide.elements) {
      const assetId = element.kind === "image" ? assetIdFromSrc(element.src) : null;
      if (assetId) {
        assetIds.add(assetId);
      }
    }
  }
  for (const font of deck?.fonts ?? []) {
    const assetId = fontAssetId(font);
    if (assetId) {
      assetIds.add(assetId);
    }
  }

  return assetIds;
}

export function mediaTypeFromFileName(fileName: string) {
  const normalized = fileName.toLowerCase();
  if (normalized.endsWith(".woff2")) {
    return "font/woff2";
  }
  if (normalized.endsWith(".woff")) {
    return "font/woff";
  }
  if (normalized.endsWith(".otf")) {
    return "font/otf";
  }
  if (normalized.endsWith(".ttf")) {
    return "font/ttf";
  }
  return "application/octet-stream";
}

export function materializeSlideAssetSources(
  slide: MikroSlideRecord,
  resolveImageSource: (src: string) => string,
) {
  return {
    ...slide,
    elements: slide.elements.map((element) =>
      element.kind === "image" ? { ...element, src: resolveImageSource(element.src) } : element,
    ),
  };
}
