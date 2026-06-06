import type { MikroFontRecord } from "../../src/index.js";
import {
  canvasFontStackForTextToken,
  createFontRuntimePlan,
  cssFontStackForTextToken,
} from "../../src/presentation/fontRuntime.js";

const now = "2026-06-02T00:00:00.000Z";

function font(input: Partial<MikroFontRecord> & Pick<MikroFontRecord, "id" | "source">) {
  return {
    label: input.id,
    family: input.id,
    assetId: null,
    mediaType: null,
    remoteUrl: null,
    createdAt: now,
    updatedAt: now,
    ...input,
  } satisfies MikroFontRecord;
}

describe("font runtime", () => {
  it("plans local, Bunny, direct source, and stylesheet source fonts separately", () => {
    const fonts = [
      font({
        id: "brand",
        source: "local",
        label: "Brand Sans",
        family: "Brand Sans",
        assetId: "asset_brand",
        mediaType: "font/woff2",
      }),
      font({
        id: "remote_css",
        source: "source",
        label: "Remote CSS",
        family: "Remote CSS",
        mediaType: "text/css",
        remoteUrl: "https://example.test/font.css",
      }),
      font({
        id: "geist",
        source: "source",
        label: "Geist Sans",
        family: "Geist",
        mediaType: "font/woff2",
        remoteUrl: "https://cdn.example.test/geist.woff2",
      }),
      font({
        id: "manrope",
        source: "bunny",
        label: "Manrope",
        family: "Manrope",
      }),
    ];

    const plan = createFontRuntimePlan(fonts, (assetId) =>
      assetId === "asset_brand" ? "blob:brand" : null,
    );

    expect(plan.fontFaceCss).toContain("MikroSlides Font brand");
    expect(plan.fontFaceCss).toContain("blob:brand");
    expect(plan.fontFaceCss).toContain("https://cdn.example.test/geist.woff2");
    expect(plan.sourceStylesheets).toEqual([
      {
        id: "mikroslides-source-font-stylesheet-remote_css",
        href: "https://example.test/font.css",
      },
    ]);
    expect(plan.bunnyStylesheetUrl).toContain("https://fonts.bunny.net/css");
    expect(plan.bunnyStylesheetUrl).toContain("Manrope");
  });

  it("does not plan provider calls when no remote deck fonts exist", () => {
    const plan = createFontRuntimePlan([], () => null);

    expect(plan.fontFaceCss).toBe("");
    expect(plan.bunnyStylesheetUrl).toBeNull();
    expect(plan.sourceStylesheets).toEqual([]);
  });

  it("resolves app and canvas font stacks through deck font tokens", () => {
    const sourceFont = font({
      id: "inter",
      source: "source",
      label: "Inter",
      family: "Inter",
      mediaType: "font/woff2",
      remoteUrl: "https://rsms.me/inter/font-files/InterVariable.woff2?v=4.1",
    });
    const getFont = () => sourceFont;

    expect(cssFontStackForTextToken("font:inter", getFont)).toContain('"Inter"');
    expect(canvasFontStackForTextToken("font:inter", getFont)).toContain('"Inter"');
    expect(cssFontStackForTextToken("mono", getFont)).toBe("var(--font-mono)");
  });
});
