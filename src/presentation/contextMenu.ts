export type ContextMenuAction =
  | "copy"
  | "cut"
  | "paste"
  | "duplicate"
  | "lock"
  | "unlock"
  | "bring-front"
  | "send-back"
  | "add-text"
  | "add-shape"
  | "add-image"
  | "delete";

export type ContextMenuAvailability = {
  hasClipboard: boolean;
  hasLockedSelection: boolean;
  hasSelection: boolean;
  hasUnlockedSelection: boolean;
};

export type ContextMenuCallbacks = Record<ContextMenuAction, () => void>;

export type CanvasContextSelectionAction =
  | { kind: "keep-selection" }
  | { elementId: string; kind: "select-element" }
  | { kind: "select-slide" };

const selectionActions = new Set<ContextMenuAction>([
  "copy",
  "cut",
  "duplicate",
  "delete",
  "lock",
  "unlock",
  "bring-front",
  "send-back",
]);

export function isContextActionDisabled(
  action: ContextMenuAction,
  availability: ContextMenuAvailability,
) {
  if (selectionActions.has(action) && !availability.hasSelection) {
    return true;
  }

  if (action === "lock") {
    return !availability.hasUnlockedSelection;
  }

  if (action === "unlock") {
    return !availability.hasLockedSelection;
  }

  return action === "paste" && !availability.hasClipboard;
}

export function contextMenuActionFromEvent(event: MouseEvent): ContextMenuAction | null {
  const target = event.target as {
    closest?: (selector: string) => Pick<HTMLButtonElement, "dataset" | "disabled"> | null;
  } | null;
  const button = target?.closest?.("[data-context-action]");
  const action = button?.dataset.contextAction;
  if (button?.disabled || !isContextMenuAction(action)) {
    return null;
  }

  return action;
}

export function runContextMenuAction(action: ContextMenuAction, callbacks: ContextMenuCallbacks) {
  callbacks[action]();
}

export function canvasContextSelectionAction(options: {
  elementId: string | null;
  selectedElementIds: string[];
  slideElementIds: string[];
  targetIsCanvas: boolean;
}): CanvasContextSelectionAction {
  if (options.elementId && options.slideElementIds.includes(options.elementId)) {
    return options.selectedElementIds.includes(options.elementId)
      ? { kind: "keep-selection" }
      : { elementId: options.elementId, kind: "select-element" };
  }

  return options.targetIsCanvas ? { kind: "select-slide" } : { kind: "keep-selection" };
}

export function constrainedMenuPosition(
  clientX: number,
  clientY: number,
  menu: { height: number; width: number },
  viewport: { height: number; width: number },
  margin = 8,
) {
  return {
    x: Math.max(margin, Math.min(clientX, viewport.width - menu.width - margin)),
    y: Math.max(margin, Math.min(clientY, viewport.height - menu.height - margin)),
  };
}

function isContextMenuAction(value: string | undefined): value is ContextMenuAction {
  return (
    value === "copy" ||
    value === "cut" ||
    value === "paste" ||
    value === "duplicate" ||
    value === "lock" ||
    value === "unlock" ||
    value === "bring-front" ||
    value === "send-back" ||
    value === "add-text" ||
    value === "add-shape" ||
    value === "add-image" ||
    value === "delete"
  );
}
