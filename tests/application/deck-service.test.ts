import {
  type DeckRepository,
  DeckService,
  MikroDeck,
  type MikroDeckRecord,
} from "../../src/index.js";

class MemoryDeckRepository implements DeckRepository {
  private readonly records = new Map<string, MikroDeckRecord>();

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
      transition: "fade",
    };
    const exported = service.exportJson(deck);
    const imported = await service.importJson(exported);

    expect(imported.title).toBe("Board Review");
    expect(imported.aspectRatio).toBe("4:3");
    expect(imported.theme.id).toBe("technical");
    expect(imported.slides[0]).toMatchObject({ layout: "comparison", transition: "fade" });
    expect(imported.slides).toHaveLength(deck.slides.length);
    expect(imported.snapshots[0].reason).toBe("import");
  });

  it("exports and imports portable MikroSlides files", async () => {
    const service = new DeckService(new MemoryDeckRepository());
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
      src: "data:image/png;base64,abc",
      alt: "Asset",
      fit: "cover",
    });

    const exported = service.exportPortable(deck);
    const imported = await service.importJson(exported);
    const parsed = JSON.parse(exported);

    expect(parsed.assets).toMatchObject([
      {
        elementId: "el_asset",
        dataUrl: "data:image/png;base64,abc",
        mediaType: "image/png",
        originalSrc: "data:image/png;base64,abc",
      },
    ]);
    expect(parsed.deck.slides[0].elements.at(-1).src).toMatch(/^asset:/);
    expect(imported.title).toBe("Portable");
    expect(imported.slides[0].elements.at(-1)).toMatchObject({
      kind: "image",
      alt: "Asset",
      src: "data:image/png;base64,abc",
    });
  });

  it("embeds fetched remote assets into portable MikroSlides files", async () => {
    const service = new DeckService(new MemoryDeckRepository());
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
        dataUrl: "data:image/png;base64,remote",
        originalSrc: "https://example.test/image.png",
      },
    ]);
    const imported = await service.importJson(exported);

    expect(JSON.parse(exported).deck.slides[0].elements.at(-1).src).toMatch(/^asset:/);
    expect(imported.slides[0].elements.at(-1)).toMatchObject({
      kind: "image",
      src: "data:image/png;base64,remote",
    });
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
    expect(imported.slides[0]).toMatchObject({ layout: "blank", transition: "none" });
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
