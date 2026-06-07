import type { MikroDeckRecord } from "../index.js";

export function presenterStartIndex(deck: MikroDeckRecord) {
  return presenterIndexForDeck(
    deck,
    deck.slides.findIndex((slide) => slide.id === deck.activeSlideId),
  );
}

export function nextPresenterIndex(deck: MikroDeckRecord, index: number, direction: -1 | 1) {
  const indexes = presentableSlideIndexes(deck);
  if (indexes.length === 0) {
    return 0;
  }

  const safeIndex = presenterIndexForDeck(deck, index);
  const currentVisibleIndex = indexes.indexOf(safeIndex);
  if (currentVisibleIndex >= 0) {
    return indexes[Math.max(0, Math.min(currentVisibleIndex + direction, indexes.length - 1))];
  }

  const nextIndex =
    direction > 0
      ? indexes.find((slideIndex) => slideIndex > index)
      : indexes.findLast((slideIndex) => slideIndex < index);
  return nextIndex ?? indexes[direction > 0 ? indexes.length - 1 : 0];
}

export function presenterMetaText(deck: MikroDeckRecord, index: number) {
  const indexes = presentableSlideIndexes(deck);
  if (indexes.length === 0) {
    return "0 / 0";
  }

  const safeIndex = presenterIndexForDeck(deck, index);
  const position = indexes.indexOf(safeIndex) + 1;
  return position > 0 ? `${position} / ${indexes.length}` : "0 / 0";
}

export function presenterIndexForDeck(deck: MikroDeckRecord, index: number) {
  const indexes = presentableSlideIndexes(deck);
  if (indexes.length === 0) {
    return 0;
  }

  const safeIndex = clampPresenterIndex(index, deck.slides.length);
  if (indexes.includes(safeIndex)) {
    return safeIndex;
  }

  return indexes.find((slideIndex) => slideIndex >= safeIndex) ?? indexes[indexes.length - 1];
}

export function presentableSlideIndexes(deck: MikroDeckRecord) {
  return deck.slides
    .map((slide, index) => (slide.skipped ? null : index))
    .filter((index): index is number => typeof index === "number");
}

export function clampPresenterIndex(index: number, slideCount: number) {
  if (slideCount <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(index, slideCount - 1));
}
