import { downloadBytes, downloadText } from "../config/index.js";
import type {
  MikroAssetRecord,
  MikroDeckRecord,
  MikroSlideRecord,
  PortableAssetInput,
  TextFontFamily,
} from "../index.js";
import { openDialog } from "./appFeedback.js";
import {
  collectPortableExportAssets,
  exportDialogState,
  jsonExportModel,
  pngExportModel,
  portableExportModel,
} from "./deckFileFlows.js";
import {
  type ExportPanelElements,
  renderExportPanelState,
  setExportActionBusy,
} from "./exportPanel.js";
import { syncPrintPageStyle } from "./presentationSurfaces.js";

type ExportControllerElements = ExportPanelElements & {
  exportDialog: HTMLDialogElement;
};

export type ExportControllerOptions = {
  baseHref: () => string;
  documentRef: Document;
  elements: ExportControllerElements;
  formatError: (error: unknown, fallback: string) => string;
  fontsReady: () => Promise<unknown>;
  getDeck: () => MikroDeckRecord | null;
  getSlide: () => MikroSlideRecord | null;
  loadAsset: (assetId: string) => Promise<MikroAssetRecord | null>;
  renderPrintDeck: () => void;
  resolveFontFamily: (fontFamily: TextFontFamily) => string;
  resolveImageSource: (src: string) => string;
  serializeDeck: (deck: MikroDeckRecord) => string;
  serializePortableDeck: (deck: MikroDeckRecord, assets: PortableAssetInput[]) => string;
  showToast: (message: string) => void;
  windowRef: Pick<Window, "print" | "setTimeout">;
};

export function createExportController(options: ExportControllerOptions) {
  function renderStatus() {
    renderExportPanelState(
      options.elements,
      exportDialogState(options.getDeck(), options.getSlide(), options.baseHref()),
    );
  }

  function close() {
    if (options.elements.exportDialog.open) {
      options.elements.exportDialog.close();
    }
  }

  return {
    close,
    exportJson() {
      const deck = options.getDeck();
      if (!deck) {
        return;
      }

      const exportModel = jsonExportModel(deck, options.serializeDeck);
      downloadText(exportModel.filename, exportModel.text, exportModel.mimeType);
      close();
      options.showToast(exportModel.toast);
    },
    async exportPng() {
      const deck = options.getDeck();
      const slide = options.getSlide();
      if (!deck || !slide) {
        return;
      }

      setExportActionBusy(options.elements.exportPngAction, true);
      try {
        const exportModel = await pngExportModel({
          aspectRatio: deck.aspectRatio,
          deckTitle: deck.title,
          fontsReady: options.fontsReady(),
          resolveFontFamily: options.resolveFontFamily,
          resolveImageSource: options.resolveImageSource,
          slide,
        });
        downloadBytes(exportModel.filename, exportModel.bytes, exportModel.mimeType);
        close();
        options.showToast(exportModel.toast);
      } catch (error) {
        options.showToast(options.formatError(error, "Could not export PNG"));
      } finally {
        setExportActionBusy(options.elements.exportPngAction, false);
      }
    },
    exportPdf() {
      const deck = options.getDeck();
      if (!deck) {
        return;
      }

      options.renderPrintDeck();
      syncPrintPageStyle(options.documentRef, deck.aspectRatio);
      close();
      const originalTitle = options.documentRef.title;
      options.documentRef.title = deck.title;
      options.windowRef.setTimeout(() => {
        options.windowRef.print();
        options.documentRef.title = originalTitle;
      }, 60);
    },
    async exportPortable() {
      const deck = options.getDeck();
      if (!deck) {
        return;
      }

      setExportActionBusy(options.elements.exportPortableAction, true);
      try {
        const portableAssets = await collectPortableExportAssets(deck, options.loadAsset);
        const exportModel = portableExportModel(
          deck,
          portableAssets.assets,
          portableAssets.failedAssets,
          options.serializePortableDeck,
        );
        downloadText(exportModel.filename, exportModel.text, exportModel.mimeType);
        close();
        options.showToast(exportModel.toast);
      } catch (error) {
        options.showToast(options.formatError(error, "Could not export portable file"));
      } finally {
        setExportActionBusy(options.elements.exportPortableAction, false);
      }
    },
    open() {
      renderStatus();
      openDialog(options.elements.exportDialog);
    },
    renderStatus,
  };
}
