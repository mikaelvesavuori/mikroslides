import type { DeckAspectRatio } from "../index.js";

export type PrintDimensions = {
  height: string;
  ratio: number;
  width: string;
};

export function printDimensionsForAspect(aspectRatio: DeckAspectRatio): PrintDimensions {
  if (aspectRatio === "4:3") {
    return { width: "10in", height: "7.5in", ratio: 4 / 3 };
  }

  if (aspectRatio === "1:1") {
    return { width: "7.5in", height: "7.5in", ratio: 1 };
  }

  return { width: "13.333in", height: "7.5in", ratio: 16 / 9 };
}

export function printCssForAspect(aspectRatio: DeckAspectRatio) {
  const size = printDimensionsForAspect(aspectRatio);
  return `
@media print {
  @page {
    size: ${size.width} ${size.height};
    margin: 0;
  }

  html,
  body {
    width: ${size.width};
    height: ${size.height};
  }
}
`;
}
