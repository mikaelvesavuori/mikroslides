import type { MikroDeckRecord, TextFontFamily } from "../index.js";
import {
  renderFontRuntimeStyles as renderDeckFontRuntimeStyles,
  canvasFontStackForTextToken as resolveCanvasFontStackForTextToken,
  cssFontStackForTextToken as resolveCssFontStackForTextToken,
} from "./fontRuntime.js";

export type FontRuntimeControllerOptions = {
  getDeck: () => MikroDeckRecord | null;
  objectUrlForAsset: (assetId: string) => string | null;
};

export function createFontRuntimeController(options: FontRuntimeControllerOptions) {
  function getFontIdFromToken(fontFamily: TextFontFamily) {
    return fontFamily.startsWith("font:") ? fontFamily.replace(/^font:/, "") : null;
  }

  function getFontFromToken(fontFamily: TextFontFamily) {
    const fontId = getFontIdFromToken(fontFamily);
    return fontId ? (options.getDeck()?.fonts.find((font) => font.id === fontId) ?? null) : null;
  }

  return {
    canvasFontStackForTextToken(fontFamily: TextFontFamily) {
      return resolveCanvasFontStackForTextToken(fontFamily, getFontFromToken);
    },
    cssFontStackForTextToken(fontFamily: TextFontFamily) {
      return resolveCssFontStackForTextToken(fontFamily, getFontFromToken);
    },
    renderFontRuntimeStyles() {
      renderDeckFontRuntimeStyles(options.getDeck()?.fonts ?? [], options.objectUrlForAsset);
    },
  };
}
