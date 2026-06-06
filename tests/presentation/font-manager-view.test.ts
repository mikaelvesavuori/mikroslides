import { MikroDeck } from "../../src/index.js";
import {
  renderFontListView,
  renderSourceFontCatalogView,
} from "../../src/presentation/fontManagerView.js";

describe("font manager view", () => {
  it("renders system font rows even when the deck has no imported fonts", () => {
    const view = renderFontListView({
      currentFont: "system",
      deck: MikroDeck.create({ title: "Fonts" }).toRecord(),
      resolvers: {
        cssFontStackForFont: () => "Brand",
        cssFontStackForTextToken: () => "System",
      },
    });

    expect(view.empty).toBe(true);
    expect(view.html).toContain("System Sans");
    expect(view.html).toContain("No deck fonts yet");
  });

  it("renders curated source fonts as addable rows", () => {
    const view = renderSourceFontCatalogView({
      currentFont: null,
      deck: MikroDeck.create({ title: "Sources" }).toRecord(),
    });

    expect(view.empty).toBe(false);
    expect(view.html).toContain("Inter");
    expect(view.html).toContain("Geist Sans");
    expect(view.html).toContain("Add");
  });
});
