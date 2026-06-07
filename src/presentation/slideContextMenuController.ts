import {
  constrainedMenuPosition,
  runSlideContextMenuAction,
  type SlideContextMenuAction,
  type SlideContextMenuAvailability,
  slideContextMenuActionFromEvent,
  updateSlideContextMenuButton,
} from "./slideContextMenu.js";

export type SlideContextMenuControllerOptions = {
  actions: Record<SlideContextMenuAction, (slideId: string) => void>;
  contextMenu: HTMLElement;
  getState: (slideId: string) => SlideContextMenuAvailability;
  viewport: () => {
    height: number;
    width: number;
  };
};

export function createSlideContextMenuController(options: SlideContextMenuControllerOptions) {
  let activeSlideId: string | null = null;

  function updateState() {
    if (!activeSlideId) {
      return;
    }

    const state = options.getState(activeSlideId);
    for (const button of options.contextMenu.querySelectorAll<HTMLButtonElement>(
      "[data-slide-context-action]",
    )) {
      updateSlideContextMenuButton(button, state);
    }
  }

  function close() {
    options.contextMenu.hidden = true;
    activeSlideId = null;
  }

  return {
    close,
    handleClick(event: MouseEvent) {
      const action = slideContextMenuActionFromEvent(event);
      const slideId = activeSlideId;
      if (!action || !slideId) {
        return;
      }

      close();
      runSlideContextMenuAction(action, slideId, options.actions);
    },
    isOpen() {
      return !options.contextMenu.hidden;
    },
    open(slideId: string, clientX: number, clientY: number) {
      activeSlideId = slideId;
      updateState();
      options.contextMenu.hidden = false;
      options.contextMenu.style.left = "0px";
      options.contextMenu.style.top = "0px";
      const rect = options.contextMenu.getBoundingClientRect();
      const position = constrainedMenuPosition(
        clientX,
        clientY,
        { height: rect.height, width: rect.width },
        options.viewport(),
      );
      options.contextMenu.style.left = `${position.x}px`;
      options.contextMenu.style.top = `${position.y}px`;
    },
    updateState,
  };
}
