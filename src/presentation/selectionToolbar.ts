import type { SlideElement } from "../index.js";
import { sharedValue } from "./inspectorPanel.js";

export type SelectionToolbarElements = {
  selectionToolbar: HTMLElement;
  selectionToolbarLabel: HTMLElement;
};

export function renderSelectionToolbar(options: {
  editingTextElementId: string | null;
  elements: SelectionToolbarElements;
  selectedElements: SlideElement[];
}) {
  const { editingTextElementId, elements, selectedElements } = options;
  const hasSelection = selectedElements.length > 0 && !editingTextElementId;
  elements.selectionToolbar.hidden = !hasSelection;
  if (!hasSelection) {
    delete elements.selectionToolbar.dataset.kind;
    delete elements.selectionToolbar.dataset.locked;
    return;
  }

  const kind = sharedValue(selectedElements, (element) => element.kind) ?? "mixed";
  const allLocked = selectedElements.every((element) => element.locked);
  elements.selectionToolbar.dataset.kind = kind;
  elements.selectionToolbar.dataset.locked = String(allLocked);
  elements.selectionToolbarLabel.textContent = selectionToolbarLabel(selectedElements, kind);
  syncSelectionToolbarActionState(elements.selectionToolbar, allLocked);
}

export function selectionToolbarLabel(
  selectedElements: SlideElement[],
  kind: SlideElement["kind"] | "mixed",
) {
  if (selectedElements.length > 1) {
    return `${selectedElements.length} objects`;
  }

  if (kind === "image") {
    return "Image";
  }

  if (kind === "shape") {
    return "Shape";
  }

  if (kind === "text") {
    return "Text";
  }

  return "Object";
}

function syncSelectionToolbarActionState(toolbar: HTMLElement, allLocked: boolean) {
  for (const button of toolbar.querySelectorAll<HTMLButtonElement>("[data-selection-action]")) {
    const action = button.dataset.selectionAction;
    button.hidden = (action === "lock" && allLocked) || (action === "unlock" && !allLocked);
    button.disabled = allLocked && action !== "unlock";
  }
}
