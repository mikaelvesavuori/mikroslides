import {
  defaultDeckTheme,
  type MikroDeckRecord,
  type MikroSlideRecord,
  type ShapeSlideElement,
  type SlideElement,
  type TextSlideElement,
} from "../index.js";
import { escapeHtml } from "./htmlEscape.js";
import { getElementLabel } from "./slideRenderer.js";

export type InspectorPanelElements = {
  deckAspectSelect: HTMLSelectElement;
  deckThemeSelect: HTMLSelectElement;
  elementHeightInput: HTMLInputElement;
  elementInspector: HTMLElement;
  elementLockedInput: HTMLInputElement;
  elementOpacityInput: HTMLInputElement;
  elementWidthInput: HTMLInputElement;
  elementXInput: HTMLInputElement;
  elementYInput: HTMLInputElement;
  imageAltInput: HTMLInputElement;
  imageFields: HTMLElement;
  imageFitSelect: HTMLSelectElement;
  imageSrcInput: HTMLInputElement;
  layersList: HTMLElement;
  layersSection: HTMLElement;
  objectInspectorTitle: HTMLElement;
  shapeFields: HTMLElement;
  shapeFillInput: HTMLInputElement;
  shapeKindSelect: HTMLSelectElement;
  shapeStrokeInput: HTMLInputElement;
  slideBackgroundInput: HTMLInputElement;
  slideInspector: HTMLElement;
  speakerNotes: HTMLTextAreaElement;
  textColorInput: HTMLInputElement;
  textContentInput: HTMLTextAreaElement;
  textFields: HTMLElement;
  textFontSelect: HTMLSelectElement;
  textLineHeightInput: HTMLInputElement;
  textSizeInput: HTMLInputElement;
  textWeightInput: HTMLInputElement;
};

export function renderInspectorPanel(options: {
  deck: MikroDeckRecord | null;
  documentRef?: Document;
  elements: InspectorPanelElements;
  renderFontOptions: () => void;
  selectedElementIds: string[];
  selectedElements: SlideElement[];
  slide: MikroSlideRecord | null;
}) {
  const { deck, elements, selectedElements, slide } = options;
  const documentRef = options.documentRef ?? document;
  if (!slide) {
    return;
  }

  if (deck && documentRef.activeElement !== elements.deckThemeSelect) {
    elements.deckThemeSelect.value = deck.theme.id;
  }
  if (deck && documentRef.activeElement !== elements.deckAspectSelect) {
    elements.deckAspectSelect.value = deck.aspectRatio;
  }
  if (documentRef.activeElement !== elements.slideBackgroundInput) {
    elements.slideBackgroundInput.value = toColorInput(slide.background);
  }
  if (documentRef.activeElement !== elements.speakerNotes) {
    elements.speakerNotes.value = slide.speakerNotes;
  }

  const element = selectedElements[0] ?? null;
  elements.slideInspector.hidden = Boolean(element);
  elements.elementInspector.hidden = !element;
  elements.layersSection.hidden = !element;
  renderLayersPanel(elements, slide, options.selectedElementIds);
  if (!element) {
    setLockedControlState(elements, false, documentRef);
    return;
  }

  elements.objectInspectorTitle.textContent =
    selectedElements.length > 1 ? `${selectedElements.length} Objects` : "Object";
  setNumberInputValueOrMixed(
    elements.elementXInput,
    sharedValue(selectedElements, (item) => item.x),
    documentRef,
  );
  setNumberInputValueOrMixed(
    elements.elementYInput,
    sharedValue(selectedElements, (item) => item.y),
    documentRef,
  );
  setNumberInputValueOrMixed(
    elements.elementWidthInput,
    sharedValue(selectedElements, (item) => item.width),
    documentRef,
  );
  setNumberInputValueOrMixed(
    elements.elementHeightInput,
    sharedValue(selectedElements, (item) => item.height),
    documentRef,
  );
  setRangeInputValueOrMixed(
    elements.elementOpacityInput,
    sharedValue(selectedElements, (item) => item.opacity),
    element.opacity,
    documentRef,
  );
  setCheckboxValueOrMixed(
    elements.elementLockedInput,
    sharedValue(selectedElements, (item) => item.locked),
  );
  setLockedControlState(elements, selectedElements.every((item) => item.locked), documentRef);

  const selectedKind = sharedValue(selectedElements, (item) => item.kind);
  setVisibleObjectFields(elements, selectedKind);

  if (selectedKind === "text" || selectedKind === "shape") {
    renderTextInspector(options, documentRef);
  }

  if (selectedKind === "shape") {
    renderShapeInspector(elements, selectedElements, documentRef);
  }

  if (selectedKind === "image") {
    renderImageInspector(elements, selectedElements, documentRef);
  }
}

export function renderLayersPanel(
  elements: Pick<InspectorPanelElements, "layersList">,
  slide: MikroSlideRecord | null,
  selectedElementIds: string[],
) {
  if (!slide) {
    elements.layersList.innerHTML = "";
    return;
  }

  elements.layersList.innerHTML = slide.elements
    .map((element, index) => ({ element, index }))
    .reverse()
    .map(({ element, index }) => {
      const selected = selectedElementIds.includes(element.id);
      return `
        <button class="layer-row" type="button" data-layer-id="${escapeHtml(element.id)}" aria-pressed="${selected}">
          <svg class="icon" aria-hidden="true"><use href="#icon-layers"></use></svg>
          <span>${escapeHtml(getElementLabel(element, index))}</span>
        </button>
      `;
    })
    .join("");
}

export function readNumber(input: HTMLInputElement) {
  const value = Number(input.value);
  return Number.isFinite(value) ? value : 0;
}

export function sharedValue<TItem, TValue>(items: TItem[], getValue: (item: TItem) => TValue) {
  if (items.length === 0) {
    return null;
  }

  const [firstItem] = items;
  const firstValue = getValue(firstItem);
  return items.every((item) => Object.is(getValue(item), firstValue)) ? firstValue : null;
}

export function toColorInput(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : "#ffffff";
}

function renderTextInspector(
  options: {
    documentRef?: Document;
    elements: InspectorPanelElements;
    renderFontOptions: () => void;
    selectedElements: SlideElement[];
  },
  documentRef: Document,
) {
  const { elements, selectedElements } = options;
  const textElements = selectedElements.filter(
    (item): item is TextSlideElement | ShapeSlideElement =>
      item.kind === "text" || item.kind === "shape",
  );
  if (documentRef.activeElement !== elements.textContentInput) {
    setTextAreaValueOrMixed(
      elements.textContentInput,
      sharedValue(textElements, (item) => item.content),
      documentRef,
    );
  }
  options.renderFontOptions();
  setSelectValueOrMixed(
    elements.textFontSelect,
    sharedValue(textElements, (item) => item.fontFamily),
    textElements[0]?.fontFamily ?? "system",
    documentRef,
  );
  setNumberInputValueOrMixed(
    elements.textSizeInput,
    sharedValue(textElements, (item) => item.fontSize),
    documentRef,
  );
  setNumberInputValueOrMixed(
    elements.textWeightInput,
    sharedValue(textElements, (item) => item.fontWeight),
    documentRef,
  );
  setNumberInputValueOrMixed(
    elements.textLineHeightInput,
    sharedValue(textElements, (item) => item.lineHeight),
    documentRef,
  );
  setColorInputValueOrMixed(
    elements.textColorInput,
    sharedValue(textElements, (item) => item.color),
    textElements[0]?.color ?? defaultDeckTheme.text,
    documentRef,
  );
  const align = sharedValue(textElements, (item) => item.align);
  for (const button of documentRef.querySelectorAll<HTMLButtonElement>("[data-align]")) {
    button.classList.toggle("is-active", align !== null && button.dataset.align === align);
  }
  const verticalAlign = sharedValue(textElements, (item) => item.verticalAlign);
  for (const button of documentRef.querySelectorAll<HTMLButtonElement>("[data-valign]")) {
    button.classList.toggle(
      "is-active",
      verticalAlign !== null && button.dataset.valign === verticalAlign,
    );
  }
  const listStyle = sharedValue(textElements, (item) => item.listStyle);
  for (const button of documentRef.querySelectorAll<HTMLButtonElement>("[data-list-style]")) {
    button.classList.toggle(
      "is-active",
      listStyle !== null && button.dataset.listStyle === listStyle,
    );
  }
}

function renderShapeInspector(
  elements: InspectorPanelElements,
  selectedElements: SlideElement[],
  documentRef: Document,
) {
  const shapeElements = selectedElements.filter((item) => item.kind === "shape");
  setSelectValueOrMixed(
    elements.shapeKindSelect,
    sharedValue(shapeElements, (item) => item.shape),
    shapeElements[0]?.shape ?? "rect",
    documentRef,
  );
  setColorInputValueOrMixed(
    elements.shapeFillInput,
    sharedValue(shapeElements, (item) => item.fill),
    shapeElements[0]?.fill ?? "#dbeafe",
    documentRef,
  );
  setColorInputValueOrMixed(
    elements.shapeStrokeInput,
    sharedValue(shapeElements, (item) => item.stroke),
    shapeElements[0]?.stroke ?? defaultDeckTheme.accent,
    documentRef,
  );
}

function renderImageInspector(
  elements: InspectorPanelElements,
  selectedElements: SlideElement[],
  documentRef: Document,
) {
  const imageElements = selectedElements.filter((item) => item.kind === "image");
  if (documentRef.activeElement !== elements.imageSrcInput) {
    setTextInputValueOrMixed(
      elements.imageSrcInput,
      sharedValue(imageElements, (item) => item.src),
      documentRef,
    );
  }
  if (documentRef.activeElement !== elements.imageAltInput) {
    setTextInputValueOrMixed(
      elements.imageAltInput,
      sharedValue(imageElements, (item) => item.alt),
      documentRef,
    );
  }
  setSelectValueOrMixed(
    elements.imageFitSelect,
    sharedValue(imageElements, (item) => item.fit),
    imageElements[0]?.fit ?? "cover",
    documentRef,
  );
}

function setVisibleObjectFields(
  elements: Pick<InspectorPanelElements, "imageFields" | "shapeFields" | "textFields">,
  kind: SlideElement["kind"] | null,
) {
  elements.textFields.dataset.visible = String(kind === "text" || kind === "shape");
  elements.shapeFields.dataset.visible = String(kind === "shape");
  elements.imageFields.dataset.visible = String(kind === "image");
}

function setMixedControlState(control: HTMLElement, mixed: boolean) {
  if (mixed) {
    control.dataset.mixed = "true";
    control.title = "Mixed values";
    return;
  }

  delete control.dataset.mixed;
  control.removeAttribute("title");
}

function setNumberInputValueOrMixed(
  input: HTMLInputElement,
  value: number | null,
  documentRef: Document,
) {
  const mixed = value === null;
  setMixedControlState(input, mixed);
  input.placeholder = mixed ? "Mixed" : "";
  if (documentRef.activeElement !== input) {
    input.value = mixed ? "" : String(Math.round(value * 100) / 100);
  }
}

function setRangeInputValueOrMixed(
  input: HTMLInputElement,
  value: number | null,
  fallback: number,
  documentRef: Document,
) {
  const mixed = value === null;
  setMixedControlState(input, mixed);
  if (documentRef.activeElement !== input) {
    input.value = String(Math.round((value ?? fallback) * 100) / 100);
  }
}

function setTextInputValueOrMixed(
  input: HTMLInputElement,
  value: string | null,
  documentRef: Document,
) {
  const mixed = value === null;
  setMixedControlState(input, mixed);
  input.placeholder = mixed ? "Mixed" : "";
  if (documentRef.activeElement !== input) {
    input.value = value ?? "";
  }
}

function setTextAreaValueOrMixed(
  input: HTMLTextAreaElement,
  value: string | null,
  documentRef: Document,
) {
  const mixed = value === null;
  setMixedControlState(input, mixed);
  input.placeholder = mixed ? "Mixed" : "";
  if (documentRef.activeElement !== input) {
    input.value = value ?? "";
  }
}

function setCheckboxValueOrMixed(input: HTMLInputElement, value: boolean | null) {
  input.indeterminate = value === null;
  input.checked = value === true;
}

function setLockedControlState(
  elements: InspectorPanelElements,
  locked: boolean,
  documentRef: Document,
) {
  const controls: Array<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> = [
    elements.elementXInput,
    elements.elementYInput,
    elements.elementWidthInput,
    elements.elementHeightInput,
    elements.elementOpacityInput,
    elements.textContentInput,
    elements.textFontSelect,
    elements.textSizeInput,
    elements.textWeightInput,
    elements.textLineHeightInput,
    elements.textColorInput,
    elements.shapeKindSelect,
    elements.shapeFillInput,
    elements.shapeStrokeInput,
    elements.imageSrcInput,
    elements.imageAltInput,
    elements.imageFitSelect,
  ];
  for (const control of controls) {
    control.disabled = locked;
  }
  for (const button of documentRef.querySelectorAll<HTMLButtonElement>(
    "[data-align], [data-valign], [data-list-style], [data-object-align]",
  )) {
    button.disabled = locked;
  }
}

function setColorInputValueOrMixed(
  input: HTMLInputElement,
  value: string | null,
  fallback: string,
  documentRef: Document,
) {
  setMixedControlState(input, value === null);
  if (documentRef.activeElement !== input) {
    input.value = toColorInput(value ?? fallback);
  }
}

function setSelectValueOrMixed(
  input: HTMLSelectElement,
  value: string | null,
  fallback: string,
  documentRef: Document,
) {
  setMixedControlState(input, value === null);
  if (documentRef.activeElement !== input) {
    input.value = value ?? fallback;
  }
}
