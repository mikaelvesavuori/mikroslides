import {
  isTextLineBreakInput,
  listTextFromItems,
  normalizeTextEditorPlainText,
} from "../../src/presentation/textEditing.js";

describe("text editing helpers", () => {
  it("normalizes plain text from contenteditable editors", () => {
    expect(normalizeTextEditorPlainText("Heading\n\n\nBody\n")).toBe("Heading\n\nBody\n");
  });

  it("reads bullet list items into newline-delimited slide text", () => {
    expect(listTextFromItems([" First point\nwrapped ", "", "Second point"])).toBe(
      "First point wrapped\nSecond point",
    );
  });

  it("detects beforeinput line breaks for plaintext editors", () => {
    expect(
      isTextLineBreakInput({
        inputType: "insertParagraph",
        type: "beforeinput",
      } as unknown as Event),
    ).toBe(true);
    expect(
      isTextLineBreakInput({
        inputType: "insertText",
        type: "beforeinput",
      } as unknown as Event),
    ).toBe(false);
    expect(
      isTextLineBreakInput({
        inputType: "insertParagraph",
        type: "input",
      } as unknown as Event),
    ).toBe(false);
  });
});
