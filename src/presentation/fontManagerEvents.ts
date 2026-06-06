import type { TextFontFamily } from "../index.js";
import type { FontCategory } from "./fontCatalog.js";

export type FontManagerEventElements = {
  addLocalFontButton: HTMLButtonElement;
  fontCatalog: HTMLElement;
  fontCategoryList: HTMLElement;
  fontList: HTMLElement;
  fontSearchInput: HTMLInputElement;
  fontSourceCatalog: HTMLElement;
  loadFontCatalogButton: HTMLButtonElement;
};

export type FontListAction = {
  action: string | undefined;
  fontId: string | undefined;
  token: TextFontFamily | undefined;
};

export function bindFontManagerEvents(
  elements: FontManagerEventElements,
  handlers: {
    addLocalFont: () => Promise<void>;
    changeBunnyCategory: (event: MouseEvent) => void;
    filterBunnyCatalog: () => void;
    loadBunnyCatalog: () => Promise<void>;
    selectBunnyFont: (event: MouseEvent) => void;
    selectDeckFont: (event: MouseEvent) => void;
    selectSourceFont: (event: MouseEvent) => void;
  },
) {
  elements.addLocalFontButton.addEventListener("click", () => void handlers.addLocalFont());
  elements.fontSourceCatalog.addEventListener("click", handlers.selectSourceFont);
  elements.loadFontCatalogButton.addEventListener("click", () => void handlers.loadBunnyCatalog());
  elements.fontSearchInput.addEventListener("input", handlers.filterBunnyCatalog);
  elements.fontCategoryList.addEventListener("click", handlers.changeBunnyCategory);
  elements.fontCatalog.addEventListener("click", handlers.selectBunnyFont);
  elements.fontList.addEventListener("click", handlers.selectDeckFont);
}

export function sourceFontIdFromEvent(event: MouseEvent) {
  const target = event.target instanceof HTMLElement ? event.target : null;
  return target?.closest<HTMLButtonElement>("[data-source-font-id]")?.dataset.sourceFontId;
}

export function fontCategoryFromEvent(event: MouseEvent) {
  const target = event.target instanceof HTMLElement ? event.target : null;
  return target?.closest<HTMLButtonElement>("[data-font-category]")?.dataset.fontCategory as
    | FontCategory
    | undefined;
}

export function bunnyFontFamilyFromEvent(event: MouseEvent) {
  const target = event.target instanceof HTMLElement ? event.target : null;
  return target?.closest<HTMLButtonElement>("[data-font-family]")?.dataset.fontFamily;
}

export function fontListActionFromEvent(event: MouseEvent): FontListAction {
  const target = event.target instanceof HTMLElement ? event.target : null;
  const row = target?.closest<HTMLElement>("[data-font-id]");
  const action = target?.closest<HTMLElement>("[data-action]")?.dataset.action;
  const token = target?.closest<HTMLElement>("[data-font-token]")?.dataset.fontToken as
    | TextFontFamily
    | undefined;

  return {
    action,
    fontId: row?.dataset.fontId,
    token,
  };
}
