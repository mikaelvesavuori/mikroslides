import type {
  MikroAssetRecord,
  MikroDeckId,
  MikroDeckRecord,
  StorageMetadata,
} from "../../interfaces/index.js";

export interface DeckRepository {
  list(): Promise<MikroDeckRecord[]>;
  load(id: MikroDeckId): Promise<MikroDeckRecord | null>;
  save(deck: MikroDeckRecord): Promise<void>;
  delete(id: MikroDeckId): Promise<void>;
  saveAsset(asset: MikroAssetRecord): Promise<void>;
  loadAsset(id: string): Promise<MikroAssetRecord | null>;
  listAssets(deckId: MikroDeckId): Promise<MikroAssetRecord[]>;
  deleteAsset(id: string): Promise<void>;
  deleteAssetsByDeck(deckId: MikroDeckId): Promise<void>;
  saveDraft(deck: MikroDeckRecord): Promise<void>;
  loadDraft(deckId: MikroDeckId): Promise<MikroDeckRecord | null>;
  deleteDraft(deckId: MikroDeckId): Promise<void>;
  getMetadata?(): Promise<StorageMetadata | null>;
}
