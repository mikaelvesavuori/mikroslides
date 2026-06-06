export function readTextEditorContent(textEditor: HTMLElement) {
  const listItems = [...textEditor.querySelectorAll<HTMLLIElement>("li")];
  if (listItems.length > 0) {
    return listTextFromItems(listItems.map((item) => item.innerText));
  }

  return normalizeTextEditorPlainText(textEditor.innerText);
}

export function listTextFromItems(items: string[]) {
  return items
    .map((item) => item.replace(/\n+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

export function normalizeTextEditorPlainText(value: string) {
  return value.replace(/\n\n+/g, "\n").trimEnd();
}

export function selectEditableContents(element: HTMLElement | null) {
  if (!element) {
    return;
  }

  const range = document.createRange();
  range.selectNodeContents(element);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

export function placeCaretAtPoint(
  element: HTMLElement | null,
  clientX: number | undefined,
  clientY: number | undefined,
  documentRef: Document = document,
  windowRef: Window = window,
) {
  if (!element || clientX === undefined || clientY === undefined) {
    return false;
  }

  const documentWithCaret = documentRef as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  const range = documentWithCaret.caretRangeFromPoint?.(clientX, clientY) ?? null;
  const position = range ? null : documentWithCaret.caretPositionFromPoint?.(clientX, clientY);
  const nextRange = range ?? documentRef.createRange();
  if (position) {
    nextRange.setStart(position.offsetNode, position.offset);
    nextRange.collapse(true);
  }
  if (!element.contains(nextRange.startContainer)) {
    return false;
  }

  const selection = windowRef.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(nextRange);
  return true;
}
