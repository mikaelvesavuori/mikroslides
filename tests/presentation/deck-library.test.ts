import { MikroDeck } from "../../src/index.js";
import { renderDeckLibraryRows } from "../../src/presentation/deckLibrary.js";

describe("deck library", () => {
  it("renders escaped deck rows", () => {
    const deck = { ...MikroDeck.create({ title: "Ship <it>" }).toRecord(), id: "deck" };
    const html = renderDeckLibraryRows([deck], () => "Now & then");

    expect(html).toContain("Ship &lt;it&gt;");
    expect(html).toContain("Now &amp; then");
    expect(html).toContain('data-action="open-deck"');
  });
});
