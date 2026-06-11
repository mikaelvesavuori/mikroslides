import {
  createShapeElement,
  defaultDeckTheme,
  MikroDeck,
  OutlineImportService,
} from "../../domain/index.js";
import type {
  DeckAspectRatio,
  MikroAssetRecord,
  MikroDeckExport,
  MikroDeckRecord,
  MikroFontRecord,
  MikroPortableAsset,
  MikroPortableDeckExport,
  MikroSlideRecord,
  PortableAssetInput,
  SlideElement,
  SlideLayoutKind,
  SlideTransition,
  TextFontFamily,
  TextListStyle,
} from "../../interfaces/index.js";
import { createId, nowIso } from "../../shared/index.js";

export type DeckImportEnvelope = {
  deck: MikroDeckRecord;
  assets: MikroPortableAsset[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readAspectRatio(value: unknown): DeckAspectRatio {
  return value === "4:3" || value === "1:1" || value === "16:9" ? value : "16:9";
}

function readLayout(value: unknown): SlideLayoutKind {
  const layouts: SlideLayoutKind[] = [
    "blank",
    "title",
    "section",
    "statement",
    "bullets",
    "two-column",
    "image-left",
    "image-right",
    "quote",
    "comparison",
    "timeline",
    "chart-data",
    "closing",
  ];
  return typeof value === "string" && layouts.includes(value as SlideLayoutKind)
    ? (value as SlideLayoutKind)
    : "blank";
}

function readTransition(value: unknown): SlideTransition {
  return value === "fade" || value === "slide" || value === "none" ? value : "none";
}

function readTextFontFamily(value: unknown): TextFontFamily {
  if (value === "serif" || value === "mono" || value === "system") {
    return value;
  }

  if (typeof value === "string" && /^font:[a-zA-Z0-9_-]+$/.test(value)) {
    return value as TextFontFamily;
  }

  return "system";
}

function readTextListStyle(value: unknown): TextListStyle {
  return value === "bullet" ? "bullet" : "none";
}

function readFontRecord(value: unknown): MikroFontRecord | null {
  if (!isObject(value)) {
    return null;
  }

  const source =
    value.source === "bunny" || value.source === "local" || value.source === "source"
      ? value.source
      : null;
  if (!source) {
    return null;
  }

  const now = nowIso();
  const id = readString(value.id, createId("font"));
  const label = readString(value.label, readString(value.family, "Font")).slice(0, 80);

  return {
    id,
    source,
    label,
    family: readString(value.family, label).slice(0, 80),
    assetId: typeof value.assetId === "string" && value.assetId ? value.assetId : null,
    mediaType: typeof value.mediaType === "string" && value.mediaType ? value.mediaType : null,
    remoteUrl: typeof value.remoteUrl === "string" && value.remoteUrl ? value.remoteUrl : null,
    createdAt: readString(value.createdAt, now),
    updatedAt: readString(value.updatedAt, now),
  };
}

function readFonts(value: unknown): MikroFontRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  return value
    .map(readFontRecord)
    .filter((font): font is MikroFontRecord => Boolean(font))
    .filter((font) => {
      if (seen.has(font.id)) {
        return false;
      }
      seen.add(font.id);
      return true;
    });
}

function assetSrc(assetId: string) {
  return `asset:${assetId}`;
}

function assetIdFromSrc(src: string) {
  return src.startsWith("asset:") ? src.replace(/^asset:/, "") : null;
}

function readElement(value: unknown): SlideElement | null {
  if (!isObject(value) || typeof value.kind !== "string") {
    return null;
  }

  const base = {
    id: readString(value.id, createId("el")),
    x: readNumber(value.x, 12),
    y: readNumber(value.y, 12),
    width: readNumber(value.width, 30),
    height: readNumber(value.height, 20),
    rotation: readNumber(value.rotation, 0),
    opacity: readNumber(value.opacity, 1),
    locked: value.locked === true,
  };

  if (value.kind === "text") {
    return {
      ...base,
      kind: "text",
      content: typeof value.content === "string" ? value.content : "Text",
      color: readString(value.color, defaultDeckTheme.text),
      fontFamily: readTextFontFamily(value.fontFamily),
      fontSize: readNumber(value.fontSize, 32),
      fontWeight: readNumber(value.fontWeight, 650),
      lineHeight: readNumber(value.lineHeight, 1.14),
      italic: value.italic === true,
      align: value.align === "center" || value.align === "right" ? value.align : "left",
      verticalAlign:
        value.verticalAlign === "top" || value.verticalAlign === "bottom"
          ? value.verticalAlign
          : "center",
      listStyle: readTextListStyle(value.listStyle),
    };
  }

  if (value.kind === "image") {
    return {
      ...base,
      kind: "image",
      src: typeof value.src === "string" ? value.src : "",
      alt: typeof value.alt === "string" ? value.alt : "",
      fit: value.fit === "contain" ? "contain" : "cover",
    };
  }

  if (value.kind === "shape") {
    return createShapeElement({
      ...base,
      shape: readShapeKind(value.shape),
      fill: readString(value.fill, "#dbeafe"),
      stroke: readString(value.stroke, defaultDeckTheme.accent),
      strokeWidth: readNumber(value.strokeWidth, 1),
      radius: readNumber(value.radius, 8),
      content: typeof value.content === "string" ? value.content : "",
      color: readString(value.color, defaultDeckTheme.text),
      fontFamily: readTextFontFamily(value.fontFamily),
      fontSize: readNumber(value.fontSize, 20),
      fontWeight: readNumber(value.fontWeight, 650),
      lineHeight: readNumber(value.lineHeight, 1.1),
      italic: value.italic === true,
      align: value.align === "left" || value.align === "right" ? value.align : "center",
      verticalAlign:
        value.verticalAlign === "top" || value.verticalAlign === "bottom"
          ? value.verticalAlign
          : "center",
      listStyle: readTextListStyle(value.listStyle),
    });
  }

  return null;
}

function readShapeKind(value: unknown) {
  return value === "capsule" ||
    value === "chevron" ||
    value === "database" ||
    value === "diamond" ||
    value === "document" ||
    value === "ellipse" ||
    value === "hexagon" ||
    value === "line" ||
    value === "octagon" ||
    value === "parallelogram" ||
    value === "rect" ||
    value === "trapezoid" ||
    value === "triangle"
    ? value
    : "rect";
}

function readSlide(value: unknown, index: number): MikroSlideRecord | null {
  if (!isObject(value)) {
    return null;
  }

  const elements = Array.isArray(value.elements)
    ? value.elements.map(readElement).filter((element): element is SlideElement => Boolean(element))
    : [];

  return {
    id: readString(value.id, createId("slide")),
    title: readString(value.title, `Slide ${index + 1}`),
    layout: readLayout(value.layout),
    background: readString(value.background, defaultDeckTheme.background),
    speakerNotes: typeof value.speakerNotes === "string" ? value.speakerNotes : "",
    skipped: value.skipped === true,
    transition: readTransition(value.transition),
    elements,
  };
}

function readDeckRecord(value: unknown): MikroDeckRecord {
  if (!isObject(value) || !Array.isArray(value.slides)) {
    throw new Error("MikroSlides deck data is missing required slides.");
  }

  const now = nowIso();
  const slides = value.slides
    .map(readSlide)
    .filter((slide): slide is MikroSlideRecord => Boolean(slide));

  if (slides.length === 0) {
    throw new Error("MikroSlides deck must contain at least one slide.");
  }

  const activeSlideId = readString(value.activeSlideId, slides[0].id);

  return {
    id: readString(value.id, createId("deck")),
    title: readString(value.title, "Imported Deck"),
    slides,
    fonts: readFonts(value.fonts),
    activeSlideId: slides.some((slide) => slide.id === activeSlideId)
      ? activeSlideId
      : slides[0].id,
    aspectRatio: readAspectRatio(value.aspectRatio),
    theme: isObject(value.theme) ? { ...defaultDeckTheme, ...value.theme } : defaultDeckTheme,
    createdAt: readString(value.createdAt, now),
    updatedAt: readString(value.updatedAt, now),
    lastSavedAt: typeof value.lastSavedAt === "string" ? value.lastSavedAt : null,
    version: readNumber(value.version, 1),
    snapshots: [],
  };
}

export function readExportEnvelope(text: string): DeckImportEnvelope {
  const parsed: unknown = JSON.parse(text);
  if (!isObject(parsed)) {
    throw new Error("Invalid MikroSlides file.");
  }

  if (parsed.schema === "mikroslides.deck") {
    if (parsed.version !== 1) {
      throw new Error(`Unsupported MikroSlides schema version: ${String(parsed.version)}`);
    }

    return { deck: readDeckRecord(parsed.deck), assets: [] };
  }

  if (parsed.schema === "mikroslides.portable") {
    if (parsed.version !== 1) {
      throw new Error(`Unsupported MikroSlides portable version: ${String(parsed.version)}`);
    }

    return readPortableDeck(parsed);
  }

  throw new Error("This JSON file is not a MikroSlides deck.");
}

function isMarkdownSourceName(sourceName: string | undefined) {
  return /\.(md|markdown)$/i.test(sourceName ?? "");
}

function looksLikeJson(text: string) {
  return /^[{\[]/.test(text.trim());
}

export function readDeckImportEnvelope(text: string, sourceName?: string): DeckImportEnvelope {
  const outlineService = new OutlineImportService();
  if (
    isMarkdownSourceName(sourceName) ||
    (!looksLikeJson(text) && outlineService.looksLikeOutline(text))
  ) {
    return {
      deck: outlineService.createDeckFromMarkdown(text),
      assets: [],
    };
  }

  return readExportEnvelope(text);
}

function assetIdForImage(slideId: string, elementId: string) {
  return `asset_${slideId}_${elementId}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function assetIdForFont(fontId: string) {
  return `asset_${fontId}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function mediaTypeFromDataUrl(dataUrl: string) {
  return dataUrl.match(/^data:([^;,]+)/)?.[1] ?? "application/octet-stream";
}

function readPortableAsset(value: unknown): MikroPortableAsset | null {
  if (!isObject(value) || typeof value.kind !== "string" || typeof value.dataUrl !== "string") {
    return null;
  }

  if (
    value.kind === "image" &&
    typeof value.slideId === "string" &&
    typeof value.elementId === "string"
  ) {
    return {
      id: readString(value.id, assetIdForImage(value.slideId, value.elementId)),
      slideId: value.slideId,
      elementId: value.elementId,
      kind: "image",
      mediaType: readString(value.mediaType, mediaTypeFromDataUrl(value.dataUrl)),
      dataUrl: value.dataUrl,
      originalSrc: typeof value.originalSrc === "string" ? value.originalSrc : value.dataUrl,
    };
  }

  if (value.kind === "font" && typeof value.fontId === "string") {
    return {
      id: readString(value.id, assetIdForFont(value.fontId)),
      fontId: value.fontId,
      kind: "font",
      mediaType: readString(value.mediaType, mediaTypeFromDataUrl(value.dataUrl)),
      dataUrl: value.dataUrl,
      originalSrc: typeof value.originalSrc === "string" ? value.originalSrc : value.dataUrl,
    };
  }

  return null;
}

function readPortableDeck(value: Record<string, unknown>): DeckImportEnvelope {
  const deck = readDeckRecord(value.deck);
  const assets = Array.isArray(value.assets)
    ? value.assets
        .map(readPortableAsset)
        .filter((asset): asset is MikroPortableAsset => Boolean(asset))
    : [];

  return { deck, assets };
}

function normalizePortableAsset(asset: PortableAssetInput) {
  if (asset.kind === "font") {
    return {
      id: assetIdForFont(asset.fontId),
      ...asset,
      mediaType: asset.mediaType || mediaTypeFromDataUrl(asset.dataUrl),
    };
  }

  return {
    id: assetIdForImage(asset.slideId, asset.elementId),
    ...asset,
    mediaType: asset.mediaType || mediaTypeFromDataUrl(asset.dataUrl),
  };
}

function createPortablePayload(record: MikroDeckRecord, embeddedAssets: PortableAssetInput[] = []) {
  const extraAssets = new Map(
    embeddedAssets.map((asset) => {
      const key =
        asset.kind === "font" ? `font:${asset.fontId}` : `${asset.slideId}:${asset.elementId}`;
      return [key, normalizePortableAsset(asset)] as const;
    }),
  );
  const assets: MikroPortableDeckExport["assets"] = [];
  const deck = MikroDeck.fromRecord(record).toRecord();
  const fonts = deck.fonts.map((font) => {
    if (font.source !== "local") {
      return font;
    }

    const embeddedAsset = extraAssets.get(`font:${font.id}`);
    if (!embeddedAsset || embeddedAsset.kind !== "font") {
      return font;
    }

    const asset = {
      id: assetIdForFont(font.id),
      fontId: font.id,
      kind: "font" as const,
      mediaType: embeddedAsset.mediaType || mediaTypeFromDataUrl(embeddedAsset.dataUrl),
      dataUrl: embeddedAsset.dataUrl,
      originalSrc: embeddedAsset.originalSrc,
    };
    assets.push(asset);
    return { ...font, assetId: asset.id };
  });

  const slides = deck.slides.map((slide) => ({
    ...slide,
    elements: slide.elements.map((element) => {
      if (element.kind !== "image" || !element.src) {
        return element;
      }

      const embeddedAsset = extraAssets.get(`${slide.id}:${element.id}`);
      const dataUrl = element.src.startsWith("data:") ? element.src : embeddedAsset?.dataUrl;
      if (!dataUrl) {
        return element;
      }

      const asset = {
        id: assetIdForImage(slide.id, element.id),
        slideId: slide.id,
        elementId: element.id,
        kind: "image" as const,
        mediaType: embeddedAsset?.mediaType || mediaTypeFromDataUrl(dataUrl),
        dataUrl,
        originalSrc: embeddedAsset?.originalSrc ?? element.src,
      };
      assets.push(asset);
      return { ...element, src: `asset:${asset.id}` };
    }),
  }));

  return {
    deck: {
      ...deck,
      fonts,
      slides,
    },
    assets,
  };
}

export function serializeDeckExport(record: MikroDeckRecord) {
  const payload: MikroDeckExport = {
    schema: "mikroslides.deck",
    version: 1,
    exportedAt: nowIso(),
    deck: MikroDeck.fromRecord(record).toRecord(),
  };

  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function serializePortableDeckExport(
  record: MikroDeckRecord,
  embeddedAssets: PortableAssetInput[] = [],
) {
  const portable = createPortablePayload(record, embeddedAssets);
  const payload: MikroPortableDeckExport = {
    schema: "mikroslides.portable",
    version: 1,
    exportedAt: nowIso(),
    deck: portable.deck,
    assets: portable.assets,
  };

  return `${JSON.stringify(payload, null, 2)}\n`;
}

function dataUrlToBlob(dataUrl: string, mediaType: string) {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex < 0) {
    return new Blob([], { type: mediaType });
  }

  const metadata = dataUrl.slice(0, commaIndex);
  const payload = dataUrl.slice(commaIndex + 1);
  const isBase64 = metadata.includes(";base64");
  const content = isBase64
    ? globalThis.atob(payload.replace(/\s/g, ""))
    : decodeURIComponent(payload);
  const bytes = new Uint8Array(content.length);
  for (let index = 0; index < content.length; index += 1) {
    bytes[index] = content.charCodeAt(index);
  }

  return new Blob([bytes], { type: mediaType || mediaTypeFromDataUrl(dataUrl) });
}

function rewriteDeckAssetRefs(record: MikroDeckRecord, assetIdMap: Map<string, string>) {
  if (assetIdMap.size === 0) {
    return record;
  }

  return {
    ...record,
    fonts: record.fonts.map((font) => {
      const nextAssetId = font.assetId ? assetIdMap.get(font.assetId) : null;
      return nextAssetId ? { ...font, assetId: nextAssetId } : font;
    }),
    slides: record.slides.map((slide) => ({
      ...slide,
      elements: slide.elements.map((element) => {
        if (element.kind !== "image") {
          return element;
        }

        const assetId = assetIdFromSrc(element.src);
        const nextAssetId = assetId ? assetIdMap.get(assetId) : null;
        return nextAssetId ? { ...element, src: assetSrc(nextAssetId) } : element;
      }),
    })),
  };
}

export function createImportedAssetRecords(record: MikroDeckRecord, assets: MikroPortableAsset[]) {
  const now = nowIso();
  const assetIdMap = new Map<string, string>();
  const records = assets.map((asset): MikroAssetRecord => {
    const nextId = createId("asset");
    assetIdMap.set(asset.id, nextId);
    return {
      id: nextId,
      deckId: record.id,
      kind: asset.kind,
      mediaType: asset.mediaType || mediaTypeFromDataUrl(asset.dataUrl),
      data: dataUrlToBlob(asset.dataUrl, asset.mediaType),
      originalName: "",
      originalSrc: asset.originalSrc,
      createdAt: now,
      updatedAt: now,
    };
  });

  return {
    record: rewriteDeckAssetRefs(record, assetIdMap),
    assets: records,
  };
}

export function createImportedDeckRecord(record: MikroDeckRecord) {
  const now = nowIso();
  return MikroDeck.fromRecord({
    ...record,
    id: createId("deck"),
    createdAt: now,
    updatedAt: now,
    lastSavedAt: null,
    snapshots: [],
  }).toRecord();
}

export function createDuplicatedAssetRecords(record: MikroDeckRecord, assets: MikroAssetRecord[]) {
  const now = nowIso();
  const assetIdMap = new Map<string, string>();
  const records = assets.map((asset): MikroAssetRecord => {
    const nextId = createId("asset");
    assetIdMap.set(asset.id, nextId);
    return {
      ...asset,
      id: nextId,
      deckId: record.id,
      createdAt: now,
      updatedAt: now,
    };
  });

  return {
    record: rewriteDeckAssetRefs(record, assetIdMap),
    assets: records,
  };
}
