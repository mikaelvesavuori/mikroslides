import type { MikroDeckRecord, MikroFontRecord, TextFontFamily } from "../index.js";
import {
  type BunnyFontCatalogItem,
  type FontCategory,
  fontCategoryChoices,
  fontCategoryLabel,
  fontSourceLabel,
  fontWeightsLabel,
  quotedCssString,
  sourceFontChoices,
  systemFontChoices,
} from "./fontCatalog.js";
import { escapeAttribute, escapeHtml } from "./htmlEscape.js";

type FontStackResolvers = {
  cssFontStackForFont: (font: MikroFontRecord) => string;
  cssFontStackForTextToken: (fontFamily: TextFontFamily) => string;
};

export function renderFontListView(options: {
  currentFont: TextFontFamily | null;
  deck: MikroDeckRecord | null;
  resolvers: FontStackResolvers;
}) {
  const fonts = options.deck?.fonts ?? [];
  const systemRows = systemFontChoices
    .map(
      (font) => `
        <div class="font-row" data-font-token="${escapeAttribute(font.token)}" data-selected="${options.currentFont === font.token}">
          <button class="font-row-main" type="button" data-action="apply-font-token" aria-pressed="${options.currentFont === font.token}">
            <span class="font-row-title" style="font-family:${escapeAttribute(options.resolvers.cssFontStackForTextToken(font.token))}">${escapeHtml(font.label)}</span>
            <span class="font-row-meta">${escapeHtml(font.meta)}</span>
          </button>
        </div>
      `,
    )
    .join("");
  const deckRows = fonts
    .map((font) => {
      const token = `font:${font.id}` as TextFontFamily;
      return `
        <div class="font-row" data-font-id="${escapeAttribute(font.id)}" data-font-token="${escapeAttribute(token)}" data-selected="${options.currentFont === token}">
          <button class="font-row-main" type="button" data-action="apply-font-token" aria-pressed="${options.currentFont === token}">
            <span class="font-row-title" style="font-family:${escapeAttribute(options.resolvers.cssFontStackForFont(font))}">${escapeHtml(font.label)}</span>
            <span class="font-row-meta">${escapeHtml(fontSourceLabel(font))}</span>
          </button>
          <button class="tool-btn icon-btn danger" type="button" data-action="delete-font" title="Delete font" aria-label="Delete font">
            <svg class="icon" aria-hidden="true"><use href="#icon-trash"></use></svg>
          </button>
        </div>
      `;
    })
    .join("");

  return {
    empty: fonts.length === 0,
    html: `
      ${systemRows}
      ${deckRows || `<div class="font-empty">No deck fonts yet</div>`}
    `,
  };
}

export function renderSourceFontCatalogView(options: {
  currentFont: TextFontFamily | null;
  deck: MikroDeckRecord | null;
}) {
  return {
    empty: sourceFontChoices.length === 0,
    html: sourceFontChoices
      .map((font) => {
        const existing = options.deck?.fonts.find(
          (item) =>
            item.source === "source" &&
            item.family.toLowerCase() === font.family.toLowerCase() &&
            item.remoteUrl === font.remoteUrl,
        );
        const token = existing ? (`font:${existing.id}` as TextFontFamily) : null;
        const selected = Boolean(token && options.currentFont === token);
        const previewStack = `${quotedCssString(font.family)}, var(--font-family)`;
        return `
          <button class="font-catalog-row source-font-row" type="button" data-source-font-id="${escapeAttribute(font.id)}" aria-pressed="${selected}">
            <span class="font-catalog-preview" style="font-family:${escapeAttribute(previewStack)}">${escapeHtml(font.label)}</span>
            <span class="font-catalog-sample" style="font-family:${escapeAttribute(previewStack)}">${escapeHtml(font.sample)}</span>
            <span class="font-catalog-meta">${escapeHtml(font.meta)}</span>
            <span class="font-row-action">${selected ? "Selected" : existing ? "Apply" : "Add"}</span>
          </button>
        `;
      })
      .join(""),
  };
}

export function renderBunnyFontCatalogView(options: {
  activeFontCategory: FontCategory;
  bunnyFontCatalog: BunnyFontCatalogItem[];
  bunnyFontCatalogLoaded: boolean;
  bunnyFontCatalogLoading: boolean;
  currentFont: TextFontFamily | null;
  deck: MikroDeckRecord | null;
  visibleFonts: BunnyFontCatalogItem[];
}) {
  return {
    catalogEmpty: options.visibleFonts.length === 0,
    catalogHtml:
      options.visibleFonts
        .map((font) => {
          const existing = options.deck?.fonts.find(
            (item) =>
              item.source === "bunny" && item.family.toLowerCase() === font.family.toLowerCase(),
          );
          const token = existing ? (`font:${existing.id}` as TextFontFamily) : null;
          const selected = Boolean(token && options.currentFont === token);
          const previewStack = `${quotedCssString(font.family)}, var(--font-family)`;
          return `
            <button class="font-catalog-row" type="button" data-font-family="${escapeAttribute(font.family)}" aria-pressed="${selected}">
              <span class="font-catalog-preview" style="font-family:${escapeAttribute(previewStack)}">${escapeHtml(font.family)}</span>
              <span class="font-catalog-sample" style="font-family:${escapeAttribute(previewStack)}">${escapeHtml(font.sample)}</span>
              <span class="font-catalog-meta">${escapeHtml(fontCategoryLabel(font.category))} / ${escapeHtml(fontWeightsLabel(font))}</span>
              <span class="font-row-action">${selected ? "Selected" : existing ? "Apply" : "Add"}</span>
            </button>
          `;
        })
        .join("") || `<div class="font-empty">No fonts match</div>`,
    categoryHtml: renderFontCategoriesView(options.activeFontCategory),
    loadButtonDisabled: options.bunnyFontCatalogLoading,
    loadButtonText: options.bunnyFontCatalogLoading
      ? "Loading"
      : options.bunnyFontCatalogLoaded
        ? "Refresh catalog"
        : "Load catalog",
    statusText: options.bunnyFontCatalogLoaded
      ? `${options.bunnyFontCatalog.length} families`
      : "Curated",
  };
}

function renderFontCategoriesView(activeFontCategory: FontCategory) {
  return fontCategoryChoices
    .map(
      (category) => `
        <button class="font-category-btn" type="button" data-font-category="${category.id}" aria-pressed="${activeFontCategory === category.id}">
          ${escapeHtml(category.label)}
        </button>
      `,
    )
    .join("");
}
