import type { DeckAspectRatio, MikroDeckRecord, TextFontFamily } from "../index.js";
import { escapeAttribute } from "./htmlEscape.js";
import { clampPresenterIndex, presenterMetaText } from "./presenterMode.js";
import { printCssForAspect, printDimensionsForAspect } from "./printSizing.js";
import { renderSlideElements } from "./slideRenderer.js";

type SlideSurfaceRenderOptions = {
  resolveFontStack: (fontFamily: TextFontFamily) => string;
  resolveImageSource: (src: string) => string;
};

export type DeckSurfaceElements = {
  appShell: HTMLElement;
  presenterDialog: HTMLElement;
  printDeck: HTMLElement;
  zoomFitButton: HTMLButtonElement;
};

export type PresenterSurfaceElements = {
  presenterMeta: HTMLElement;
  presenterNextButton: HTMLButtonElement;
  presenterPrevButton: HTMLButtonElement;
  presenterSlide: HTMLElement;
};

export function syncDeckSurfaceChrome(
  elements: DeckSurfaceElements,
  aspectRatio: DeckAspectRatio,
  canvasZoom: number,
) {
  const [width, height] = aspectRatio.split(":").map(Number);
  const ratio = width / height;
  const printSize = printDimensionsForAspect(aspectRatio);
  for (const target of [elements.appShell, elements.presenterDialog, elements.printDeck]) {
    target.style.setProperty("--deck-aspect-ratio", `${width} / ${height}`);
    target.style.setProperty("--deck-ratio", String(ratio));
  }
  elements.appShell.style.setProperty("--canvas-zoom", String(canvasZoom));
  elements.zoomFitButton.textContent = `${Math.round(canvasZoom * 100)}%`;
  elements.printDeck.style.setProperty("--print-width", printSize.width);
  elements.printDeck.style.setProperty("--print-height", printSize.height);
}

export function renderPrintDeckSurface(
  printDeck: HTMLElement,
  deck: MikroDeckRecord | null,
  options: SlideSurfaceRenderOptions,
) {
  printDeck.innerHTML = deck ? renderPrintDeckMarkup(deck, options) : "";
}

export function renderPrintDeckMarkup(deck: MikroDeckRecord, options: SlideSurfaceRenderOptions) {
  return deck.slides
    .map(
      (slide) => `
        <section class="print-slide" style="--slide-bg:${escapeAttribute(slide.background)}">
          ${renderSlideElements(slide, options)}
        </section>
      `,
    )
    .join("");
}

export function renderPresenterSurface(
  elements: PresenterSurfaceElements,
  deck: MikroDeckRecord | null,
  index: number,
  isOpen: boolean,
  options: SlideSurfaceRenderOptions,
) {
  if (!deck || !isOpen) {
    return index;
  }

  const safeIndex = clampPresenterIndex(index, deck.slides.length);
  const slide = deck.slides[safeIndex];
  if (!slide) {
    elements.presenterSlide.innerHTML = "";
    elements.presenterMeta.textContent = "0 / 0";
    elements.presenterPrevButton.disabled = true;
    elements.presenterNextButton.disabled = true;
    return safeIndex;
  }

  elements.presenterSlide.style.setProperty("--slide-bg", slide.background);
  elements.presenterSlide.innerHTML = renderSlideElements(slide, options);
  elements.presenterMeta.textContent = presenterMetaText(deck, safeIndex);
  elements.presenterPrevButton.disabled = safeIndex === 0;
  elements.presenterNextButton.disabled = safeIndex === deck.slides.length - 1;
  return safeIndex;
}

export function syncPrintPageStyle(
  documentRef: Document,
  aspectRatio: DeckAspectRatio,
  styleId = "mikroslides-print-page-style",
) {
  const existing = documentRef.querySelector<HTMLStyleElement>(`#${styleId}`);
  const style = existing ?? documentRef.createElement("style");
  style.id = styleId;
  style.textContent = printCssForAspect(aspectRatio);
  if (!existing) {
    documentRef.head.append(style);
  }
}
