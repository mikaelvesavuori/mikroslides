import { vi } from "vitest";
import { downloadText } from "../../src/config/index.js";
import { createImageElement, MikroDeck } from "../../src/index.js";
import { createExportController } from "../../src/presentation/exportController.js";

vi.mock("../../src/config/index.js", () => ({
  downloadBytes: vi.fn(),
  downloadText: vi.fn(),
  readBlobAsDataUrl: vi.fn(async (blob: Blob) => {
    const mediaType = blob.type || "application/octet-stream";
    return `data:${mediaType};base64,${await blob.text()}`;
  }),
  readFileAsText: vi.fn(),
}));

function action() {
  return {
    disabled: false,
    removeAttribute: vi.fn(),
    setAttribute: vi.fn(),
  };
}

function exportDialog() {
  return {
    close: vi.fn(function (this: { open: boolean }) {
      this.open = false;
    }),
    open: true,
    showModal: vi.fn(function (this: { open: boolean }) {
      this.open = true;
    }),
  };
}

function documentRef(title = "Original") {
  const appended: unknown[] = [];
  return {
    appended,
    createElement: () => ({ id: "", textContent: "" }),
    head: {
      append: (node: unknown) => appended.push(node),
    },
    querySelector: () => null,
    title,
  };
}

function controllerHarness() {
  const deck = MikroDeck.create({ title: "Ship It" }).toRecord();
  const dialog = exportDialog();
  const elements = {
    exportDialog: dialog,
    exportJsonAction: action(),
    exportPdfAction: action(),
    exportPngAction: action(),
    exportPortableAction: action(),
    exportStatus: { textContent: "" },
  };
  const doc = documentRef();
  const toast: string[] = [];
  const calls: string[] = [];
  const portableAssetPayloads: unknown[] = [];
  const controller = createExportController({
    baseHref: () => "https://example.test/app",
    documentRef: doc as unknown as Document,
    elements: elements as unknown as Parameters<typeof createExportController>[0]["elements"],
    fontsReady: async () => undefined,
    formatError: (error, fallback) => (error instanceof Error ? error.message : fallback),
    getDeck: () => deck,
    getSlide: () => deck.slides[0],
    loadAsset: async (assetId) =>
      assetId === "asset_image"
        ? {
            id: assetId,
            deckId: deck.id,
            kind: "image",
            mediaType: "image/png",
            data: new Blob(["asset"], { type: "image/png" }),
            originalName: "asset.png",
            originalSrc: "asset.png",
            createdAt: deck.createdAt,
            updatedAt: deck.updatedAt,
          }
        : null,
    renderPrintDeck: () => calls.push("render-print"),
    resolveFontFamily: () => "system-ui",
    resolveImageSource: (src) => src,
    serializeDeck: () => '{"deck":true}',
    serializePortableDeck: (_deck, assets) => {
      portableAssetPayloads.push(assets);
      return '{"portable":true}';
    },
    showToast: (message) => toast.push(message),
    windowRef: {
      print: () => calls.push("print"),
      setTimeout: (callback: TimerHandler) => {
        if (typeof callback === "function") {
          callback();
        }
        return 1;
      },
    } as unknown as Window,
  });

  return { calls, controller, deck, dialog, doc, elements, portableAssetPayloads, toast };
}

describe("export controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders status and opens the export dialog", () => {
    const test = controllerHarness();
    test.dialog.open = false;

    test.controller.open();

    expect(test.dialog.showModal).toHaveBeenCalled();
    expect(test.elements.exportStatus.textContent).toContain("slides");
    expect(test.elements.exportJsonAction.disabled).toBe(false);
  });

  it("exports JSON through the configured serializer", () => {
    const test = controllerHarness();

    test.controller.exportJson();

    expect(downloadText).toHaveBeenCalledWith(
      "ship-it.mikroslides.json",
      '{"deck":true}',
      "application/json;charset=utf-8",
    );
    expect(test.dialog.open).toBe(false);
    expect(test.toast).toContain("MikroSlides JSON exported");
  });

  it("prints PDFs with temporary document title and print stylesheet", () => {
    const test = controllerHarness();

    test.controller.exportPdf();

    expect(test.calls).toEqual(["render-print", "print"]);
    expect(test.doc.appended).toHaveLength(1);
    expect(test.doc.title).toBe("Original");
    expect(test.dialog.open).toBe(false);
  });

  it("exports portable files with collected stored assets", async () => {
    const test = controllerHarness();
    test.deck.slides[0].elements.push(
      createImageElement({ id: "image", src: "asset:asset_image" }),
    );

    await test.controller.exportPortable();

    expect(downloadText).toHaveBeenCalledWith(
      "ship-it.mikroslides",
      '{"portable":true}',
      "application/vnd.mikroslides+json;charset=utf-8",
    );
    expect(test.portableAssetPayloads).toEqual([
      [
        {
          slideId: test.deck.slides[0].id,
          elementId: "image",
          kind: "image",
          mediaType: "image/png",
          dataUrl: "data:image/png;base64,asset",
          originalSrc: "asset.png",
        },
      ],
    ]);
    expect(test.dialog.open).toBe(false);
    expect(test.toast).toContain("Portable MikroSlides file exported");
  });
});
