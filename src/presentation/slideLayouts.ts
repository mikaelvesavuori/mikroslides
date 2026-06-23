import {
  createBlankSlide,
  createImageElement,
  createShapeElement,
  createTextElement,
  type DeckTheme,
  type MikroSlideRecord,
} from "../index.js";

export const builtInTemplates = [
  { id: "title", name: "Title" },
  { id: "section", name: "Section" },
  { id: "statement", name: "Statement" },
  { id: "bullets", name: "Bullets" },
  { id: "twoColumn", name: "Two-column" },
  { id: "imageLeft", name: "Image left" },
  { id: "imageRight", name: "Image right" },
  { id: "quote", name: "Quote" },
  { id: "comparison", name: "Comparison" },
  { id: "timeline", name: "Timeline" },
  { id: "chartData", name: "Chart/data" },
  { id: "closing", name: "Closing" },
];

export function createTemplateSlide(template: string, base: MikroSlideRecord, theme: DeckTheme) {
  const title = base.title && base.title !== "Untitled" ? base.title : "Slide title";
  const background = base.background || theme.background;
  const body = "Add text";

  if (template === "section") {
    return createBlankSlide({
      ...base,
      title,
      layout: "section",
      background: theme.text,
      elements: [
        createTextElement({
          content: title,
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

  if (template === "statement") {
    return createBlankSlide({
      ...base,
      title,
      layout: "statement",
      background,
      elements: [
        createTextElement({
          content: "Add statement",
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

  if (template === "bullets") {
    return createBlankSlide({
      ...base,
      title,
      layout: "bullets",
      background,
      elements: [
        createTextElement({
          content: title,
          x: 10,
          y: 10,
          width: 76,
          height: 12,
          color: theme.text,
          fontSize: 38,
          fontWeight: 740,
        }),
        createTextElement({
          content: "First point\nSecond point\nThird point",
          x: 13,
          y: 34,
          width: 66,
          height: 34,
          color: theme.text,
          fontSize: 25,
          fontWeight: 430,
          listStyle: "bullet",
        }),
      ],
    });
  }

  if (template === "twoColumn") {
    return createBlankSlide({
      ...base,
      title,
      layout: "two-column",
      background,
      elements: [
        createTextElement({
          content: title,
          x: 9,
          y: 9,
          width: 74,
          height: 11,
          color: theme.text,
          fontSize: 34,
          fontWeight: 740,
        }),
        createTextElement({
          content: "Left column\nAdd text",
          x: 11,
          y: 32,
          width: 34,
          height: 30,
          color: theme.text,
          fontSize: 23,
          fontWeight: 430,
        }),
        createTextElement({
          content: "Right column\nAdd text",
          x: 55,
          y: 32,
          width: 34,
          height: 30,
          color: theme.text,
          fontSize: 23,
          fontWeight: 430,
        }),
        createShapeElement({
          x: 50,
          y: 28,
          width: 0.8,
          height: 48,
          fill: theme.accent,
          stroke: theme.accent,
          radius: 1,
        }),
      ],
    });
  }

  if (template === "imageLeft" || template === "imageText") {
    return createBlankSlide({
      ...base,
      title,
      layout: "image-left",
      background,
      elements: [
        createImageElement({
          x: 8,
          y: 11,
          width: 42,
          height: 78,
          src: "",
          fit: "cover",
        }),
        createTextElement({
          content: title,
          x: 56,
          y: 20,
          width: 34,
          height: 14,
          color: theme.text,
          fontSize: 36,
          fontWeight: 740,
        }),
        createTextElement({
          content: body,
          x: 57,
          y: 43,
          width: 31,
          height: 24,
          color: theme.muted,
          fontSize: 22,
          fontWeight: 430,
        }),
      ],
    });
  }

  if (template === "imageRight") {
    return createBlankSlide({
      ...base,
      title,
      layout: "image-right",
      background,
      elements: [
        createTextElement({
          content: title,
          x: 10,
          y: 20,
          width: 34,
          height: 14,
          color: theme.text,
          fontSize: 36,
          fontWeight: 740,
        }),
        createTextElement({
          content: body,
          x: 11,
          y: 43,
          width: 31,
          height: 24,
          color: theme.muted,
          fontSize: 22,
          fontWeight: 430,
        }),
        createImageElement({
          x: 52,
          y: 11,
          width: 40,
          height: 78,
          src: "",
          fit: "cover",
        }),
      ],
    });
  }

  if (template === "quote") {
    return createBlankSlide({
      ...base,
      title,
      layout: "quote",
      background,
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
          content: "Add quote",
          x: 20,
          y: 23,
          width: 62,
          height: 28,
          color: theme.text,
          fontSize: 38,
          fontFamily: "serif",
          fontWeight: 620,
        }),
        createTextElement({
          content: "Attribution",
          x: 22,
          y: 66,
          width: 30,
          height: 8,
          color: theme.muted,
          fontSize: 18,
          fontWeight: 500,
        }),
      ],
    });
  }

  if (template === "comparison") {
    return createBlankSlide({
      ...base,
      title,
      layout: "comparison",
      background,
      elements: [
        createTextElement({
          content: title,
          x: 10,
          y: 9,
          width: 72,
          height: 11,
          color: theme.text,
          fontSize: 34,
          fontWeight: 740,
        }),
        createShapeElement({
          x: 9,
          y: 27,
          width: 37,
          height: 46,
          fill: theme.surface,
          stroke: theme.accent,
          radius: 5,
        }),
        createShapeElement({
          x: 54,
          y: 27,
          width: 37,
          height: 46,
          fill: theme.surface,
          stroke: theme.accent,
          radius: 5,
        }),
        createTextElement({
          content: "Option A\n• Detail\n• Detail",
          x: 13,
          y: 34,
          width: 29,
          height: 26,
          color: theme.text,
          fontSize: 21,
          fontWeight: 450,
        }),
        createTextElement({
          content: "Option B\n• Detail\n• Detail",
          x: 58,
          y: 34,
          width: 29,
          height: 26,
          color: theme.text,
          fontSize: 21,
          fontWeight: 450,
        }),
      ],
    });
  }

  if (template === "timeline") {
    return createBlankSlide({
      ...base,
      title,
      layout: "timeline",
      background,
      elements: [
        createTextElement({
          content: title,
          x: 10,
          y: 10,
          width: 72,
          height: 11,
          color: theme.text,
          fontSize: 34,
          fontWeight: 740,
        }),
        createShapeElement({
          x: 13,
          y: 50,
          width: 72,
          height: 1.1,
          fill: theme.accent,
          stroke: theme.accent,
          radius: 1,
        }),
        ...[18, 42, 66].flatMap((x, index) => [
          createShapeElement({
            x,
            y: 45,
            width: 6,
            height: 10,
            shape: "ellipse",
            fill: theme.background,
            stroke: theme.accent,
            strokeWidth: 2,
          }),
          createTextElement({
            content: `Step ${index + 1}\nDate`,
            x: x - 6,
            y: 60,
            width: 19,
            height: 14,
            color: theme.text,
            fontSize: 17,
            fontWeight: 520,
            align: "center",
          }),
        ]),
      ],
    });
  }

  if (template === "chartData") {
    return createBlankSlide({
      ...base,
      title,
      layout: "chart-data",
      background,
      elements: [
        createTextElement({
          content: title,
          x: 9,
          y: 9,
          width: 74,
          height: 11,
          color: theme.text,
          fontSize: 34,
          fontWeight: 740,
        }),
        ...[24, 43, 62].map((x, index) =>
          createShapeElement({
            x,
            y: 65 - index * 12,
            width: 11,
            height: 18 + index * 12,
            fill: index === 1 ? theme.accent : theme.surface,
            stroke: theme.accent,
            radius: 3,
          }),
        ),
        createTextElement({
          content: "Metric\nValue\nNotes",
          x: 69,
          y: 34,
          width: 20,
          height: 28,
          color: theme.muted,
          fontSize: 19,
          fontWeight: 460,
        }),
      ],
    });
  }

  if (template === "closing") {
    return createBlankSlide({
      ...base,
      title: "Thank you",
      layout: "closing",
      background,
      elements: [
        createTextElement({
          content: "Thank you",
          x: 12,
          y: 26,
          width: 62,
          height: 18,
          color: theme.text,
          fontSize: 50,
          fontWeight: 760,
        }),
        createTextElement({
          content: "Questions?",
          x: 13,
          y: 51,
          width: 44,
          height: 10,
          color: theme.muted,
          fontSize: 23,
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
      ],
    });
  }

  return createBlankSlide({
    ...base,
    title,
    layout: "title",
    background,
    elements: [
      createTextElement({
        content: title,
        x: 11,
        y: 22,
        width: 72,
        height: 18,
        color: theme.text,
        fontSize: 50,
        fontWeight: 760,
      }),
      createTextElement({
        content: "Subtitle",
        x: 12,
        y: 48,
        width: 48,
        height: 12,
        color: theme.muted,
        fontSize: 24,
        fontWeight: 430,
      }),
    ],
  });
}
