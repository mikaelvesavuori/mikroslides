import {
  renderShapeSelector,
  shapeSelectorTools,
  shapeSelectorTitle,
} from "../../src/presentation/shapeSelectorView.js";

describe("shape selector view", () => {
  it("renders MikroCanvas-style shape options", () => {
    const iconAttributes = new Map<string, string>();
    const currentShapeIcon = {
      setAttribute: (name: string, value: string) => iconAttributes.set(name, value),
    } as unknown as SVGUseElement;
    const shapeOptions = { innerHTML: "" } as HTMLElement;

    renderShapeSelector({ activeShape: "diamond", currentShapeIcon, shapeOptions });

    expect(iconAttributes.get("href")).toBe("#icon-diamond");
    expect(shapeOptions.innerHTML).toContain('data-shape-tool="rect"');
    expect(shapeOptions.innerHTML).toContain('data-shape-tool="database"');
    expect(shapeOptions.innerHTML).toContain('data-shape-tool="chevron"');
    expect(shapeOptions.innerHTML).not.toContain('data-shape-tool="line"');
    expect(shapeSelectorTools).toHaveLength(12);
    expect(shapeSelectorTitle("rect")).toBe("Rectangle (R)");
  });
});
