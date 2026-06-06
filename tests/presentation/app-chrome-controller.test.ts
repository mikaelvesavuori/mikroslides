import { createAppChromeController } from "../../src/presentation/appChromeController.js";

function chromeElement() {
  return {
    dataset: {} as Record<string, string>,
    href: "",
    setAttribute(name: string, value: string) {
      if (name === "href") {
        this.href = value;
      }
    },
  };
}

describe("app chrome controller", () => {
  it("applies focus mode, theme, and clamped canvas zoom", () => {
    const storage = new Map<string, string>();
    const calls: string[] = [];
    const appShell = chromeElement();
    const html = chromeElement();
    const themeIcon = chromeElement();
    const controller = createAppChromeController({
      elements: {
        appShell: appShell as unknown as HTMLElement,
        html: html as unknown as HTMLElement,
        themeIcon: themeIcon as unknown as SVGUseElement,
      },
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      } as unknown as Storage,
      prefersDarkMode: () => true,
      renderDeckChrome: () => calls.push("render"),
    });

    controller.applyFocusMode();
    expect(appShell.dataset.focusMode).toBe("true");
    expect(controller.loadTheme()).toBe("dark");

    controller.applyTheme("dark");
    expect(html.dataset.theme).toBe("dark");
    expect(themeIcon.href).toBe("#icon-sun");

    controller.toggleTheme();
    expect(html.dataset.theme).toBe("light");
    expect(storage.get("mikroslides.theme")).toBe("light");

    controller.setCanvasZoom(9);
    expect(controller.getCanvasZoom()).toBe(2.4);
    expect(calls).toEqual(["render"]);
  });
});
