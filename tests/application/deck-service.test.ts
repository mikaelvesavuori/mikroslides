import {
  type DeckRepository,
  DeckService,
  type MikroAssetRecord,
  MikroDeck,
  type MikroDeckRecord,
} from "../../src/index.js";

class MemoryDeckRepository implements DeckRepository {
  private readonly records = new Map<string, MikroDeckRecord>();
  private readonly assets = new Map<string, MikroAssetRecord>();
  private readonly drafts = new Map<string, MikroDeckRecord>();

  async list() {
    return [...this.records.values()];
  }

  async load(id: string) {
    return this.records.get(id) ?? null;
  }

  async save(deck: MikroDeckRecord) {
    this.records.set(deck.id, structuredClone(deck));
  }

  async delete(id: string) {
    this.records.delete(id);
    for (const [assetId, asset] of this.assets) {
      if (asset.deckId === id) {
        this.assets.delete(assetId);
      }
    }
    this.drafts.delete(id);
  }

  async saveAsset(asset: MikroAssetRecord) {
    this.assets.set(asset.id, structuredClone(asset));
  }

  async loadAsset(id: string) {
    return this.assets.get(id) ?? null;
  }

  async listAssets(deckId: string) {
    return [...this.assets.values()].filter((asset) => asset.deckId === deckId);
  }

  async deleteAsset(id: string) {
    this.assets.delete(id);
  }

  async deleteAssetsByDeck(deckId: string) {
    for (const [assetId, asset] of this.assets) {
      if (asset.deckId === deckId) {
        this.assets.delete(assetId);
      }
    }
  }

  async saveDraft(deck: MikroDeckRecord) {
    this.drafts.set(deck.id, structuredClone(deck));
  }

  async loadDraft(deckId: string) {
    return this.drafts.get(deckId) ?? null;
  }

  async deleteDraft(deckId: string) {
    this.drafts.delete(deckId);
  }
}

describe("DeckService", () => {
  it("exports and imports MikroSlides JSON", async () => {
    const service = new DeckService(new MemoryDeckRepository());
    const deck = await service.create({ title: "Board Review" });
    deck.aspectRatio = "4:3";
    deck.theme = {
      id: "technical",
      name: "Technical",
      accent: "#0f766e",
      background: "#f0fdfa",
      muted: "#475569",
      surface: "#ccfbf1",
      text: "#0f172a",
      fontHeading: "system-sans",
      fontBody: "system-sans",
      fontMono: "system-mono",
    };
    deck.slides[0] = {
      ...deck.slides[0],
      layout: "comparison",
      skipped: true,
      transition: "fade",
    };
    const exported = service.exportJson(deck);
    const imported = await service.importJson(exported);
    const secondImport = await service.importJson(exported);

    expect(imported.title).toBe("Board Review");
    expect(imported.id).not.toBe(deck.id);
    expect(secondImport.id).not.toBe(deck.id);
    expect(secondImport.id).not.toBe(imported.id);
    expect(imported.aspectRatio).toBe("4:3");
    expect(imported.theme.id).toBe("technical");
    expect(imported.slides[0]).toMatchObject({
      layout: "comparison",
      skipped: true,
      transition: "fade",
    });
    expect(imported.slides).toHaveLength(deck.slides.length);
    expect(imported.snapshots[0]).toMatchObject({ deckId: imported.id, reason: "import" });
    expect(await service.list()).toHaveLength(3);
  });

  it("exports and imports portable MikroSlides files", async () => {
    const repository = new MemoryDeckRepository();
    const service = new DeckService(repository);
    const deck = await service.create({ title: "Portable" });
    deck.slides[0].elements.push({
      id: "el_asset",
      kind: "image",
      x: 10,
      y: 10,
      width: 20,
      height: 20,
      rotation: 0,
      opacity: 1,
      locked: false,
      src: "data:image/png;base64,YWJj",
      alt: "Asset",
      fit: "cover",
    });

    const exported = service.exportPortable(deck);
    const imported = await service.importJson(exported);
    const parsed = JSON.parse(exported);

    expect(parsed.assets).toMatchObject([
      {
        elementId: "el_asset",
        dataUrl: "data:image/png;base64,YWJj",
        mediaType: "image/png",
        originalSrc: "data:image/png;base64,YWJj",
      },
    ]);
    expect(parsed.deck.slides[0].elements.at(-1).src).toMatch(/^asset:/);
    expect(imported.title).toBe("Portable");
    expect(imported.slides[0].elements.at(-1)).toMatchObject({
      kind: "image",
      alt: "Asset",
      src: expect.stringMatching(/^asset:/),
    });
    const assets = await repository.listAssets(imported.id);
    expect(assets).toMatchObject([{ kind: "image", mediaType: "image/png" }]);
    expect(assets[0].deckId).toBe(imported.id);
    expect(await assets[0].data.text()).toBe("abc");
  });

  it("embeds fetched remote assets into portable MikroSlides files", async () => {
    const repository = new MemoryDeckRepository();
    const service = new DeckService(repository);
    const deck = await service.create({ title: "Remote Asset" });
    deck.slides[0].elements.push({
      id: "el_remote",
      kind: "image",
      x: 10,
      y: 10,
      width: 20,
      height: 20,
      rotation: 0,
      opacity: 1,
      locked: false,
      src: "https://example.test/image.png",
      alt: "Remote",
      fit: "cover",
    });

    const exported = service.exportPortable(deck, [
      {
        slideId: deck.slides[0].id,
        elementId: "el_remote",
        kind: "image",
        mediaType: "image/png",
        dataUrl: "data:image/png;base64,cmVtb3Rl",
        originalSrc: "https://example.test/image.png",
      },
    ]);
    const imported = await service.importJson(exported);

    expect(JSON.parse(exported).deck.slides[0].elements.at(-1).src).toMatch(/^asset:/);
    expect(imported.slides[0].elements.at(-1)).toMatchObject({
      kind: "image",
      src: expect.stringMatching(/^asset:/),
    });
    const assets = await repository.listAssets(imported.id);
    expect(assets[0].deckId).toBe(imported.id);
    expect(await assets[0].data.text()).toBe("remote");
  });

  it("exports and imports portable local font assets", async () => {
    const repository = new MemoryDeckRepository();
    const service = new DeckService(repository);
    const deck = await service.create({ title: "Font Portable" });
    deck.fonts = [
      {
        id: "font_brand",
        source: "local",
        label: "Brand Sans",
        family: "Brand Sans",
        assetId: "asset_font_original",
        mediaType: "font/woff2",
        remoteUrl: null,
        createdAt: deck.createdAt,
        updatedAt: deck.updatedAt,
      },
    ];
    const title = deck.slides[0].elements.find((element) => element.kind === "text");
    if (title?.kind === "text") {
      title.fontFamily = "font:font_brand";
    }

    const exported = service.exportPortable(deck, [
      {
        fontId: "font_brand",
        kind: "font",
        mediaType: "font/woff2",
        dataUrl: "data:font/woff2;base64,Zm9udA==",
        originalSrc: "brand.woff2",
      },
    ]);
    const imported = await service.importJson(exported);
    const parsed = JSON.parse(exported);

    expect(parsed.assets).toMatchObject([
      {
        kind: "font",
        fontId: "font_brand",
        dataUrl: "data:font/woff2;base64,Zm9udA==",
        mediaType: "font/woff2",
        originalSrc: "brand.woff2",
      },
    ]);
    expect(parsed.deck.fonts[0]).toMatchObject({ id: "font_brand", assetId: "asset_font_brand" });
    expect(imported.fonts[0]).toMatchObject({
      id: "font_brand",
      source: "local",
      assetId: expect.stringMatching(/^asset/),
    });
    const assets = await repository.listAssets(imported.id);
    expect(assets).toMatchObject([{ kind: "font", mediaType: "font/woff2" }]);
    expect(assets[0].deckId).toBe(imported.id);
    expect(await assets[0].data.text()).toBe("font");
  });

  it("preserves source font records without embedding remote font assets", async () => {
    const repository = new MemoryDeckRepository();
    const service = new DeckService(repository);
    const deck = await service.create({ title: "Source Font" });
    deck.fonts = [
      {
        id: "font_inter",
        source: "source",
        label: "Inter",
        family: "Inter",
        assetId: null,
        mediaType: "font/woff2",
        remoteUrl: "https://rsms.me/inter/font-files/InterVariable.woff2?v=4.1",
        createdAt: deck.createdAt,
        updatedAt: deck.updatedAt,
      },
    ];
    const title = deck.slides[0].elements.find((element) => element.kind === "text");
    if (title?.kind === "text") {
      title.fontFamily = "font:font_inter";
    }

    const exported = service.exportPortable(deck);
    const parsed = JSON.parse(exported);
    const imported = await service.importJson(exported);

    expect(parsed.assets).toEqual([]);
    expect(parsed.deck.fonts[0]).toMatchObject({
      id: "font_inter",
      source: "source",
      remoteUrl: "https://rsms.me/inter/font-files/InterVariable.woff2?v=4.1",
    });
    expect(imported.fonts[0]).toMatchObject({
      id: "font_inter",
      source: "source",
      remoteUrl: "https://rsms.me/inter/font-files/InterVariable.woff2?v=4.1",
    });
  });

  it("duplicates local image assets with the deck", async () => {
    const repository = new MemoryDeckRepository();
    const service = new DeckService(repository);
    const deck = await service.create({ title: "With Asset" });
    deck.slides[0].elements.push({
      id: "el_asset",
      kind: "image",
      x: 10,
      y: 10,
      width: 20,
      height: 20,
      rotation: 0,
      opacity: 1,
      locked: false,
      src: "asset:asset_original",
      alt: "Asset",
      fit: "cover",
    });
    await service.save(deck);
    await service.saveAsset({
      id: "asset_original",
      deckId: deck.id,
      kind: "image",
      mediaType: "image/png",
      data: new Blob(["abc"], { type: "image/png" }),
      originalName: "image.png",
      originalSrc: "image.png",
      createdAt: deck.createdAt,
      updatedAt: deck.updatedAt,
    });

    const duplicated = await service.duplicate(deck.id);
    const image = duplicated.slides[0].elements.at(-1);
    const assets = await service.listAssets(duplicated.id);

    expect(image).toMatchObject({ kind: "image", src: expect.stringMatching(/^asset:/) });
    expect(image).not.toMatchObject({ src: "asset:asset_original" });
    expect(assets).toHaveLength(1);
    expect(await assets[0].data.text()).toBe("abc");
  });

  it("duplicates local font assets with the deck", async () => {
    const repository = new MemoryDeckRepository();
    const service = new DeckService(repository);
    const deck = await service.create({ title: "With Font" });
    deck.fonts = [
      {
        id: "font_brand",
        source: "local",
        label: "Brand Sans",
        family: "Brand Sans",
        assetId: "asset_font_original",
        mediaType: "font/woff2",
        remoteUrl: null,
        createdAt: deck.createdAt,
        updatedAt: deck.updatedAt,
      },
    ];
    const title = deck.slides[0].elements.find((element) => element.kind === "text");
    if (title?.kind === "text") {
      title.fontFamily = "font:font_brand";
    }
    await service.save(deck);
    await service.saveAsset({
      id: "asset_font_original",
      deckId: deck.id,
      kind: "font",
      mediaType: "font/woff2",
      data: new Blob(["font"], { type: "font/woff2" }),
      originalName: "brand.woff2",
      originalSrc: "brand.woff2",
      createdAt: deck.createdAt,
      updatedAt: deck.updatedAt,
    });

    const duplicated = await service.duplicate(deck.id);
    const assets = await service.listAssets(duplicated.id);
    const duplicatedTitle = duplicated.slides[0].elements.find(
      (element) => element.kind === "text",
    );

    expect(duplicated.fonts[0]).toMatchObject({
      id: "font_brand",
      assetId: expect.stringMatching(/^asset/),
    });
    expect(duplicated.fonts[0].assetId).not.toBe("asset_font_original");
    expect(duplicatedTitle).toMatchObject({ fontFamily: "font:font_brand" });
    expect(assets).toHaveLength(1);
    expect(assets[0]).toMatchObject({ kind: "font", mediaType: "font/woff2" });
    expect(await assets[0].data.text()).toBe("font");
  });

  it("normalizes unsupported slide layout, transition, and aspect values on import", async () => {
    const service = new DeckService(new MemoryDeckRepository());
    const imported = await service.importJson(
      JSON.stringify({
        schema: "mikroslides.deck",
        version: 1,
        deck: {
          id: "deck_invalid",
          title: "Invalid",
          aspectRatio: "21:9",
          slides: [
            {
              id: "slide_invalid",
              title: "Invalid slide",
              layout: "script-tag",
              transition: "explode",
              elements: [],
            },
          ],
        },
      }),
    );

    expect(imported.aspectRatio).toBe("16:9");
    expect(imported.slides[0]).toMatchObject({
      layout: "blank",
      skipped: false,
      transition: "none",
    });
  });

  it("rejects unsupported MikroSlides schema versions", async () => {
    const service = new DeckService(new MemoryDeckRepository());

    await expect(
      service.importJson(
        JSON.stringify({
          schema: "mikroslides.deck",
          version: 99,
          deck: { slides: [] },
        }),
      ),
    ).rejects.toThrow("Unsupported MikroSlides schema version");
  });

  it("rejects raw deck JSON without a MikroSlides envelope", async () => {
    const service = new DeckService(new MemoryDeckRepository());

    await expect(
      service.importJson(
        JSON.stringify({
          id: "deck_raw",
          title: "Raw",
          slides: [{ id: "slide_raw", title: "Raw slide", elements: [] }],
        }),
      ),
    ).rejects.toThrow("This JSON file is not a MikroSlides deck");
  });

  it("searches deck title, slide title, notes, and text content", async () => {
    const service = new DeckService(new MemoryDeckRepository());
    const deck = MikroDeck.create({ title: "Roadmap" }).toRecord();
    const saved = await service.create({
      title: deck.title,
      slides: deck.slides.map((slide, index) => ({
        ...slide,
        speakerNotes: index === 0 ? "Mention revenue" : slide.speakerNotes,
      })),
    });

    expect(service.search([saved], "revenue")).toHaveLength(1);
    expect(service.search([saved], "missing")).toHaveLength(0);
  });
});
