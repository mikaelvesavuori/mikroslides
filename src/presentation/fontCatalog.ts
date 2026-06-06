import type { MikroFontRecord, TextFontFamily } from "../index.js";

export type FontCategory =
  | "recommended"
  | "sans-serif"
  | "serif"
  | "display"
  | "monospace"
  | "handwriting";

export type BunnyFontCatalogItem = {
  slug: string;
  family: string;
  category: string;
  weights: number[];
  styles: string[];
  isVariable: boolean;
  sample: string;
};

export type SourceFontChoice = {
  id: string;
  label: string;
  family: string;
  remoteUrl: string;
  mediaType: string;
  meta: string;
  sample: string;
};

export const systemFontChoices: Array<{ label: string; meta: string; token: TextFontFamily }> = [
  { label: "System Sans", meta: "Built in", token: "system" },
  { label: "System Serif", meta: "Built in", token: "serif" },
  { label: "System Mono", meta: "Built in", token: "mono" },
];

export const fontCategoryChoices: Array<{ id: FontCategory; label: string }> = [
  { id: "recommended", label: "Recommended" },
  { id: "sans-serif", label: "Sans" },
  { id: "serif", label: "Serif" },
  { id: "display", label: "Display" },
  { id: "monospace", label: "Mono" },
  { id: "handwriting", label: "Script" },
];

export const recommendedBunnyFamilies = [
  "Manrope",
  "DM Sans",
  "Plus Jakarta Sans",
  "Public Sans",
  "IBM Plex Sans",
  "Source Sans 3",
  "Work Sans",
  "Nunito Sans",
  "Lato",
  "Open Sans",
  "Montserrat",
  "Poppins",
  "Space Grotesk",
  "Sora",
  "Urbanist",
  "Roboto Slab",
  "Merriweather",
  "Libre Baskerville",
  "Playfair Display",
  "Fraunces",
  "Cormorant Garamond",
  "JetBrains Mono",
  "IBM Plex Mono",
  "Fira Code",
  "Bebas Neue",
  "Oswald",
  "Archivo Black",
  "Caveat",
  "Permanent Marker",
];

export const fallbackBunnyFontCatalog: BunnyFontCatalogItem[] = [
  bunnyFontCatalogItem("Manrope", "sans-serif", "Make every slide feel crisp"),
  bunnyFontCatalogItem("DM Sans", "sans-serif", "Make every slide feel crisp"),
  bunnyFontCatalogItem("Plus Jakarta Sans", "sans-serif", "Make every slide feel crisp"),
  bunnyFontCatalogItem("Public Sans", "sans-serif", "Make every slide feel crisp"),
  bunnyFontCatalogItem("IBM Plex Sans", "sans-serif", "Make every slide feel crisp"),
  bunnyFontCatalogItem("Source Sans 3", "sans-serif", "Make every slide feel crisp"),
  bunnyFontCatalogItem("Work Sans", "sans-serif", "Make every slide feel crisp"),
  bunnyFontCatalogItem("Nunito Sans", "sans-serif", "Make every slide feel crisp"),
  bunnyFontCatalogItem("Lato", "sans-serif", "Make every slide feel crisp"),
  bunnyFontCatalogItem("Open Sans", "sans-serif", "Make every slide feel crisp"),
  bunnyFontCatalogItem("Montserrat", "sans-serif", "Make every slide feel crisp"),
  bunnyFontCatalogItem("Poppins", "sans-serif", "Make every slide feel crisp"),
  bunnyFontCatalogItem("Space Grotesk", "sans-serif", "Make every slide feel crisp"),
  bunnyFontCatalogItem("Sora", "sans-serif", "Make every slide feel crisp"),
  bunnyFontCatalogItem("Urbanist", "sans-serif", "Make every slide feel crisp"),
  bunnyFontCatalogItem("Merriweather", "serif", "A serious story needs a human voice"),
  bunnyFontCatalogItem("Libre Baskerville", "serif", "A serious story needs a human voice"),
  bunnyFontCatalogItem("Roboto Slab", "serif", "A serious story needs a human voice"),
  bunnyFontCatalogItem("Playfair Display", "serif", "A serious story needs a human voice"),
  bunnyFontCatalogItem("Fraunces", "serif", "A serious story needs a human voice"),
  bunnyFontCatalogItem("Cormorant Garamond", "serif", "A serious story needs a human voice"),
  bunnyFontCatalogItem("Oswald", "display", "Bold claims need bold type"),
  bunnyFontCatalogItem("Bebas Neue", "display", "Bold claims need bold type"),
  bunnyFontCatalogItem("Archivo Black", "display", "Bold claims need bold type"),
  bunnyFontCatalogItem("JetBrains Mono", "monospace", "Metrics, code, and calm precision"),
  bunnyFontCatalogItem("IBM Plex Mono", "monospace", "Metrics, code, and calm precision"),
  bunnyFontCatalogItem("Fira Code", "monospace", "Metrics, code, and calm precision"),
  bunnyFontCatalogItem("Caveat", "handwriting", "A note in the margin"),
  bunnyFontCatalogItem("Permanent Marker", "handwriting", "A note in the margin"),
];

export const sourceFontChoices: SourceFontChoice[] = [
  {
    id: "inter",
    label: "Inter",
    family: "Inter",
    remoteUrl: "https://rsms.me/inter/font-files/InterVariable.woff2?v=4.1",
    mediaType: "font/woff2",
    meta: "rsms source",
    sample: "Sharp product stories",
  },
  {
    id: "geist-sans",
    label: "Geist Sans",
    family: "Geist",
    remoteUrl:
      "https://cdn.jsdelivr.net/npm/geist@1.7.2/dist/fonts/geist-sans/Geist-Variable.woff2",
    mediaType: "font/woff2",
    meta: "Vercel package",
    sample: "Developer-grade decks",
  },
  {
    id: "geist-mono",
    label: "Geist Mono",
    family: "Geist Mono",
    remoteUrl:
      "https://cdn.jsdelivr.net/npm/geist@1.7.2/dist/fonts/geist-mono/GeistMono-Variable.woff2",
    mediaType: "font/woff2",
    meta: "Vercel package",
    sample: "const ship = true;",
  },
];

export function bunnyStylesheetUrl(fonts: MikroFontRecord[]) {
  return bunnyStylesheetUrlForFamilies(
    fonts.filter((font) => font.source === "bunny").map((font) => font.family),
  );
}

export function matchesFontCategory(font: BunnyFontCatalogItem, category: FontCategory) {
  if (category === "recommended") {
    return recommendedBunnyFamilies.some(
      (family) => family.toLowerCase() === font.family.toLowerCase(),
    );
  }

  if (category === "sans-serif") {
    return font.category === "sans-serif";
  }

  if (category === "serif") {
    return font.category === "serif";
  }

  if (category === "display") {
    return font.category === "display";
  }

  if (category === "monospace") {
    return font.category === "monospace";
  }

  return font.category === "handwriting";
}

export function readBunnyFontCatalogItem(slug: string, value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const family = typeof record.familyName === "string" ? cleanFontName(record.familyName) : "";
  const category = typeof record.category === "string" ? record.category : "sans-serif";
  if (!family || !isSupportedBunnyCategory(category)) {
    return null;
  }

  const weights = Array.isArray(record.weights)
    ? record.weights.map((item) => Number(item)).filter((item) => Number.isFinite(item))
    : [400, 600, 700];
  const styles = Array.isArray(record.styles)
    ? record.styles.filter((item): item is string => typeof item === "string")
    : ["normal"];

  return {
    slug,
    family,
    category,
    weights,
    styles,
    isVariable: Boolean(record.isVariable),
    sample: sampleForFontCategory(category),
  } satisfies BunnyFontCatalogItem;
}

export function sortBunnyFontCatalog(fonts: BunnyFontCatalogItem[]) {
  const recommended = new Map(
    recommendedBunnyFamilies.map((family, index) => [family.toLowerCase(), index]),
  );
  return fonts.toSorted((left, right) => {
    const leftRecommended = recommended.get(left.family.toLowerCase()) ?? 9999;
    const rightRecommended = recommended.get(right.family.toLowerCase()) ?? 9999;
    if (leftRecommended !== rightRecommended) {
      return leftRecommended - rightRecommended;
    }
    return left.family.localeCompare(right.family);
  });
}

export function fontSourceLabel(font: MikroFontRecord) {
  if (font.source === "bunny") {
    return "Bunny";
  }
  if (font.source === "source") {
    return "Source";
  }
  return "Imported file";
}

export function fontCategoryLabel(category: string) {
  if (category === "sans-serif") {
    return "Sans";
  }
  if (category === "serif") {
    return "Serif";
  }
  if (category === "display") {
    return "Display";
  }
  if (category === "monospace") {
    return "Mono";
  }
  return "Script";
}

export function fontWeightsLabel(font: BunnyFontCatalogItem) {
  if (font.isVariable) {
    return "Variable";
  }

  const weights = [...new Set(font.weights)].sort((left, right) => left - right);
  if (weights.length <= 3) {
    return weights.join(", ");
  }

  return `${weights[0]}-${weights[weights.length - 1]}`;
}

export function cleanFontName(value: string) {
  return value
    .replace(/\.(woff2?|otf|ttf)$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function fontNameFromFile(fileName: string) {
  return cleanFontName(fileName) || "Imported font";
}

export function quotedCssString(value: string) {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function bunnyStylesheetUrlForFamilies(fonts: string[]) {
  const families = [...new Set(fonts)]
    .map((family) => encodeBunnyFamily(family))
    .filter(Boolean)
    .join("|");
  if (!families) {
    return null;
  }

  return `https://fonts.bunny.net/css?family=${families}&display=swap`;
}

function encodeBunnyFamily(family: string) {
  const name = family
    .trim()
    .split(/\s+/)
    .map((part) => encodeURIComponent(part))
    .join("+");
  return name ? `${name}:300,400,500,600,700,800,900` : "";
}

function isSupportedBunnyCategory(category: string) {
  return ["sans-serif", "serif", "display", "monospace", "handwriting"].includes(category);
}

function bunnyFontCatalogItem(
  family: string,
  category: BunnyFontCatalogItem["category"],
  sample: string,
): BunnyFontCatalogItem {
  return {
    slug: family.toLowerCase().replace(/\s+/g, "-"),
    family,
    category,
    weights: [300, 400, 500, 600, 700, 800, 900],
    styles: ["normal"],
    isVariable: true,
    sample,
  };
}

function sampleForFontCategory(category: string) {
  if (category === "serif") {
    return "A serious story needs a human voice";
  }
  if (category === "display") {
    return "Bold claims need bold type";
  }
  if (category === "monospace") {
    return "Metrics, code, and calm precision";
  }
  if (category === "handwriting") {
    return "A note in the margin";
  }
  return "Make every slide feel crisp";
}
