import { defaultDeckTheme, MikroDeck } from "../../domain/index.js";
import type {
  CreateDeckInput,
  DeckAspectRatio,
  MikroDeckExport,
  MikroDeckId,
  MikroDeckRecord,
  MikroPortableDeckExport,
  MikroSlideRecord,
  PortableAssetInput,
  SlideElement,
  SlideLayoutKind,
  SlideTransition,
  UpdateDeckInput,
} from "../../interfaces/index.js";
import { createId, nowIso } from "../../shared/index.js";
import type { DeckRepository } from "../ports/index.js";

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
  };

  if (value.kind === "text") {
    return {
      ...base,
      kind: "text",
      content: typeof value.content === "string" ? value.content : "Text",
      color: readString(value.color, defaultDeckTheme.text),
      fontFamily:
        value.fontFamily === "serif" || value.fontFamily === "mono" ? value.fontFamily : "system",
      fontSize: readNumber(value.fontSize, 32),
      fontWeight: readNumber(value.fontWeight, 650),
      italic: value.italic === true,
      align: value.align === "center" || value.align === "right" ? value.align : "left",
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
    return {
      ...base,
      kind: "shape",
      shape:
        value.shape === "ellipse" || value.shape === "line" || value.shape === "rect"
          ? value.shape
          : "rect",
      fill: readString(value.fill, "#dbeafe"),
      stroke: readString(value.stroke, defaultDeckTheme.accent),
      strokeWidth: readNumber(value.strokeWidth, 1),
      radius: readNumber(value.radius, 8),
    };
  }

  return null;
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

function readExportEnvelope(text: string): MikroDeckRecord {
  const parsed: unknown = JSON.parse(text);
  if (!isObject(parsed)) {
    throw new Error("Invalid MikroSlides file.");
  }

  if (parsed.schema === "mikroslides.deck") {
    if (parsed.version !== 1) {
      throw new Error(`Unsupported MikroSlides schema version: ${String(parsed.version)}`);
    }

    return readDeckRecord(parsed.deck);
  }

  if (parsed.schema === "mikroslides.portable") {
    if (parsed.version !== 1) {
      throw new Error(`Unsupported MikroSlides portable version: ${String(parsed.version)}`);
    }

    return readPortableDeck(parsed);
  }

  throw new Error("This JSON file is not a MikroSlides deck.");
}

function assetIdForImage(slideId: string, elementId: string) {
  return `asset_${slideId}_${elementId}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function mediaTypeFromDataUrl(dataUrl: string) {
  return dataUrl.match(/^data:([^;,]+)/)?.[1] ?? "application/octet-stream";
}

function readPortableAsset(value: unknown): MikroPortableDeckExport["assets"][number] | null {
  if (
    !isObject(value) ||
    value.kind !== "image" ||
    typeof value.slideId !== "string" ||
    typeof value.elementId !== "string" ||
    typeof value.dataUrl !== "string"
  ) {
    return null;
  }

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

function readPortableDeck(value: Record<string, unknown>) {
  const deck = readDeckRecord(value.deck);
  const assets = Array.isArray(value.assets)
    ? value.assets
        .map(readPortableAsset)
        .filter((asset): asset is MikroPortableDeckExport["assets"][number] => Boolean(asset))
    : [];
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));

  return {
    ...deck,
    slides: deck.slides.map((slide) => ({
      ...slide,
      elements: slide.elements.map((element) => {
        if (element.kind !== "image" || !element.src.startsWith("asset:")) {
          return element;
        }

        const asset = assetsById.get(element.src.replace(/^asset:/, ""));
        return asset ? { ...element, src: asset.dataUrl } : element;
      }),
    })),
  };
}

function normalizePortableAsset(asset: PortableAssetInput) {
  return {
    id: assetIdForImage(asset.slideId, asset.elementId),
    ...asset,
    mediaType: asset.mediaType || mediaTypeFromDataUrl(asset.dataUrl),
  };
}

function createPortablePayload(record: MikroDeckRecord, embeddedAssets: PortableAssetInput[] = []) {
  const extraAssets = new Map(
    embeddedAssets.map((asset) => [
      `${asset.slideId}:${asset.elementId}`,
      normalizePortableAsset(asset),
    ]),
  );
  const assets: MikroPortableDeckExport["assets"] = [];
  const deck = MikroDeck.fromRecord(record).toRecord();

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
      slides,
    },
    assets,
  };
}

/**
 * @description Application service for local-first deck lifecycle, snapshots, and file exchange.
 */
export class DeckService {
  constructor(private readonly repository: DeckRepository) {}

  async create(input: CreateDeckInput = {}) {
    const deck = MikroDeck.create(input);
    await this.repository.save(deck.toRecord());
    return deck.toRecord();
  }

  async list() {
    const decks = await this.repository.list();
    return decks
      .map((deck) => MikroDeck.fromRecord(deck).toRecord())
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async load(id: MikroDeckId) {
    const deck = await this.repository.load(id);
    return deck ? MikroDeck.fromRecord(deck).toRecord() : null;
  }

  async update(id: MikroDeckId, input: UpdateDeckInput) {
    const existing = await this.repository.load(id);
    if (!existing) {
      throw new Error(`Deck not found: ${id}`);
    }

    const deck = MikroDeck.fromRecord(existing).update(input);
    await this.repository.save(deck.toRecord());
    return deck.toRecord();
  }

  async save(
    record: MikroDeckRecord,
    input: Omit<UpdateDeckInput, "slides" | "activeSlideId"> = {},
  ) {
    const deck = MikroDeck.fromRecord(record).update({
      ...input,
      slides: record.slides,
      activeSlideId: record.activeSlideId,
      aspectRatio: record.aspectRatio,
      theme: record.theme,
    });
    await this.repository.save(deck.toRecord());
    return deck.toRecord();
  }

  async duplicate(id: MikroDeckId) {
    const existing = await this.repository.load(id);
    if (!existing) {
      throw new Error(`Deck not found: ${id}`);
    }

    return this.create({
      title: `${existing.title} copy`,
      slides: existing.slides,
      aspectRatio: existing.aspectRatio,
      theme: existing.theme,
    });
  }

  async delete(id: MikroDeckId) {
    await this.repository.delete(id);
  }

  exportJson(record: MikroDeckRecord) {
    const payload: MikroDeckExport = {
      schema: "mikroslides.deck",
      version: 1,
      exportedAt: nowIso(),
      deck: MikroDeck.fromRecord(record).toRecord(),
    };

    return `${JSON.stringify(payload, null, 2)}\n`;
  }

  exportPortable(record: MikroDeckRecord, embeddedAssets: PortableAssetInput[] = []) {
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

  async importJson(text: string) {
    const record = MikroDeck.fromRecord(readExportEnvelope(text)).update({
      saveSnapshot: true,
      snapshotReason: "import",
    });
    await this.repository.save(record.toRecord());
    return record.toRecord();
  }

  search(decks: MikroDeckRecord[], query: string) {
    const term = query.trim().toLowerCase();
    if (!term) {
      return decks;
    }

    return decks.filter((deck) => {
      const slideText = deck.slides
        .flatMap((slide) => [
          slide.title,
          slide.speakerNotes,
          ...slide.elements.map((element) => ("content" in element ? element.content : "")),
        ])
        .join(" ");
      return `${deck.title} ${slideText}`.toLowerCase().includes(term);
    });
  }
}
