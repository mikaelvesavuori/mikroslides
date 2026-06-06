import { readBlobAsDataUrl } from "../config/index.js";
import type {
  DeckAspectRatio,
  ImageSlideElement,
  MikroSlideRecord,
  ShapeSlideElement,
  SlideElement,
  TextSlideElement,
} from "../index.js";

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
  }

  if (element.kind === "image") {
    await drawImageElement(context, element, box);
  }

  context.restore();
}

function drawTextElement(
  context: CanvasRenderingContext2D,
  element: TextSlideElement,
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
  const lineHeight = fontSize * 1.14;
  context.save();
  context.beginPath();
  context.rect(0, 0, box.width, box.height);
  context.clip();
  context.fillStyle = element.color;
  context.font = `${element.italic ? "italic " : ""}${element.fontWeight} ${fontSize}px ${fontFamily}`;
  context.textAlign = element.align;
  context.textBaseline = "alphabetic";

  if (element.listStyle === "bullet") {
    drawBulletTextElement(context, element, box, fontSize, lineHeight);
    context.restore();
    return;
  }

  const lines = element.content
    .split("\n")
    .flatMap((paragraph) => wrapText(context, paragraph, box.width));
  const x = element.align === "center" ? box.width / 2 : element.align === "right" ? box.width : 0;
  let y = Math.max(fontSize, (box.height - lines.length * lineHeight) / 2 + fontSize);

  for (const line of lines) {
    context.fillText(line, x, y, box.width);
    y += lineHeight;
  }

  context.restore();
}

function drawBulletTextElement(
  context: CanvasRenderingContext2D,
  element: TextSlideElement,
  box: ElementBox,
  fontSize: number,
  lineHeight: number,
) {
  context.textAlign = "left";
  const bulletX = 0;
  const textX = fontSize * 0.82;
  const maxLineWidth = Math.max(1, box.width - textX);
  const itemLines = textListItems(element.content).map((item) =>
    wrapText(context, item, maxLineWidth),
  );
  const totalLines = itemLines.reduce((count, lines) => count + Math.max(1, lines.length), 0);
  let y = Math.max(fontSize, (box.height - totalLines * lineHeight) / 2 + fontSize);

  for (const lines of itemLines) {
    context.fillText("•", bulletX, y, textX * 0.8);
    for (const line of lines) {
      context.fillText(line, textX, y, maxLineWidth);
      y += lineHeight;
    }
  }
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
  const strokeWidth = Math.max(1, element.strokeWidth * scale);
  context.fillStyle = element.fill;
  context.strokeStyle = element.stroke;
  context.lineWidth = strokeWidth;

  if (element.shape === "line") {
    context.beginPath();
    context.moveTo(0, box.height / 2);
    context.lineTo(box.width, box.height / 2);
    context.stroke();
    return;
  }

  if (element.shape === "ellipse") {
    context.beginPath();
    context.ellipse(
      box.width / 2,
      box.height / 2,
      box.width / 2,
      box.height / 2,
      0,
      0,
      Math.PI * 2,
    );
    context.fill();
    context.stroke();
    return;
  }

  roundedRectPath(context, 0, 0, box.width, box.height, element.radius * scale);
  context.fill();
  context.stroke();
}

function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
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
