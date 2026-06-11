import { MikroDeck } from "../../domain/index.js";
import type {
  CreateDeckInput,
  MikroAssetRecord,
  MikroDeckId,
  MikroDeckRecord,
  PortableAssetInput,
  UpdateDeckInput,
} from "../../interfaces/index.js";
import type { DeckRepository } from "../ports/index.js";
import {
  createDuplicatedAssetRecords,
  createImportedAssetRecords,
  createImportedDeckRecord,
  readDeckImportEnvelope,
  readExportEnvelope,
  serializeDeckExport,
  serializePortableDeckExport,
} from "./DeckFileExchange.js";

/**
 * @description Application service for local-first deck lifecycle, snapshots, and file exchange.
 */
export class DeckService {
  constructor(private readonly repository: DeckRepository) {}

  async create(input: CreateDeckInput = {}) {
    const deck = MikroDeck.create(input);
    await this.repository.save(deck.toRecord());
    return deck.toRecord();
  }

  async list() {
    const decks = await this.repository.list();
    return decks
      .map((deck) => MikroDeck.fromRecord(deck).toRecord())
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async load(id: MikroDeckId) {
    const deck = await this.repository.load(id);
    return deck ? MikroDeck.fromRecord(deck).toRecord() : null;
  }

  async update(id: MikroDeckId, input: UpdateDeckInput) {
    const existing = await this.repository.load(id);
    if (!existing) {
      throw new Error(`Deck not found: ${id}`);
    }

    const deck = MikroDeck.fromRecord(existing).update(input);
    await this.repository.save(deck.toRecord());
    return deck.toRecord();
  }

  async save(
    record: MikroDeckRecord,
    input: Omit<UpdateDeckInput, "activeSlideId" | "slides"> = {},
  ) {
    const deck = MikroDeck.fromRecord(record).update({
      ...input,
      slides: record.slides,
      activeSlideId: record.activeSlideId,
      aspectRatio: record.aspectRatio,
      theme: record.theme,
    });
    await this.repository.save(deck.toRecord());
    return deck.toRecord();
  }

  async duplicate(id: MikroDeckId) {
    const existing = await this.repository.load(id);
    if (!existing) {
      throw new Error(`Deck not found: ${id}`);
    }

    const deck = MikroDeck.create({
      title: `${existing.title} copy`,
      slides: existing.slides,
      fonts: existing.fonts,
      aspectRatio: existing.aspectRatio,
      theme: existing.theme,
    }).toRecord();
    const localAssets = await this.repository.listAssets(existing.id);
    const duplicated = createDuplicatedAssetRecords(deck, localAssets);
    for (const asset of duplicated.assets) {
      await this.repository.saveAsset(asset);
    }
    await this.repository.save(duplicated.record);
    return duplicated.record;
  }

  async delete(id: MikroDeckId) {
    await this.repository.delete(id);
  }

  async saveAsset(asset: MikroAssetRecord) {
    await this.repository.saveAsset(asset);
  }

  async loadAsset(id: string) {
    return this.repository.loadAsset(id);
  }

  async listAssets(deckId: MikroDeckId) {
    return this.repository.listAssets(deckId);
  }

  async deleteAsset(id: string) {
    await this.repository.deleteAsset(id);
  }

  async saveDraft(record: MikroDeckRecord) {
    await this.repository.saveDraft(MikroDeck.fromRecord(record).toRecord());
  }

  async loadDraft(deckId: MikroDeckId) {
    const draft = await this.repository.loadDraft(deckId);
    return draft ? MikroDeck.fromRecord(draft).toRecord() : null;
  }

  async deleteDraft(deckId: MikroDeckId) {
    await this.repository.deleteDraft(deckId);
  }

  exportJson(record: MikroDeckRecord) {
    return serializeDeckExport(record);
  }

  exportPortable(record: MikroDeckRecord, embeddedAssets: PortableAssetInput[] = []) {
    return serializePortableDeckExport(record, embeddedAssets);
  }

  async importJson(text: string) {
    const envelope = readExportEnvelope(text);
    return this.importEnvelope(envelope);
  }

  async importFile(text: string, sourceName?: string) {
    const envelope = readDeckImportEnvelope(text, sourceName);
    return this.importEnvelope(envelope);
  }

  private async importEnvelope(envelope: ReturnType<typeof readDeckImportEnvelope>) {
    const imported = MikroDeck.fromRecord(createImportedDeckRecord(envelope.deck)).update({
      saveSnapshot: true,
      snapshotReason: "import",
    });
    const prepared = createImportedAssetRecords(imported.toRecord(), envelope.assets);
    for (const asset of prepared.assets) {
      await this.repository.saveAsset(asset);
    }
    await this.repository.save(prepared.record);
    return prepared.record;
  }

  search(decks: MikroDeckRecord[], query: string) {
    const term = query.trim().toLowerCase();
    if (!term) {
      return decks;
    }

    return decks.filter((deck) => {
      const slideText = deck.slides
        .flatMap((slide) => [
          slide.title,
          slide.speakerNotes,
          ...slide.elements.map((element) => ("content" in element ? element.content : "")),
        ])
        .join(" ");
      return `${deck.title} ${slideText}`.toLowerCase().includes(term);
    });
  }
}
