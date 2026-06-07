import type { SlideShapeKind } from "../index.js";

type Rect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type MoveCommand = {
  kind: "move";
  x: number;
  y: number;
};

type LineCommand = {
  kind: "line";
  x: number;
  y: number;
};

type CurveCommand = {
  kind: "curve";
  x: number;
  x1: number;
  x2: number;
  y: number;
  y1: number;
  y2: number;
};

type CloseCommand = {
  kind: "close";
};

export type ShapePathCommand = MoveCommand | LineCommand | CurveCommand | CloseCommand;

const ellipseKappa = 0.5522847498307936;

export const slideShapeKinds = [
  "rect",
  "ellipse",
  "diamond",
  "triangle",
  "capsule",
  "document",
  "database",
  "parallelogram",
  "trapezoid",
  "hexagon",
  "octagon",
  "chevron",
  "line",
] as const satisfies readonly SlideShapeKind[];

export function isSlideShapeKind(value: unknown): value is SlideShapeKind {
  return typeof value === "string" && slideShapeKinds.includes(value as SlideShapeKind);
}

export function shapePathCommands(
  shape: SlideShapeKind,
  rect: Rect,
  radius = 8,
): ShapePathCommand[] {
  const { x, y, width, height } = rect;
  const right = x + width;
  const bottom = y + height;
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  if (shape === "ellipse") {
    return ellipsePath(centerX, centerY, width / 2, height / 2);
  }

  if (shape === "diamond") {
    return polygonPath([
      { x: centerX, y },
      { x: right, y: centerY },
      { x: centerX, y: bottom },
      { x, y: centerY },
    ]);
  }

  if (shape === "triangle") {
    return polygonPath([
      { x: centerX, y },
      { x: right, y: bottom },
      { x, y: bottom },
    ]);
  }

  if (shape === "capsule") {
    return roundedRectPath(rect, height / 2);
  }

  if (shape === "document") {
    const waveTop = bottom - Math.min(20, height * 0.18);
    const waveMid = bottom - Math.min(7, height * 0.06);
    const waveLow = bottom - Math.min(12, height * 0.1);
    return [
      { kind: "move", x, y },
      { kind: "line", x: right, y },
      { kind: "line", x: right, y: waveTop },
      {
        kind: "curve",
        x1: x + width * 0.72,
        y1: waveMid,
        x2: x + width * 0.54,
        y2: waveLow,
        x: centerX,
        y: waveTop,
      },
      {
        kind: "curve",
        x1: x + width * 0.32,
        y1: bottom - 30,
        x2: x + width * 0.18,
        y2: bottom - 20,
        x,
        y: bottom - 10,
      },
      { kind: "close" },
    ];
  }

  if (shape === "database") {
    const ellipseHeight = databaseEllipseHeight(height);
    const topCenter = y + ellipseHeight / 2;
    const bottomCenter = bottom - ellipseHeight / 2;
    return [
      { kind: "move", x, y: topCenter },
      { kind: "curve", x1: x, y1: y + 1, x2: right, y2: y + 1, x: right, y: topCenter },
      { kind: "line", x: right, y: bottomCenter },
      {
        kind: "curve",
        x1: right,
        y1: bottom - 1,
        x2: x,
        y2: bottom - 1,
        x,
        y: bottomCenter,
      },
      { kind: "close" },
    ];
  }

  if (shape === "parallelogram") {
    const skew = Math.min(34, width * 0.22);
    return polygonPath([
      { x: x + skew, y },
      { x: right, y },
      { x: right - skew, y: bottom },
      { x, y: bottom },
    ]);
  }

  if (shape === "trapezoid") {
    const inset = Math.min(34, width * 0.22);
    return polygonPath([
      { x: x + inset, y },
      { x: right - inset, y },
      { x: right, y: bottom },
      { x, y: bottom },
    ]);
  }

  if (shape === "hexagon") {
    const inset = Math.min(34, width * 0.22);
    return polygonPath([
      { x: x + inset, y },
      { x: right - inset, y },
      { x: right, y: centerY },
      { x: right - inset, y: bottom },
      { x: x + inset, y: bottom },
      { x, y: centerY },
    ]);
  }

  if (shape === "octagon") {
    const inset = Math.min(width, height) * 0.24;
    return polygonPath([
      { x: x + inset, y },
      { x: right - inset, y },
      { x: right, y: y + inset },
      { x: right, y: bottom - inset },
      { x: right - inset, y: bottom },
      { x: x + inset, y: bottom },
      { x, y: bottom - inset },
      { x, y: y + inset },
    ]);
  }

  if (shape === "chevron") {
    const notch = Math.min(44, width * 0.28);
    const pointInset = Math.min(52, width * 0.32);
    return polygonPath([
      { x, y },
      { x: right - pointInset, y },
      { x: right, y: centerY },
      { x: right - pointInset, y: bottom },
      { x, y: bottom },
      { x: x + notch, y: centerY },
    ]);
  }

  return roundedRectPath(rect, shape === "rect" ? radius : 0);
}

export function shapeDecorationPathCommands(
  shape: SlideShapeKind,
  rect: Rect,
): ShapePathCommand[] | null {
  if (shape !== "database") {
    return null;
  }

  const ellipseHeight = databaseEllipseHeight(rect.height);
  return ellipsePath(
    rect.x + rect.width / 2,
    rect.y + ellipseHeight / 2,
    rect.width / 2,
    ellipseHeight / 2,
  );
}

export function pathCommandsToSvg(commands: ShapePathCommand[]) {
  return commands
    .map((command) => {
      if (command.kind === "move") {
        return `M${command.x} ${command.y}`;
      }
      if (command.kind === "line") {
        return `L${command.x} ${command.y}`;
      }
      if (command.kind === "curve") {
        return `C${command.x1} ${command.y1} ${command.x2} ${command.y2} ${command.x} ${command.y}`;
      }
      return "Z";
    })
    .join(" ");
}

export function tracePathCommands(
  context: Pick<CanvasRenderingContext2D, "bezierCurveTo" | "closePath" | "lineTo" | "moveTo">,
  commands: ShapePathCommand[],
) {
  for (const command of commands) {
    if (command.kind === "move") {
      context.moveTo(command.x, command.y);
    } else if (command.kind === "line") {
      context.lineTo(command.x, command.y);
    } else if (command.kind === "curve") {
      context.bezierCurveTo(command.x1, command.y1, command.x2, command.y2, command.x, command.y);
    } else {
      context.closePath();
    }
  }
}

function databaseEllipseHeight(height: number) {
  return Math.min(32, Math.max(18, height * 0.24));
}

function roundedRectPath(rect: Rect, radius: number): ShapePathCommand[] {
  const { x, y, width, height } = rect;
  const right = x + width;
  const bottom = y + height;
  const safeRadius = Math.min(radius, width / 2, height / 2);
  const control = safeRadius * ellipseKappa;

  return [
    { kind: "move", x: x + safeRadius, y },
    { kind: "line", x: right - safeRadius, y },
    {
      kind: "curve",
      x1: right - safeRadius + control,
      y1: y,
      x2: right,
      y2: y + safeRadius - control,
      x: right,
      y: y + safeRadius,
    },
    { kind: "line", x: right, y: bottom - safeRadius },
    {
      kind: "curve",
      x1: right,
      y1: bottom - safeRadius + control,
      x2: right - safeRadius + control,
      y2: bottom,
      x: right - safeRadius,
      y: bottom,
    },
    { kind: "line", x: x + safeRadius, y: bottom },
    {
      kind: "curve",
      x1: x + safeRadius - control,
      y1: bottom,
      x2: x,
      y2: bottom - safeRadius + control,
      x,
      y: bottom - safeRadius,
    },
    { kind: "line", x, y: y + safeRadius },
    {
      kind: "curve",
      x1: x,
      y1: y + safeRadius - control,
      x2: x + safeRadius - control,
      y2: y,
      x: x + safeRadius,
      y,
    },
    { kind: "close" },
  ];
}

function ellipsePath(cx: number, cy: number, rx: number, ry: number): ShapePathCommand[] {
  const controlX = rx * ellipseKappa;
  const controlY = ry * ellipseKappa;
  return [
    { kind: "move", x: cx + rx, y: cy },
    {
      kind: "curve",
      x1: cx + rx,
      y1: cy + controlY,
      x2: cx + controlX,
      y2: cy + ry,
      x: cx,
      y: cy + ry,
    },
    {
      kind: "curve",
      x1: cx - controlX,
      y1: cy + ry,
      x2: cx - rx,
      y2: cy + controlY,
      x: cx - rx,
      y: cy,
    },
    {
      kind: "curve",
      x1: cx - rx,
      y1: cy - controlY,
      x2: cx - controlX,
      y2: cy - ry,
      x: cx,
      y: cy - ry,
    },
    {
      kind: "curve",
      x1: cx + controlX,
      y1: cy - ry,
      x2: cx + rx,
      y2: cy - controlY,
      x: cx + rx,
      y: cy,
    },
    { kind: "close" },
  ];
}

function polygonPath(points: Array<{ x: number; y: number }>): ShapePathCommand[] {
  const [first, ...rest] = points;
  if (!first) {
    return [];
  }

  return [
    { kind: "move", x: first.x, y: first.y },
    ...rest.map((point): ShapePathCommand => ({ kind: "line", x: point.x, y: point.y })),
    { kind: "close" },
  ];
}
