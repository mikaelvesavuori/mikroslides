import type { MikroDeckRecord, TextFontFamily } from "../index.js";
import { renderPresenterSurface } from "./presentationSurfaces.js";
import { nextPresenterIndex, presenterStartIndex } from "./presenterMode.js";

export type PresenterControllerOptions = {
  documentRef: Document;
  getDeck: () => MikroDeckRecord | null;
  openDialog: (dialog: HTMLDialogElement) => void;
  presenterDialog: HTMLDialogElement;
  presenterMeta: HTMLElement;
  presenterNextButton: HTMLButtonElement;
  presenterPrevButton: HTMLButtonElement;
  presenterSlide: HTMLElement;
  resolveFontStack: (fontFamily: TextFontFamily) => string;
  resolveImageSource: (src: string) => string;
  windowRef: Window;
};

export function createPresenterController(options: PresenterControllerOptions) {
  let presenterIndex = 0;

  function render() {
    presenterIndex = renderPresenterSurface(
      {
        presenterMeta: options.presenterMeta,
        presenterNextButton: options.presenterNextButton,
        presenterPrevButton: options.presenterPrevButton,
        presenterSlide: options.presenterSlide,
      },
      options.getDeck(),
      presenterIndex,
      options.presenterDialog.open,
      {
        resolveFontStack: options.resolveFontStack,
        resolveImageSource: options.resolveImageSource,
      },
    );
  }

  return {
    move(direction: -1 | 1) {
      const deck = options.getDeck();
      if (!deck) {
        return;
      }

      presenterIndex = nextPresenterIndex(deck, presenterIndex, direction);
      render();
    },
    open() {
      const deck = options.getDeck();
      if (!deck) {
        return;
      }

      presenterIndex = presenterStartIndex(deck);
      options.openDialog(options.presenterDialog);
      render();
      if (!options.documentRef.fullscreenElement) {
        void options.presenterDialog.requestFullscreen?.().catch(() => undefined);
      }
      options.windowRef.setTimeout(() => options.presenterSlide.focus(), 0);
    },
    render,
  };
}
