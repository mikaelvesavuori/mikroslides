import type { DeckRepository } from "../../application/index.js";
import type {
  MikroAssetRecord,
  MikroDeckId,
  MikroDeckRecord,
  StorageMetadata,
} from "../../interfaces/index.js";

const defaultDatabaseName = "mikroslides";
const defaultStoreName = "decks";
const assetStoreName = "assets";
const draftStoreName = "drafts";
const metadataStoreName = "metadata";
const databaseVersion = 2;
const metadataKey = "schema";
const deckIdIndexName = "deckId";
const storageUnavailableMessage =
  "Browser storage is unavailable. Decks cannot be saved in this browser session.";

function isIndexedDbAvailable() {
  return typeof globalThis !== "undefined" && typeof globalThis.indexedDB !== "undefined";
}

function createRequestPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function deleteCursorEntries(request: IDBRequest<IDBCursorWithValue | null>) {
  return new Promise<void>((resolve, reject) => {
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve();
        return;
      }

      cursor.delete();
      cursor.continue();
    };
    request.onerror = () => reject(request.error ?? new Error("IndexedDB cursor failed"));
  });
}

/**
 * @description IndexedDB adapter for browser-local presentation persistence.
 */
export class IndexedDbDeckRepository implements DeckRepository {
  private databasePromise: Promise<IDBDatabase | null> | null = null;

  constructor(
    private readonly databaseName = defaultDatabaseName,
    private readonly storeName = defaultStoreName,
  ) {}

  async list() {
    return this.withStore("readonly", async (store) => {
      if ("getAll" in store) {
        return createRequestPromise<MikroDeckRecord[]>(store.getAll());
      }

      return [];
    });
  }

  async load(id: MikroDeckId) {
    return this.withStore("readonly", async (store) => {
      const value = await createRequestPromise<MikroDeckRecord | undefined>(store.get(id));
      return value ?? null;
    });
  }

  async save(deck: MikroDeckRecord) {
    await this.withStore("readwrite", async (store) => {
      await createRequestPromise(store.put(deck));
    });
  }

  async delete(id: MikroDeckId) {
    await this.withStore("readwrite", async (store) => {
      await createRequestPromise(store.delete(id));
    });
    await this.deleteAssetsByDeck(id);
    await this.deleteDraft(id);
  }

  async saveAsset(asset: MikroAssetRecord) {
    await this.withNamedStore(assetStoreName, "readwrite", async (store) => {
      await createRequestPromise(store.put(asset));
    });
  }

  async loadAsset(id: string) {
    return this.withNamedStore<MikroAssetRecord | null>(
      assetStoreName,
      "readonly",
      async (store) => {
        const value = await createRequestPromise<MikroAssetRecord | undefined>(store.get(id));
        return value ?? null;
      },
      null,
    );
  }

  async listAssets(deckId: MikroDeckId) {
    return this.withNamedStore<MikroAssetRecord[]>(
      assetStoreName,
      "readonly",
      async (store) => {
        const index = store.index(deckIdIndexName);
        if ("getAll" in index) {
          return createRequestPromise<MikroAssetRecord[]>(index.getAll(deckId));
        }

        return [];
      },
      [],
    );
  }

  async deleteAsset(id: string) {
    await this.withNamedStore(assetStoreName, "readwrite", async (store) => {
      await createRequestPromise(store.delete(id));
    });
  }

  async deleteAssetsByDeck(deckId: MikroDeckId) {
    await this.withNamedStore(assetStoreName, "readwrite", async (store) => {
      const index = store.index(deckIdIndexName);
      await deleteCursorEntries(index.openCursor(IDBKeyRange.only(deckId)));
    });
  }

  async saveDraft(deck: MikroDeckRecord) {
    await this.withNamedStore(draftStoreName, "readwrite", async (store) => {
      await createRequestPromise(store.put(deck));
    });
  }

  async loadDraft(deckId: MikroDeckId) {
    return this.withNamedStore<MikroDeckRecord | null>(
      draftStoreName,
      "readonly",
      async (store) => {
        const value = await createRequestPromise<MikroDeckRecord | undefined>(store.get(deckId));
        return value ?? null;
      },
      null,
    );
  }

  async deleteDraft(deckId: MikroDeckId) {
    await this.withNamedStore(draftStoreName, "readwrite", async (store) => {
      await createRequestPromise(store.delete(deckId));
    });
  }

  async getMetadata() {
    return this.withNamedStore<StorageMetadata | null>(
      metadataStoreName,
      "readonly",
      async (store) => {
        const value = await createRequestPromise<StorageMetadata | undefined>(
          store.get(metadataKey),
        );
        return value ?? null;
      },
      null,
    );
  }

  private openDatabase() {
    if (!isIndexedDbAvailable()) {
      return Promise.resolve(null);
    }

    if (this.databasePromise) {
      return this.databasePromise;
    }

    this.databasePromise = new Promise((resolve, reject) => {
      const request = globalThis.indexedDB.open(this.databaseName, databaseVersion);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(this.storeName)) {
          database.createObjectStore(this.storeName, { keyPath: "id" });
        }

        if (!database.objectStoreNames.contains(assetStoreName)) {
          const assetStore = database.createObjectStore(assetStoreName, { keyPath: "id" });
          assetStore.createIndex(deckIdIndexName, deckIdIndexName, { unique: false });
        }

        if (!database.objectStoreNames.contains(draftStoreName)) {
          database.createObjectStore(draftStoreName, { keyPath: "id" });
        }

        if (!database.objectStoreNames.contains(metadataStoreName)) {
          database.createObjectStore(metadataStoreName);
        }

        request.transaction?.objectStore(metadataStoreName).put(
          {
            schemaVersion: databaseVersion,
            migratedAt: new Date().toISOString(),
          },
          metadataKey,
        );
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error("Could not open IndexedDB database"));
    });

    return this.databasePromise;
  }

  private async withStore<T>(
    mode: IDBTransactionMode,
    handler: (store: IDBObjectStore) => Promise<T>,
  ) {
    const database = await this.openDatabase();
    if (!database) {
      throw new Error(storageUnavailableMessage);
    }

    const transaction = database.transaction(this.storeName, mode);
    const store = transaction.objectStore(this.storeName);
    return handler(store);
  }

  private async withNamedStore<T>(
    storeName: string,
    mode: IDBTransactionMode,
    handler: (store: IDBObjectStore) => Promise<T>,
    fallback?: T,
  ) {
    const database = await this.openDatabase();
    if (!database) {
      if (fallback === undefined) {
        throw new Error(storageUnavailableMessage);
      }

      return fallback as T;
    }

    const transaction = database.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    return handler(store);
  }
}
