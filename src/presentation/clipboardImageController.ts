import type { MikroDeckRecord, MikroSlideRecord, SlideElement } from "../index.js";
import { addImageElementToActiveSlide, pasteElementsIntoActiveSlide } from "./deckMutations.js";
import { imageDialogSource, pasteActionFromEvent, pastedImageGeometry } from "./imageInsertion.js";

type ImageDialogElements = {
  imageDialog: HTMLDialogElement;
  imageFileInput: HTMLInputElement;
  imageUrlInput: HTMLInputElement;
};

type RenderOptions = {
  history?: boolean;
  inspector?: boolean;
  library?: boolean;
};

export type ClipboardImageControllerOptions = {
  commitDeckMutation: (
    result: MikroDeckRecord | { deck: MikroDeckRecord; selectedElementIds?: string[] } | null,
    options?: RenderOptions,
  ) => boolean;
  createDeckFromOutlineText: (markdown: string) => Promise<void>;
  createStoredImageAsset: (blob: Blob, originalName: string) => Promise<string>;
  deleteSelectedElement: () => void;
  elements: ImageDialogElements;
  formatError: (error: unknown, fallback: string) => string;
  getDeck: () => MikroDeckRecord | null;
  getSelectedElements: () => SlideElement[];
  getSlide: () => MikroSlideRecord | null;
  looksLikeOutline: (text: string) => boolean;
  showToast: (message: string) => void;
};

export function createClipboardImageController(options: ClipboardImageControllerOptions) {
  let clipboardElements: SlideElement[] = [];

  function addImageToSlide(
    src: string,
    alt: string,
    geometry: Partial<Pick<SlideElement, "height" | "width" | "x" | "y">> = {},
  ) {
    const deck = options.getDeck();
    if (!deck) {
      return;
    }

    options.commitDeckMutation(addImageElementToActiveSlide(deck, src, alt, geometry));
  }

  return {
    addImageToSlide,
    copySelectedElements() {
      const selected = options.getSelectedElements();
      if (selected.length === 0) {
        return;
      }

      clipboardElements = selected.map((element) => structuredClone(element));
      options.showToast(
        `${clipboardElements.length} object${clipboardElements.length === 1 ? "" : "s"} copied`,
      );
    },
    cutSelectedElements() {
      if (options.getSelectedElements().length === 0) {
        return;
      }

      this.copySelectedElements();
      options.deleteSelectedElement();
    },
    async handlePaste(event: ClipboardEvent) {
      const action = pasteActionFromEvent(event, {
        hasClipboardElements: clipboardElements.length > 0,
        looksLikeOutline: options.looksLikeOutline,
      });
      if (action.kind === "ignore") {
        return;
      }

      if (action.kind === "outline") {
        event.preventDefault();
        await options.createDeckFromOutlineText(action.text);
        return;
      }

      if (action.kind === "paste-elements") {
        event.preventDefault();
        this.pasteElements();
        return;
      }

      const slide = options.getSlide();
      if (!options.getDeck() || !slide) {
        return;
      }

      event.preventDefault();
      let src = "";
      try {
        src = await options.createStoredImageAsset(action.file, action.alt);
      } catch (error) {
        options.showToast(options.formatError(error, "Could not store pasted image"));
        return;
      }
      addImageToSlide(src, action.alt, pastedImageGeometry);
      options.showToast("Image pasted");
    },
    hasClipboard() {
      return clipboardElements.length > 0;
    },
    async insertImageFromDialog() {
      const slide = options.getSlide();
      if (!options.getDeck() || !slide) {
        return;
      }

      const source = imageDialogSource(
        options.elements.imageFileInput.files?.[0] ?? null,
        options.elements.imageUrlInput.value,
      );
      if (source.kind === "missing") {
        options.showToast("Choose an image file or URL");
        return;
      }

      let src = source.kind === "url" ? source.src : "";
      const alt = source.kind === "file" ? source.file.name : "";
      if (source.kind === "file") {
        try {
          src = await options.createStoredImageAsset(source.file, source.file.name);
        } catch (error) {
          options.showToast(options.formatError(error, "Could not store image"));
          return;
        }
      }

      addImageToSlide(src, alt);
      options.elements.imageUrlInput.value = "";
      options.elements.imageFileInput.value = "";
      options.elements.imageDialog.close();
    },
    pasteElements() {
      const deck = options.getDeck();
      if (!deck || clipboardElements.length === 0) {
        return;
      }

      options.commitDeckMutation(pasteElementsIntoActiveSlide(deck, clipboardElements));
    },
  };
}
