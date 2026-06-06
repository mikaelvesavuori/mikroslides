import type { SlideElement } from "../index.js";

export type MultiSelectEventLike = {
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
};

export function normalizeSelection(ids: string[], availableIds: Iterable<string>) {
  const available = new Set(availableIds);
  return [...new Set(ids.filter((id) => available.has(id)))];
}

export function nextInteractionSelection(
  currentIds: string[],
  elementId: string,
  multiSelect: boolean,
) {
  const isSelected = currentIds.includes(elementId);
  if (multiSelect && isSelected) {
    return currentIds.filter((id) => id !== elementId);
  }

  if (multiSelect) {
    return [elementId, ...currentIds];
  }

  if (isSelected) {
    return [elementId, ...currentIds.filter((id) => id !== elementId)];
  }

  return [elementId];
}

export function selectionForSlide(currentIds: string[], elements: SlideElement[]) {
  return normalizeSelection(
    currentIds,
    elements.map((element) => element.id),
  );
}

export function isMultiSelectEvent(event: MultiSelectEventLike) {
  return event.shiftKey || event.metaKey || event.ctrlKey;
}
