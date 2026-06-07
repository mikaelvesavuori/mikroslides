import {
  blurDeckTitleFromOutsideClick,
  objectAlignmentFromTarget,
} from "../../src/presentation/appEvents.js";

class FakeElement {
  dataset: Record<string, string> = {};

  constructor(private readonly closestMatch: FakeElement | null = null) {}

  closest(selector: string) {
    return selector === "[data-object-align]" ? this.closestMatch : null;
  }
}

describe("app events", () => {
  it("reads object alignment from delegated click targets", () => {
    const button = new FakeElement();
    button.dataset.objectAlign = "middle";
    const target = new FakeElement(button);

    expect(objectAlignmentFromTarget(target as unknown as HTMLElement)).toBe("middle");
  });

  it("rejects unsupported object alignment values", () => {
    const button = new FakeElement();
    button.dataset.objectAlign = "stretch";
    const target = new FakeElement(button);

    expect(objectAlignmentFromTarget(target as unknown as HTMLElement)).toBeNull();
    expect(objectAlignmentFromTarget(null)).toBeNull();
  });

  it("blurs the deck title input when clicking elsewhere", () => {
    const input = { blur: vi.fn() } as unknown as HTMLInputElement;
    const target = {} as HTMLElement;

    expect(blurDeckTitleFromOutsideClick(input, target, input)).toBe(true);
    expect(input.blur).toHaveBeenCalledOnce();
  });

  it("keeps deck title focus when clicking the title input itself", () => {
    const input = { blur: vi.fn() } as unknown as HTMLInputElement;

    expect(blurDeckTitleFromOutsideClick(input, input, input)).toBe(false);
    expect(input.blur).not.toHaveBeenCalled();
  });
});
