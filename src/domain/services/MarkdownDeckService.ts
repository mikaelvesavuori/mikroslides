import type {
  DeckAspectRatio,
  DeckTheme,
  ImageFit,
  MikroSlideRecord,
  SlideLayoutKind,
  SlideTransition,
} from "../../interfaces/index.js";
import {
  createBlankSlide,
  createImageElement,
  createShapeElement,
  createTextElement,
  defaultDeckTheme,
  MikroDeck,
} from "../entities/index.js";

type MarkdownDeckOptions = {
  aspectRatio?: DeckAspectRatio;
  theme?: DeckTheme;
  title?: string;
};

type MarkdownSlide = {
  background?: string;
  body: string[];
  imageAlt?: string;
  imageFit?: ImageFit;
  imageSrc?: string;
  layout?: SlideLayoutKind;
  notes: string[];
  skipped: boolean;
  title: string;
  transition: SlideTransition;
};

type ParsedMarkdownDeck = {
  aspectRatio?: DeckAspectRatio;
  deckTitle: string;
  slides: MarkdownSlide[];
  theme: DeckTheme;
};

const slideLayoutAliases: Record<string, SlideLayoutKind> = {
  blank: "blank",
  bullets: "bullets",
  chartdata: "chart-data",
  chart: "chart-data",
  closing: "closing",
  comparison: "comparison",
  imageleft: "image-left",
  image: "image-right",
  imageright: "image-right",
  quote: "quote",
  section: "section",
  statement: "statement",
  timeline: "timeline",
  title: "title",
  twocolumn: "two-column",
  twocolumns: "two-column",
};

const frontMatterKeys = new Set([
  "accent",
  "aspect",
  "aspectratio",
  "background",
  "muted",
  "surface",
  "text",
  "theme",
  "title",
]);

const slideMetaKeys = new Set([
  "alt",
  "background",
  "fit",
  "image",
  "layout",
  "skip",
  "skipped",
  "transition",
]);

function cleanMarkdownText(value: string) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function metadataKey(value: string) {
  return value.toLowerCase().replace(/[\s_-]+/g, "");
}

function readMetadataLine(line: string) {
  const match = line.match(/^([A-Za-z][A-Za-z0-9 _-]*):\s*(.*)$/);
  if (!match) {
    return null;
  }

  return {
    key: metadataKey(match[1]),
    value: match[2].trim(),
  };
}

function parseMetadataLines(lines: string[], keys: Set<string>) {
  const metadata: Record<string, string> = {};
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const field = readMetadataLine(line);
    if (!field || !keys.has(field.key)) {
      continue;
    }

    metadata[field.key] = field.value;
  }

  return metadata;
}

function takeLeadingMetadata(lines: string[]) {
  const metadata: Record<string, string> = {};
  let index = 0;

  for (; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) {
      continue;
    }

    const field = readMetadataLine(line);
    if (!field || !slideMetaKeys.has(field.key)) {
      break;
    }

    metadata[field.key] = field.value;
  }

  return {
    metadata,
    lines: lines.slice(index),
  };
}

function trimBlankLines(lines: string[]) {
  let start = 0;
  let end = lines.length;
  while (start < end && !lines[start].trim()) {
    start += 1;
  }
  while (end > start && !lines[end - 1].trim()) {
    end -= 1;
  }
  return lines.slice(start, end);
}

function readFrontMatter(markdown: string) {
  const normalized = markdown.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  if (lines[0]?.trim() !== "---") {
    return {
      metadata: {},
      markdown: normalized,
    };
  }

  const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (closingIndex < 0) {
    return {
      metadata: {},
      markdown: normalized,
    };
  }

  return {
    metadata: parseMetadataLines(lines.slice(1, closingIndex), frontMatterKeys),
    markdown: lines.slice(closingIndex + 1).join("\n"),
  };
}

function splitSlideBlocks(markdown: string) {
  if (/\n-{3,}\n/.test(markdown)) {
    return markdown
      .split(/\n-{3,}\n/g)
      .map((block) => trimBlankLines(block.split("\n")))
      .filter((block) => block.length > 0);
  }

  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of markdown.split("\n")) {
    const startsSlide = /^##\s+.+/.test(line.trim()) || /^#\s+.+/.test(line.trim());
    if (startsSlide && current.some((currentLine) => currentLine.trim())) {
      blocks.push(trimBlankLines(current));
      current = [line];
      continue;
    }

    current.push(line);
  }

  const finalBlock = trimBlankLines(current);
  if (finalBlock.length > 0) {
    blocks.push(finalBlock);
  }

  return blocks;
}

function readAspectRatio(value: string | undefined): DeckAspectRatio | undefined {
  return value === "16:9" || value === "4:3" || value === "1:1" ? value : undefined;
}

function readSlideLayout(value: string | undefined): SlideLayoutKind | undefined {
  if (!value) {
    return undefined;
  }

  return slideLayoutAliases[metadataKey(value)];
}

function readSlideTransition(value: string | undefined): SlideTransition {
  return value === "fade" || value === "slide" || value === "none" ? value : "none";
}

function readImageFit(value: string | undefined): ImageFit {
  return value === "contain" ? "contain" : "cover";
}

function readBoolean(value: string | undefined) {
  return /^(1|true|yes|y|skip|skipped)$/i.test(value ?? "");
}

function readTheme(metadata: Record<string, string>, fallback: DeckTheme) {
  return {
    ...fallback,
    accent: metadata.accent || fallback.accent,
    background: metadata.background || fallback.background,
    muted: metadata.muted || fallback.muted,
    surface: metadata.surface || fallback.surface,
    text: metadata.text || fallback.text,
  };
}

function isNoteLine(value: string) {
  return /^(notes?|speaker notes?|presenter notes?):\s*/i.test(value);
}

function noteText(value: string) {
  return value.replace(/^(notes?|speaker notes?|presenter notes?):\s*/i, "").trim();
}

function splitNotes(lines: string[]) {
  const body: string[] = [];
  const notes: string[] = [];
  let inNotes = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (inNotes) {
      notes.push(cleanMarkdownText(rawLine));
      continue;
    }

    if (isNoteLine(line)) {
      const firstNote = noteText(line);
      if (firstNote) {
        notes.push(cleanMarkdownText(firstNote));
      }
      inNotes = true;
      continue;
    }

    body.push(rawLine);
  }

  return {
    body: trimBlankLines(body),
    notes: trimBlankLines(notes),
  };
}

function extractHeading(lines: string[]) {
  const headingIndex = lines.findIndex((line) => /^#{1,6}\s+.+/.test(line.trim()));
  if (headingIndex >= 0) {
    return {
      title: cleanMarkdownText(lines[headingIndex].replace(/^#{1,6}\s+/, "")),
      lines: [...lines.slice(0, headingIndex), ...lines.slice(headingIndex + 1)],
    };
  }

  const firstTextIndex = lines.findIndex((line) => line.trim());
  if (firstTextIndex >= 0) {
    return {
      title: cleanMarkdownText(lines[firstTextIndex]),
      lines: [...lines.slice(0, firstTextIndex), ...lines.slice(firstTextIndex + 1)],
    };
  }

  return {
    title: "Untitled",
    lines,
  };
}

function normalizeBodyLine(value: string) {
  const line = value.trim();
  if (!line) {
    return "";
  }

  const quote = line.match(/^>\s?(.+)$/);
  if (quote) {
    return `> ${cleanMarkdownText(quote[1])}`;
  }

  const unordered = line.match(/^[-*+]\s+(.+)$/);
  if (unordered) {
    return `• ${cleanMarkdownText(unordered[1])}`;
  }

  const ordered = line.match(/^(\d+)[.)]\s+(.+)$/);
  if (ordered) {
    return `${ordered[1]}. ${cleanMarkdownText(ordered[2])}`;
  }

  return cleanMarkdownText(line);
}

function extractImage(lines: string[], metadata: Record<string, string>) {
  const body: string[] = [];
  let imageSrc = metadata.image || "";
  let imageAlt = metadata.alt || "";

  for (const rawLine of lines) {
    const image = rawLine.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (image) {
      imageAlt ||= cleanMarkdownText(image[1]);
      imageSrc ||= image[2].trim();
      continue;
    }

    body.push(rawLine);
  }

  return {
    body,
    imageAlt,
    imageSrc,
  };
}

function parseSlideBlock(block: string[], index: number): MarkdownSlide {
  const leading = takeLeadingMetadata(block);
  const withNotes = splitNotes(leading.lines);
  const heading = extractHeading(withNotes.body);
  const image = extractImage(heading.lines, leading.metadata);
  const body = image.body.map(normalizeBodyLine).filter(Boolean);
  const layout =
    readSlideLayout(leading.metadata.layout) ??
    (image.imageSrc ? "image-right" : index === 0 ? "title" : "bullets");

  return {
    background: leading.metadata.background,
    body,
    imageAlt: image.imageAlt,
    imageFit: readImageFit(leading.metadata.fit),
    imageSrc: image.imageSrc,
    layout,
    notes: withNotes.notes,
    skipped: readBoolean(leading.metadata.skip || leading.metadata.skipped),
    title: heading.title || `Slide ${index + 1}`,
    transition: readSlideTransition(leading.metadata.transition),
  };
}

function createTitleSlide(slide: MarkdownSlide, theme: DeckTheme): MikroSlideRecord {
  const subtitle = slide.body.slice(0, 3).join("\n");
  return createBlankSlide({
    title: slide.title,
    layout: "title",
    background: slide.background || theme.background,
    speakerNotes: slide.notes.join("\n"),
    skipped: slide.skipped,
    transition: slide.transition,
    elements: [
      createShapeElement({
        x: 10,
        y: 17,
        width: 8,
        height: 62,
        fill: theme.accent,
        stroke: theme.accent,
        radius: 4,
      }),
      createTextElement({
        content: slide.title,
        x: 23,
        y: subtitle ? 24 : 32,
        width: 58,
        height: 18,
        color: theme.text,
        fontSize: 48,
        fontWeight: 760,
      }),
      createTextElement({
        content: subtitle,
        x: 24,
        y: 48,
        width: 52,
        height: 18,
        color: theme.muted,
        fontSize: 22,
        fontWeight: 440,
      }),
    ].filter((element) => element.kind !== "text" || element.content),
  });
}

function createSectionSlide(slide: MarkdownSlide, theme: DeckTheme): MikroSlideRecord {
  return createBlankSlide({
    title: slide.title,
    layout: "section",
    background: slide.background || theme.text,
    speakerNotes: slide.notes.join("\n"),
    skipped: slide.skipped,
    transition: slide.transition,
    elements: [
      createTextElement({
        content: slide.title,
        x: 12,
        y: 34,
        width: 64,
        height: 18,
        color: theme.background,
        fontSize: 46,
        fontWeight: 760,
      }),
      createShapeElement({
        x: 12,
        y: 61,
        width: 44,
        height: 2,
        fill: theme.accent,
        stroke: theme.accent,
        radius: 2,
      }),
    ],
  });
}

function createStatementSlide(slide: MarkdownSlide, theme: DeckTheme): MikroSlideRecord {
  return createBlankSlide({
    title: slide.title,
    layout: "statement",
    background: slide.background || theme.background,
    speakerNotes: slide.notes.join("\n"),
    skipped: slide.skipped,
    transition: slide.transition,
    elements: [
      createTextElement({
        content: slide.body.join("\n") || slide.title,
        x: 12,
        y: 25,
        width: 76,
        height: 34,
        color: theme.text,
        fontSize: 46,
        fontWeight: 740,
        align: "center",
      }),
      createShapeElement({
        x: 42,
        y: 70,
        width: 16,
        height: 1.4,
        fill: theme.accent,
        stroke: theme.accent,
        radius: 1,
      }),
    ],
  });
}

function createQuoteSlide(slide: MarkdownSlide, theme: DeckTheme): MikroSlideRecord {
  const quote = slide.body.join("\n").replace(/^>\s?/, "") || slide.title;
  return createBlankSlide({
    title: slide.title,
    layout: "quote",
    background: slide.background || theme.background,
    speakerNotes: slide.notes.join("\n"),
    skipped: slide.skipped,
    transition: slide.transition,
    elements: [
      createShapeElement({
        x: 10,
        y: 17,
        width: 5,
        height: 58,
        fill: theme.accent,
        stroke: theme.accent,
        radius: 3,
      }),
      createTextElement({
        content: quote,
        x: 20,
        y: 23,
        width: 62,
        height: 28,
        color: theme.text,
        fontSize: 38,
        fontFamily: "serif",
        fontWeight: 620,
      }),
    ],
  });
}

function createImageSlide(slide: MarkdownSlide, theme: DeckTheme): MikroSlideRecord {
  const imageLeft = slide.layout === "image-left";
  return createBlankSlide({
    title: slide.title,
    layout: imageLeft ? "image-left" : "image-right",
    background: slide.background || theme.background,
    speakerNotes: slide.notes.join("\n"),
    skipped: slide.skipped,
    transition: slide.transition,
    elements: [
      createTextElement({
        content: slide.title,
        x: imageLeft ? 56 : 10,
        y: 20,
        width: 34,
        height: 14,
        color: theme.text,
        fontSize: 36,
        fontWeight: 740,
      }),
      createTextElement({
        content: slide.body.join("\n"),
        x: imageLeft ? 57 : 11,
        y: 43,
        width: 31,
        height: 24,
        color: theme.muted,
        fontSize: 22,
        fontWeight: 430,
        listStyle: listStyleForBody(slide.body),
      }),
      createImageElement({
        x: imageLeft ? 8 : 52,
        y: 11,
        width: imageLeft ? 42 : 40,
        height: 78,
        src: slide.imageSrc || "",
        alt: slide.imageAlt || "",
        fit: slide.imageFit,
      }),
    ].filter((element) => element.kind !== "text" || element.content),
  });
}

function listStyleForBody(lines: string[]) {
  const firstListLine = lines.find((line) => /^\s*(?:[-*•]|\d+[.)])\s+/.test(line));
  if (!firstListLine) {
    return "none";
  }
  return /^\s*\d+[.)]\s+/.test(firstListLine) ? "numbered" : "bullet";
}

function createBulletSlide(slide: MarkdownSlide, theme: DeckTheme): MikroSlideRecord {
  const body = slide.body.join("\n") || "Add supporting detail here.";
  return createBlankSlide({
    title: slide.title,
    layout: slide.layout || "bullets",
    background: slide.background || theme.background,
    speakerNotes: slide.notes.join("\n"),
    skipped: slide.skipped,
    transition: slide.transition,
    elements: [
      createTextElement({
        content: slide.title,
        x: 10,
        y: 10,
        width: 76,
        height: 12,
        color: theme.text,
        fontSize: 38,
        fontWeight: 740,
      }),
      createShapeElement({
        x: 10,
        y: 27,
        width: 13,
        height: 1.2,
        fill: theme.accent,
        stroke: theme.accent,
        radius: 1,
      }),
      createTextElement({
        content: body,
        x: 12,
        y: 35,
        width: 70,
        height: 42,
        color: theme.text,
        fontSize: body.length > 170 ? 21 : 25,
        fontWeight: 430,
        listStyle: "bullet",
      }),
    ],
  });
}

function createSlide(slide: MarkdownSlide, theme: DeckTheme) {
  if (slide.layout === "title") {
    return createTitleSlide(slide, theme);
  }
  if (slide.layout === "section") {
    return createSectionSlide(slide, theme);
  }
  if (slide.layout === "statement") {
    return createStatementSlide(slide, theme);
  }
  if (slide.layout === "quote") {
    return createQuoteSlide(slide, theme);
  }
  if (slide.layout === "image-left" || slide.layout === "image-right" || slide.imageSrc) {
    return createImageSlide(slide, theme);
  }

  return createBulletSlide(slide, theme);
}

function parseMarkdownDeck(
  markdown: string,
  options: MarkdownDeckOptions = {},
): ParsedMarkdownDeck {
  const frontMatter = readFrontMatter(markdown);
  const metadata = frontMatter.metadata;
  const theme = readTheme(metadata, options.theme ?? defaultDeckTheme);
  const blocks = splitSlideBlocks(frontMatter.markdown);
  const parsedSlides = blocks.map(parseSlideBlock);
  const firstSlideTitle = parsedSlides[0]?.title || "Untitled Deck";
  const deckTitle = options.title || metadata.title || firstSlideTitle;

  return {
    aspectRatio: options.aspectRatio ?? readAspectRatio(metadata.aspect || metadata.aspectratio),
    deckTitle,
    slides: parsedSlides.length
      ? parsedSlides
      : [
          {
            body: [],
            layout: "title",
            notes: [],
            skipped: false,
            title: deckTitle,
            transition: "none",
          },
        ],
    theme,
  };
}

/**
 * Converts the documented MikroSlides Markdown authoring format into a deck.
 */
export class MarkdownDeckService {
  createDeckFromMarkdown(markdown: string, options: MarkdownDeckOptions = {}) {
    const parsed = parseMarkdownDeck(markdown, options);
    const slides = parsed.slides.map((slide) => createSlide(slide, parsed.theme));

    return MikroDeck.create({
      title: parsed.deckTitle,
      slides,
      aspectRatio: parsed.aspectRatio,
      theme: parsed.theme,
    }).toRecord();
  }

  looksLikeMarkdownDeck(markdown: string) {
    const text = markdown.trim();
    return (
      /^---\s*[\s\S]*?\n---/m.test(text) || /^#{1,2}\s+.+/m.test(text) || /\n-{3,}\n/.test(text)
    );
  }
}
