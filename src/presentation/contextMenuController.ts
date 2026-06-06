import {
  type ContextMenuAction,
  constrainedMenuPosition,
  contextMenuActionFromEvent,
  isContextActionDisabled,
  runContextMenuAction,
} from "./contextMenu.js";

export type ContextMenuControllerOptions = {
  actions: Record<ContextMenuAction, () => void>;
  contextMenu: HTMLElement;
  getState: () => {
    hasClipboard: boolean;
    hasSelection: boolean;
  };
  viewport: () => {
    height: number;
    width: number;
  };
};

export function createContextMenuController(options: ContextMenuControllerOptions) {
  function updateState() {
    const state = options.getState();
    for (const button of options.contextMenu.querySelectorAll<HTMLButtonElement>(
      "[data-context-action]",
    )) {
      const action = button.dataset.contextAction as ContextMenuAction | undefined;
      if (!action) {
        continue;
      }

      button.disabled = isContextActionDisabled(action, state);
    }
  }

  function close() {
    options.contextMenu.hidden = true;
  }

  return {
    close,
    handleClick(event: MouseEvent) {
      const action = contextMenuActionFromEvent(event);
      if (!action) {
        return;
      }

      close();
      runContextMenuAction(action, options.actions);
    },
    isOpen() {
      return !options.contextMenu.hidden;
    },
    open(clientX: number, clientY: number) {
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
