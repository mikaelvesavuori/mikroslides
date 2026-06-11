import { MarkdownDeckService } from "../../src/index.js";

describe("MarkdownDeckService", () => {
  it("creates a deck from structured MikroSlides Markdown", () => {
    const service = new MarkdownDeckService();
    const deck = service.createDeckFromMarkdown(`---
title: Launch Plan
aspect: 4:3
accent: #0f766e
---

# Launch Plan
A short title-slide subtitle.

---
layout: image-right
image: https://example.test/rollout.png
alt: Rollout timeline
skip: true

# Rollout

- Pilot
- Measure
- Roll out

notes:
Mention the customer cohort.
`);

    expect(deck.title).toBe("Launch Plan");
    expect(deck.aspectRatio).toBe("4:3");
    expect(deck.theme.accent).toBe("#0f766e");
    expect(deck.slides).toHaveLength(2);
    expect(deck.slides[0]).toMatchObject({ layout: "title", title: "Launch Plan" });
    expect(deck.slides[1]).toMatchObject({
      layout: "image-right",
      skipped: true,
      speakerNotes: "Mention the customer cohort.",
    });
    expect(deck.slides[1].elements).toContainEqual(
      expect.objectContaining({
        kind: "image",
        src: "https://example.test/rollout.png",
        alt: "Rollout timeline",
      }),
    );
  });

  it("splits ordinary H1/H2 markdown into slide blocks", () => {
    const service = new MarkdownDeckService();
    const deck = service.createDeckFromMarkdown(`# Launch Plan

Intro text.

## Why now
- Customer demand
- Internal readiness

## Next steps
1. Pilot
2. Measure`);

    expect(deck.slides.map((slide) => slide.title)).toEqual([
      "Launch Plan",
      "Why now",
      "Next steps",
    ]);
    expect(deck.slides.map((slide) => slide.layout)).toEqual(["title", "bullets", "bullets"]);
  });
});
