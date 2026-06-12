import type { SlideShapeKind } from "../index.js";
import { escapeAttribute } from "./htmlEscape.js";

export type ShapeSelectorTool = SlideShapeKind | "arrow";

export const shapeSelectorDefinitions: Record<
  ShapeSelectorTool,
  { icon: string; label: string; shortcut?: string }
> = {
  rect: { label: "Rectangle", icon: "#icon-rectangle", shortcut: "R" },
  ellipse: { label: "Ellipse", icon: "#icon-ellipse", shortcut: "O" },
  diamond: { label: "Diamond", icon: "#icon-diamond", shortcut: "D" },
  triangle: { label: "Triangle", icon: "#icon-triangle" },
  capsule: { label: "Capsule", icon: "#icon-capsule" },
  document: { label: "Document", icon: "#icon-document-shape" },
  database: { label: "Database", icon: "#icon-database-shape" },
  parallelogram: { label: "Parallelogram", icon: "#icon-parallelogram" },
  trapezoid: { label: "Trapezoid", icon: "#icon-trapezoid" },
  hexagon: { label: "Hexagon", icon: "#icon-hexagon" },
  octagon: { label: "Octagon", icon: "#icon-octagon" },
  chevron: { label: "Chevron", icon: "#icon-chevron-shape" },
  line: { label: "Line", icon: "#icon-line" },
  arrow: { label: "Arrow", icon: "#icon-arrow" },
};

export const shapeSelectorTools = Object.keys(shapeSelectorDefinitions) as ShapeSelectorTool[];

export function isShapeSelectorTool(value: unknown): value is ShapeSelectorTool {
  return typeof value === "string" && value in shapeSelectorDefinitions;
}

export function shapeSelectorTitle(shape: ShapeSelectorTool) {
  const definition = shapeSelectorDefinitions[shape];
  return definition.shortcut ? `${definition.label} (${definition.shortcut})` : definition.label;
}

export function renderShapeSelector(options: {
  activeShape: ShapeSelectorTool;
  currentShapeIcon: SVGUseElement;
  shapeOptions: HTMLElement;
}) {
  const activeDefinition = shapeSelectorDefinitions[options.activeShape];
  options.currentShapeIcon.setAttribute("href", activeDefinition.icon);
  options.shapeOptions.innerHTML = shapeSelectorTools
    .map((shape) => {
      const definition = shapeSelectorDefinitions[shape];
      const title = shapeSelectorTitle(shape);
      const active = shape === options.activeShape;
      return `<button class="shape-option${active ? " is-active" : ""}" type="button" data-shape-tool="${shape}" title="${escapeAttribute(title)}" aria-label="${escapeAttribute(definition.label)}" aria-pressed="${active}">
        <svg class="icon" aria-hidden="true"><use href="${escapeAttribute(definition.icon)}"></use></svg>
      </button>`;
    })
    .join("");
}
