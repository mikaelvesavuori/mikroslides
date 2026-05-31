import { printCssForAspect, printDimensionsForAspect } from "../../src/presentation/printSizing.js";

describe("print sizing", () => {
  it("maps deck aspect ratios to print dimensions", () => {
    expect(printDimensionsForAspect("16:9")).toMatchObject({ width: "13.333in", height: "7.5in" });
    expect(printDimensionsForAspect("4:3")).toMatchObject({ width: "10in", height: "7.5in" });
    expect(printDimensionsForAspect("1:1")).toMatchObject({ width: "7.5in", height: "7.5in" });
  });

  it("generates a print stylesheet with matching page size", () => {
    expect(printCssForAspect("4:3")).toContain("size: 10in 7.5in");
    expect(printCssForAspect("1:1")).toContain("width: 7.5in");
  });
});
