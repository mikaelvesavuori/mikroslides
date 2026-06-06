import {
  createImageElement,
  createShapeElement,
  createTextElement,
  MikroDeck,
} from "../../src/index.js";
import { builtInDeckThemes } from "../../src/presentation/deckOptions.js";
import { mapThemeColor, rethemeSlide } from "../../src/presentation/deckTheme.js";

describe("deck theme", () => {
  it("maps colors from one theme to another case-insensitively", () => {
    const [light, dark] = builtInDeckThemes;

    expect(mapThemeColor(light.text.toUpperCase(), light, dark)).toBe(dark.text);
    expect(mapThemeColor("#123456", light, dark)).toBe("#123456");
  });

  it("rethemes slide background, text, and shapes without touching images", () => {
    const [light, dark] = builtInDeckThemes;
    const image = createImageElement({ id: "image", src: "asset:image" });
    const slide = {
      ...MikroDeck.create({ title: "Theme" }).toRecord().slides[0],
      background: light.background,
      elements: [
        createTextElement({ id: "text", color: light.text }),
        createShapeElement({ id: "shape", fill: light.surface, stroke: light.accent }),
        image,
      ],
    };

    const next = rethemeSlide(slide, light, dark);

    expect(next.background).toBe(dark.background);
    expect(next.elements[0]).toMatchObject({ color: dark.text });
    expect(next.elements[1]).toMatchObject({ fill: dark.surface, stroke: dark.accent });
    expect(next.elements[2]).toBe(image);
  });
});
