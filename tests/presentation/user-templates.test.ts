import { createTextElement, MikroDeck } from "../../src/index.js";
import {
  createUserTemplateFromSlide,
  createUserTemplateSlide,
  parseUserTemplates,
  prependUserTemplate,
  renderUserTemplateOptions,
} from "../../src/presentation/userTemplates.js";

describe("user templates", () => {
  it("creates templates from slides and normalizes names", () => {
    const slide = MikroDeck.create({ title: "Deck" }).toRecord().slides[0];
    const template = createUserTemplateFromSlide(
      slide,
      "  ",
      "2026-06-04T00:00:00.000Z",
      () => "template",
    );

    expect(template.id).toBe("template");
    expect(template.name).toBe(slide.title);
    expect(template.slide.id).not.toBe(slide.id);
  });

  it("keeps newest templates first and caps the list", () => {
    const slide = MikroDeck.create({ title: "Deck" }).toRecord().slides[0];
    const templates = Array.from({ length: 24 }, (_, index) =>
      createUserTemplateFromSlide(slide, `Template ${index}`, undefined, () => `old_${index}`),
    );
    const next = prependUserTemplate(
      templates,
      createUserTemplateFromSlide(slide, "New", undefined, () => "new"),
    );

    expect(next).toHaveLength(24);
    expect(next[0].id).toBe("new");
  });

  it("parses stored templates defensively", () => {
    const slide = MikroDeck.create({ title: "Deck" }).toRecord().slides[0];
    const parsed = parseUserTemplates(
      JSON.stringify([
        {
          id: "template",
          name: "  ",
          slide,
        },
        null,
      ]),
    );

    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe("Untitled template");
    expect(parseUserTemplates(null)).toEqual([]);
    expect(parseUserTemplates(JSON.stringify({ nope: true }))).toEqual([]);
  });

  it("renders escaped template options", () => {
    const slide = MikroDeck.create({ title: "Deck" }).toRecord().slides[0];
    const html = renderUserTemplateOptions([
      createUserTemplateFromSlide(slide, "Ship <it>", undefined, () => "custom&one"),
    ]);

    expect(html).toContain("Ship &lt;it&gt;");
    expect(html).toContain("custom&amp;one");
  });

  it("creates insertion slides with fresh element ids", () => {
    const base = MikroDeck.create({ title: "Base" }).toRecord().slides[0];
    const templateSlide = {
      ...base,
      elements: [createTextElement({ id: "original" })],
      title: "Template",
    };
    const template = createUserTemplateFromSlide(templateSlide, "Template", undefined, () => "t");
    const slide = createUserTemplateSlide([template], "t", base, () => "fresh");

    expect(slide?.title).toBe("Template");
    expect(slide?.elements[0].id).toBe("fresh");
    expect(createUserTemplateSlide([template], "missing", base)).toBeNull();
  });
});
