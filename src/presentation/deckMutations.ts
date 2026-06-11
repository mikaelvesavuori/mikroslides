import {
  createImageElement,
  createShapeElement,
  createTextElement,
  MikroDeck,
  type MikroDeckRecord,
  type MikroFontRecord,
  type MikroSlideRecord,
  type SlideElement,
  type SlideShapeKind,
  type TextFontFamily,
  type TextSlideElement,
} from "../index.js";
import { createId } from "../shared/index.js";
import { reorderSlides, type SlideDropPlacement } from "./slideReorder.js";

export type ElementGeometryPatch = Partial<Pick<SlideElement, "height" | "width" | "x" | "y">>;
export type ElementPatch = Partial<SlideElement>;
export type ElementGeometryUpdate = {
  id: string;
  patch: ElementPatch;
};
export type LayerAction = "front" | "forward" | "backward" | "back";
export type ObjectAlignment = "bottom" | "center" | "left" | "middle" | "right" | "top";
type DeckRecordPatch = Partial<
  Pick<MikroDeckRecord, "activeSlideId" | "aspectRatio" | "fonts" | "slides" | "theme" | "title">
>;

export function activeSlideForDeck(deck: MikroDeckRecord | null) {
  if (!deck) {
    return null;
  }

  return deck.slides.find((slide) => slide.id === deck.activeSlideId) ?? null;
}

export function selectedElementsForDeck(
  deck: MikroDeckRecord | null,
  selectedElementIds: string[],
) {
  const slide = activeSlideForDeck(deck);
  if (!slide) {
    return [];
  }

  return selectedElementIds
    .map((id) => slide.elements.find((element) => element.id === id))
    .filter((element): element is SlideElement => Boolean(element));
}

export function updateDeckRecord(deck: MikroDeckRecord, patch: DeckRecordPatch) {
  return MikroDeck.fromRecord(deck).update(patch).toRecord();
}

export function addSlideToDeck(deck: MikroDeckRecord) {
  return MikroDeck.fromRecord(deck).addSlide().toRecord();
}

export function duplicateActiveSlide(deck: MikroDeckRecord) {
  return MikroDeck.fromRecord(deck).duplicateSlide().toRecord();
}

export function pasteSlidesAfterActiveSlide(
  deck: MikroDeckRecord,
  slidesToPaste: MikroSlideRecord[],
  createSlideId = () => createId("slide"),
  createElementId = () => createId("el"),
) {
  if (slidesToPaste.length === 0) {
    return null;
  }

  const activeIndex = deck.slides.findIndex((slide) => slide.id === deck.activeSlideId);
  const insertIndex = activeIndex >= 0 ? activeIndex + 1 : deck.slides.length;
  const pastedSlides = slidesToPaste.map((slide) =>
    cloneSlideForDeck(slide, createSlideId, createElementId),
  );
  const slides = [
    ...deck.slides.slice(0, insertIndex),
    ...pastedSlides,
    ...deck.slides.slice(insertIndex),
  ];

  return {
    deck: MikroDeck.fromRecord(deck)
      .update({ slides, activeSlideId: pastedSlides[0].id })
      .toRecord(),
    selectedElementIds: [],
  };
}

export function moveActiveSlide(deck: MikroDeckRecord, direction: -1 | 1) {
  return MikroDeck.fromRecord(deck).moveSlide(deck.activeSlideId, direction).toRecord();
}

export function removeActiveSlide(deck: MikroDeckRecord) {
  return MikroDeck.fromRecord(deck).removeSlide().toRecord();
}

export function setActiveSlide(deck: MikroDeckRecord, slideId: string) {
  return MikroDeck.fromRecord(deck).setActiveSlide(slideId).toRecord();
}

export function toggleSlideSkipped(deck: MikroDeckRecord, slideId: string) {
  const slide = deck.slides.find((item) => item.id === slideId);
  if (!slide) {
    return null;
  }

  return MikroDeck.fromRecord(deck).updateSlide(slideId, { skipped: !slide.skipped }).toRecord();
}

export function reorderDeckSlides(
  deck: MikroDeckRecord,
  draggedSlideId: string,
  targetSlideId: string,
  placement: SlideDropPlacement,
) {
  const reordered = reorderSlides(deck.slides, draggedSlideId, targetSlideId, placement);
  if (!reordered.changed) {
    return null;
  }

  return MikroDeck.fromRecord(deck)
    .update({ slides: reordered.slides, activeSlideId: draggedSlideId })
    .toRecord();
}

export function addDefaultTextElement(deck: MikroDeckRecord) {
  const slide = activeSlideForDeck(deck);
  if (!slide) {
    return null;
  }

  const element = createTextElement({
    content: "New text",
    x: 16,
    y: 18 + slide.elements.length * 4,
    width: 46,
    height: 14,
  });
  return addElementToActiveSlide(deck, element);
}

export function addDefaultShapeElement(deck: MikroDeckRecord, shape: SlideShapeKind = "rect") {
  const element = createShapeElement({
    x: 50,
    y: 36,
    width: 26,
    height: 20,
    shape,
  });
  return addElementToActiveSlide(deck, element);
}

export function addImageElementToActiveSlide(
  deck: MikroDeckRecord,
  src: string,
  alt: string,
  geometry: ElementGeometryPatch = {},
) {
  const element = createImageElement({
    src,
    alt,
    x: geometry.x ?? 48,
    y: geometry.y ?? 20,
    width: geometry.width ?? 38,
    height: geometry.height ?? 44,
  });
  return addElementToActiveSlide(deck, element);
}

export function addElementToActiveSlide(deck: MikroDeckRecord, element: SlideElement) {
  const slide = activeSlideForDeck(deck);
  if (!slide) {
    return null;
  }

  return {
    deck: MikroDeck.fromRecord(deck).addElement(slide.id, element).toRecord(),
    selectedElementIds: [element.id],
  };
}

export function deleteElementsFromActiveSlide(deck: MikroDeckRecord, selectedElementIds: string[]) {
  const slide = activeSlideForDeck(deck);
  if (!slide || selectedElementIds.length === 0) {
    return null;
  }

  const selected = new Set(selectedElementIds);
  const slides = deck.slides.map((item) =>
    item.id === slide.id
      ? { ...item, elements: item.elements.filter((element) => !selected.has(element.id)) }
      : item,
  );

  return {
    deck: MikroDeck.fromRecord(deck).update({ slides }).toRecord(),
    selectedElementIds: [],
  };
}

export function duplicateElementsInActiveSlide(
  deck: MikroDeckRecord,
  selectedElementIds: string[],
  createElementId = () => createId("el"),
) {
  const slide = activeSlideForDeck(deck);
  const elements = selectedElementsForDeck(deck, selectedElementIds);
  if (!slide || elements.length === 0) {
    return null;
  }

  const duplicates = elements.map((element) =>
    cloneElementForDeck(element, {
      createElementId,
      offset: 4,
    }),
  );

  return insertElements(deck, slide, duplicates);
}

export function duplicateElementsInPlaceInActiveSlide(
  deck: MikroDeckRecord,
  selectedElementIds: string[],
  createElementId = () => createId("el"),
) {
  const slide = activeSlideForDeck(deck);
  const elements = selectedElementsForDeck(deck, selectedElementIds);
  if (!slide || elements.length === 0) {
    return null;
  }

  const duplicates = elements.map((element) =>
    cloneElementForDeck(element, {
      createElementId,
      offset: 0,
    }),
  );

  return insertElements(deck, slide, duplicates);
}

export function pasteElementsIntoActiveSlide(
  deck: MikroDeckRecord,
  clipboardElements: SlideElement[],
  createElementId = () => createId("el"),
) {
  const slide = activeSlideForDeck(deck);
  if (!slide || clipboardElements.length === 0) {
    return null;
  }

  const pasted = clipboardElements.map((element) =>
    cloneElementForDeck(element, {
      createElementId,
      maxPosition: 96,
      offset: 5,
    }),
  );

  return insertElements(deck, slide, pasted);
}

export function applyTemplateToActiveSlide(deck: MikroDeckRecord, templateSlide: MikroSlideRecord) {
  const slide = activeSlideForDeck(deck);
  if (!slide) {
    return null;
  }
  const elements = mergeTemplateElementsWithSlideContent(slide.elements, templateSlide.elements);

  return MikroDeck.fromRecord(deck)
    .updateSlide(slide.id, {
      title: templateSlide.title,
      layout: templateSlide.layout,
      background: templateSlide.background,
      transition: templateSlide.transition,
      elements,
    })
    .toRecord();
}

function mergeTemplateElementsWithSlideContent(
  currentElements: SlideElement[],
  templateElements: SlideElement[],
) {
  const textSources = currentElements.filter(isTextBearingElement).filter((element) =>
    element.content.trim(),
  );
  const imageSources = currentElements.filter(
    (element): element is Extract<SlideElement, { kind: "image" }> =>
      element.kind === "image" && Boolean(element.src.trim()),
  );
  const consumed = new Set<string>();
  let textIndex = 0;
  let imageIndex = 0;

  const merged = templateElements.map((element) => {
    if (isTextBearingElement(element)) {
      const source = textSources[textIndex];
      textIndex += 1;
      if (source) {
        consumed.add(source.id);
        return {
          ...element,
          content: source.content,
          listStyle: source.listStyle,
        } as SlideElement;
      }
    }

    if (element.kind === "image") {
      const source = imageSources[imageIndex];
      imageIndex += 1;
      if (source) {
        consumed.add(source.id);
        return {
          ...element,
          alt: source.alt,
          fit: source.fit,
          src: source.src,
        } as SlideElement;
      }
    }

    return element;
  });

  return [
    ...merged,
    ...currentElements
      .filter((element) => !consumed.has(element.id) && shouldCarryElementAcrossLayout(element))
      .map((element) => structuredClone(element) as SlideElement),
  ];
}

function isTextBearingElement(
  element: SlideElement,
): element is Extract<SlideElement, { kind: "shape" | "text" }> {
  return element.kind === "text" || element.kind === "shape";
}

function shouldCarryElementAcrossLayout(element: SlideElement) {
  if (isTextBearingElement(element)) {
    return Boolean(element.content.trim());
  }

  return element.kind === "image" && Boolean(element.src.trim());
}

export function addFontToDeckRecord(deck: MikroDeckRecord, font: MikroFontRecord) {
  return MikroDeck.fromRecord(deck)
    .update({ fonts: [...deck.fonts.filter((item) => item.id !== font.id), font] })
    .toRecord();
}

export function applyFontToSelectedText(
  deck: MikroDeckRecord,
  selectedElementIds: string[],
  fontFamily: TextFontFamily,
) {
  const slide = activeSlideForDeck(deck);
  const selectedTextIds = selectedElementsForDeck(deck, selectedElementIds)
    .filter((element): element is TextSlideElement => element.kind === "text")
    .map((element) => element.id);
  if (!slide || selectedTextIds.length === 0) {
    return null;
  }

  const selected = new Set(selectedTextIds);
  const slides = deck.slides.map((item) =>
    item.id === slide.id
      ? {
          ...item,
          elements: item.elements.map((element) =>
            element.kind === "text" && selected.has(element.id)
              ? { ...element, fontFamily }
              : element,
          ),
        }
      : item,
  );

  return MikroDeck.fromRecord(deck).update({ slides }).toRecord();
}

export function removeFontFromDeck(deck: MikroDeckRecord, fontId: string) {
  const font = deck.fonts.find((item) => item.id === fontId);
  if (!font) {
    return null;
  }

  const token = `font:${fontId}`;
  const slides = deck.slides.map((slide) => ({
    ...slide,
    elements: slide.elements.map((element) =>
      element.kind === "text" && element.fontFamily === token
        ? { ...element, fontFamily: "system" as const }
        : element,
    ),
  }));

  return {
    deck: MikroDeck.fromRecord(deck)
      .update({
        fonts: deck.fonts.filter((item) => item.id !== fontId),
        slides,
      })
      .toRecord(),
    font,
  };
}

export function updateActiveSlide(deck: MikroDeckRecord, patch: Partial<MikroSlideRecord>) {
  const slide = activeSlideForDeck(deck);
  if (!slide) {
    return null;
  }

  return MikroDeck.fromRecord(deck).updateSlide(slide.id, patch).toRecord();
}

export function updateElementsInActiveSlide(
  deck: MikroDeckRecord,
  updates: ElementGeometryUpdate[],
) {
  const slide = activeSlideForDeck(deck);
  if (!slide || updates.length === 0) {
    return null;
  }

  const patches = new Map(updates.map((update) => [update.id, update.patch]));
  const slides = deck.slides.map((item) =>
    item.id === slide.id
      ? {
          ...item,
          elements: item.elements.map((element) => ({
            ...element,
            ...(patches.get(element.id) ?? {}),
          })) as SlideElement[],
        }
      : item,
  );

  return MikroDeck.fromRecord(deck).update({ slides }).toRecord();
}

export function alignElementsInActiveSlide(
  deck: MikroDeckRecord,
  selectedElementIds: string[],
  alignment: ObjectAlignment,
) {
  const selectedElements = selectedElementsForDeck(deck, selectedElementIds);
  if (selectedElements.length === 0) {
    return null;
  }

  const target = selectedElements.length === 1 ? slideBounds() : selectionBounds(selectedElements);
  const updates = selectedElements
    .map((element) => {
      const patch = alignmentPatch(element, target, alignment);
      return { id: element.id, patch };
    })
    .filter((update) => Object.keys(update.patch).length > 0);

  if (updates.length === 0) {
    return null;
  }

  return updateElementsInActiveSlide(deck, updates);
}

export function reorderSelectedElementsInActiveSlide(
  deck: MikroDeckRecord,
  selectedElementIds: string[],
  action: LayerAction,
) {
  const slide = activeSlideForDeck(deck);
  if (!slide || selectedElementIds.length === 0) {
    return null;
  }

  const selected = new Set(selectedElementIds);
  let elements = slide.elements.slice();

  if (action === "front") {
    elements = [
      ...elements.filter((element) => !selected.has(element.id)),
      ...elements.filter((element) => selected.has(element.id)),
    ];
  }

  if (action === "back") {
    elements = [
      ...elements.filter((element) => selected.has(element.id)),
      ...elements.filter((element) => !selected.has(element.id)),
    ];
  }

  if (action === "forward") {
    for (let index = elements.length - 2; index >= 0; index -= 1) {
      if (selected.has(elements[index].id) && !selected.has(elements[index + 1].id)) {
        [elements[index], elements[index + 1]] = [elements[index + 1], elements[index]];
      }
    }
  }

  if (action === "backward") {
    for (let index = 1; index < elements.length; index += 1) {
      if (selected.has(elements[index].id) && !selected.has(elements[index - 1].id)) {
        [elements[index], elements[index - 1]] = [elements[index - 1], elements[index]];
      }
    }
  }

  return updateActiveSlide(deck, { elements });
}

function slideBounds() {
  return {
    bottom: 100,
    centerX: 50,
    centerY: 50,
    left: 0,
    right: 100,
    top: 0,
  };
}

function selectionBounds(elements: SlideElement[]) {
  const left = Math.min(...elements.map((element) => element.x));
  const top = Math.min(...elements.map((element) => element.y));
  const right = Math.max(...elements.map((element) => element.x + element.width));
  const bottom = Math.max(...elements.map((element) => element.y + element.height));
  return {
    bottom,
    centerX: left + (right - left) / 2,
    centerY: top + (bottom - top) / 2,
    left,
    right,
    top,
  };
}

function alignmentPatch(
  element: SlideElement,
  target: ReturnType<typeof slideBounds>,
  alignment: ObjectAlignment,
): Partial<SlideElement> {
  if (alignment === "left") {
    return element.x === target.left ? {} : { x: target.left };
  }
  if (alignment === "center") {
    const x = target.centerX - element.width / 2;
    return element.x === x ? {} : { x };
  }
  if (alignment === "right") {
    const x = target.right - element.width;
    return element.x === x ? {} : { x };
  }
  if (alignment === "top") {
    return element.y === target.top ? {} : { y: target.top };
  }
  if (alignment === "middle") {
    const y = target.centerY - element.height / 2;
    return element.y === y ? {} : { y };
  }

  const y = target.bottom - element.height;
  return element.y === y ? {} : { y };
}

function insertElements(deck: MikroDeckRecord, slide: MikroSlideRecord, elements: SlideElement[]) {
  const slides = deck.slides.map((item) =>
    item.id === slide.id ? { ...item, elements: [...item.elements, ...elements] } : item,
  );

  return {
    deck: MikroDeck.fromRecord(deck).update({ slides }).toRecord(),
    selectedElementIds: elements.map((element) => element.id),
  };
}

function cloneElementForDeck(
  element: SlideElement,
  options: {
    createElementId: () => string;
    maxPosition?: number;
    offset: number;
  },
) {
  return {
    ...structuredClone(element),
    id: options.createElementId(),
    x:
      typeof options.maxPosition === "number"
        ? Math.min(element.x + options.offset, options.maxPosition)
        : element.x + options.offset,
    y:
      typeof options.maxPosition === "number"
        ? Math.min(element.y + options.offset, options.maxPosition)
        : element.y + options.offset,
  } as SlideElement;
}

function cloneSlideForDeck(
  slide: MikroSlideRecord,
  createSlideId: () => string,
  createElementId: () => string,
): MikroSlideRecord {
  return {
    ...structuredClone(slide),
    id: createSlideId(),
    title: `${slide.title} copy`,
    elements: slide.elements.map((element) => ({
      ...structuredClone(element),
      id: createElementId(),
    })) as SlideElement[],
  };
}
