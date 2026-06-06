import { escapeAttribute, escapeHtml } from "../../src/presentation/htmlEscape.js";

describe("HTML escaping", () => {
  it("escapes text nodes and quoted attributes", () => {
    expect(escapeHtml(`<b title="x">A&B</b>`)).toBe(
      "&lt;b title=&quot;x&quot;&gt;A&amp;B&lt;/b&gt;",
    );
    expect(escapeAttribute(`"Mikro" & 'Slides'`)).toBe("&quot;Mikro&quot; &amp; &#39;Slides&#39;");
  });
});
