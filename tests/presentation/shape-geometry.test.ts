import {
  isSlideShapeKind,
  pathCommandsToSvg,
  shapeDecorationPathCommands,
  shapePathCommands,
  slideShapeKinds,
} from "../../src/presentation/shapeGeometry.js";

describe("shape geometry", () => {
  it("defines the supported slide shape set", () => {
    expect(slideShapeKinds).toEqual([
      "rect",
      "ellipse",
      "diamond",
      "triangle",
      "capsule",
      "document",
      "database",
      "parallelogram",
      "trapezoid",
      "hexagon",
      "octagon",
      "chevron",
      "line",
    ]);
    expect(isSlideShapeKind("diamond")).toBe(true);
    expect(isSlideShapeKind("unknown")).toBe(false);
  });

  it("renders polygon and decoration paths", () => {
    expect(
      pathCommandsToSvg(shapePathCommands("diamond", { x: 0, y: 0, width: 100, height: 100 })),
    ).toBe("M50 0 L100 50 L50 100 L0 50 Z");
    expect(
      shapeDecorationPathCommands("database", { x: 0, y: 0, width: 100, height: 100 }),
    ).not.toBeNull();
    expect(
      shapeDecorationPathCommands("hexagon", { x: 0, y: 0, width: 100, height: 100 }),
    ).toBeNull();
  });
});
