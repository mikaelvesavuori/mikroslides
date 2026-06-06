import type { DeckAspectRatio, DeckTheme, MikroFontRecord, SlideLayoutKind } from "../index.js";
import type { CommandTemplate } from "./commandActions.js";
import { escapeAttribute, escapeHtml } from "./htmlEscape.js";

export function renderDeckThemeOptions(themes: DeckTheme[]) {
  return themes
    .map(
      (theme) => `<option value="${escapeAttribute(theme.id)}">${escapeHtml(theme.name)}</option>`,
    )
    .join("");
}

export function renderDeckAspectOptions(aspects: Array<{ id: DeckAspectRatio; name: string }>) {
  return aspects
    .map(
      (aspect) =>
        `<option value="${escapeAttribute(aspect.id)}">${escapeHtml(aspect.name)}</option>`,
    )
    .join("");
}

export function renderFontSelectOptions(fonts: MikroFontRecord[]) {
  const customOptions = fonts
    .map(
      (font) =>
        `<option value="font:${escapeAttribute(font.id)}">${escapeHtml(font.label)}</option>`,
    )
    .join("");

  return `
    <option value="system">System Sans</option>
    <option value="serif">System Serif</option>
    <option value="mono">System Mono</option>
    ${customOptions ? `<optgroup label="Deck">${customOptions}</optgroup>` : ""}
  `;
}

export function renderTemplateSelectOptions(
  builtInTemplates: CommandTemplate[],
  customOptions: string,
  currentLayout?: SlideLayoutKind | null,
) {
  const currentTemplateId = currentLayout ? templateIdForSlideLayout(currentLayout) : null;
  const hasCurrentTemplate = builtInTemplates.some((template) => template.id === currentTemplateId);
  const builtInOptions = builtInTemplates
    .map(
      (template) =>
        `<option value="${escapeAttribute(template.id)}"${
          template.id === currentTemplateId ? " selected" : ""
        }>${escapeHtml(template.name)}</option>`,
    )
    .join("");
  const readoutOption =
    !currentLayout || !hasCurrentTemplate
      ? `<option value="" selected>${escapeHtml(
          currentLayout ? templateLabelForSlideLayout(currentLayout, builtInTemplates) : "Layout",
        )}</option>`
      : "";

  return `
    ${readoutOption}
    <optgroup label="Built in">${builtInOptions}</optgroup>
    ${customOptions ? `<optgroup label="Mine">${customOptions}</optgroup>` : ""}
  `;
}

export function templateLabelForSlideLayout(layout: SlideLayoutKind, templates: CommandTemplate[]) {
  const templateId = templateIdForSlideLayout(layout);
  return (
    templates.find((template) => template.id === templateId)?.name ?? formatSlideLayout(layout)
  );
}

function templateIdForSlideLayout(layout: SlideLayoutKind) {
  if (layout === "two-column") {
    return "twoColumn";
  }
  if (layout === "image-left") {
    return "imageLeft";
  }
  if (layout === "image-right") {
    return "imageRight";
  }
  if (layout === "chart-data") {
    return "chartData";
  }

  return layout;
}

function formatSlideLayout(layout: SlideLayoutKind) {
  return layout
    .split("-")
    .map((part, index) => (index === 0 ? `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}` : part))
    .join(" ");
}
