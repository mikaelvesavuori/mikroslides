import type { MikroDeckRecord } from "../index.js";

export function presenterStartIndex(deck: MikroDeckRecord) {
  return clampPresenterIndex(
    deck.slides.findIndex((slide) => slide.id === deck.activeSlideId),
    deck.slides.length,
  );
}

export function nextPresenterIndex(index: number, direction: -1 | 1, slideCount: number) {
  return clampPresenterIndex(index + direction, slideCount);
}

export function presenterMetaText(deck: MikroDeckRecord, index: number) {
  const safeIndex = clampPresenterIndex(index, deck.slides.length);
  const slide = deck.slides[safeIndex];
  return slide ? `${safeIndex + 1} / ${deck.slides.length} · ${slide.title}` : "0 / 0";
}

export function clampPresenterIndex(index: number, slideCount: number) {
  if (slideCount <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(index, slideCount - 1));
}
