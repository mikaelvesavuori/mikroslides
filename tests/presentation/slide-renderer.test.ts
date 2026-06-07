import {
  createImageElement,
  createShapeElement,
  createTextElement,
  MikroDeck,
} from "../../src/index.js";
import {
  getElementLabel,
  renderSlideElements,
  renderSlideThumbnails,
  renderTextElementContent,
  textListItems,
} from "../../src/presentation/slideRenderer.js";

describe("slide renderer", () => {
  it("renders bullet list text as escaped list items", () => {
    const element = createTextElement({
      id: "text_1",
      content: "- Ship it\n2. Improve <detail>\n• Measure & learn",
      listStyle: "bullet",
    });

    expect(textListItems(element.content)).toEqual([
      "Ship it",
      "Improve <detail>",
      "Measure & learn",
    ]);
    expect(renderTextElementContent(element)).toBe(
      "<ul><li>Ship it</li><li>Improve &lt;detail&gt;</li><li>Measure &amp; learn</li></ul>",
    );
  });

  it("renders selected/editing state and resolves image/font sources", () => {
    const slide = MikroDeck.create({ title: "Render" }).toRecord().slides[0];
    slide.elements = [
      createTextElement({
        id: "text_1",
        content: "Headline",
        fontFamily: "font:brand",
        lineHeight: 1.35,
        verticalAlign: "bottom",
      }),
      createImageElement({
        id: "image_1",
        src: "asset:image_1",
        alt: "Catalog",
      }),
    ];

    const html = renderSlideElements(slide, {
      editingTextElementId: "text_1",
      includeHandle: true,
      resolveFontStack: () => '"Brand Sans", sans-serif',
      resolveImageSource: () => "blob:image_1",
      selectedIds: new Set(["text_1"]),
    });

    expect(html).toContain('data-selected="true"');
    expect(html).toContain('data-align="left"');
    expect(html).toContain('data-valign="bottom"');
    expect(html).toContain('contenteditable="plaintext-only"');
    expect(html).toContain('class="slide-text-content"');
    expect(html).toContain("&quot;Brand Sans&quot;, sans-serif");
    expect(html).toContain("--line-height:1.35");
    expect(html).toContain('src="blob:image_1"');
    expect(html).toContain("element-resize-handle");
  });

  it("omits contenteditable when text is not actively being edited", () => {
    const slide = MikroDeck.create({ title: "Render" }).toRecord().slides[0];
    slide.elements = [createTextElement({ align: "center", content: "Centered", id: "text_1" })];

    const html = renderSlideElements(slide);

    expect(html).toContain('data-align="center"');
    expect(html).not.toContain("contenteditable");
    expect(html).toContain('<div class="slide-text-content">Centered</div>');
  });

  it("renders shape elements as SVG paths", () => {
    const slide = MikroDeck.create({ title: "Render" }).toRecord().slides[0];
    slide.elements = [
      createShapeElement({ id: "diamond", shape: "diamond", content: "Decision" }),
      createShapeElement({ id: "database", shape: "database" }),
      createShapeElement({ id: "line", shape: "line" }),
    ];

    const html = renderSlideElements(slide);

    expect(html).toContain('data-shape="diamond"');
    expect(html).toContain("slide-shape-label");
    expect(html).toContain("Decision");
    expect(html).toContain('class="slide-shape-fill"');
    expect(html).toContain('class="slide-shape-decoration"');
    expect(html).toContain('class="slide-shape-line"');
  });

  it("renders editable shape labels", () => {
    const slide = MikroDeck.create({ title: "Render" }).toRecord().slides[0];
    slide.elements = [createShapeElement({ id: "shape", shape: "capsule" })];

    const html = renderSlideElements(slide, { editingTextElementId: "shape" });

    expect(html).toContain('data-text-editor="shape"');
    expect(html).toContain('contenteditable="plaintext-only"');
  });

  it("creates stable layer labels", () => {
    expect(getElementLabel(createTextElement({ content: "Launch readiness plan" }), 0)).toBe(
      "Launch readiness plan",
    );
    expect(getElementLabel(createImageElement({ alt: "Product screenshot" }), 1)).toBe(
      "Product screenshot",
    );
    expect(getElementLabel(createShapeElement({ content: "Launch gate" }), 2)).toBe(
      "Launch gate",
    );
  });

  it("renders escaped slide thumbnails with active state", () => {
    const deck = MikroDeck.create({ title: "Render" }).toRecord();
    const slides = deck.slides.map((slide, index) => ({
      ...slide,
      id: index === 0 ? "slide&1" : slide.id,
      title: index === 0 ? "Intro <now>" : slide.title,
    }));

    const html = renderSlideThumbnails(slides, {
      activeSlideId: "slide&1",
      resolveFontStack: () => "system-ui",
      resolveImageSource: (src) => src,
    });

    expect(html).toContain('data-slide-id="slide&amp;1"');
    expect(html).toContain('aria-current="true"');
    expect(html).toContain("Intro &lt;now&gt;");
    expect(html).toContain('data-skipped="false"');
    expect(html).toContain("slide-skip-btn");
    expect(html).toContain("thumb-preview");
    expect(html).not.toContain("thumb-title");
  });
});
