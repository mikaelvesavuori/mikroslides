export type AppTheme = "dark" | "light";

export const appThemeStorageKey = "mikroslides.theme";

export function initialAppTheme(storedTheme: string | null, prefersDark: boolean): AppTheme {
  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }

  return prefersDark ? "dark" : "light";
}

export function nextAppTheme(currentTheme: string | undefined): AppTheme {
  return currentTheme === "dark" ? "light" : "dark";
}

export function themeIconHref(theme: AppTheme) {
  return theme === "dark" ? "#icon-sun" : "#icon-moon";
}

export function clampCanvasZoom(value: number) {
  return Math.min(2.4, Math.max(0.55, Math.round(value * 100) / 100));
}
