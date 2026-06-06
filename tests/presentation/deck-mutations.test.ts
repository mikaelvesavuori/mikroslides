import type { MikroFontRecord } from "../../src/index.js";
import { createTextElement, MikroDeck } from "../../src/index.js";
import {
  addDefaultTextElement,
  alignElementsInActiveSlide,
  applyFontToSelectedText,
  duplicateElementsInActiveSlide,
  pasteElementsIntoActiveSlide,
  removeFontFromDeck,
  reorderSelectedElementsInActiveSlide,
} from "../../src/presentation/deckMutations.js";

const now = "2026-06-03T00:00:00.000Z";

function font(input: Partial<MikroFontRecord>): MikroFontRecord {
  return {
    id: "brand",
    source: "local",
    label: "Brand",
    family: "Brand",
    assetId: "asset_font",
    mediaType: "font/woff2",
    remoteUrl: null,
    createdAt: now,
    updatedAt: now,
    ...input,
  };
}

describe("deck mutations", () => {
  it("adds default text to the active slide and selects it", () => {
    const deck = MikroDeck.create({ title: "Mutations" }).toRecord();
    const initialElementCount = deck.slides[0].elements.length;
    const result = addDefaultTextElement(deck);

    expect(result?.deck.slides[0].elements).toHaveLength(initialElementCount + 1);
    expect(result?.selectedElementIds).toEqual([result?.deck.slides[0].elements.at(-1)?.id]);
  });

  it("duplicates and pastes selected elements with deterministic ids", () => {
    const original = createTextElement({ id: "original", x: 10, y: 12 });
    const deck = MikroDeck.create({
      title: "Objects",
      slides: [
        { ...MikroDeck.create({ title: "Base" }).toRecord().slides[0], elements: [original] },
      ],
    }).toRecord();

    const duplicated = duplicateElementsInActiveSlide(deck, ["original"], () => "duplicate");
    expect(duplicated?.selectedElementIds).toEqual(["duplicate"]);
    expect(duplicated?.deck.slides[0].elements.at(-1)).toMatchObject({
      id: "duplicate",
      x: 14,
      y: 16,
    });

    const pasted = pasteElementsIntoActiveSlide(deck, [original], () => "pasted");
    expect(pasted?.deck.slides[0].elements.at(-1)).toMatchObject({
      id: "pasted",
      x: 15,
      y: 17,
    });
  });

  it("applies and removes deck font tokens from selected text", () => {
    const text = createTextElement({ id: "title", fontFamily: "system" });
    const deck = MikroDeck.create({
      fonts: [font({ id: "brand" })],
      slides: [{ ...MikroDeck.create({ title: "Base" }).toRecord().slides[0], elements: [text] }],
      title: "Fonts",
    }).toRecord();

    const applied = applyFontToSelectedText(deck, ["title"], "font:brand");
    expect(applied?.slides[0].elements[0]).toMatchObject({ fontFamily: "font:brand" });

    const removed = removeFontFromDeck(applied ?? deck, "brand");
    expect(removed?.font.assetId).toBe("asset_font");
    expect(removed?.deck.fonts).toEqual([]);
    expect(removed?.deck.slides[0].elements[0]).toMatchObject({ fontFamily: "system" });
  });

  it("reorders selected elements by layer action", () => {
    const first = createTextElement({ id: "first" });
    const second = createTextElement({ id: "second" });
    const third = createTextElement({ id: "third" });
    const deck = MikroDeck.create({
      slides: [
        {
          ...MikroDeck.create({ title: "Base" }).toRecord().slides[0],
          elements: [first, second, third],
        },
      ],
      title: "Layers",
    }).toRecord();

    expect(
      reorderSelectedElementsInActiveSlide(deck, ["first"], "front")?.slides[0].elements.map(
        (element) => element.id,
      ),
    ).toEqual(["second", "third", "first"]);
  });

  it("aligns multiple selected elements against their shared bounds", () => {
    const first = createTextElement({ height: 10, id: "first", width: 20, x: 10, y: 10 });
    const second = createTextElement({ height: 12, id: "second", width: 10, x: 50, y: 30 });
    const deck = MikroDeck.create({
      slides: [
        {
          ...MikroDeck.create({ title: "Base" }).toRecord().slides[0],
          elements: [first, second],
        },
      ],
      title: "Alignment",
    }).toRecord();

    const centered = alignElementsInActiveSlide(deck, ["first", "second"], "center");
    expect(centered?.slides[0].elements).toMatchObject([
      { id: "first", x: 25 },
      { id: "second", x: 30 },
    ]);

    const bottom = alignElementsInActiveSlide(deck, ["first", "second"], "bottom");
    expect(bottom?.slides[0].elements).toMatchObject([
      { id: "first", y: 32 },
      { id: "second", y: 30 },
    ]);
  });

  it("aligns a single selected element against the slide bounds", () => {
    const element = createTextElement({ height: 20, id: "single", width: 30, x: 10, y: 10 });
    const deck = MikroDeck.create({
      slides: [
        {
          ...MikroDeck.create({ title: "Base" }).toRecord().slides[0],
          elements: [element],
        },
      ],
      title: "Single Alignment",
    }).toRecord();

    expect(
      alignElementsInActiveSlide(deck, ["single"], "right")?.slides[0].elements[0],
    ).toMatchObject({
      x: 70,
    });
    expect(
      alignElementsInActiveSlide(deck, ["single"], "middle")?.slides[0].elements[0],
    ).toMatchObject({
      y: 40,
    });
  });
});
