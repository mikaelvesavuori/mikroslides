import type { MikroFontRecord, TextFontFamily } from "../index.js";
import { bunnyStylesheetUrl } from "./fontCatalog.js";

const fontFaceStyleId = "mikroslides-font-faces";
const bunnyFontLinkId = "mikroslides-bunny-fonts";
const sourceFontStylesheetLinkIdPrefix = "mikroslides-source-font-stylesheet-";

export type FontRuntimePlan = {
  bunnyStylesheetUrl: string | null;
  fontFaceCss: string;
  sourceStylesheets: Array<{ href: string; id: string }>;
};

export function localCssFontFamily(font: MikroFontRecord) {
  return `MikroSlides Font ${font.id}`;
}

export function fontAssetId(font: MikroFontRecord) {
  return font.source === "local" && font.assetId ? font.assetId : null;
}

export function cssFontStackForFont(font: MikroFontRecord) {
  const family = font.source === "local" ? localCssFontFamily(font) : font.family;
  return `${quotedCssString(family)}, var(--font-family)`;
}

export function cssFontStackForTextToken(
  fontFamily: TextFontFamily,
  getFont: (fontFamily: TextFontFamily) => MikroFontRecord | null,
) {
  if (fontFamily === "serif") {
    return "var(--font-serif)";
  }

  if (fontFamily === "mono") {
    return "var(--font-mono)";
  }

  const font = getFont(fontFamily);
  return font ? cssFontStackForFont(font) : "var(--font-family)";
}

export function canvasFontStackForTextToken(
  fontFamily: TextFontFamily,
  getFont: (fontFamily: TextFontFamily) => MikroFontRecord | null,
) {
  if (fontFamily === "serif") {
    return "Georgia, Cambria, serif";
  }

  if (fontFamily === "mono") {
    return '"SFMono-Regular", Consolas, monospace';
  }

  const font = getFont(fontFamily);
  if (!font) {
    return 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  }

  const family = font.source === "local" ? localCssFontFamily(font) : font.family;
  return `${quotedCssString(family)}, system-ui, sans-serif`;
}

export function createFontRuntimePlan(
  fonts: MikroFontRecord[],
  objectUrlForAsset: (assetId: string) => string | null,
): FontRuntimePlan {
  const localRules = fonts
    .filter((font) => font.source === "local" && font.assetId)
    .flatMap((font) => {
      const assetId = fontAssetId(font);
      const objectUrl = assetId ? objectUrlForAsset(assetId) : null;
      if (!objectUrl) {
        return [];
      }

      return [
        `@font-face{font-family:${quotedCssString(localCssFontFamily(font))};src:url(${quotedCssString(objectUrl)}) format("${fontFormat(font)}");font-display:swap;}`,
      ];
    });
  const sourceRules = fonts
    .filter((font) => font.source === "source" && font.remoteUrl && !isRemoteFontStylesheet(font))
    .map(
      (font) =>
        `@font-face{font-family:${quotedCssString(font.family)};src:url(${quotedCssString(font.remoteUrl ?? "")}) format("${fontFormat(font)}");font-style:normal;font-weight:100 900;font-display:swap;}`,
    );
  const bunnyFonts = fonts.filter((font) => font.source === "bunny");
  const stylesheetFonts = fonts.filter(
    (font) => font.source === "source" && font.remoteUrl && isRemoteFontStylesheet(font),
  );

  return {
    bunnyStylesheetUrl: bunnyFonts.length > 0 ? bunnyStylesheetUrl(bunnyFonts) : null,
    fontFaceCss: [...localRules, ...sourceRules].join("\n"),
    sourceStylesheets: stylesheetFonts.map((font) => ({
      id: sourceFontStylesheetLinkId(font),
      href: font.remoteUrl ?? "",
    })),
  };
}

export function renderFontRuntimeStyles(
  fonts: MikroFontRecord[],
  objectUrlForAsset: (assetId: string) => string | null,
  documentRef: Document = document,
) {
  const plan = createFontRuntimePlan(fonts, objectUrlForAsset);
  const existingStyle = documentRef.querySelector<HTMLStyleElement>(`#${fontFaceStyleId}`);
  const style = existingStyle ?? documentRef.createElement("style");
  style.id = fontFaceStyleId;
  style.textContent = plan.fontFaceCss;
  if (!existingStyle) {
    documentRef.head.append(style);
  }

  syncSourceFontStylesheetLinks(plan.sourceStylesheets, documentRef);
  syncBunnyFontStylesheet(plan.bunnyStylesheetUrl, documentRef);
}

function syncSourceFontStylesheetLinks(
  stylesheets: FontRuntimePlan["sourceStylesheets"],
  documentRef: Document,
) {
  const activeIds = new Set(stylesheets.map((font) => font.id));
  for (const link of documentRef.querySelectorAll<HTMLLinkElement>(
    "link[data-mikroslides-source-font='true']",
  )) {
    if (!activeIds.has(link.id)) {
      link.remove();
    }
  }

  for (const stylesheet of stylesheets) {
    const existingLink = documentRef.getElementById(stylesheet.id) as HTMLLinkElement | null;
    const link = existingLink ?? documentRef.createElement("link");
    link.id = stylesheet.id;
    link.rel = "stylesheet";
    link.href = stylesheet.href;
    link.dataset.mikroslidesSourceFont = "true";
    if (!existingLink) {
      documentRef.head.append(link);
    }
  }
}

function syncBunnyFontStylesheet(href: string | null, documentRef: Document) {
  const existingLink = documentRef.querySelector<HTMLLinkElement>(`#${bunnyFontLinkId}`);
  if (!href) {
    existingLink?.remove();
    return;
  }

  const link = existingLink ?? documentRef.createElement("link");
  link.id = bunnyFontLinkId;
  link.rel = "stylesheet";
  link.href = href;
  if (!existingLink) {
    documentRef.head.append(link);
  }
}

function sourceFontStylesheetLinkId(font: MikroFontRecord) {
  return `${sourceFontStylesheetLinkIdPrefix}${font.id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function isRemoteFontStylesheet(font: MikroFontRecord) {
  const source = `${font.mediaType ?? ""} ${font.remoteUrl ?? ""}`.toLowerCase();
  return source.includes("text/css") || source.includes(".css");
}

function fontFormat(font: MikroFontRecord) {
  const source = `${font.mediaType ?? ""} ${font.label} ${font.remoteUrl ?? ""}`.toLowerCase();
  if (source.includes("woff2")) {
    return "woff2";
  }
  if (source.includes("woff")) {
    return "woff";
  }
  if (source.includes("otf") || source.includes("opentype")) {
    return "opentype";
  }
  if (source.includes("ttf") || source.includes("truetype")) {
    return "truetype";
  }
  return "woff2";
}

function quotedCssString(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
