import type {
  DeckAspectRatio,
  MikroAssetRecord,
  MikroDeckRecord,
  MikroSlideRecord,
  PortableAssetInput,
  TextFontFamily,
} from "../index.js";
import { assetIdFromSrc, materializeSlideAssetSources } from "./assetRuntime.js";
import { renderSlideToPng } from "./pngExport.js";
import {
  collectRemoteImageAssets,
  collectStoredFontAssets,
  collectStoredImageAssets,
} from "./portableAssets.js";

export type ExportDialogState = {
  canExportJson: boolean;
  canExportPdf: boolean;
  canExportPng: boolean;
  canExportPortable: boolean;
  statusText: string;
};

export function exportDialogState(
  deck: MikroDeckRecord | null,
  slide: MikroSlideRecord | null,
  baseHref: string,
): ExportDialogState {
  if (!deck) {
    return {
      canExportJson: false,
      canExportPdf: false,
      canExportPng: false,
      canExportPortable: false,
      statusText: "No active deck.",
    };
  }

  const imageSources = deck.slides.flatMap((deckSlide) =>
    deckSlide.elements.flatMap((element) =>
      element.kind === "image" && element.src ? [element.src] : [],
    ),
  );
  const storedImages = imageSources.filter((src) => assetIdFromSrc(src)).length;
  const embeddedImages = imageSources.filter((src) => src.startsWith("data:")).length;
  const remoteImages = imageSources.filter((src) => isRemoteImageSource(src, baseHref)).length;
  const storedFonts = deck.fonts.filter((font) => font.source === "local").length;
  const bunnyFonts = deck.fonts.filter((font) => font.source === "bunny").length;
  const sourceFonts = deck.fonts.filter((font) => font.source === "source").length;
  const details = [
    `${deck.slides.length} ${deck.slides.length === 1 ? "slide" : "slides"}`,
    deck.aspectRatio,
  ];

  if (storedImages > 0) {
    details.push(`${storedImages} stored ${storedImages === 1 ? "image" : "images"}`);
  }
  if (embeddedImages > 0) {
    details.push(`${embeddedImages} embedded ${embeddedImages === 1 ? "image" : "images"}`);
  }
  if (remoteImages > 0) {
    details.push(`${remoteImages} remote ${remoteImages === 1 ? "image" : "images"}`);
  }
  if (storedFonts > 0) {
    details.push(`${storedFonts} local ${storedFonts === 1 ? "font" : "fonts"}`);
  }
  if (bunnyFonts > 0) {
    details.push(`${bunnyFonts} Bunny ${bunnyFonts === 1 ? "font" : "fonts"}`);
  }
  if (sourceFonts > 0) {
    details.push(`${sourceFonts} source ${sourceFonts === 1 ? "font" : "fonts"}`);
  }

  return {
    canExportJson: true,
    canExportPdf: true,
    canExportPng: Boolean(slide),
    canExportPortable: true,
    statusText: slide ? `${details.join(" / ")} / Current: ${slide.title}` : details.join(" / "),
  };
}

export function jsonExportModel(
  deck: MikroDeckRecord,
  serializeDeck: (deck: MikroDeckRecord) => string,
) {
  return {
    filename: `${toFileSlug(deck.title)}.mikroslides.json`,
    mimeType: "application/json;charset=utf-8",
    text: serializeDeck(deck),
    toast: deckHasLocalAssets(deck)
      ? "JSON exported with local asset references; use Portable for sharing"
      : "MikroSlides JSON exported",
  };
}

export async function collectPortableExportAssets(
  deck: MikroDeckRecord,
  loadAsset: (assetId: string) => Promise<MikroAssetRecord | null>,
) {
  const storedAssets = await collectStoredImageAssets(deck, loadAsset);
  const storedFontAssets = await collectStoredFontAssets(deck, loadAsset);
  const externalAssets = await collectRemoteImageAssets(deck);
  const assets: PortableAssetInput[] = [
    ...storedAssets.assets,
    ...storedFontAssets.assets,
    ...externalAssets.assets,
  ];

  return {
    assets,
    failedAssets: storedAssets.failed + storedFontAssets.failed + externalAssets.failed,
  };
}

export function portableExportModel(
  deck: MikroDeckRecord,
  assets: PortableAssetInput[],
  failedAssets: number,
  serializePortableDeck: (deck: MikroDeckRecord, assets: PortableAssetInput[]) => string,
) {
  return {
    filename: `${toFileSlug(deck.title)}.mikroslides`,
    mimeType: "application/vnd.mikroslides+json;charset=utf-8",
    text: serializePortableDeck(deck, assets),
    toast:
      failedAssets > 0
        ? `Portable file exported; ${failedAssets} asset${failedAssets === 1 ? "" : "s"} could not be embedded`
        : "Portable MikroSlides file exported",
  };
}

export async function pngExportModel(options: {
  aspectRatio: DeckAspectRatio;
  deckTitle: string;
  fontsReady: Promise<unknown>;
  resolveFontFamily: (fontFamily: TextFontFamily) => string;
  resolveImageSource: (src: string) => string;
  slide: MikroSlideRecord;
}) {
  await options.fontsReady;
  const png = await renderSlideToPng(
    materializeSlideAssetSources(options.slide, options.resolveImageSource),
    options.aspectRatio,
    {
      resolveFontFamily: options.resolveFontFamily,
      scale: 2,
    },
  );

  return {
    bytes: png,
    filename: `${toFileSlug(options.deckTitle)}-${toFileSlug(options.slide.title)}.png`,
    mimeType: "image/png",
    toast: "Current slide exported as PNG",
  };
}

export async function readImportFileFromEvent(
  event: Event,
  readFileAsText: (file: File) => Promise<string>,
) {
  const input = event.currentTarget;
  if (!(input instanceof HTMLInputElement)) {
    return null;
  }

  const file = input.files?.[0];
  if (!file) {
    return { input, text: null };
  }

  return {
    fileName: file.name,
    input,
    text: await readFileAsText(file),
  };
}

export function isRemoteImageSource(src: string, baseHref: string) {
  if (!src || src.startsWith("data:") || src.startsWith("asset:")) {
    return false;
  }

  try {
    const url = new URL(src, baseHref);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function toFileSlug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "mikroslides"
  );
}

function deckHasLocalAssets(deck: MikroDeckRecord) {
  const storedImages = deck.slides
    .flatMap((slide) => slide.elements)
    .filter((element) => element.kind === "image" && assetIdFromSrc(element.src)).length;
  const storedFonts = deck.fonts.filter((font) => font.source === "local").length;
  return storedImages + storedFonts > 0;
}
