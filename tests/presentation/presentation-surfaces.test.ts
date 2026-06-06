import { MikroDeck } from "../../src/index.js";
import {
  renderPresenterSurface,
  renderPrintDeckMarkup,
  syncDeckSurfaceChrome,
} from "../../src/presentation/presentationSurfaces.js";

const renderOptions = {
  resolveFontStack: () => "system-ui",
  resolveImageSource: (src: string) => src,
};

function styledElement() {
  const styles = new Map<string, string>();
  return {
    styles,
    style: {
      setProperty: (key: string, value: string) => styles.set(key, value),
    },
    innerHTML: "",
    textContent: "",
  };
}

function buttonElement() {
  return {
    ...styledElement(),
    disabled: false,
  };
}

describe("presentation surfaces", () => {
  it("renders print deck markup for every slide", () => {
    const deck = MikroDeck.create({ title: "Deck" }).addSlide().toRecord();
    deck.slides[0].background = "#fff'bad";

    const markup = renderPrintDeckMarkup(deck, renderOptions);

    expect(markup.match(/<section class="print-slide"/g)).toHaveLength(deck.slides.length);
    expect(markup).toContain("--slide-bg:#fff&#39;bad");
  });

  it("syncs deck surface dimensions and zoom text", () => {
    const appShell = styledElement();
    const presenterDialog = styledElement();
    const printDeck = styledElement();
    const zoomFitButton = buttonElement();

    syncDeckSurfaceChrome(
      {
        appShell: appShell as unknown as HTMLElement,
        presenterDialog: presenterDialog as unknown as HTMLElement,
        printDeck: printDeck as unknown as HTMLElement,
        zoomFitButton: zoomFitButton as unknown as HTMLButtonElement,
      },
      "4:3",
      1.25,
    );

    expect(appShell.styles.get("--deck-aspect-ratio")).toBe("4 / 3");
    expect(appShell.styles.get("--canvas-zoom")).toBe("1.25");
    expect(printDeck.styles.get("--print-width")).toBe("10in");
    expect(zoomFitButton.textContent).toBe("125%");
  });

  it("renders the clamped presenter slide and navigation state", () => {
    const deck = MikroDeck.create({ title: "Deck" }).addSlide().toRecord();
    const lastSlideIndex = deck.slides.length - 1;
    const presenterSlide = styledElement();
    const presenterMeta = styledElement();
    const presenterPrevButton = buttonElement();
    const presenterNextButton = buttonElement();

    const nextIndex = renderPresenterSurface(
      {
        presenterMeta: presenterMeta as unknown as HTMLElement,
        presenterNextButton: presenterNextButton as unknown as HTMLButtonElement,
        presenterPrevButton: presenterPrevButton as unknown as HTMLButtonElement,
        presenterSlide: presenterSlide as unknown as HTMLElement,
      },
      deck,
      99,
      true,
      renderOptions,
    );

    expect(nextIndex).toBe(lastSlideIndex);
    expect(presenterMeta.textContent).toContain(`${deck.slides.length} / ${deck.slides.length}`);
    expect(presenterNextButton.disabled).toBe(true);
    expect(presenterPrevButton.disabled).toBe(false);
  });

  it("renders the next presentable slide when the requested slide is skipped", () => {
    const deck = MikroDeck.create({ title: "Deck" }).addSlide().toRecord();
    const skippedDeck = {
      ...deck,
      slides: deck.slides.map((slide, index) =>
        index === 0 ? { ...slide, skipped: true } : slide,
      ),
    };
    const presenterSlide = styledElement();
    const presenterMeta = styledElement();
    const presenterPrevButton = buttonElement();
    const presenterNextButton = buttonElement();

    const nextIndex = renderPresenterSurface(
      {
        presenterMeta: presenterMeta as unknown as HTMLElement,
        presenterNextButton: presenterNextButton as unknown as HTMLButtonElement,
        presenterPrevButton: presenterPrevButton as unknown as HTMLButtonElement,
        presenterSlide: presenterSlide as unknown as HTMLElement,
      },
      skippedDeck,
      0,
      true,
      renderOptions,
    );

    expect(nextIndex).toBe(1);
    expect(presenterMeta.textContent).toContain(`1 / ${deck.slides.length - 1}`);
    expect(presenterPrevButton.disabled).toBe(true);
  });
});
