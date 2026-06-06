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
    expect(nextPresenterIndex(deck.slides.length - 1, 1, deck.slides.length)).toBe(
      deck.slides.length - 1,
    );
    expect(nextPresenterIndex(1, -1, deck.slides.length)).toBe(0);
  });

  it("formats presenter metadata", () => {
    const deck = MikroDeck.create({ title: "Deck" }).toRecord();

    expect(presenterMetaText(deck, 0)).toContain(`1 / ${deck.slides.length}`);
    expect(presenterMetaText({ ...deck, slides: [] }, 0)).toBe("0 / 0");
  });
});
