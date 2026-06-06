import { createTextElement, MikroDeck } from "../../src/index.js";
import {
  readNumber,
  renderLayersPanel,
  sharedValue,
  toColorInput,
} from "../../src/presentation/inspectorPanel.js";

describe("inspector panel helpers", () => {
  it("reads numeric controls and shared mixed values", () => {
    expect(readNumber({ value: "42.5" } as HTMLInputElement)).toBe(42.5);
    expect(readNumber({ value: "nope" } as HTMLInputElement)).toBe(0);
    expect(sharedValue([{ x: 1 }, { x: 1 }], (item) => item.x)).toBe(1);
    expect(sharedValue([{ x: 1 }, { x: 2 }], (item) => item.x)).toBeNull();
  });

  it("normalizes colors for color inputs", () => {
    expect(toColorInput("#aabbcc")).toBe("#aabbcc");
    expect(toColorInput("navy")).toBe("#ffffff");
  });

  it("renders layers with the topmost element first", () => {
    const slide = MikroDeck.create({ title: "Layers" }).toRecord().slides[0];
    slide.elements = [
      createTextElement({ id: "first", content: "First" }),
      createTextElement({ id: "second", content: "Second" }),
    ];
    const elements = { layersList: { innerHTML: "" } as HTMLElement };

    renderLayersPanel(elements, slide, ["second"]);

    expect(elements.layersList.innerHTML.indexOf("second")).toBeLessThan(
      elements.layersList.innerHTML.indexOf("first"),
    );
    expect(elements.layersList.innerHTML).toContain('aria-pressed="true"');
  });
});
