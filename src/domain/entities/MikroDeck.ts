import type {
  CreateDeckInput,
  DeckAspectRatio,
  DeckStats,
  DeckTheme,
  ImageSlideElement,
  MikroDeckRecord,
  MikroDeckSnapshot,
  MikroFontRecord,
  MikroSlideRecord,
  ShapeSlideElement,
  SlideElement,
  SlideLayoutKind,
  SlideShapeKind,
  SlideTransition,
  TextFontFamily,
  TextListStyle,
  TextSlideElement,
  TextVerticalAlignment,
  UpdateDeckInput,
} from "../../interfaces/index.js";
import { createId, nowIso } from "../../shared/index.js";

const maxSnapshots = 30;

export const defaultDeckTheme: DeckTheme = {
  id: "clean-light",
  name: "Mikro",
  accent: "#1665d8",
  background: "#f8fafc",
  muted: "#64748b",
  surface: "#ffffff",
  text: "#1e293b",
  fontHeading: "system-sans",
  fontBody: "system-sans",
  fontMono: "system-mono",
};

const defaultAspectRatio: DeckAspectRatio = "16:9";
const slideLayouts = new Set<SlideLayoutKind>([
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
]);
const slideTransitions = new Set<SlideTransition>(["none", "fade", "slide"]);

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function cleanText(value: string, fallback = "") {
  const trimmed = value.trim();
  return trimmed || fallback;
}

function cleanFontLabel(value: string, fallback = "Font") {
  return cleanText(value.replace(/\s+/g, " "), fallback).slice(0, 80);
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function normalizeAspectRatio(value: unknown): DeckAspectRatio {
  return value === "16:9" || value === "4:3" || value === "1:1" ? value : defaultAspectRatio;
}

function normalizeFontToken(value: unknown): DeckTheme["fontBody"] {
  return value === "system-serif" || value === "system-mono" || value === "system-sans"
    ? value
    : "system-sans";
}

function normalizeTextFontFamily(value: unknown): TextFontFamily {
  if (value === "serif" || value === "mono" || value === "system") {
    return value;
  }

  if (typeof value === "string" && /^font:[a-zA-Z0-9_-]+$/.test(value)) {
    return value as TextFontFamily;
  }

  return "system";
}

function normalizeTextListStyle(value: unknown): TextListStyle {
  return value === "bullet" ? "bullet" : "none";
}

function normalizeTextVerticalAlignment(value: unknown): TextVerticalAlignment {
  return value === "top" || value === "bottom" ? value : "center";
}

function normalizeSlideShapeKind(value: unknown): SlideShapeKind {
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

function normalizeFontRecord(value: MikroFontRecord): MikroFontRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const id = typeof value.id === "string" && value.id.trim() ? value.id : createId("font");
  const source =
    value.source === "bunny" || value.source === "local" || value.source === "source"
      ? value.source
      : null;
  if (!source) {
    return null;
  }

  const label = cleanFontLabel(value.label || value.family || id, "Font");
  const family = cleanFontLabel(value.family || label, label);
  const now = nowIso();

  return {
    id,
    source,
    label,
    family,
    assetId: typeof value.assetId === "string" && value.assetId ? value.assetId : null,
    mediaType: typeof value.mediaType === "string" && value.mediaType ? value.mediaType : null,
    remoteUrl: typeof value.remoteUrl === "string" && value.remoteUrl ? value.remoteUrl : null,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : now,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : now,
  };
}

function normalizeFonts(fonts: MikroFontRecord[] | undefined): MikroFontRecord[] {
  const records = fonts
    ?.map(normalizeFontRecord)
    .filter((font): font is MikroFontRecord => Boolean(font));
  const seen = new Set<string>();
  return (records ?? []).filter((font) => {
    if (seen.has(font.id)) {
      return false;
    }
    seen.add(font.id);
    return true;
  });
}

function normalizeSnapshots(snapshots: MikroDeckSnapshot[] | undefined): MikroDeckSnapshot[] {
  return (snapshots ?? []).map((snapshot) => ({
    ...snapshot,
    fonts: normalizeFonts(snapshot.fonts),
  }));
}

function normalizeTheme(theme: Partial<DeckTheme> | undefined): DeckTheme {
  return {
    ...defaultDeckTheme,
    ...(theme ?? {}),
    id: theme?.id || defaultDeckTheme.id,
    name: theme?.name || defaultDeckTheme.name,
    fontHeading: normalizeFontToken(theme?.fontHeading),
    fontBody: normalizeFontToken(theme?.fontBody),
    fontMono:
      theme?.fontMono === "system-serif" || theme?.fontMono === "system-sans"
        ? theme.fontMono
        : "system-mono",
  };
}

function normalizeSlideLayout(value: unknown): SlideLayoutKind {
  return typeof value === "string" && slideLayouts.has(value as SlideLayoutKind)
    ? (value as SlideLayoutKind)
    : "blank";
}

function normalizeSlideTransition(value: unknown): SlideTransition {
  return typeof value === "string" && slideTransitions.has(value as SlideTransition)
    ? (value as SlideTransition)
    : "none";
}

function normalizeElementGeometry<TElement extends SlideElement>(element: TElement): TElement {
  return {
    ...element,
    x: clamp(element.x, -20, 120),
    y: clamp(element.y, -20, 120),
    width: clamp(element.width, 1, 140),
    height: clamp(element.height, 1, 140),
    rotation: clamp(element.rotation, -360, 360),
    opacity: clamp(element.opacity, 0, 1),
  };
}

export function createTextElement(input: Partial<TextSlideElement> = {}): TextSlideElement {
  return normalizeElementGeometry({
    id: input.id ?? createId("el"),
    kind: "text",
    x: input.x ?? 12,
    y: input.y ?? 18,
    width: input.width ?? 52,
    height: input.height ?? 18,
    rotation: input.rotation ?? 0,
    opacity: input.opacity ?? 1,
    locked: input.locked === true,
    content: input.content ?? "New text",
    color: input.color ?? defaultDeckTheme.text,
    fontFamily: normalizeTextFontFamily(input.fontFamily),
    fontSize: clamp(input.fontSize ?? 32, 8, 120),
    fontWeight: clamp(input.fontWeight ?? 650, 300, 900),
    lineHeight: clamp(input.lineHeight ?? 1.14, 0.75, 3),
    italic: input.italic ?? false,
    align: input.align ?? "left",
    verticalAlign: normalizeTextVerticalAlignment(input.verticalAlign),
    listStyle: normalizeTextListStyle(input.listStyle),
  });
}

export function createShapeElement(input: Partial<ShapeSlideElement> = {}): ShapeSlideElement {
  return normalizeElementGeometry({
    id: input.id ?? createId("el"),
    kind: "shape",
    x: input.x ?? 52,
    y: input.y ?? 46,
    width: input.width ?? 28,
    height: input.height ?? 22,
    rotation: input.rotation ?? 0,
    opacity: input.opacity ?? 1,
    locked: input.locked === true,
    shape: normalizeSlideShapeKind(input.shape),
    fill: input.fill ?? "#dbeafe",
    stroke: input.stroke ?? defaultDeckTheme.accent,
    strokeWidth: clamp(input.strokeWidth ?? 1, 0, 10),
    radius: clamp(input.radius ?? 8, 0, 48),
    content: input.content ?? "",
    color: input.color ?? defaultDeckTheme.text,
    fontFamily: normalizeTextFontFamily(input.fontFamily),
    fontSize: clamp(input.fontSize ?? 20, 8, 120),
    fontWeight: clamp(input.fontWeight ?? 650, 300, 900),
    lineHeight: clamp(input.lineHeight ?? 1.1, 0.75, 3),
    italic: input.italic ?? false,
    align: input.align ?? "center",
    verticalAlign: normalizeTextVerticalAlignment(input.verticalAlign),
    listStyle: normalizeTextListStyle(input.listStyle),
  });
}

export function createImageElement(input: Partial<ImageSlideElement> = {}): ImageSlideElement {
  return normalizeElementGeometry({
    id: input.id ?? createId("el"),
    kind: "image",
    x: input.x ?? 48,
    y: input.y ?? 18,
    width: input.width ?? 36,
    height: input.height ?? 48,
    rotation: input.rotation ?? 0,
    opacity: input.opacity ?? 1,
    locked: input.locked === true,
    src: input.src ?? "",
    alt: input.alt ?? "",
    fit: input.fit ?? "cover",
  });
}

export function createBlankSlide(input: Partial<MikroSlideRecord> = {}): MikroSlideRecord {
  return {
    id: input.id ?? createId("slide"),
    title: cleanText(input.title ?? "", "Untitled"),
    layout: normalizeSlideLayout(input.layout),
    background: input.background ?? defaultDeckTheme.background,
    speakerNotes: input.speakerNotes ?? "",
    skipped: input.skipped === true,
    transition: normalizeSlideTransition(input.transition),
    elements: input.elements?.map(sanitizeElement) ?? [
      createTextElement({
        content: "Untitled",
        x: 12,
        y: 16,
        width: 62,
        height: 16,
        fontSize: 42,
        fontWeight: 720,
      }),
    ],
  };
}

export function sanitizeElement(element: SlideElement): SlideElement {
  if (element.kind === "text") {
    return createTextElement(element);
  }

  if (element.kind === "image") {
    return createImageElement(element);
  }

  return createShapeElement(element);
}

function sanitizeSlide(slide: MikroSlideRecord, index: number): MikroSlideRecord {
  const fallback = `Slide ${index + 1}`;
  return {
    id: slide.id || createId("slide"),
    title: cleanText(slide.title, fallback),
    layout: normalizeSlideLayout(slide.layout),
    background: slide.background || defaultDeckTheme.background,
    speakerNotes: slide.speakerNotes ?? "",
    skipped: slide.skipped === true,
    transition: normalizeSlideTransition(slide.transition),
    elements: slide.elements.map(sanitizeElement),
  };
}

function createStarterSlides(): MikroSlideRecord[] {
  const titleSlide = createBlankSlide({
    title: "MikroSlides",
    layout: "title",
    elements: [
      createShapeElement({
        x: 10,
        y: 15,
        width: 9,
        height: 66,
        fill: defaultDeckTheme.accent,
        stroke: defaultDeckTheme.accent,
        radius: 3,
      }),
      createTextElement({
        content: "MikroSlides",
        x: 23,
        y: 23,
        width: 58,
        height: 16,
        fontSize: 50,
        fontWeight: 760,
      }),
      createTextElement({
        content: "Local-first decks with focused controls and clean PDF export.",
        x: 24,
        y: 45,
        width: 52,
        height: 16,
        fontSize: 22,
        color: "#64748b",
        fontWeight: 440,
      }),
    ],
  });

  const storySlide = createBlankSlide({
    title: "Tell the story",
    layout: "bullets",
    elements: [
      createTextElement({
        content: "Tell the story",
        x: 10,
        y: 10,
        width: 72,
        height: 12,
        fontSize: 38,
        fontWeight: 720,
      }),
      createTextElement({
        content: "One idea per slide\nSimple layouts\nPresenter notes when you need them",
        x: 13,
        y: 32,
        width: 50,
        height: 32,
        fontSize: 25,
        fontWeight: 440,
        listStyle: "bullet",
      }),
      createShapeElement({
        x: 70,
        y: 30,
        width: 18,
        height: 18,
        shape: "ellipse",
        fill: "#d1fae5",
        stroke: "#10b981",
      }),
      createShapeElement({
        x: 66,
        y: 52,
        width: 24,
        height: 14,
        fill: "#fef3c7",
        stroke: "#d97706",
      }),
    ],
  });

  const closeSlide = createBlankSlide({
    title: "Ship it",
    layout: "closing",
    elements: [
      createTextElement({
        content: "Ship it",
        x: 11,
        y: 18,
        width: 54,
        height: 18,
        fontSize: 48,
        fontWeight: 760,
      }),
      createTextElement({
        content: "Export JSON for local files.\nExport PDF for sharing.",
        x: 12,
        y: 43,
        width: 45,
        height: 22,
        fontSize: 24,
        color: "#64748b",
        fontWeight: 440,
      }),
      createShapeElement({
        x: 65,
        y: 19,
        width: 23,
        height: 45,
        fill: "#e0f2fe",
        stroke: defaultDeckTheme.accent,
        radius: 5,
      }),
    ],
  });

  return [titleSlide, storySlide, closeSlide];
}

function duplicateElements(elements: SlideElement[]) {
  return elements.map((element) => ({ ...clone(element), id: createId("el") }));
}

function statsForSlides(slides: MikroSlideRecord[]): DeckStats {
  const words = slides
    .flatMap((slide) => slide.elements)
    .filter((element): element is TextSlideElement => element.kind === "text")
    .flatMap((element) => element.content.trim().split(/\s+/).filter(Boolean));

  return {
    slideCount: slides.length,
    elementCount: slides.reduce((count, slide) => count + slide.elements.length, 0),
    wordCount: words.length,
  };
}

/**
 * @description Domain entity for a local-first presentation deck using HTML-safe slide geometry.
 */
export class MikroDeck {
  private readonly record: MikroDeckRecord;

  private constructor(record: MikroDeckRecord) {
    this.record = clone(record);
  }

  static create(input: CreateDeckInput = {}) {
    const now = nowIso();
    const slides =
      input.slides && input.slides.length > 0
        ? input.slides.map(sanitizeSlide)
        : createStarterSlides();
    const activeSlideId = slides[0]?.id ?? createBlankSlide().id;

    return new MikroDeck({
      id: createId("deck"),
      title: cleanText(input.title ?? "", "Untitled Deck"),
      slides,
      fonts: normalizeFonts(input.fonts),
      activeSlideId,
      aspectRatio: normalizeAspectRatio(input.aspectRatio),
      theme: normalizeTheme(input.theme),
      createdAt: now,
      updatedAt: now,
      lastSavedAt: null,
      version: 1,
      snapshots: [],
    });
  }

  static fromRecord(record: MikroDeckRecord) {
    const slides =
      record.slides.length > 0 ? record.slides.map(sanitizeSlide) : [createBlankSlide()];
    const activeSlideId = slides.some((slide) => slide.id === record.activeSlideId)
      ? record.activeSlideId
      : slides[0].id;

    return new MikroDeck({
      ...record,
      title: cleanText(record.title, "Untitled Deck"),
      slides,
      fonts: normalizeFonts(record.fonts),
      activeSlideId,
      aspectRatio: normalizeAspectRatio(record.aspectRatio),
      theme: normalizeTheme(record.theme),
      snapshots: normalizeSnapshots(record.snapshots),
    });
  }

  toRecord(): MikroDeckRecord {
    return clone(this.record);
  }

  stats() {
    return statsForSlides(this.record.slides);
  }

  update(input: UpdateDeckInput = {}) {
    const now = nowIso();
    const next = this.toRecord();

    if (typeof input.title === "string") {
      next.title = cleanText(input.title, "Untitled Deck");
    }

    if (input.slides) {
      next.slides =
        input.slides.length > 0 ? input.slides.map(sanitizeSlide) : [createBlankSlide()];
    }

    if (input.fonts) {
      next.fonts = normalizeFonts(input.fonts);
    }

    if (input.activeSlideId && next.slides.some((slide) => slide.id === input.activeSlideId)) {
      next.activeSlideId = input.activeSlideId;
    }

    if (input.aspectRatio) {
      next.aspectRatio = normalizeAspectRatio(input.aspectRatio);
    }

    if (input.theme) {
      next.theme = normalizeTheme(input.theme);
    }

    if (!next.slides.some((slide) => slide.id === next.activeSlideId)) {
      next.activeSlideId = next.slides[0].id;
    }

    next.updatedAt = now;
    next.version += 1;

    if (input.saveSnapshot) {
      next.lastSavedAt = now;
      next.snapshots = MikroDeck.appendSnapshot(
        next.snapshots,
        next.id,
        next.title,
        next.slides,
        next.fonts,
        next.activeSlideId,
        next.aspectRatio,
        next.theme,
        input.snapshotReason ?? "manual",
        now,
      );
    }

    return new MikroDeck(next);
  }

  setActiveSlide(slideId: string) {
    return this.update({ activeSlideId: slideId });
  }

  addSlide(afterSlideId = this.record.activeSlideId) {
    const slides = this.record.slides.slice();
    const index = slides.findIndex((slide) => slide.id === afterSlideId);
    const title = `Slide ${slides.length + 1}`;
    const slide = createBlankSlide({
      title,
      background: this.record.theme.background,
      elements: [
        createTextElement({
          content: title,
          x: 12,
          y: 16,
          width: 62,
          height: 16,
          color: this.record.theme.text,
          fontSize: 42,
          fontWeight: 720,
        }),
      ],
    });
    slides.splice(index >= 0 ? index + 1 : slides.length, 0, slide);
    return this.update({ slides, activeSlideId: slide.id });
  }

  duplicateSlide(slideId = this.record.activeSlideId) {
    const slides = this.record.slides.slice();
    const index = slides.findIndex((slide) => slide.id === slideId);
    const source = slides[index];
    if (!source) {
      return this;
    }

    const slide: MikroSlideRecord = {
      ...clone(source),
      id: createId("slide"),
      title: `${source.title} copy`,
      elements: duplicateElements(source.elements),
    };

    slides.splice(index + 1, 0, slide);
    return this.update({ slides, activeSlideId: slide.id });
  }

  removeSlide(slideId = this.record.activeSlideId) {
    if (this.record.slides.length === 1) {
      const slide = createBlankSlide();
      return this.update({ slides: [slide], activeSlideId: slide.id });
    }

    const index = this.record.slides.findIndex((slide) => slide.id === slideId);
    const slides = this.record.slides.filter((slide) => slide.id !== slideId);
    const activeSlideId = slides[Math.max(0, Math.min(index, slides.length - 1))].id;
    return this.update({ slides, activeSlideId });
  }

  moveSlide(slideId: string, direction: -1 | 1) {
    const slides = this.record.slides.slice();
    const index = slides.findIndex((slide) => slide.id === slideId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= slides.length) {
      return this;
    }

    const [slide] = slides.splice(index, 1);
    slides.splice(nextIndex, 0, slide);
    return this.update({ slides });
  }

  updateSlide(slideId: string, patch: Partial<MikroSlideRecord>) {
    const slides = this.record.slides.map((slide) =>
      slide.id === slideId
        ? sanitizeSlide(
            {
              ...slide,
              ...patch,
              elements: patch.elements ?? slide.elements,
            },
            0,
          )
        : slide,
    );
    return this.update({ slides });
  }

  addElement(slideId: string, element: SlideElement) {
    const slides = this.record.slides.map((slide) =>
      slide.id === slideId
        ? {
            ...slide,
            elements: [...slide.elements, sanitizeElement(element)],
          }
        : slide,
    );
    return this.update({ slides, activeSlideId: slideId });
  }

  updateElement(slideId: string, elementId: string, patch: Partial<SlideElement>) {
    const slides = this.record.slides.map((slide) =>
      slide.id === slideId
        ? {
            ...slide,
            elements: slide.elements.map((element) =>
              element.id === elementId
                ? sanitizeElement({ ...element, ...patch } as SlideElement)
                : element,
            ),
          }
        : slide,
    );
    return this.update({ slides });
  }

  removeElement(slideId: string, elementId: string) {
    const slides = this.record.slides.map((slide) =>
      slide.id === slideId
        ? {
            ...slide,
            elements: slide.elements.filter((element) => element.id !== elementId),
          }
        : slide,
    );
    return this.update({ slides });
  }

  private static appendSnapshot(
    snapshots: MikroDeckSnapshot[],
    deckId: string,
    title: string,
    slides: MikroSlideRecord[],
    fonts: MikroFontRecord[],
    activeSlideId: string,
    aspectRatio: DeckAspectRatio,
    theme: DeckTheme,
    reason: MikroDeckSnapshot["reason"],
    createdAt: string,
  ) {
    return [
      {
        id: createId("snap"),
        deckId,
        title,
        slides: clone(slides),
        fonts: clone(fonts),
        activeSlideId,
        aspectRatio,
        theme: clone(theme),
        createdAt,
        reason,
      },
      ...snapshots,
    ].slice(0, maxSnapshots);
  }
}
