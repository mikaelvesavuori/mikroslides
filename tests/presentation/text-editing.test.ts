import {
  listTextFromItems,
  normalizeTextEditorPlainText,
} from "../../src/presentation/textEditing.js";

describe("text editing helpers", () => {
  it("normalizes plain text from contenteditable editors", () => {
    expect(normalizeTextEditorPlainText("Heading\n\n\nBody\n")).toBe("Heading\nBody");
  });

  it("reads bullet list items into newline-delimited slide text", () => {
    expect(listTextFromItems([" First point\nwrapped ", "", "Second point"])).toBe(
      "First point wrapped\nSecond point",
    );
  });
});
