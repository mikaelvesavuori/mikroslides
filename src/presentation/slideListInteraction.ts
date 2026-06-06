import type { SlideDropPlacement } from "./slideReorder.js";

export type SlideListInteractionOptions = {
  hasDeck: () => boolean;
  onReorderSlide: (
    draggedSlideId: string,
    targetSlideId: string,
    placement: SlideDropPlacement,
  ) => void;
  onSelectSlide: (slideId: string) => void;
  slideList: HTMLElement;
  windowRef?: Pick<Window, "setTimeout">;
};

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

    const slideId = slideIdFromEvent(event);
    if (!options.hasDeck() || !slideId) {
      return;
    }

    options.onSelectSlide(slideId);
  }

  function handleDragStart(event: DragEvent) {
    const button = slideButtonFromEvent(event);
    const slideId = button?.dataset.slideId;
    if (!options.hasDeck() || !button || !slideId) {
      return;
    }

    draggedSlideId = slideId;
    button.classList.add("is-dragging");
    event.dataTransfer?.setData("text/plain", slideId);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
    }
  }

  function handleDragOver(event: DragEvent) {
    if (!draggedSlideId) {
      return;
    }

    const button = slideButtonFromEvent(event);
    const slideId = button?.dataset.slideId;
    if (!button || !slideId || slideId === draggedSlideId) {
      clearDropIndicators(options.slideList);
      return;
    }

    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
    setDropIndicator(button, dropPlacementFromEvent(event, button), options.slideList);
  }

  function handleDrop(event: DragEvent) {
    if (!draggedSlideId) {
      return;
    }

    const button = slideButtonFromEvent(event);
    const targetSlideId = button?.dataset.slideId;
    if (!button || !targetSlideId) {
      handleDragEnd();
      return;
    }

    event.preventDefault();
    const placement = dropPlacementFromEvent(event, button);
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

  return {
    handleClick,
    handleDragEnd,
    handleDragLeave,
    handleDragOver,
    handleDragStart,
    handleDrop,
  };
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

function slideButtonFromEvent(event: Event) {
  const target = event.target instanceof HTMLElement ? event.target : null;
  return target?.closest<HTMLButtonElement>("[data-slide-id]") ?? null;
}

function slideIdFromEvent(event: Event) {
  return slideButtonFromEvent(event)?.dataset.slideId ?? null;
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
