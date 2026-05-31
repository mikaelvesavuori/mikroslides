import { OutlineImportService } from "../../src/index.js";

describe("OutlineImportService", () => {
  it("creates a deck from a Markdown outline", () => {
    const service = new OutlineImportService();
    const deck = service.createDeckFromMarkdown(`# Launch Plan

Short intro.

## Why now
- Customer demand
- Internal readiness
Note: Mention pilot customers.

## Next steps
1. Pilot
2. Measure
3. Roll out`);

    expect(deck.title).toBe("Launch Plan");
    expect(deck.slides).toHaveLength(3);
    expect(deck.slides[0]).toMatchObject({ title: "Launch Plan", layout: "title" });
    expect(deck.slides[1]).toMatchObject({
      title: "Why now",
      layout: "bullets",
      speakerNotes: "Mention pilot customers.",
    });
    expect(
      deck.slides[1].elements.some(
        (element) => "content" in element && element.content.includes("Customer demand"),
      ),
    ).toBe(true);
  });

  it("recognizes H1/H2 outlines for paste import", () => {
    const service = new OutlineImportService();

    expect(service.looksLikeOutline("# Deck\n\n## Slide")).toBe(true);
    expect(service.looksLikeOutline("## Slide without deck title\n- Point")).toBe(true);
    expect(service.looksLikeOutline("just a paragraph")).toBe(false);
  });

  it("uses the first section title when an outline has no H1", () => {
    const service = new OutlineImportService();
    const deck = service.createDeckFromMarkdown(`## First topic
- One
- Two

## Second topic
- Three`);

    expect(deck.title).toBe("First topic");
    expect(deck.slides.map((slide) => slide.title)).toEqual([
      "First topic",
      "First topic",
      "Second topic",
    ]);
  });

  it("shrinks long outline bodies into a denser slide layout", () => {
    const service = new OutlineImportService();
    const deck = service.createDeckFromMarkdown(`# Long

## Detail
- ${"Long point ".repeat(25)}
- ${"Another long point ".repeat(18)}`);
    const body = deck.slides[1].elements.find(
      (element) => element.kind === "text" && element.content.includes("Long point"),
    );

    expect(body).toMatchObject({ kind: "text", fontSize: 20 });
  });

  it("chooses presentation layouts from outline content", () => {
    const service = new OutlineImportService();
    const deck = service.createDeckFromMarkdown(`# Launch

## Roadmap
1. Pilot
2. Measure
3. Roll out

## Proof
- Revenue +24%
- Retention 82%

## Customer voice
> This made the decision obvious.
Speaker notes: Pause before the quote.`);

    expect(deck.slides.map((slide) => slide.layout)).toEqual([
      "title",
      "timeline",
      "chart-data",
      "quote",
    ]);
    expect(deck.slides[3].speakerNotes).toBe("Pause before the quote.");
  });
});
