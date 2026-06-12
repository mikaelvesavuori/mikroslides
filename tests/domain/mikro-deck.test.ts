import {
  createShapeElement,
  createTextElement,
  MikroDeck,
  type SlideElement,
} from "../../src/index.js";

describe("MikroDeck", () => {
  it("creates a starter deck with useful defaults", () => {
    const deck = MikroDeck.create({ title: "Launch Plan" });
    const record = deck.toRecord();

    expect(record.title).toBe("Launch Plan");
    expect(record.slides).toHaveLength(3);
    expect(record.activeSlideId).toBe(record.slides[0].id);
    expect(deck.stats().slideCount).toBe(3);
    expect(deck.stats().wordCount).toBeGreaterThan(0);
  });

  it("adds, duplicates, moves, and removes slides", () => {
    const deck = MikroDeck.create({ title: "Deck" });
    const withSlide = deck.addSlide();
    const added = withSlide.toRecord().activeSlideId;
    const duplicated = withSlide.duplicateSlide(added).toRecord();

    expect(duplicated.slides).toHaveLength(5);
    expect(duplicated.slides[2].title).toContain("copy");

    const moved = MikroDeck.fromRecord(duplicated)
      .moveSlide(duplicated.slides[2].id, -1)
      .toRecord();
    expect(moved.slides[1].id).toBe(duplicated.slides[2].id);

    const removed = MikroDeck.fromRecord(moved).removeSlide(moved.slides[1].id).toRecord();
    expect(removed.slides).toHaveLength(4);
    expect(removed.slides.some((slide) => slide.id === moved.slides[1].id)).toBe(false);
  });

  it("updates slide elements and clamps unsafe geometry", () => {
    const deck = MikroDeck.create({ title: "Deck" });
    const slide = deck.toRecord().slides[0];
    const shape = createShapeElement({ x: 200, y: -80, width: 300, height: 0 });
    const withElement = deck.addElement(slide.id, shape).toRecord();
    const element = withElement.slides[0].elements.at(-1) as SlideElement;

    expect(element.x).toBe(120);
    expect(element.y).toBe(-20);
    expect(element.width).toBe(140);
    expect(element.height).toBe(1);

    const updated = MikroDeck.fromRecord(withElement)
      .updateElement(slide.id, element.id, createTextElement({ content: "Changed" }))
      .toRecord();

    expect(updated.slides[0].elements.at(-1)?.kind).toBe("text");
  });

  it("normalizes text line height", () => {
    expect(createTextElement({ lineHeight: 1.4 }).lineHeight).toBe(1.4);
    expect(createTextElement({ lineHeight: 0.2 }).lineHeight).toBe(0.75);
    expect(createTextElement({ lineHeight: 5 }).lineHeight).toBe(3);
    expect(createTextElement().lineHeight).toBe(1.14);
  });

  it("normalizes text vertical alignment", () => {
    expect(createTextElement({ verticalAlign: "top" }).verticalAlign).toBe("top");
    expect(createTextElement({ verticalAlign: "bottom" }).verticalAlign).toBe("bottom");
    expect(createTextElement().verticalAlign).toBe("center");
  });

  it("normalizes supported shape kinds", () => {
    expect(createShapeElement({ shape: "diamond" }).shape).toBe("diamond");
    expect(createShapeElement({ shape: "database" }).shape).toBe("database");
    expect(createShapeElement({ shape: "chevron" }).shape).toBe("chevron");
    expect(createShapeElement({ shape: "nope" as never }).shape).toBe("rect");
    expect(createShapeElement({ arrowHead: "both", shape: "line" }).arrowHead).toBe("both");
    expect(createShapeElement({ arrowHead: "weird" as never, shape: "line" }).arrowHead).toBe(
      "none",
    );
  });

  it("normalizes shape labels", () => {
    const shape = createShapeElement({ content: "Decision", align: "left", verticalAlign: "top" });

    expect(shape.content).toBe("Decision");
    expect(shape.align).toBe("left");
    expect(shape.verticalAlign).toBe("top");
    expect(createShapeElement().align).toBe("center");
  });

  it("keeps snapshots for manual saves", () => {
    const saved = MikroDeck.create({ title: "Deck" })
      .update({ saveSnapshot: true, snapshotReason: "manual" })
      .toRecord();

    expect(saved.lastSavedAt).toBeTruthy();
    expect(saved.snapshots).toHaveLength(1);
    expect(saved.snapshots[0].reason).toBe("manual");
  });
});
