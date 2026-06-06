import {
  appThemeStorageKey,
  clampCanvasZoom,
  initialAppTheme,
  nextAppTheme,
  themeIconHref,
} from "./appChrome.js";
import type { MikroSlidesElements } from "./appElements.js";

export type AppChromeControllerOptions = {
  elements: Pick<MikroSlidesElements, "appShell" | "html" | "themeIcon">;
  localStorage: Storage;
  prefersDarkMode: () => boolean;
  renderDeckChrome: () => void;
};

export function createAppChromeController(options: AppChromeControllerOptions) {
  let canvasZoom = 1;

  function applyTheme(theme: string) {
    const nextTheme = initialAppTheme(theme, false);
    options.elements.html.dataset.theme = nextTheme;
    options.elements.themeIcon.setAttribute("href", themeIconHref(nextTheme));
    options.localStorage.setItem(appThemeStorageKey, nextTheme);
  }

  return {
    applyFocusMode() {
      options.elements.appShell.dataset.focusMode = "true";
    },
    applyTheme,
    getCanvasZoom() {
      return canvasZoom;
    },
    loadTheme() {
      return initialAppTheme(
        options.localStorage.getItem(appThemeStorageKey),
        options.prefersDarkMode(),
      );
    },
    setCanvasZoom(value: number) {
      canvasZoom = clampCanvasZoom(value);
      options.renderDeckChrome();
    },
    toggleTheme() {
      applyTheme(nextAppTheme(options.elements.html.dataset.theme));
    },
  };
}
