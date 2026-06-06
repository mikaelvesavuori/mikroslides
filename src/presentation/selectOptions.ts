import type { DeckAspectRatio, DeckTheme, MikroFontRecord } from "../index.js";
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
) {
  const builtInOptions = builtInTemplates
    .map(
      (template) =>
        `<option value="${escapeAttribute(template.id)}">${escapeHtml(template.name)}</option>`,
    )
    .join("");

  return `
    <option value="">Layout</option>
    <optgroup label="Built in">${builtInOptions}</optgroup>
    ${customOptions ? `<optgroup label="Mine">${customOptions}</optgroup>` : ""}
  `;
}
