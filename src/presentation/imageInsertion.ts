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
