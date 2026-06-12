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

  return {
    canExportJson: true,
    canExportPdf: true,
    canExportPng: Boolean(slide),
    canExportPortable: true,
    statusText: "",
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
