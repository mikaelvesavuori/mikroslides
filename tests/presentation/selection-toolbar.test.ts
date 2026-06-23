import { createImageElement, createShapeElement, createTextElement } from "../../src/index.js";
import {
  renderSelectionToolbar,
  selectionToolbarLabel,
} from "../../src/presentation/selectionToolbar.js";

function toolbarElement() {
  const actionButtons = ["front", "back", "duplicate", "lock", "unlock", "delete"].map(
    (action) =>
      ({
        dataset: { selectionAction: action },
        disabled: false,
        hidden: false,
      }) as unknown as HTMLButtonElement,
  );
  return {
    dataset: {} as Record<string, string>,
    hidden: false,
    querySelectorAll: (selector: string) =>
      selector === "[data-selection-action]" ? actionButtons : [],
  } as unknown as HTMLElement;
}

describe("selection toolbar", () => {
  it("labels selected object types", () => {
    expect(selectionToolbarLabel([createTextElement()], "text")).toBe("Text");
    expect(selectionToolbarLabel([createShapeElement()], "shape")).toBe("Shape");
    expect(selectionToolbarLabel([createImageElement()], "image")).toBe("Image");
    expect(selectionToolbarLabel([createTextElement(), createShapeElement()], "mixed")).toBe(
      "2 objects",
    );
  });

  it("hides while nothing is selected or text is being edited", () => {
    const toolbar = toolbarElement();
    const label = { textContent: "" } as HTMLElement;

    renderSelectionToolbar({
      editingTextElementId: null,
      elements: { selectionToolbar: toolbar, selectionToolbarLabel: label },
      selectedElements: [],
    });
    expect(toolbar.hidden).toBe(true);

    renderSelectionToolbar({
      editingTextElementId: "text",
      elements: { selectionToolbar: toolbar, selectionToolbarLabel: label },
      selectedElements: [createTextElement({ id: "text" })],
    });
    expect(toolbar.hidden).toBe(true);
  });

  it("marks selected kind and disables destructive actions when locked", () => {
    const toolbar = toolbarElement();
    const label = { textContent: "" } as HTMLElement;

    renderSelectionToolbar({
      editingTextElementId: null,
      elements: { selectionToolbar: toolbar, selectionToolbarLabel: label },
      selectedElements: [createTextElement({ locked: true })],
    });

    const buttons = toolbar.querySelectorAll<HTMLButtonElement>("[data-selection-action]");
    expect(toolbar.hidden).toBe(false);
    expect(toolbar.dataset.kind).toBe("text");
    expect(toolbar.dataset.locked).toBe("true");
    expect(label.textContent).toBe("Text");
    expect([...buttons].find((button) => button.dataset.selectionAction === "lock")?.hidden).toBe(
      true,
    );
    expect(
      [...buttons].find((button) => button.dataset.selectionAction === "unlock")?.disabled,
    ).toBe(false);
    expect(
      [...buttons].find((button) => button.dataset.selectionAction === "delete")?.disabled,
    ).toBe(true);
  });
});
