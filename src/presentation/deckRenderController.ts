import type {
  DeckAspectRatio,
  DeckTheme,
  MikroDeckRecord,
  MikroSlideRecord,
  SlideElement,
  TextFontFamily,
} from "../index.js";
import type { MikroSlidesElements } from "./appElements.js";
import type { CommandTemplate } from "./commandActions.js";
import { renderDeckLibraryRows } from "./deckLibrary.js";
import { type InspectorPanelElements, renderInspectorPanel } from "./inspectorPanel.js";
import { renderPrintDeckSurface, syncDeckSurfaceChrome } from "./presentationSurfaces.js";
import {
  renderDeckAspectOptions,
  renderDeckThemeOptions,
  renderFontSelectOptions,
  renderTemplateSelectOptions,
} from "./selectOptions.js";
import {
  renderSlideElements,
  renderSlideThumbnails,
  renderTextEditingOverlay,
} from "./slideRenderer.js";
import { renderUserTemplateOptions, type UserTemplate } from "./userTemplates.js";

export type DeckRenderElements = InspectorPanelElements &
  Pick<
    MikroSlidesElements,
    | "appShell"
    | "backgroundSwatches"
    | "deckList"
    | "deckMeta"
    | "deckTitleInput"
    | "duplicateElementButton"
    | "layerBackButton"
    | "layerBackwardButton"
    | "layerForwardButton"
    | "layerFrontButton"
    | "librarySearch"
    | "presenterDialog"
    | "printDeck"
    | "redoButton"
    | "slideCanvas"
    | "slideList"
    | "templateSelect"
    | "undoButton"
    | "zoomFitButton"
  >;

export type DeckRenderControllerOptions = {
  backgroundSwatches: string[];
  deckAspects: Array<{ id: DeckAspectRatio; name: string }>;
  documentRef: Document;
  elements: DeckRenderElements;
  getCanvasZoom: () => number;
  getDeck: () => MikroDeckRecord | null;
  getEditingTextElementId: () => string | null;
  getSelectedElementIds: () => string[];
  getSelectedElements: () => SlideElement[];
  getSlide: () => MikroSlideRecord | null;
  getUserTemplates: () => UserTemplate[];
  librarySearch: (query: string) => MikroDeckRecord[];
  renderFontRuntimeStyles: () => void;
  resolveFontStack: (fontFamily: TextFontFamily) => string;
  resolveImageSource: (src: string) => string;
  themes: DeckTheme[];
  templates: CommandTemplate[];
};

export function createDeckRenderController(options: DeckRenderControllerOptions) {
  function renderFontOptions() {
    options.elements.textFontSelect.innerHTML = renderFontSelectOptions(
      options.getDeck()?.fonts ?? [],
    );
  }

  return {
    renderBackgroundSwatches() {
      const customColor = options.elements.backgroundSwatches.querySelector(
        "[data-custom-paint='background']",
      );
      options.elements.backgroundSwatches.innerHTML = options.backgroundSwatches
        .map(
          (color) =>
            `<button class="paint-swatch" type="button" data-background="${color}" style="--swatch:${color}" title="${color}" aria-label="${color}"></button>`,
        )
        .join("");
      if (customColor) {
        options.elements.backgroundSwatches.append(customColor);
      }
    },
    renderCanvas() {
      const slide = options.getSlide();
      if (!slide) {
        options.elements.slideCanvas.innerHTML = "";
        options.elements.slideCanvas.dataset.textEditing = "false";
        return;
      }

      const editingTextElementId = options.getEditingTextElementId();
      options.elements.slideCanvas.dataset.textEditing = String(Boolean(editingTextElementId));
      options.elements.slideCanvas.style.setProperty("--slide-bg", slide.background);
      const renderOptions = {
        editingTextElementId,
        includeHandle: true,
        resolveFontStack: options.resolveFontStack,
        resolveImageSource: options.resolveImageSource,
        selectedIds: new Set(options.getSelectedElementIds()),
      };
      options.elements.slideCanvas.innerHTML = `${renderSlideElements(slide, renderOptions)}${renderTextEditingOverlay(slide, renderOptions)}`;
    },
    renderDeckChrome() {
      const aspect = options.getDeck()?.aspectRatio ?? "16:9";
      syncDeckSurfaceChrome(options.elements, aspect, options.getCanvasZoom());
    },
    renderDeckHeader() {
      const deck = options.getDeck();
      if (!deck) {
        return;
      }

      if (options.documentRef.activeElement !== options.elements.deckTitleInput) {
        options.elements.deckTitleInput.value = deck.title;
      }

      const activeSlideIndex = deck.slides.findIndex((slide) => slide.id === deck.activeSlideId);
      const currentSlide = activeSlideIndex >= 0 ? activeSlideIndex + 1 : 1;
      options.elements.deckMeta.textContent = `Slide ${currentSlide}/${deck.slides.length}`;
    },
    renderDeckOptionControls() {
      options.elements.deckThemeSelect.innerHTML = renderDeckThemeOptions(options.themes);
      options.elements.deckAspectSelect.innerHTML = renderDeckAspectOptions(options.deckAspects);
    },
    renderFontOptions,
    renderHistoryControls(canUndo: boolean, canRedo: boolean) {
      options.elements.undoButton.disabled = !canUndo;
      options.elements.redoButton.disabled = !canRedo;
      options.elements.duplicateElementButton.disabled =
        options.getSelectedElementIds().length === 0;
      const canLayer = options.getSelectedElementIds().length > 0;
      options.elements.layerFrontButton.disabled = !canLayer;
      options.elements.layerForwardButton.disabled = !canLayer;
      options.elements.layerBackwardButton.disabled = !canLayer;
      options.elements.layerBackButton.disabled = !canLayer;
    },
    renderInspector() {
      renderInspectorPanel({
        deck: options.getDeck(),
        elements: options.elements,
        renderFontOptions,
        selectedElementIds: options.getSelectedElementIds(),
        selectedElements: options.getSelectedElements(),
        slide: options.getSlide(),
      });
    },
    renderLibrary() {
      const decks = options.librarySearch(options.elements.librarySearch.value);
      options.elements.deckList.innerHTML = renderDeckLibraryRows(decks);
    },
    renderPrintDeck() {
      renderPrintDeckSurface(options.elements.printDeck, options.getDeck(), {
        resolveFontStack: options.resolveFontStack,
        resolveImageSource: options.resolveImageSource,
      });
    },
    renderSlideList() {
      const deck = options.getDeck();
      if (!deck) {
        options.elements.slideList.innerHTML = "";
        return;
      }

      options.elements.slideList.innerHTML = renderSlideThumbnails(deck.slides, {
        activeSlideId: deck.activeSlideId,
        resolveFontStack: options.resolveFontStack,
        resolveImageSource: options.resolveImageSource,
      });
    },
    renderTemplateOptions() {
      const customOptions = renderUserTemplateOptions(options.getUserTemplates());
      options.elements.templateSelect.innerHTML = renderTemplateSelectOptions(
        options.templates,
        customOptions,
        options.getSlide()?.layout ?? null,
      );
    },
    renderFontRuntimeStyles() {
      options.renderFontRuntimeStyles();
    },
  };
}
