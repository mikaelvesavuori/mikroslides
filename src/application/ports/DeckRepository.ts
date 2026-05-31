import type { MikroDeckId, MikroDeckRecord, StorageMetadata } from "../../interfaces/index.js";

export interface DeckRepository {
  list(): Promise<MikroDeckRecord[]>;
  load(id: MikroDeckId): Promise<MikroDeckRecord | null>;
  save(deck: MikroDeckRecord): Promise<void>;
  delete(id: MikroDeckId): Promise<void>;
  getMetadata?(): Promise<StorageMetadata | null>;
}
