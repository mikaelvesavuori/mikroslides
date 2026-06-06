import type { MikroSlideRecord } from "../index.js";

export type SlideDropPlacement = "before" | "after";

export function reorderSlides(
  slides: MikroSlideRecord[],
  draggedSlideId: string,
  targetSlideId: string,
  placement: SlideDropPlacement,
) {
  if (draggedSlideId === targetSlideId) {
    return { slides, changed: false };
  }

  const nextSlides = slides.slice();
  const fromIndex = nextSlides.findIndex((slide) => slide.id === draggedSlideId);
  const targetIndex = nextSlides.findIndex((slide) => slide.id === targetSlideId);
  if (fromIndex < 0 || targetIndex < 0) {
    return { slides, changed: false };
  }

  const [slide] = nextSlides.splice(fromIndex, 1);
  let insertIndex = targetIndex;
  if (fromIndex < targetIndex) {
    insertIndex -= 1;
  }
  if (placement === "after") {
    insertIndex += 1;
  }
  insertIndex = Math.max(0, Math.min(insertIndex, nextSlides.length));
  if (insertIndex === fromIndex) {
    return { slides, changed: false };
  }

  nextSlides.splice(insertIndex, 0, slide);
  return { slides: nextSlides, changed: true };
}
