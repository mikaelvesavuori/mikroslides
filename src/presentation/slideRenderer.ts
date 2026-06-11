import type {
  MikroSlideRecord,
  ShapeSlideElement,
  SlideElement,
  TextFontFamily,
  TextSlideElement,
} from "../index.js";
import { escapeAttribute, escapeHtml } from "./htmlEscape.js";
import {
  pathCommandsToSvg,
  shapeDecorationPathCommands,
  shapePathCommands,
} from "./shapeGeometry.js";

export type SlideRenderOptions = {
  editingTextElementId?: string | null;
  includeHandle?: boolean;
  resolveFontStack?: (fontFamily: TextFontFamily) => string;
  resolveImageSource?: (src: string) => string;
  selectedIds?: Set<string>;
};

const defaultFontStack = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export function renderSlideElements(slide: MikroSlideRecord, options: SlideRenderOptions = {}) {
  const selectedIds = options.selectedIds ?? new Set<string>();
  const includeHandle = options.includeHandle === true;
  return slide.elements
    .map((element) =>
      renderSlideElement(element, {
        ...options,
        includeHandle,
        selected: selectedIds.has(element.id),
      }),
    )
    .join("");
}

export function renderTextEditingOverlay(
  slide: MikroSlideRecord,
  options: Pick<SlideRenderOptions, "editingTextElementId" | "resolveFontStack"> = {},
) {
  const element = slide.elements.find((item) => item.id === options.editingTextElementId);
  if (!element || (element.kind !== "text" && element.kind !== "shape")) {
    return "";
  }

  const baseStyle = elementBaseStyle(element);
  if (element.kind === "text") {
    const textStyle = textStyleForElement(element, options);
    return `
      <div class="text-edit-overlay" data-text-edit-overlay="true" style="${escapeAttribute(baseStyle)}">
        <div class="slide-text" data-list-style="${element.listStyle}" data-align="${element.align}" data-valign="${element.verticalAlign}" style="${escapeAttribute(textStyle)}">
          <div class="slide-text-content" data-text-editor="${escapeAttribute(element.id)}" contenteditable="plaintext-only" spellcheck="true">${renderTextElementContent(element)}</div>
        </div>
      </div>
    `;
  }

  const textStyle = textStyleForElement(element, options);
  return `
    <div class="text-edit-overlay" data-text-edit-overlay="true" style="${escapeAttribute(baseStyle)}">
      <div class="slide-shape-label slide-text" data-list-style="${element.listStyle}" data-align="${element.align}" data-valign="${element.verticalAlign}" style="${escapeAttribute(textStyle)}">
        <div class="slide-text-content" data-text-editor="${escapeAttribute(element.id)}" contenteditable="plaintext-only" spellcheck="true">${renderTextElementContent(element)}</div>
      </div>
    </div>
  `;
}

export function renderSlideThumbnails(
  slides: MikroSlideRecord[],
  options: SlideRenderOptions & { activeSlideId: string | null },
) {
  return slides
    .map((slide, index) => {
      const current = slide.id === options.activeSlideId;
      const slideLabel = `Slide ${index + 1}: ${slide.title}${slide.skipped ? " (skipped)" : ""}`;
      const skipLabel = slide.skipped ? `Include slide ${index + 1}` : `Skip slide ${index + 1}`;
      return `
        <div class="slide-thumb" draggable="true" data-slide-id="${escapeAttribute(slide.id)}" data-skipped="${slide.skipped}" aria-current="${current}">
          <button class="slide-select-btn" type="button" aria-label="${escapeAttribute(slideLabel)}">
            <span class="slide-number" aria-hidden="true">${index + 1}</span>
            <span class="thumb-preview" style="--thumb-bg:${escapeAttribute(slide.background)}">
              ${renderSlideElements(slide, options)}
            </span>
          </button>
          <button class="slide-skip-btn" type="button" data-slide-skip="true" aria-pressed="${slide.skipped}" title="${escapeAttribute(skipLabel)}" aria-label="${escapeAttribute(skipLabel)}">
            <svg class="icon" aria-hidden="true"><use href="#icon-skip-slide"></use></svg>
          </button>
        </div>
      `;
    })
    .join("");
}

export function renderSlideElement(
  element: SlideElement,
  options: Omit<SlideRenderOptions, "selectedIds"> & { selected?: boolean } = {},
) {
  const baseStyle = elementBaseStyle(element);
  const handle = options.includeHandle && !element.locked
    ? '<span class="element-resize-handle" data-resize="true"></span>'
    : "";
  const selectedAttr = options.selected ? "true" : "false";
  const editingAttr = options.editingTextElementId === element.id ? "true" : "false";
  let body = "";

  if (element.kind === "text") {
    const style = textStyleForElement(element, options);
    body = `<div class="slide-text" data-list-style="${element.listStyle}" data-align="${element.align}" data-valign="${element.verticalAlign}" style="${escapeAttribute(style)}"><div class="slide-text-content">${renderTextElementContent(element)}</div></div>`;
  }

  if (element.kind === "shape") {
    const style = [
      `--fill:${escapeAttribute(element.fill)}`,
      `--stroke:${escapeAttribute(element.stroke)}`,
      `--stroke-width:${element.strokeWidth}`,
      `--radius:${element.radius}`,
    ].join(";");
    body = renderShapeElementBody(element, style, options);
  }

  if (element.kind === "image") {
    const style = `--image-fit:${element.fit}`;
    const src = options.resolveImageSource?.(element.src) ?? element.src;
    body = src
      ? `<img class="slide-image" src="${escapeAttribute(src)}" alt="${escapeAttribute(element.alt)}" style="${escapeAttribute(style)}" />`
      : `<div class="slide-image-placeholder" style="${escapeAttribute(style)}">Image</div>`;
  }

  return `
    <div class="slide-element" data-element-id="${escapeAttribute(element.id)}" data-kind="${element.kind}" data-locked="${element.locked}" data-selected="${selectedAttr}" data-editing="${editingAttr}" style="${escapeAttribute(baseStyle)}">
      ${body}
      ${handle}
    </div>
  `;
}

function textStyleForElement(
  element: TextSlideElement | ShapeSlideElement,
  options: Omit<SlideRenderOptions, "selectedIds"> & { selected?: boolean } = {},
) {
  return [
    `--text-color:${escapeAttribute(element.color)}`,
    `--font-size-cqw:${element.fontSize / 10}cqw`,
    `--font-weight:${element.fontWeight}`,
    `--font-style:${element.italic ? "italic" : "normal"}`,
    `--line-height:${element.lineHeight}`,
    `--text-align:${element.align}`,
    `--element-font:${options.resolveFontStack?.(element.fontFamily) ?? defaultFontStack}`,
  ].join(";");
}

function elementBaseStyle(element: SlideElement) {
  return [
    `--x:${element.x}`,
    `--y:${element.y}`,
    `--w:${element.width}`,
    `--h:${element.height}`,
    `--rotation:${element.rotation}`,
    `--opacity:${element.opacity}`,
  ].join(";");
}

function renderShapeElementBody(
  element: ShapeSlideElement,
  style: string,
  options: Omit<SlideRenderOptions, "selectedIds"> & { selected?: boolean } = {},
) {
  const label = renderShapeLabel(element, options);
  if (element.shape === "line") {
    return `<svg class="slide-shape" data-shape="${element.shape}" viewBox="0 0 100 100" preserveAspectRatio="none" style="${escapeAttribute(style)}" aria-hidden="true"><line class="slide-shape-line" x1="0" y1="50" x2="100" y2="50" /></svg>${label}`;
  }

  const rect = { x: 0, y: 0, width: 100, height: 100 };
  const path = pathCommandsToSvg(shapePathCommands(element.shape, rect, element.radius));
  const decorationPath = shapeDecorationPathCommands(element.shape, rect);
  const decoration = decorationPath
    ? `<path class="slide-shape-decoration" d="${escapeAttribute(pathCommandsToSvg(decorationPath))}" />`
    : "";

  return `<svg class="slide-shape" data-shape="${element.shape}" viewBox="0 0 100 100" preserveAspectRatio="none" style="${escapeAttribute(style)}" aria-hidden="true"><path class="slide-shape-fill" d="${escapeAttribute(path)}" />${decoration}</svg>${label}`;
}

function renderShapeLabel(
  element: ShapeSlideElement,
  options: Omit<SlideRenderOptions, "selectedIds"> & { selected?: boolean } = {},
) {
  const isEditing = options.editingTextElementId === element.id;
  if (!element.content && !isEditing) {
    return "";
  }

  const style = textStyleForElement(element, options);
  return `<div class="slide-shape-label slide-text" data-list-style="${element.listStyle}" data-align="${element.align}" data-valign="${element.verticalAlign}" style="${escapeAttribute(style)}"><div class="slide-text-content">${renderTextElementContent(element)}</div></div>`;
}

export function renderTextElementContent(element: TextSlideElement | ShapeSlideElement) {
  if (element.listStyle !== "bullet") {
    return escapeHtml(element.content);
  }

  const items = textListItems(element.content);
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

export function textListItems(content: string) {
  const items = content
    .split("\n")
    .map((line) => line.replace(/^\s*(?:[-*•]\s+|\d+[.)]\s+)/, "").trim())
    .filter(Boolean);
  return items.length > 0 ? items : [""];
}

export function getElementLabel(element: SlideElement, index: number) {
  if (element.kind === "text") {
    return element.content.trim().split(/\s+/).slice(0, 4).join(" ") || `Text ${index + 1}`;
  }

  if (element.kind === "image") {
    return element.alt || `Image ${index + 1}`;
  }

  if (element.content.trim()) {
    return element.content.trim().split(/\s+/).slice(0, 4).join(" ");
  }

  return `${element.shape[0].toUpperCase()}${element.shape.slice(1)} ${index + 1}`;
}
