import { dropPlacementFromGeometry } from "../../src/presentation/slideListInteraction.js";

describe("slide list interaction", () => {
  it("places drops before or after vertical thumbnails", () => {
    const rect = { height: 100, left: 0, top: 20, width: 60 };

    expect(dropPlacementFromGeometry(rect, 20, 40)).toBe("before");
    expect(dropPlacementFromGeometry(rect, 20, 90)).toBe("after");
  });

  it("places drops before or after horizontal thumbnails", () => {
    const rect = { height: 40, left: 10, top: 0, width: 160 };

    expect(dropPlacementFromGeometry(rect, 40, 20)).toBe("before");
    expect(dropPlacementFromGeometry(rect, 120, 20)).toBe("after");
  });
});
