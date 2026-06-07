import type { SlideElement } from "../index.js";
import { isKeyboardInputTarget } from "./keyboardShortcuts.js";

export const pastedImageGeometry: Partial<Pick<SlideElement, "height" | "width" | "x" | "y">> = {
  height: 56,
  width: 50,
  x: 25,
  y: 18,
};

export type ImageDialogSource =
  | { file: File; kind: "file" }
  | { kind: "missing" }
  | { kind: "url"; src: string };

export type PasteAction =
  | { kind: "ignore" }
  | { kind: "image"; alt: string; file: File }
  | { kind: "outline"; text: string }
  | { kind: "paste-elements" };

type ClipboardItemLike = {
  getAsFile: () => File | null;
  type: string;
};

type ClipboardDataLike = {
  getData: (type: string) => string;
  items?: ArrayLike<ClipboardItemLike> | Iterable<ClipboardItemLike>;
};

type DataTransferItemLike = {
  getAsFile?: () => File | null;
  kind?: string;
  type: string;
};

type DataTransferLike = {
  files?: ArrayLike<File> | Iterable<File>;
  items?: ArrayLike<DataTransferItemLike> | Iterable<DataTransferItemLike>;
};

type PasteEventLike = {
  clipboardData?: ClipboardDataLike | null;
  target: EventTarget | null;
};

export function imageDialogSource(file: File | null, urlValue: string): ImageDialogSource {
  if (file) {
    return { file, kind: "file" };
  }

  const src = urlValue.trim();
  return src ? { kind: "url", src } : { kind: "missing" };
}

export function droppedImageFiles(dataTransfer: DataTransferLike | null | undefined) {
  const files = Array.from(dataTransfer?.files ?? []).filter(isImageFile);
  if (files.length > 0) {
    return files;
  }

  return Array.from(dataTransfer?.items ?? [])
    .filter((item) => item.kind === "file")
    .map((item) => item.getAsFile?.() ?? null)
    .filter((file): file is File => Boolean(file && isImageFile(file)));
}

export function hasDroppedImage(dataTransfer: DataTransferLike | null | undefined) {
  if (droppedImageFiles(dataTransfer).length > 0) {
    return true;
  }

  return Array.from(dataTransfer?.items ?? []).some(
    (item) => item.kind === "file" && (item.type === "" || isImageTypeOrName(item.type, "")),
  );
}

export function droppedImageGeometry(
  clientX: number,
  clientY: number,
  rect: Pick<DOMRect, "height" | "left" | "top" | "width">,
  index = 0,
): Partial<Pick<SlideElement, "height" | "width" | "x" | "y">> {
  const width = 38;
  const height = 44;
  const x = ((clientX - rect.left) / Math.max(rect.width, 1)) * 100 - width / 2 + index * 3;
  const y = ((clientY - rect.top) / Math.max(rect.height, 1)) * 100 - height / 2 + index * 3;

  return {
    height,
    width,
    x: clamp(x, 0, 100 - width),
    y: clamp(y, 0, 100 - height),
  };
}

export function pasteActionFromEvent(
  event: PasteEventLike,
  options: {
    hasClipboardElements: boolean;
    looksLikeOutline: (text: string) => boolean;
  },
): PasteAction {
  if (isKeyboardInputTarget(event.target)) {
    return { kind: "ignore" };
  }

  const imageItem = firstImageClipboardItem(event.clipboardData?.items);
  const text = event.clipboardData?.getData("text/plain") ?? "";
  if (!imageItem && text && options.looksLikeOutline(text)) {
    return { kind: "outline", text };
  }

  if (!imageItem) {
    return options.hasClipboardElements ? { kind: "paste-elements" } : { kind: "ignore" };
  }

  const file = imageItem.getAsFile();
  if (!file) {
    return { kind: "ignore" };
  }

  return { alt: file.name || "Clipboard image", file, kind: "image" };
}

function firstImageClipboardItem(
  items: ArrayLike<ClipboardItemLike> | Iterable<ClipboardItemLike> | undefined,
) {
  return Array.from(items ?? []).find((clipboardItem) => clipboardItem.type.startsWith("image/"));
}

function isImageFile(file: File) {
  return isImageTypeOrName(file.type, file.name);
}

function isImageTypeOrName(type: string, name: string) {
  return (
    type.startsWith("image/") ||
    /\.(?:avif|bmp|gif|heic|heif|jpe?g|png|svg|tiff?|webp)$/i.test(name)
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
