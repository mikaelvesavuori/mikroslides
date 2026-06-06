import { MikroDeck } from "../../src/index.js";
import { createPresenterController } from "../../src/presentation/presenterController.js";

function presenterElement() {
  return {
    disabled: false,
    focused: false,
    innerHTML: "",
    style: { setProperty: () => undefined },
    textContent: "",
    focus() {
      this.focused = true;
    },
  };
}

describe("presenter controller", () => {
  it("opens on the active slide and moves through the deck", () => {
    const deck = MikroDeck.create({ title: "Presenter" }).addSlide().toRecord();
    deck.activeSlideId = deck.slides[1].id;
    const presenterDialog = {
      open: false,
      requestFullscreen: async () => undefined,
    } as unknown as HTMLDialogElement;
    const presenterSlide = presenterElement();
    const presenterMeta = presenterElement();
    const presenterPrevButton = presenterElement();
    const presenterNextButton = presenterElement();
    const calls: string[] = [];
    const controller = createPresenterController({
      documentRef: { fullscreenElement: null } as unknown as Document,
      getDeck: () => deck,
      openDialog: (dialog) => {
        dialog.open = true;
        calls.push("open");
      },
      presenterDialog,
      presenterMeta: presenterMeta as unknown as HTMLElement,
      presenterNextButton: presenterNextButton as unknown as HTMLButtonElement,
      presenterPrevButton: presenterPrevButton as unknown as HTMLButtonElement,
      presenterSlide: presenterSlide as unknown as HTMLElement,
      resolveFontStack: () => "Inter, sans-serif",
      resolveImageSource: (src) => src,
      windowRef: {
        setTimeout: (callback: TimerHandler) => {
          if (typeof callback === "function") {
            callback();
          }
          return 1;
        },
      } as unknown as Window,
    });

    controller.open();
    expect(calls).toEqual(["open"]);
    expect(presenterMeta.textContent).toContain("2 /");
    expect(presenterSlide.focused).toBe(true);

    controller.move(1);
    expect(presenterMeta.textContent).toContain("3 /");
    controller.move(1);
    expect(presenterMeta.textContent).toContain(`${deck.slides.length} /`);
    expect(presenterNextButton.disabled).toBe(true);

    controller.move(-1);
    expect(presenterMeta.textContent).toContain(`${deck.slides.length - 1} /`);
  });
});
