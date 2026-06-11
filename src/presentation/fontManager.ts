import type { MikroDeckRecord, MikroFontRecord, TextFontFamily } from "../index.js";
import {
  type BunnyFontCatalogItem,
  cleanFontName,
  type FontCategory,
  fallbackBunnyFontCatalog,
  fontNameFromFile,
  matchesFontCategory,
  readBunnyFontCatalogItem,
  type SourceFontChoice,
  sortBunnyFontCatalog,
  sourceFontChoices,
} from "./fontCatalog.js";
import {
  bindFontManagerEvents,
  bunnyFontFamilyFromEvent,
  fontCategoryFromEvent,
  fontListActionFromEvent,
  sourceFontIdFromEvent,
} from "./fontManagerEvents.js";
import {
  renderBunnyFontCatalogView,
  renderFontListView,
  renderSourceFontCatalogView,
} from "./fontManagerView.js";

export type { SourceFontChoice };

export type FontManagerElements = {
  fontDialog: HTMLDialogElement;
  fontCurrentTab: HTMLButtonElement;
  fontBrowseTab: HTMLButtonElement;
  fontCurrentPanel: HTMLElement;
  fontBrowsePanel: HTMLElement;
  fontList: HTMLElement;
  fontNameInput: HTMLInputElement;
  fontFileInput: HTMLInputElement;
  addLocalFontButton: HTMLButtonElement;
  fontSourceCatalog: HTMLElement;
  fontSearchInput: HTMLInputElement;
  fontCategoryList: HTMLElement;
  fontCatalog: HTMLElement;
  fontCatalogStatus: HTMLElement;
  loadFontCatalogButton: HTMLButtonElement;
};

type FontManagerOptions = {
  elements: FontManagerElements;
  getDeck: () => MikroDeckRecord | null;
  selectedTextElementCount: () => number;
  selectedTextFontFamily: () => TextFontFamily | null;
  cssFontStackForFont: (font: MikroFontRecord) => string;
  cssFontStackForTextToken: (fontFamily: TextFontFamily) => string;
  importLocalFont: (file: File, label: string) => Promise<void>;
  addBunnyFontFamily: (family: string) => void;
  addSourceFont: (font: SourceFontChoice) => void;
  applyFontToken: (fontFamily: TextFontFamily) => boolean;
  deleteFont: (fontId: string) => void;
  formatError: (error: unknown, fallback: string) => string;
  openDialog: (dialog: HTMLDialogElement) => void;
  showToast: (message: string) => void;
};

export type FontManager = {
  bindEvents: () => void;
  open: () => void;
  render: () => void;
};

export function createFontManager(options: FontManagerOptions): FontManager {
  const { elements } = options;
  let bunnyFontCatalog = fallbackBunnyFontCatalog;
  let bunnyFontCatalogLoaded = false;
  let bunnyFontCatalogLoading = false;
  let activeFontCategory: FontCategory = "recommended";
  let activeTab: "current" | "browse" = "current";

  function render() {
    renderTabs();
    renderFontList();
    renderSourceFontCatalog();
    renderBunnyFontCatalog();
  }

  function renderTabs() {
    const current = activeTab === "current";
    elements.fontCurrentTab.setAttribute("aria-selected", String(current));
    elements.fontBrowseTab.setAttribute("aria-selected", String(!current));
    elements.fontCurrentPanel.hidden = !current;
    elements.fontBrowsePanel.hidden = current;
  }

  function renderFontList() {
    const view = renderFontListView({
      currentFont: options.selectedTextFontFamily(),
      deck: options.getDeck(),
      resolvers: {
        cssFontStackForFont: options.cssFontStackForFont,
        cssFontStackForTextToken: options.cssFontStackForTextToken,
      },
    });
    elements.fontList.dataset.empty = String(view.empty);
    elements.fontList.innerHTML = view.html;
  }

  function renderSourceFontCatalog() {
    const view = renderSourceFontCatalogView({
      currentFont: options.selectedTextFontFamily(),
      deck: options.getDeck(),
    });
    elements.fontSourceCatalog.dataset.empty = String(view.empty);
    elements.fontSourceCatalog.innerHTML = view.html;
  }

  function renderBunnyFontCatalog() {
    const view = renderBunnyFontCatalogView({
      activeFontCategory,
      bunnyFontCatalog,
      bunnyFontCatalogLoaded,
      bunnyFontCatalogLoading,
      currentFont: options.selectedTextFontFamily(),
      deck: options.getDeck(),
      visibleFonts: visibleBunnyFonts(),
    });
    elements.fontCategoryList.innerHTML = view.categoryHtml;
    elements.fontCatalogStatus.textContent = view.statusText;
    elements.loadFontCatalogButton.disabled = view.loadButtonDisabled;
    elements.loadFontCatalogButton.textContent = view.loadButtonText;
    elements.fontCatalog.dataset.empty = String(view.catalogEmpty);
    elements.fontCatalog.innerHTML = view.catalogHtml;
  }

  function visibleBunnyFonts() {
    const query = elements.fontSearchInput.value.trim().toLowerCase();
    const matches = bunnyFontCatalog.filter((font) => {
      const matchesSearch =
        !query ||
        font.family.toLowerCase().includes(query) ||
        font.category.toLowerCase().includes(query);
      return matchesSearch && (query ? true : matchesActiveFontCategory(font));
    });
    return matches.slice(0, query ? 60 : 36);
  }

  function matchesActiveFontCategory(font: BunnyFontCatalogItem) {
    return matchesFontCategory(font, activeFontCategory);
  }

  function open() {
    elements.fontNameInput.value = "";
    elements.fontFileInput.value = "";
    elements.fontSearchInput.value = "";
    activeFontCategory = "recommended";
    activeTab = "current";
    options.openDialog(elements.fontDialog);
    render();
  }

  function showCurrentFonts() {
    activeTab = "current";
    renderTabs();
  }

  function showBrowseFonts() {
    activeTab = "browse";
    renderTabs();
  }

  async function addLocalFontFromDialog() {
    const file = elements.fontFileInput.files?.[0] ?? null;
    if (!file) {
      options.showToast("Choose a font file");
      return;
    }

    try {
      const label = cleanFontName(elements.fontNameInput.value) || fontNameFromFile(file.name);
      await options.importLocalFont(file, label);
      elements.fontNameInput.value = "";
      elements.fontFileInput.value = "";
      render();
      options.showToast("Font imported");
    } catch (error) {
      options.showToast(options.formatError(error, "Could not import font"));
    }
  }

  async function loadBunnyFontCatalog() {
    if (bunnyFontCatalogLoading) {
      return;
    }

    bunnyFontCatalogLoading = true;
    renderBunnyFontCatalog();
    try {
      const response = await fetch("https://fonts.bunny.net/list");
      if (!response.ok) {
        throw new Error(`Bunny font catalog failed with ${response.status}`);
      }

      const raw = (await response.json()) as Record<string, unknown>;
      const fonts = Object.entries(raw)
        .map(([slug, value]) => readBunnyFontCatalogItem(slug, value))
        .filter((font): font is BunnyFontCatalogItem => Boolean(font));
      if (fonts.length > 0) {
        bunnyFontCatalog = sortBunnyFontCatalog(fonts);
        bunnyFontCatalogLoaded = true;
      }
    } catch {
      bunnyFontCatalog = fallbackBunnyFontCatalog;
    } finally {
      bunnyFontCatalogLoading = false;
      renderBunnyFontCatalog();
    }
  }

  function handleSourceFontCatalogClick(event: MouseEvent) {
    const fontId = sourceFontIdFromEvent(event);
    const font = sourceFontChoices.find((item) => item.id === fontId);
    if (!font) {
      return;
    }

    options.addSourceFont(font);
    render();
  }

  function handleFontCategoryClick(event: MouseEvent) {
    const category = fontCategoryFromEvent(event);
    if (!category) {
      return;
    }

    activeFontCategory = category;
    renderBunnyFontCatalog();
  }

  function handleFontCatalogClick(event: MouseEvent) {
    const family = bunnyFontFamilyFromEvent(event);
    if (!family) {
      return;
    }

    options.addBunnyFontFamily(cleanFontName(family));
    render();
  }

  function handleFontListClick(event: MouseEvent) {
    const { action, fontId, token } = fontListActionFromEvent(event);
    if (!options.getDeck() || !action) {
      return;
    }

    if (action === "apply-font-token" && token) {
      const applied = options.applyFontToken(token);
      render();
      options.showToast(applied ? "Font applied" : "Select text first");
      return;
    }

    if (action === "delete-font" && fontId) {
      options.deleteFont(fontId);
    }
  }

  function bindEvents() {
    bindFontManagerEvents(elements, {
      addLocalFont: addLocalFontFromDialog,
      changeBunnyCategory: handleFontCategoryClick,
      filterBunnyCatalog: renderBunnyFontCatalog,
      loadBunnyCatalog: loadBunnyFontCatalog,
      showBrowseFonts,
      showCurrentFonts,
      selectBunnyFont: handleFontCatalogClick,
      selectDeckFont: handleFontListClick,
      selectSourceFont: handleSourceFontCatalogClick,
    });
  }

  return {
    bindEvents,
    open,
    render,
  };
}
