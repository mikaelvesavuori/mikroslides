import type {
  DeckTheme,
  ImageSlideElement,
  MikroDeckRecord,
  MikroSlideRecord,
  SlideElement,
  SlideLayoutKind,
} from "../../interfaces/index.js";
import {
  createBlankSlide,
  createImageElement,
  createShapeElement,
  createTextElement,
  MikroDeck,
} from "../entities/index.js";

type SlideStory = {
  image: ImageSlideElement | null;
  lines: string[];
  title: string;
};

const closingPattern = /\b(thank|questions|next steps|wrap|close|summary)\b/i;
const comparisonPattern = /\b(vs\.?|versus|pros?|cons?|option a|option b|before|after)\b/i;
const metricPattern = /[%$€£]|\b(metric|kpi|revenue|growth|cost|users|conversion|retention)\b/i;
const timelinePattern = /\b(roadmap|timeline|steps?|phase|milestone|pilot|rollout|launch)\b/i;

function cleanLine(value: string) {
  return value
    .replace(/^[-*+]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .replace(/^>\s?/, "")
    .trim();
}

function toBullet(value: string) {
  const clean = cleanLine(value);
  return value.trim().startsWith("•") ? value.trim() : `• ${clean}`;
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function textElements(slide: MikroSlideRecord) {
  return slide.elements.filter((element) => element.kind === "text");
}

function firstImage(slide: MikroSlideRecord) {
  return (
    slide.elements.find((element): element is ImageSlideElement => element.kind === "image") ?? null
  );
}

function fontToken(value: DeckTheme["fontBody"]) {
  if (value === "system-serif") {
    return "serif";
  }

  if (value === "system-mono") {
    return "mono";
  }

  return "system";
}

function storyForSlide(slide: MikroSlideRecord): SlideStory {
  const title = slide.title.trim() || "Untitled";
  const titleLower = title.toLowerCase();
  const lines = textElements(slide)
    .flatMap((element) => splitLines(element.content))
    .filter((line, index) => index > 0 || line.toLowerCase() !== titleLower)
    .filter((line) => line.toLowerCase() !== titleLower);

  return {
    image: firstImage(slide),
    lines,
    title,
  };
}

function inferLayout(story: SlideStory, slide: MikroSlideRecord, index: number, total: number) {
  const joined = `${story.title} ${story.lines.join(" ")}`;
  if (index === 0 || slide.layout === "title") {
    return "title";
  }

  if (story.lines.length === 0) {
    return "section";
  }

  if (story.image) {
    return index % 2 === 0 ? "image-right" : "image-left";
  }

  if (slide.layout !== "blank" && slide.layout !== "bullets") {
    return slide.layout;
  }

  if (closingPattern.test(story.title) && index === total - 1) {
    return "closing";
  }

  if (story.lines.some((line) => line.trim().startsWith(">") || /^["“]/.test(cleanLine(line)))) {
    return "quote";
  }

  if (comparisonPattern.test(joined)) {
    return "comparison";
  }

  if (
    timelinePattern.test(joined) ||
    story.lines.filter((line) => /^\d+[.)]\s+/.test(line)).length >= 2
  ) {
    return "timeline";
  }

  if (metricPattern.test(joined)) {
    return "chart-data";
  }

  if (story.lines.length === 1 && cleanLine(story.lines[0]).length <= 120) {
    return "statement";
  }

  if (story.lines.length >= 6) {
    return "two-column";
  }

  return "bullets";
}

function slideShell(
  slide: MikroSlideRecord,
  layout: SlideLayoutKind,
  theme: DeckTheme,
  elements: SlideElement[],
) {
  return createBlankSlide({
    ...slide,
    layout,
    background: theme.background,
    elements,
  });
}

function titleSlide(slide: MikroSlideRecord, story: SlideStory, theme: DeckTheme) {
  const subtitle = story.lines.map(cleanLine).filter(Boolean).slice(0, 2).join("\n");
  return slideShell(slide, "title", theme, [
    createShapeElement({
      x: 8,
      y: 16,
      width: 8,
      height: 62,
      fill: theme.accent,
      stroke: theme.accent,
      radius: 4,
    }),
    createShapeElement({
      x: 78,
      y: 15,
      width: 10,
      height: 10,
      shape: "ellipse",
      fill: theme.surface,
      stroke: theme.accent,
      strokeWidth: 2,
    }),
    createShapeElement({
      x: 77,
      y: 72,
      width: 13,
      height: 3,
      fill: theme.accent,
      stroke: theme.accent,
      radius: 3,
    }),
    createTextElement({
      content: story.title,
      x: 22,
      y: subtitle ? 25 : 32,
      width: 58,
      height: 18,
      color: theme.text,
      fontFamily: fontToken(theme.fontHeading),
      fontSize: 52,
      fontWeight: 780,
    }),
    createTextElement({
      content: subtitle || "A focused local-first presentation.",
      x: 23,
      y: 50,
      width: 48,
      height: 14,
      color: theme.muted,
      fontFamily: fontToken(theme.fontBody),
      fontSize: 22,
      fontWeight: 440,
    }),
  ]);
}

function sectionSlide(slide: MikroSlideRecord, story: SlideStory, theme: DeckTheme) {
  return slideShell(slide, "section", theme, [
    createShapeElement({
      x: 8,
      y: 25,
      width: 76,
      height: 1.3,
      fill: theme.accent,
      stroke: theme.accent,
      radius: 2,
    }),
    createTextElement({
      content: story.title,
      x: 12,
      y: 36,
      width: 66,
      height: 18,
      color: theme.text,
      fontFamily: fontToken(theme.fontHeading),
      fontSize: 48,
      fontWeight: 760,
      align: "center",
    }),
  ]);
}

function statementSlide(slide: MikroSlideRecord, story: SlideStory, theme: DeckTheme) {
  const statement = cleanLine(story.lines[0] ?? story.title);
  return slideShell(slide, "statement", theme, [
    createShapeElement({
      x: 10,
      y: 18,
      width: 6,
      height: 55,
      fill: theme.accent,
      stroke: theme.accent,
      radius: 4,
    }),
    createTextElement({
      content: statement,
      x: 20,
      y: 25,
      width: 62,
      height: 34,
      color: theme.text,
      fontFamily: fontToken(theme.fontHeading),
      fontSize: statement.length > 90 ? 36 : 44,
      fontWeight: 760,
      align: "center",
    }),
    createTextElement({
      content: story.title,
      x: 31,
      y: 72,
      width: 38,
      height: 8,
      color: theme.muted,
      fontSize: 15,
      fontWeight: 560,
      align: "center",
    }),
  ]);
}

function bulletSlide(slide: MikroSlideRecord, story: SlideStory, theme: DeckTheme) {
  const bullets = story.lines.length
    ? story.lines.map(toBullet).join("\n")
    : "• Add supporting detail";
  return slideShell(slide, "bullets", theme, [
    createTextElement({
      content: story.title,
      x: 9,
      y: 9,
      width: 72,
      height: 11,
      color: theme.text,
      fontFamily: fontToken(theme.fontHeading),
      fontSize: 35,
      fontWeight: 760,
    }),
    createShapeElement({
      x: 9,
      y: 25,
      width: 15,
      height: 1.2,
      fill: theme.accent,
      stroke: theme.accent,
      radius: 2,
    }),
    createShapeElement({
      x: 10,
      y: 32,
      width: 76,
      height: 48,
      fill: theme.surface,
      stroke: theme.surface,
      radius: 5,
      opacity: 0.72,
    }),
    createTextElement({
      content: bullets,
      x: 14,
      y: 38,
      width: 66,
      height: 35,
      color: theme.text,
      fontFamily: fontToken(theme.fontBody),
      fontSize: bullets.length > 210 ? 20 : 24,
      fontWeight: 440,
    }),
  ]);
}

function twoColumnSlide(slide: MikroSlideRecord, story: SlideStory, theme: DeckTheme) {
  const midpoint = Math.ceil(story.lines.length / 2);
  const left = story.lines.slice(0, midpoint).map(toBullet).join("\n");
  const right = story.lines.slice(midpoint).map(toBullet).join("\n");
  return slideShell(slide, "two-column", theme, [
    createTextElement({
      content: story.title,
      x: 9,
      y: 9,
      width: 74,
      height: 11,
      color: theme.text,
      fontFamily: fontToken(theme.fontHeading),
      fontSize: 34,
      fontWeight: 760,
    }),
    createShapeElement({
      x: 10,
      y: 28,
      width: 35,
      height: 48,
      fill: theme.surface,
      stroke: theme.surface,
      radius: 5,
      opacity: 0.78,
    }),
    createShapeElement({
      x: 54,
      y: 28,
      width: 35,
      height: 48,
      fill: theme.surface,
      stroke: theme.surface,
      radius: 5,
      opacity: 0.78,
    }),
    createShapeElement({
      x: 48.8,
      y: 31,
      width: 1.1,
      height: 42,
      fill: theme.accent,
      stroke: theme.accent,
      radius: 1,
    }),
    createTextElement({
      content: left,
      x: 14,
      y: 36,
      width: 27,
      height: 30,
      color: theme.text,
      fontSize: 20,
      fontWeight: 440,
    }),
    createTextElement({
      content: right,
      x: 58,
      y: 36,
      width: 27,
      height: 30,
      color: theme.text,
      fontSize: 20,
      fontWeight: 440,
    }),
  ]);
}

function splitComparison(lines: string[]) {
  const cleaned = lines.map(cleanLine).filter(Boolean);
  const midpoint = Math.max(1, Math.ceil(cleaned.length / 2));
  return [cleaned.slice(0, midpoint), cleaned.slice(midpoint)] as const;
}

function comparisonSlide(slide: MikroSlideRecord, story: SlideStory, theme: DeckTheme) {
  const [left, right] = splitComparison(story.lines);
  return slideShell(slide, "comparison", theme, [
    createTextElement({
      content: story.title,
      x: 9,
      y: 9,
      width: 74,
      height: 11,
      color: theme.text,
      fontFamily: fontToken(theme.fontHeading),
      fontSize: 34,
      fontWeight: 760,
    }),
    createShapeElement({
      x: 9,
      y: 28,
      width: 37,
      height: 48,
      fill: theme.surface,
      stroke: theme.accent,
      radius: 5,
      opacity: 0.82,
    }),
    createShapeElement({
      x: 54,
      y: 28,
      width: 37,
      height: 48,
      fill: theme.surface,
      stroke: theme.accent,
      radius: 5,
      opacity: 0.82,
    }),
    createTextElement({
      content: left.map(toBullet).join("\n"),
      x: 13,
      y: 36,
      width: 29,
      height: 27,
      color: theme.text,
      fontSize: 20,
      fontWeight: 440,
    }),
    createTextElement({
      content: right.length ? right.map(toBullet).join("\n") : "• Alternative\n• Tradeoff",
      x: 58,
      y: 36,
      width: 29,
      height: 27,
      color: theme.text,
      fontSize: 20,
      fontWeight: 440,
    }),
  ]);
}

function timelineSlide(slide: MikroSlideRecord, story: SlideStory, theme: DeckTheme) {
  const steps = (story.lines.length ? story.lines : ["Pilot", "Measure", "Roll out"]).slice(0, 4);
  const points = steps.length === 4 ? [15, 37, 59, 81] : [18, 50, 82].slice(0, steps.length);
  return slideShell(slide, "timeline", theme, [
    createTextElement({
      content: story.title,
      x: 9,
      y: 9,
      width: 74,
      height: 11,
      color: theme.text,
      fontFamily: fontToken(theme.fontHeading),
      fontSize: 34,
      fontWeight: 760,
    }),
    createShapeElement({
      x: 13,
      y: 51,
      width: 74,
      height: 1.1,
      fill: theme.accent,
      stroke: theme.accent,
      radius: 2,
    }),
    ...steps.flatMap((step, index) => [
      createShapeElement({
        x: points[index] - 3,
        y: 45,
        width: 6,
        height: 10,
        shape: "ellipse",
        fill: theme.background,
        stroke: theme.accent,
        strokeWidth: 2,
      }),
      createTextElement({
        content: cleanLine(step),
        x: points[index] - 9,
        y: 62,
        width: 18,
        height: 13,
        color: theme.text,
        fontSize: 16,
        fontWeight: 560,
        align: "center",
      }),
    ]),
  ]);
}

function chartSlide(slide: MikroSlideRecord, story: SlideStory, theme: DeckTheme) {
  const labels = story.lines.map(cleanLine).filter(Boolean).slice(0, 3);
  const heights = [24, 39, 52];
  return slideShell(slide, "chart-data", theme, [
    createTextElement({
      content: story.title,
      x: 9,
      y: 9,
      width: 74,
      height: 11,
      color: theme.text,
      fontFamily: fontToken(theme.fontHeading),
      fontSize: 34,
      fontWeight: 760,
    }),
    createShapeElement({
      x: 13,
      y: 72,
      width: 44,
      height: 1,
      fill: theme.muted,
      stroke: theme.muted,
      radius: 1,
      opacity: 0.45,
    }),
    ...heights.map((height, index) =>
      createShapeElement({
        x: 18 + index * 13,
        y: 72 - height,
        width: 8,
        height,
        fill: index === 2 ? theme.accent : theme.surface,
        stroke: theme.accent,
        radius: 3,
      }),
    ),
    createTextElement({
      content: labels.length ? labels.join("\n") : "Metric\nSignal\nDecision",
      x: 63,
      y: 32,
      width: 25,
      height: 31,
      color: theme.text,
      fontSize: 20,
      fontWeight: 500,
    }),
  ]);
}

function quoteSlide(slide: MikroSlideRecord, story: SlideStory, theme: DeckTheme) {
  const quote = cleanLine(story.lines[0] ?? story.title).replace(/^["“]|["”]$/g, "");
  const attribution = story.lines[1] ? cleanLine(story.lines[1]) : story.title;
  return slideShell(slide, "quote", theme, [
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
      height: 31,
      color: theme.text,
      fontFamily: "serif",
      fontSize: quote.length > 110 ? 30 : 38,
      fontWeight: 620,
    }),
    createTextElement({
      content: attribution,
      x: 22,
      y: 67,
      width: 38,
      height: 8,
      color: theme.muted,
      fontSize: 17,
      fontWeight: 520,
    }),
  ]);
}

function imageSlide(
  slide: MikroSlideRecord,
  story: SlideStory,
  theme: DeckTheme,
  layout: "image-left" | "image-right",
) {
  const image = story.image;
  const textX = layout === "image-left" ? 56 : 10;
  const imageX = layout === "image-left" ? 8 : 52;
  return slideShell(slide, layout, theme, [
    createImageElement({
      ...(image ?? {}),
      x: imageX,
      y: 11,
      width: 40,
      height: 78,
      fit: image?.fit ?? "cover",
      src: image?.src ?? "",
      alt: image?.alt ?? "",
    }),
    createTextElement({
      content: story.title,
      x: textX,
      y: 20,
      width: 34,
      height: 14,
      color: theme.text,
      fontFamily: fontToken(theme.fontHeading),
      fontSize: 36,
      fontWeight: 760,
    }),
    createTextElement({
      content:
        story.lines.map(cleanLine).filter(Boolean).slice(0, 3).join("\n") ||
        "Add supporting detail here.",
      x: textX + 1,
      y: 43,
      width: 31,
      height: 25,
      color: theme.muted,
      fontFamily: fontToken(theme.fontBody),
      fontSize: 21,
      fontWeight: 430,
    }),
  ]);
}

function closingSlide(slide: MikroSlideRecord, story: SlideStory, theme: DeckTheme) {
  return slideShell(slide, "closing", theme, [
    createTextElement({
      content: story.title,
      x: 11,
      y: 24,
      width: 58,
      height: 18,
      color: theme.text,
      fontFamily: fontToken(theme.fontHeading),
      fontSize: 48,
      fontWeight: 780,
    }),
    createTextElement({
      content: story.lines.map(cleanLine).slice(0, 3).join("\n") || "Questions and next steps",
      x: 12,
      y: 51,
      width: 44,
      height: 18,
      color: theme.muted,
      fontFamily: fontToken(theme.fontBody),
      fontSize: 22,
      fontWeight: 440,
    }),
    createShapeElement({
      x: 75,
      y: 22,
      width: 10,
      height: 56,
      fill: theme.accent,
      stroke: theme.accent,
      radius: 4,
    }),
  ]);
}

function polishSlide(slide: MikroSlideRecord, index: number, total: number, theme: DeckTheme) {
  const story = storyForSlide(slide);
  const layout = inferLayout(story, slide, index, total);

  if (layout === "title") {
    return titleSlide(slide, story, theme);
  }

  if (layout === "section") {
    return sectionSlide(slide, story, theme);
  }

  if (layout === "statement") {
    return statementSlide(slide, story, theme);
  }

  if (layout === "two-column") {
    return twoColumnSlide(slide, story, theme);
  }

  if (layout === "comparison") {
    return comparisonSlide(slide, story, theme);
  }

  if (layout === "timeline") {
    return timelineSlide(slide, story, theme);
  }

  if (layout === "chart-data") {
    return chartSlide(slide, story, theme);
  }

  if (layout === "quote") {
    return quoteSlide(slide, story, theme);
  }

  if (layout === "image-left" || layout === "image-right") {
    return imageSlide(slide, story, theme, layout);
  }

  if (layout === "closing") {
    return closingSlide(slide, story, theme);
  }

  return bulletSlide(slide, story, theme);
}

/**
 * @description Deterministic local deck cleanup: layout choice, spacing, type scale, and theme colors.
 */
export class DeckPolishService {
  polish(record: MikroDeckRecord) {
    const deck = MikroDeck.fromRecord(record).toRecord();
    const slides = deck.slides.map((slide, index) =>
      polishSlide(slide, index, deck.slides.length, deck.theme),
    );

    return MikroDeck.fromRecord(deck)
      .update({
        slides,
        activeSlideId: deck.activeSlideId,
      })
      .toRecord();
  }
}
