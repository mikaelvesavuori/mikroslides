import { readBlobAsDataUrl } from "../config/index.js";
import type {
  DeckAspectRatio,
  ImageSlideElement,
  MikroSlideRecord,
  ShapeArrowHead,
  ShapeSlideElement,
  SlideElement,
  TextSlideElement,
} from "../index.js";
import {
  shapeDecorationPathCommands,
  shapePathCommands,
  tracePathCommands,
} from "./shapeGeometry.js";

type PngExportOptions = {
  resolveFontFamily?: (fontFamily: TextSlideElement["fontFamily"]) => string;
  scale?: number;
};

type SlideDimensions = {
  height: number;
  width: number;
};

type ElementBox = {
  height: number;
  width: number;
};

const baseSlideWidths: Record<DeckAspectRatio, SlideDimensions> = {
  "16:9": { width: 960, height: 540 },
  "4:3": { width: 960, height: 720 },
  "1:1": { width: 960, height: 960 },
};

function dimensionsForAspect(aspectRatio: DeckAspectRatio, scale: number) {
  const dimensions = baseSlideWidths[aspectRatio];
  return {
    width: Math.round(dimensions.width * scale),
    height: Math.round(dimensions.height * scale),
  };
}

function isFetchableImageSource(src: string) {
  if (!src || src.startsWith("data:") || src.startsWith("asset:")) {
    return false;
  }

  try {
    const url = new URL(src, window.location.href);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function imageSourceToRenderableUrl(src: string) {
  if (!isFetchableImageSource(src)) {
    return src;
  }

  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`Could not load image for PNG export: ${src}`);
  }

  return readBlobAsDataUrl(await response.blob());
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not render slide image"));
    image.src = src;
  });
}

function elementBox(element: SlideElement, slide: SlideDimensions) {
  return {
    x: (element.x / 100) * slide.width,
    y: (element.y / 100) * slide.height,
    width: (element.width / 100) * slide.width,
    height: (element.height / 100) * slide.height,
  };
}

async function drawElement(
  context: CanvasRenderingContext2D,
  element: SlideElement,
  slide: SlideDimensions,
  scale: number,
  options: PngExportOptions,
) {
  const box = elementBox(element, slide);
  context.save();
  context.globalAlpha = Math.max(0, Math.min(1, element.opacity));
  context.translate(box.x + box.width / 2, box.y + box.height / 2);
  context.rotate((element.rotation * Math.PI) / 180);
  context.translate(-box.width / 2, -box.height / 2);

  if (element.kind === "text") {
    drawTextElement(context, element, box, slide, scale, options);
  }

  if (element.kind === "shape") {
    drawShapeElement(context, element, box, scale);
    if (element.content) {
      drawTextElement(context, element, box, slide, scale, options);
    }
  }

  if (element.kind === "image") {
    await drawImageElement(context, element, box);
  }

  context.restore();
}

function drawTextElement(
  context: CanvasRenderingContext2D,
  element: TextSlideElement | ShapeSlideElement,
  box: ElementBox,
  slide: SlideDimensions,
  scale: number,
  options: PngExportOptions,
) {
  const fontSize = Math.max(
    8 * scale,
    Math.min(120 * scale, (element.fontSize * slide.width) / 1000),
  );
  const fontFamily =
    options.resolveFontFamily?.(element.fontFamily) ??
    (element.fontFamily === "serif"
      ? "Georgia, Cambria, serif"
      : element.fontFamily === "mono"
        ? '"SFMono-Regular", Consolas, monospace'
        : 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif');
  const lineHeight = fontSize * element.lineHeight;
  context.save();
  context.beginPath();
  context.rect(0, 0, box.width, box.height);
  context.clip();
  context.fillStyle = element.color;
  context.font = `${element.italic ? "italic " : ""}${element.fontWeight} ${fontSize}px ${fontFamily}`;
  context.textAlign = element.align;
  context.textBaseline = "alphabetic";

  if (element.listStyle !== "none") {
    drawListTextElement(context, element, box, fontSize, lineHeight);
    context.restore();
    return;
  }

  const lines = element.content
    .split("\n")
    .flatMap((paragraph) => wrapText(context, paragraph, box.width));
  const x = element.align === "center" ? box.width / 2 : element.align === "right" ? box.width : 0;
  let y = textBlockStartY(element, box, Math.max(1, lines.length), fontSize, lineHeight);

  for (const line of lines) {
    context.fillText(line, x, y, box.width);
    y += lineHeight;
  }

  context.restore();
}

function drawListTextElement(
  context: CanvasRenderingContext2D,
  element: TextSlideElement | ShapeSlideElement,
  box: ElementBox,
  fontSize: number,
  lineHeight: number,
) {
  context.textAlign = "left";
  const markerX = 0;
  const textX = element.listStyle === "numbered" ? fontSize * 1.35 : fontSize * 0.82;
  const maxLineWidth = Math.max(1, box.width - textX);
  const itemLines = textListItems(element.content).map((item) =>
    wrapText(context, item, maxLineWidth),
  );
  const totalLines = itemLines.reduce((count, lines) => count + Math.max(1, lines.length), 0);
  let y = textBlockStartY(element, box, Math.max(1, totalLines), fontSize, lineHeight);

  for (let index = 0; index < itemLines.length; index += 1) {
    const lines = itemLines[index] ?? [""];
    const marker = element.listStyle === "numbered" ? `${index + 1}.` : "•";
    context.fillText(marker, markerX, y, textX * 0.8);
    for (const line of lines) {
      context.fillText(line, textX, y, maxLineWidth);
      y += lineHeight;
    }
  }
}

function textBlockStartY(
  element: TextSlideElement | ShapeSlideElement,
  box: ElementBox,
  lineCount: number,
  fontSize: number,
  lineHeight: number,
) {
  if (element.verticalAlign === "top") {
    return fontSize;
  }

  const contentHeight = lineCount * lineHeight;
  if (element.verticalAlign === "bottom") {
    return Math.max(fontSize, box.height - contentHeight + fontSize);
  }

  return Math.max(fontSize, (box.height - contentHeight) / 2 + fontSize);
}

function textListItems(content: string) {
  const items = content
    .split("\n")
    .map((line) => line.replace(/^\s*(?:[-*•]\s+|\d+[.)]\s+)/, "").trim())
    .filter(Boolean);
  return items.length > 0 ? items : [""];
}

function wrapText(context: CanvasRenderingContext2D, value: string, maxWidth: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [""];
  }

  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const nextLine = line ? `${line} ${word}` : word;
    if (line && context.measureText(nextLine).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = nextLine;
    }
  }

  lines.push(line);
  return lines;
}

function drawShapeElement(
  context: CanvasRenderingContext2D,
  element: ShapeSlideElement,
  box: ElementBox,
  scale: number,
) {
  const strokeWidth = Math.max(0, element.strokeWidth * scale);
  const hasFill = !isNonePaint(element.fill);
  const hasStroke = !isNonePaint(element.stroke) && strokeWidth > 0;
  if (hasFill) {
    context.fillStyle = element.fill;
  }
  if (hasStroke) {
    context.strokeStyle = element.stroke;
  }
  context.lineWidth = strokeWidth;

  if (element.shape === "line") {
    if (!hasStroke) {
      return;
    }
    context.beginPath();
    const headInset = Math.min(box.width / 2, Math.max(10 * scale, strokeWidth * 4.4));
    const startX = hasArrowHead(element.arrowHead, "start") ? headInset : 0;
    const endX = hasArrowHead(element.arrowHead, "end") ? box.width - headInset : box.width;
    context.moveTo(startX, box.height / 2);
    context.lineTo(endX, box.height / 2);
    context.stroke();
    drawLineArrowHeads(context, element.arrowHead, element.stroke, box, headInset);
    return;
  }

  context.beginPath();
  tracePathCommands(
    context,
    shapePathCommands(
      element.shape,
      { x: 0, y: 0, width: box.width, height: box.height },
      element.radius * scale,
    ),
  );
  if (hasFill) {
    context.fill();
  }
  if (hasStroke) {
    context.stroke();
  }

  const decoration = shapeDecorationPathCommands(element.shape, {
    x: 0,
    y: 0,
    width: box.width,
    height: box.height,
  });
  if (decoration && hasStroke) {
    context.beginPath();
    tracePathCommands(context, decoration);
    context.stroke();
  }
}

function drawLineArrowHeads(
  context: CanvasRenderingContext2D,
  arrowHead: ShapeArrowHead,
  color: string,
  box: ElementBox,
  size: number,
) {
  context.fillStyle = color;
  if (hasArrowHead(arrowHead, "start")) {
    drawArrowTriangle(context, { x: 0, y: box.height / 2 }, 0, size);
  }
  if (hasArrowHead(arrowHead, "end")) {
    drawArrowTriangle(context, { x: box.width, y: box.height / 2 }, Math.PI, size);
  }
}

function drawArrowTriangle(
  context: CanvasRenderingContext2D,
  tip: { x: number; y: number },
  angle: number,
  size: number,
) {
  const wing = 0.58;
  const left = {
    x: tip.x + Math.cos(angle - wing) * size,
    y: tip.y + Math.sin(angle - wing) * size,
  };
  const right = {
    x: tip.x + Math.cos(angle + wing) * size,
    y: tip.y + Math.sin(angle + wing) * size,
  };
  context.beginPath();
  context.moveTo(tip.x, tip.y);
  context.lineTo(left.x, left.y);
  context.lineTo(right.x, right.y);
  context.closePath();
  context.fill();
}

function hasArrowHead(arrowHead: ShapeArrowHead, endpoint: "start" | "end") {
  return arrowHead === "both" || arrowHead === endpoint;
}

function isNonePaint(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized === "none" || normalized === "transparent";
}

async function drawImageElement(
  context: CanvasRenderingContext2D,
  element: ImageSlideElement,
  box: ElementBox,
) {
  if (!element.src || element.src.startsWith("asset:")) {
    drawImagePlaceholder(context, box);
    return;
  }

  const image = await loadImage(await imageSourceToRenderableUrl(element.src));
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const boxRatio = box.width / box.height;

  if (element.fit === "contain") {
    const drawWidth = imageRatio > boxRatio ? box.width : box.height * imageRatio;
    const drawHeight = imageRatio > boxRatio ? box.width / imageRatio : box.height;
    context.drawImage(
      image,
      (box.width - drawWidth) / 2,
      (box.height - drawHeight) / 2,
      drawWidth,
      drawHeight,
    );
    return;
  }

  const sourceWidth = imageRatio > boxRatio ? image.naturalHeight * boxRatio : image.naturalWidth;
  const sourceHeight = imageRatio > boxRatio ? image.naturalHeight : image.naturalWidth / boxRatio;
  context.drawImage(
    image,
    (image.naturalWidth - sourceWidth) / 2,
    (image.naturalHeight - sourceHeight) / 2,
    sourceWidth,
    sourceHeight,
    0,
    0,
    box.width,
    box.height,
  );
}

function drawImagePlaceholder(context: CanvasRenderingContext2D, box: ElementBox) {
  context.save();
  context.fillStyle = "#f1f5f9";
  context.strokeStyle = "#94a3b8";
  context.setLineDash([8, 8]);
  context.fillRect(0, 0, box.width, box.height);
  context.strokeRect(0, 0, box.width, box.height);
  context.fillStyle = "#64748b";
  context.font = `${Math.max(12, box.width / 16)}px system-ui, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("Image", box.width / 2, box.height / 2, box.width - 16);
  context.restore();
}

function encodePng(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error("Could not encode PNG"));
    }, "image/png");
  });
}

export async function renderSlideToPng(
  slide: MikroSlideRecord,
  aspectRatio: DeckAspectRatio,
  options: PngExportOptions = {},
) {
  const scale = options.scale ?? 2;
  const dimensions = dimensionsForAspect(aspectRatio, scale);
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas export is unavailable");
  }

  context.fillStyle = slide.background || "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (const element of slide.elements) {
    await drawElement(context, element, dimensions, scale, options);
  }

  return encodePng(canvas);
}
