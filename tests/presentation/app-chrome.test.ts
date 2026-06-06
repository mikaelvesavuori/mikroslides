import {
  clampCanvasZoom,
  initialAppTheme,
  nextAppTheme,
  themeIconHref,
} from "../../src/presentation/appChrome.js";

describe("app chrome", () => {
  it("resolves initial theme from storage before media preference", () => {
    expect(initialAppTheme("dark", false)).toBe("dark");
    expect(initialAppTheme("light", true)).toBe("light");
    expect(initialAppTheme(null, true)).toBe("dark");
    expect(initialAppTheme("unknown", false)).toBe("light");
  });

  it("toggles theme and maps icons", () => {
    expect(nextAppTheme("dark")).toBe("light");
    expect(nextAppTheme("light")).toBe("dark");
    expect(themeIconHref("dark")).toBe("#icon-sun");
    expect(themeIconHref("light")).toBe("#icon-moon");
  });

  it("clamps canvas zoom to supported bounds", () => {
    expect(clampCanvasZoom(0.1)).toBe(0.55);
    expect(clampCanvasZoom(1.234)).toBe(1.23);
    expect(clampCanvasZoom(3)).toBe(2.4);
  });
});
