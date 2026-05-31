import {
  createBlankSlide,
  createImageElement,
  createTextElement,
  DeckPolishService,
  MikroDeck,
} from "../../src/index.js";

describe("DeckPolishService", () => {
  it("turns rough slide notes into polished layout choices", () => {
    const deck = MikroDeck.create({
      title: "Launch",
      slides: [
        createBlankSlide({
          title: "Launch",
          layout: "title",
          elements: [
            createTextElement({ content: "Launch" }),
            createTextElement({ content: "A focused plan" }),
          ],
        }),
        createBlankSlide({
          title: "Roadmap",
          elements: [
            createTextElement({
              content: "Roadmap",
            }),
            createTextElement({
              content: "1. Pilot\n2. Measure\n3. Roll out",
            }),
          ],
        }),
        createBlankSlide({
          title: "Growth",
          elements: [
            createTextElement({
              content: "Growth",
            }),
            createTextElement({
              content: "Revenue +24%\nConversion 9%\nRetention 82%",
            }),
          ],
        }),
      ],
    }).toRecord();

    const polished = new DeckPolishService().polish(deck);

    expect(polished.slides.map((slide) => slide.layout)).toEqual([
      "title",
      "timeline",
      "chart-data",
    ]);
    expect(polished.slides[1].elements.length).toBeGreaterThan(deck.slides[1].elements.length);
    expect(polished.activeSlideId).toBe(deck.activeSlideId);
  });

  it("preserves image sources on non-title image slides", () => {
    const deck = MikroDeck.create({
      title: "Image",
      slides: [
        createBlankSlide({ title: "Cover", layout: "title" }),
        createBlankSlide({
          title: "Proof",
          elements: [
            createTextElement({ content: "Proof" }),
            createTextElement({ content: "Supporting context" }),
            createImageElement({ src: "data:image/png;base64,abc", alt: "Demo" }),
          ],
        }),
      ],
    }).toRecord();

    const polished = new DeckPolishService().polish(deck);
    const image = polished.slides[1].elements.find((element) => element.kind === "image");

    expect(polished.slides[1].layout).toBe("image-left");
    expect(image).toMatchObject({ kind: "image", src: "data:image/png;base64,abc", alt: "Demo" });
  });
});
