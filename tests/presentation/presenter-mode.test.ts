import { MikroDeck } from "../../src/index.js";
import {
  nextPresenterIndex,
  presenterMetaText,
  presenterStartIndex,
} from "../../src/presentation/presenterMode.js";

describe("presenter mode", () => {
  it("starts at the active slide and clamps navigation", () => {
    const deckWithSlides = MikroDeck.create({ title: "Deck" }).addSlide().toRecord();
    const deck = MikroDeck.fromRecord(deckWithSlides)
      .setActiveSlide(deckWithSlides.slides[1].id)
      .toRecord();

    expect(presenterStartIndex(deck)).toBe(1);
    expect(nextPresenterIndex(deck, deck.slides.length - 1, 1)).toBe(deck.slides.length - 1);
    expect(nextPresenterIndex(deck, 1, -1)).toBe(0);
  });

  it("skips hidden slides in presenter navigation and metadata", () => {
    const deck = MikroDeck.create({ title: "Deck" }).addSlide().toRecord();
    const skippedDeck = {
      ...deck,
      activeSlideId: deck.slides[1].id,
      slides: deck.slides.map((slide, index) =>
        index === 1 ? { ...slide, skipped: true } : slide,
      ),
    };

    expect(presenterStartIndex(skippedDeck)).toBe(2);
    expect(nextPresenterIndex(skippedDeck, 0, 1)).toBe(2);
    expect(nextPresenterIndex(skippedDeck, 2, -1)).toBe(0);
    expect(presenterMetaText(skippedDeck, 2)).toContain(`2 / ${deck.slides.length - 1}`);
  });

  it("formats presenter metadata", () => {
    const deck = MikroDeck.create({ title: "Deck" }).toRecord();

    expect(presenterMetaText(deck, 0)).toContain(`1 / ${deck.slides.length}`);
    expect(presenterMetaText({ ...deck, slides: [] }, 0)).toBe("0 / 0");
  });
});
