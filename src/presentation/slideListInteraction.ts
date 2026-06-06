import type { SlideDropPlacement } from "./slideReorder.js";

export type SlideListKeyboardAction = "copy-slide" | "cut-slide" | "delete-slide" | "paste-slide";

export type SlideListInteractionOptions = {
  hasDeck: () => boolean;
  onCopySlide: () => void;
  onCutSlide: () => void;
  onDeleteSlide: () => void;
  onPasteSlide: () => void;
  onReorderSlide: (
    draggedSlideId: string,
    targetSlideId: string,
    placement: SlideDropPlacement,
  ) => void;
  onSelectSlide: (slideId: string) => void;
  onToggleSlideSkipped: (slideId: string) => void;
  slideList: HTMLElement;
  windowRef?: Pick<Window, "setTimeout">;
};

type SlideListKeyboardEventLike = Pick<KeyboardEvent, "ctrlKey" | "key" | "metaKey">;

export function createSlideListInteraction(options: SlideListInteractionOptions) {
  const windowRef = options.windowRef ?? window;
  let draggedSlideId: string | null = null;
  let ignoreNextClick = false;

  function handleClick(event: MouseEvent) {
    if (ignoreNextClick) {
      event.preventDefault();
      ignoreNextClick = false;
      return;
    }

    const skippedSlideId = skippedSlideIdFromEvent(event);
    if (skippedSlideId) {
      event.preventDefault();
      event.stopPropagation();
      options.onToggleSlideSkipped(skippedSlideId);
      focusActiveSlideButton();
      return;
    }

    const slideId = slideIdFromEvent(event);
    if (!options.hasDeck() || !slideId) {
      return;
    }

    options.onSelectSlide(slideId);
    focusActiveSlideButton();
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (!options.hasDeck()) {
      return;
    }

    const action = slideListKeyboardActionFromEvent(event);
    if (!action) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (action === "copy-slide") {
      options.onCopySlide();
    }
    if (action === "cut-slide") {
      options.onCutSlide();
    }
    if (action === "delete-slide") {
      options.onDeleteSlide();
    }
    if (action === "paste-slide") {
      options.onPasteSlide();
    }

    focusActiveSlideButton();
  }

  function handleDragStart(event: DragEvent) {
    const thumb = slideThumbFromEvent(event);
    const slideId = thumb?.dataset.slideId;
    if (!options.hasDeck() || !thumb || !slideId) {
      return;
    }

    draggedSlideId = slideId;
    thumb.classList.add("is-dragging");
    event.dataTransfer?.setData("text/plain", slideId);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
    }
  }

  function handleDragOver(event: DragEvent) {
    if (!draggedSlideId) {
      return;
    }

    const thumb = slideThumbFromEvent(event);
    const slideId = thumb?.dataset.slideId;
    if (!thumb || !slideId || slideId === draggedSlideId) {
      clearDropIndicators(options.slideList);
      return;
    }

    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
    setDropIndicator(thumb, dropPlacementFromEvent(event, thumb), options.slideList);
  }

  function handleDrop(event: DragEvent) {
    if (!draggedSlideId) {
      return;
    }

    const thumb = slideThumbFromEvent(event);
    const targetSlideId = thumb?.dataset.slideId;
    if (!thumb || !targetSlideId) {
      handleDragEnd();
      return;
    }

    event.preventDefault();
    const placement = dropPlacementFromEvent(event, thumb);
    const slideId = draggedSlideId;
    handleDragEnd();
    options.onReorderSlide(slideId, targetSlideId, placement);
    ignoreNextClick = true;
    windowRef.setTimeout(() => {
      ignoreNextClick = false;
    }, 250);
  }

  function handleDragEnd() {
    draggedSlideId = null;
    clearDragState(options.slideList);
  }

  function handleDragLeave(event: DragEvent) {
    if (event.relatedTarget instanceof Node && options.slideList.contains(event.relatedTarget)) {
      return;
    }

    clearDropIndicators(options.slideList);
  }

  function focusActiveSlideButton() {
    windowRef.setTimeout(() => {
      options.slideList
        .querySelector<HTMLButtonElement>('.slide-thumb[aria-current="true"] .slide-select-btn')
        ?.focus();
    }, 0);
  }

  return {
    handleClick,
    handleDragEnd,
    handleDragLeave,
    handleDragOver,
    handleDragStart,
    handleDrop,
    handleKeyDown,
  };
}

export function slideListKeyboardActionFromEvent(
  event: SlideListKeyboardEventLike,
): SlideListKeyboardAction | null {
  const key = event.key.toLowerCase();
  const isModifierShortcut = event.metaKey || event.ctrlKey;

  if (isModifierShortcut && key === "c") {
    return "copy-slide";
  }
  if (isModifierShortcut && key === "x") {
    return "cut-slide";
  }
  if (isModifierShortcut && key === "v") {
    return "paste-slide";
  }
  if (!isModifierShortcut && (event.key === "Delete" || event.key === "Backspace")) {
    return "delete-slide";
  }

  return null;
}

export function dropPlacementFromGeometry(
  rect: Pick<DOMRect, "height" | "left" | "top" | "width">,
  clientX: number,
  clientY: number,
): SlideDropPlacement {
  const horizontal = rect.width > rect.height * 1.25;
  const midpoint = horizontal ? rect.left + rect.width / 2 : rect.top + rect.height / 2;
  const pointer = horizontal ? clientX : clientY;
  return pointer < midpoint ? "before" : "after";
}

function slideThumbFromEvent(event: Event) {
  const target = event.target instanceof HTMLElement ? event.target : null;
  return target?.closest<HTMLElement>(".slide-thumb[data-slide-id]") ?? null;
}

function slideIdFromEvent(event: Event) {
  return slideThumbFromEvent(event)?.dataset.slideId ?? null;
}

function skippedSlideIdFromEvent(event: Event) {
  const target = event.target instanceof HTMLElement ? event.target : null;
  const button = target?.closest<HTMLButtonElement>("[data-slide-skip]");
  return button ? slideIdFromEvent(event) : null;
}

function dropPlacementFromEvent(event: DragEvent, button: HTMLElement) {
  const rect = button.getBoundingClientRect();
  return dropPlacementFromGeometry(rect, event.clientX, event.clientY);
}

function setDropIndicator(
  button: HTMLElement,
  placement: SlideDropPlacement,
  slideList: HTMLElement,
) {
  clearDropIndicators(slideList);
  button.dataset.dropPosition = placement;
}

function clearDragState(slideList: HTMLElement) {
  for (const button of slideList.querySelectorAll<HTMLElement>(".slide-thumb")) {
    button.classList.remove("is-dragging");
    delete button.dataset.dropPosition;
  }
}

function clearDropIndicators(slideList: HTMLElement) {
  for (const button of slideList.querySelectorAll<HTMLElement>(".slide-thumb")) {
    delete button.dataset.dropPosition;
  }
}
