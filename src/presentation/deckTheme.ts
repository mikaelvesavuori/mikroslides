import type { DeckTheme, MikroSlideRecord } from "../index.js";

const themeColorKeys = ["accent", "background", "muted", "surface", "text"] as const;

export function rethemeSlide(
  slide: MikroSlideRecord,
  previousTheme: DeckTheme,
  nextTheme: DeckTheme,
): MikroSlideRecord {
  return {
    ...slide,
    background: mapThemeColor(slide.background, previousTheme, nextTheme),
    elements: slide.elements.map((element) => {
      if (element.kind === "text") {
        return { ...element, color: mapThemeColor(element.color, previousTheme, nextTheme) };
      }

      if (element.kind === "shape") {
        return {
          ...element,
          fill: mapThemeColor(element.fill, previousTheme, nextTheme),
          stroke: mapThemeColor(element.stroke, previousTheme, nextTheme),
        };
      }

      return element;
    }),
  };
}

export function mapThemeColor(color: string, previousTheme: DeckTheme, nextTheme: DeckTheme) {
  const match = themeColorKeys.find(
    (key) => color.toLowerCase() === previousTheme[key].toLowerCase(),
  );
  return match ? nextTheme[match] : color;
}
