import type { MikroFontRecord } from "../../src/index.js";
import {
  renderDeckAspectOptions,
  renderDeckThemeOptions,
  renderFontSelectOptions,
  renderTemplateSelectOptions,
  templateLabelForSlideLayout,
} from "../../src/presentation/selectOptions.js";

const now = "2026-06-04T00:00:00.000Z";

describe("select options", () => {
  it("renders escaped deck theme and aspect options", () => {
    expect(
      renderDeckThemeOptions([
        {
          accent: "#000",
          background: "#fff",
          fontBody: "system-sans",
          fontHeading: "system-sans",
          fontMono: "system-mono",
          id: "theme&1",
          muted: "#777",
          name: "Theme <one>",
          surface: "#eee",
          text: "#111",
        },
      ]),
    ).toContain('value="theme&amp;1"');
    expect(renderDeckAspectOptions([{ id: "16:9", name: "Wide <16>" }])).toContain(
      "Wide &lt;16&gt;",
    );
  });

  it("renders font select options with optional deck group", () => {
    const font: MikroFontRecord = {
      assetId: null,
      createdAt: now,
      family: "Brand",
      id: "brand",
      label: "Brand & Co",
      mediaType: null,
      remoteUrl: null,
      source: "bunny",
      updatedAt: now,
    };

    expect(renderFontSelectOptions([])).not.toContain("optgroup");
    expect(renderFontSelectOptions([font])).toContain("Brand &amp; Co");
  });

  it("renders template options with optional custom group", () => {
    const html = renderTemplateSelectOptions([{ id: "title", name: "Title <slide>" }], "");
    expect(html).toContain("Title &lt;slide&gt;");
    expect(html).not.toContain('label="Mine"');

    expect(renderTemplateSelectOptions([], "<option>Mine</option>")).toContain('label="Mine"');
  });

  it("renders the current slide layout as the template select readout", () => {
    const templates = [
      { id: "twoColumn", name: "Two-column" },
      { id: "chartData", name: "Chart/data" },
    ];

    expect(renderTemplateSelectOptions(templates, "", "two-column")).toContain(
      '<option value="twoColumn" selected>Two-column</option>',
    );
    expect(renderTemplateSelectOptions(templates, "", "blank")).toContain(
      '<option value="" selected>Blank</option>',
    );
    expect(templateLabelForSlideLayout("chart-data", templates)).toBe("Chart/data");
    expect(templateLabelForSlideLayout("blank", templates)).toBe("Blank");
  });

  it("selects current template layouts by id rather than by repeated labels", () => {
    const html = renderTemplateSelectOptions(
      [
        { id: "duplicateLabel", name: "Two-column" },
        { id: "twoColumn", name: "Two-column" },
      ],
      '<option value="custom:saved">Two-column</option>',
      "two-column",
    );

    expect(html).toContain('<option value="duplicateLabel">Two-column</option>');
    expect(html).toContain('<option value="twoColumn" selected>Two-column</option>');
    expect(html).toContain('<option value="custom:saved">Two-column</option>');
  });
});
