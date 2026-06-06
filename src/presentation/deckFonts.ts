import type { MikroFontRecord } from "../index.js";
import { bunnyStylesheetUrl, type SourceFontChoice } from "./fontCatalog.js";

export function createLocalFontRecord(options: {
  assetId: string;
  createFontId: () => string;
  label: string;
  mediaType: string;
  now: string;
}) {
  return {
    assetId: options.assetId,
    createdAt: options.now,
    family: options.label,
    id: options.createFontId(),
    label: options.label,
    mediaType: options.mediaType,
    remoteUrl: null,
    source: "local",
    updatedAt: options.now,
  } satisfies MikroFontRecord;
}

export function createBunnyFontRecord(options: {
  createFontId: () => string;
  family: string;
  now: string;
}) {
  const label = options.family.trim();
  return {
    assetId: null,
    createdAt: options.now,
    family: label,
    id: options.createFontId(),
    label,
    mediaType: null,
    remoteUrl: bunnyStylesheetUrl([
      {
        assetId: null,
        createdAt: options.now,
        family: label,
        id: "preview",
        label,
        mediaType: null,
        remoteUrl: null,
        source: "bunny",
        updatedAt: options.now,
      },
    ]),
    source: "bunny",
    updatedAt: options.now,
  } satisfies MikroFontRecord;
}

export function createSourceFontRecord(options: {
  createFontId: () => string;
  now: string;
  sourceFont: SourceFontChoice;
}) {
  return {
    assetId: null,
    createdAt: options.now,
    family: options.sourceFont.family,
    id: options.createFontId(),
    label: options.sourceFont.label,
    mediaType: options.sourceFont.mediaType,
    remoteUrl: options.sourceFont.remoteUrl,
    source: "source",
    updatedAt: options.now,
  } satisfies MikroFontRecord;
}

export function findExistingBunnyFont(fonts: MikroFontRecord[], family: string) {
  const label = family.trim().toLowerCase();
  return fonts.find((font) => font.source === "bunny" && font.family.toLowerCase() === label);
}

export function findExistingSourceFont(fonts: MikroFontRecord[], sourceFont: SourceFontChoice) {
  return fonts.find(
    (font) =>
      font.source === "source" &&
      font.family.toLowerCase() === sourceFont.family.toLowerCase() &&
      font.remoteUrl === sourceFont.remoteUrl,
  );
}
