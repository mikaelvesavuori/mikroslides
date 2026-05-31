import { defaultDeckTheme, MikroDeck } from "../../src/index.js";
import { builtInTemplates, createTemplateSlide } from "../../src/presentation/slideLayouts.js";

describe("slide layouts", () => {
  it("creates every built-in layout without dropping editable elements", () => {
    const base = MikroDeck.create({ title: "Layouts" }).toRecord().slides[0];

    for (const template of builtInTemplates) {
      const slide = createTemplateSlide(template.id, base, defaultDeckTheme);

      expect(slide.title).toBeTruthy();
      expect(slide.elements.length).toBeGreaterThan(0);
      expect(slide.layout).not.toBe("blank");
    }
  });
});
