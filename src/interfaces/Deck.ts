export type MikroDeckId = string;
export type MikroSlideId = string;
export type MikroSlideElementId = string;

export type DeckAspectRatio = "16:9" | "4:3" | "1:1";
export type SlideLayoutKind =
  | "blank"
  | "title"
  | "section"
  | "statement"
  | "bullets"
  | "two-column"
  | "image-left"
  | "image-right"
  | "quote"
  | "comparison"
  | "timeline"
  | "chart-data"
  | "closing";
export type SlideTransition = "none" | "fade" | "slide";
export type SlideElementKind = "text" | "shape" | "image";
export type SlideShapeKind = "rect" | "ellipse" | "line";
export type TextAlignment = "left" | "center" | "right";
export type ImageFit = "cover" | "contain";

export interface DeckTheme {
  id: string;
  name: string;
  accent: string;
  background: string;
  muted: string;
  surface: string;
  text: string;
  fontHeading: "system-sans" | "system-serif" | "system-mono";
  fontBody: "system-sans" | "system-serif" | "system-mono";
  fontMono: "system-sans" | "system-serif" | "system-mono";
}

export interface SlideElementBase {
  id: MikroSlideElementId;
  kind: SlideElementKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
}

export interface TextSlideElement extends SlideElementBase {
  kind: "text";
  content: string;
  color: string;
  fontFamily: "system" | "serif" | "mono";
  fontSize: number;
  fontWeight: number;
  italic: boolean;
  align: TextAlignment;
}

export interface ShapeSlideElement extends SlideElementBase {
  kind: "shape";
  shape: SlideShapeKind;
  fill: string;
  stroke: string;
  strokeWidth: number;
  radius: number;
}

export interface ImageSlideElement extends SlideElementBase {
  kind: "image";
  src: string;
  alt: string;
  fit: ImageFit;
}

export type SlideElement = TextSlideElement | ShapeSlideElement | ImageSlideElement;

export interface MikroSlideRecord {
  id: MikroSlideId;
  title: string;
  layout: SlideLayoutKind;
  background: string;
  speakerNotes: string;
  transition: SlideTransition;
  elements: SlideElement[];
}

export interface MikroDeckSnapshot {
  id: string;
  deckId: MikroDeckId;
  title: string;
  slides: MikroSlideRecord[];
  activeSlideId: MikroSlideId;
  aspectRatio: DeckAspectRatio;
  theme: DeckTheme;
  createdAt: string;
  reason: "manual" | "autosave" | "import";
}

export interface MikroDeckRecord {
  id: MikroDeckId;
  title: string;
  slides: MikroSlideRecord[];
  activeSlideId: MikroSlideId;
  aspectRatio: DeckAspectRatio;
  theme: DeckTheme;
  createdAt: string;
  updatedAt: string;
  lastSavedAt: string | null;
  version: number;
  snapshots: MikroDeckSnapshot[];
}

export interface CreateDeckInput {
  title?: string;
  slides?: MikroSlideRecord[];
  aspectRatio?: DeckAspectRatio;
  theme?: DeckTheme;
}

export interface UpdateDeckInput {
  title?: string;
  slides?: MikroSlideRecord[];
  activeSlideId?: MikroSlideId;
  aspectRatio?: DeckAspectRatio;
  theme?: DeckTheme;
  saveSnapshot?: boolean;
  snapshotReason?: MikroDeckSnapshot["reason"];
}

export interface DeckStats {
  slideCount: number;
  elementCount: number;
  wordCount: number;
}

export interface MikroDeckExport {
  schema: "mikroslides.deck";
  version: 1;
  exportedAt: string;
  deck: MikroDeckRecord;
}

export interface MikroPortableDeckExport {
  schema: "mikroslides.portable";
  version: 1;
  exportedAt: string;
  deck: MikroDeckRecord;
  assets: MikroPortableAsset[];
}

export interface MikroPortableAsset {
  id: string;
  slideId: MikroSlideId;
  elementId: MikroSlideElementId;
  kind: "image";
  mediaType: string;
  dataUrl: string;
  originalSrc: string;
}

export interface PortableAssetInput {
  slideId: MikroSlideId;
  elementId: MikroSlideElementId;
  kind: "image";
  mediaType: string;
  dataUrl: string;
  originalSrc: string;
}

export interface StorageMetadata {
  schemaVersion: number;
  migratedAt: string;
}
