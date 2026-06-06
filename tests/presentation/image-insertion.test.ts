import {
  imageDialogSource,
  pasteActionFromEvent,
  pastedImageGeometry,
} from "../../src/presentation/imageInsertion.js";

function file(name = "image.png") {
  return new File(["image"], name, { type: "image/png" });
}

describe("image insertion", () => {
  it("prefers dialog files before urls", () => {
    const image = file();

    expect(imageDialogSource(image, "https://example.test/image.png")).toEqual({
      file: image,
      kind: "file",
    });
    expect(imageDialogSource(null, " https://example.test/image.png ")).toEqual({
      kind: "url",
      src: "https://example.test/image.png",
    });
    expect(imageDialogSource(null, " ")).toEqual({ kind: "missing" });
  });

  it("ignores paste into text-like targets", () => {
    expect(
      pasteActionFromEvent(
        {
          clipboardData: { getData: () => "# Deck" },
          target: { tagName: "TEXTAREA" } as unknown as EventTarget,
        },
        { hasClipboardElements: true, looksLikeOutline: () => true },
      ),
    ).toEqual({ kind: "ignore" });
  });

  it("recognizes outline, copied element, and image pastes", () => {
    expect(
      pasteActionFromEvent(
        {
          clipboardData: { getData: () => "# Deck\n\n## Slide" },
          target: null,
        },
        { hasClipboardElements: false, looksLikeOutline: () => true },
      ),
    ).toEqual({ kind: "outline", text: "# Deck\n\n## Slide" });

    expect(
      pasteActionFromEvent(
        {
          clipboardData: { getData: () => "" },
          target: null,
        },
        { hasClipboardElements: true, looksLikeOutline: () => false },
      ),
    ).toEqual({ kind: "paste-elements" });

    const image = file("");
    const action = pasteActionFromEvent(
      {
        clipboardData: {
          getData: () => "",
          items: [{ getAsFile: () => image, type: "image/png" }],
        },
        target: null,
      },
      { hasClipboardElements: false, looksLikeOutline: () => false },
    );

    expect(action).toEqual({ alt: "Clipboard image", file: image, kind: "image" });
    expect(pastedImageGeometry).toMatchObject({ height: 56, width: 50, x: 25, y: 18 });
  });
});
