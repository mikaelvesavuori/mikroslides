import type { DeckAspectRatio, DeckTheme, MikroSlideRecord } from "../../interfaces/index.js";
import {
  createBlankSlide,
  createShapeElement,
  createTextElement,
  defaultDeckTheme,
  MikroDeck,
} from "../entities/index.js";
import { DeckPolishService } from "./DeckPolishService.js";

type ParsedSection = {
  body: string[];
  notes: string[];
  title: string;
};

type OutlineDeckOptions = {
  aspectRatio?: DeckAspectRatio;
  theme?: DeckTheme;
  title?: string;
};

function cleanMarkdownText(value: string) {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function isNoteLine(value: string) {
  return /^(notes?|speaker notes?|presenter notes?):\s*/i.test(value);
}

function noteText(value: string) {
  return value.replace(/^(notes?|speaker notes?|presenter notes?):\s*/i, "").trim();
}

function bulletText(value: string) {
  const quote = value.match(/^>\s?(.+)$/);
  if (quote) {
    return `> ${cleanMarkdownText(quote[1])}`;
  }

  const unordered = value.match(/^[-*+]\s+(.+)$/);
  if (unordered) {
    return `• ${cleanMarkdownText(unordered[1])}`;
  }

  const ordered = value.match(/^(\d+)[.)]\s+(.+)$/);
  if (ordered) {
    return `${ordered[1]}. ${cleanMarkdownText(ordered[2])}`;
  }

  return cleanMarkdownText(value);
}

function parseOutline(markdown: string) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  let deckTitle = "";
  const intro: string[] = [];
  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;
  let forceNewSlide = false;

  const pushCurrent = () => {
    if (current) {
      sections.push(current);
      current = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    if (/^-{3,}$/.test(line)) {
      pushCurrent();
      forceNewSlide = true;
      continue;
    }

    const h1 = line.match(/^#\s+(.+)$/);
    if (h1) {
      if (!deckTitle) {
        deckTitle = cleanMarkdownText(h1[1]);
        continue;
      }
      pushCurrent();
      current = { title: cleanMarkdownText(h1[1]), body: [], notes: [] };
      continue;
    }

    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      pushCurrent();
      current = { title: cleanMarkdownText(h2[1]), body: [], notes: [] };
      continue;
    }

    const lowerHeading = line.match(/^#{3,6}\s+(.+)$/);
    if (lowerHeading) {
      const text = cleanMarkdownText(lowerHeading[1]);
      if (current) {
        current.body.push(text);
      } else {
        intro.push(text);
      }
      continue;
    }

    if (forceNewSlide) {
      current = { title: cleanMarkdownText(line), body: [], notes: [] };
      forceNewSlide = false;
      continue;
    }

    if (isNoteLine(line)) {
      if (current) {
        const note = noteText(line);
        if (note) {
          current.notes.push(note);
        }
      } else {
        const note = noteText(line);
        if (note) {
          intro.push(note);
        }
      }
      continue;
    }

    const text = bulletText(line);
    if (current) {
      current.body.push(text);
    } else {
      intro.push(text);
    }
  }

  pushCurrent();

  if (!deckTitle) {
    deckTitle = cleanMarkdownText(intro.shift() ?? sections[0]?.title ?? "Untitled Deck");
  }

  return {
    deckTitle: deckTitle || "Untitled Deck",
    intro,
    sections,
  };
}

function createTitleSlide(title: string, intro: string[], theme: DeckTheme): MikroSlideRecord {
  const subtitle = intro.filter(Boolean).slice(0, 3).join("\n");
  return createBlankSlide({
    title,
    layout: "title",
    background: theme.background,
    speakerNotes: intro.slice(3).join("\n"),
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
        content: title,
        x: 23,
        y: subtitle ? 24 : 32,
        width: 58,
        height: 18,
        color: theme.text,
        fontSize: 48,
        fontWeight: 760,
      }),
      createTextElement({
        content: subtitle || "A clear deck from a local outline.",
        x: 24,
        y: 48,
        width: 52,
        height: 18,
        color: theme.muted,
        fontSize: 22,
        fontWeight: 440,
      }),
    ],
  });
}

function createSectionSlide(section: ParsedSection, theme: DeckTheme): MikroSlideRecord {
  const body = section.body.length ? section.body.join("\n") : "Add supporting detail here.";
  return createBlankSlide({
    title: section.title,
    layout: "bullets",
    background: theme.background,
    speakerNotes: section.notes.join("\n"),
    elements: [
      createTextElement({
        content: section.title,
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
      }),
    ],
  });
}

/**
 * @description Converts a plain Markdown outline into a normalized local deck.
 */
export class OutlineImportService {
  private readonly polishService = new DeckPolishService();

  createDeckFromMarkdown(markdown: string, options: OutlineDeckOptions = {}) {
    const parsed = parseOutline(markdown);
    const theme = options.theme ?? defaultDeckTheme;
    const sections =
      parsed.sections.length > 0
        ? parsed.sections
        : [{ title: parsed.deckTitle, body: parsed.intro, notes: [] }];
    const slides = [
      createTitleSlide(options.title ?? parsed.deckTitle, parsed.intro, theme),
      ...sections.map((section) => createSectionSlide(section, theme)),
    ];

    const deck = MikroDeck.create({
      title: options.title ?? parsed.deckTitle,
      slides,
      aspectRatio: options.aspectRatio,
      theme,
    }).toRecord();

    return this.polishService.polish(deck);
  }

  looksLikeOutline(markdown: string) {
    return /^#{1,2}\s+.+/m.test(markdown);
  }
}
