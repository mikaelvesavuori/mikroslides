import { constrainedMenuPosition } from "./contextMenu.js";

export type SlideContextMenuAction =
  | "copy"
  | "cut"
  | "delete"
  | "duplicate"
  | "move-down"
  | "move-up"
  | "paste-after"
  | "toggle-skip";

export type SlideContextMenuAvailability = {
  hasClipboard: boolean;
  hasSlide: boolean;
  isFirstSlide: boolean;
  isLastSlide: boolean;
  isSkipped: boolean;
};

export type SlideContextMenuCallbacks = Record<SlideContextMenuAction, (slideId: string) => void>;

export function isSlideContextActionDisabled(
  action: SlideContextMenuAction,
  availability: SlideContextMenuAvailability,
) {
  if (!availability.hasSlide) {
    return true;
  }
  if (action === "paste-after") {
    return !availability.hasClipboard;
  }
  if (action === "move-up") {
    return availability.isFirstSlide;
  }
  if (action === "move-down") {
    return availability.isLastSlide;
  }

  return false;
}

export function slideContextMenuActionFromEvent(event: MouseEvent): SlideContextMenuAction | null {
  const target = event.target as {
    closest?: (selector: string) => Pick<HTMLButtonElement, "dataset" | "disabled"> | null;
  } | null;
  const button = target?.closest?.("[data-slide-context-action]");
  const action = button?.dataset.slideContextAction;
  if (button?.disabled || !isSlideContextMenuAction(action)) {
    return null;
  }

  return action;
}

export function runSlideContextMenuAction(
  action: SlideContextMenuAction,
  slideId: string,
  callbacks: SlideContextMenuCallbacks,
) {
  callbacks[action](slideId);
}

export function updateSlideContextMenuButton(
  button: HTMLButtonElement,
  availability: SlideContextMenuAvailability,
) {
  const action = button.dataset.slideContextAction;
  if (!isSlideContextMenuAction(action)) {
    return;
  }

  button.disabled = isSlideContextActionDisabled(action, availability);
  if (action === "toggle-skip") {
    button.textContent = availability.isSkipped ? "Don't skip slide" : "Skip slide";
  }
}

export { constrainedMenuPosition };

function isSlideContextMenuAction(value: string | undefined): value is SlideContextMenuAction {
  return (
    value === "copy" ||
    value === "cut" ||
    value === "delete" ||
    value === "duplicate" ||
    value === "move-down" ||
    value === "move-up" ||
    value === "paste-after" ||
    value === "toggle-skip"
  );
}
