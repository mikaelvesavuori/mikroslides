import "fake-indexeddb/auto";

import { IndexedDbDeckRepository, MikroDeck } from "../../src/index.js";

describe("IndexedDbDeckRepository", () => {
  it("persists decks in browser-local storage", async () => {
    const repository = new IndexedDbDeckRepository(`mikroslides-test-${crypto.randomUUID()}`);
    const deck = MikroDeck.create({ title: "Stored Deck" }).toRecord();

    await repository.save(deck);

    expect(await repository.load(deck.id)).toMatchObject({ title: "Stored Deck" });
    expect(await repository.list()).toHaveLength(1);

    await repository.delete(deck.id);

    expect(await repository.load(deck.id)).toBeNull();
  });

  it("persists image assets and recovery drafts outside deck records", async () => {
    const repository = new IndexedDbDeckRepository(`mikroslides-test-${crypto.randomUUID()}`);
    const deck = MikroDeck.create({ title: "Asset Deck" }).toRecord();
    const now = new Date().toISOString();
    const asset = {
      id: "asset_test",
      deckId: deck.id,
      kind: "image" as const,
      mediaType: "image/png",
      data: new Blob(["abc"], { type: "image/png" }),
      originalName: "image.png",
      originalSrc: "image.png",
      createdAt: now,
      updatedAt: now,
    };

    await repository.save(deck);
    await repository.saveAsset(asset);
    await repository.saveDraft({ ...deck, title: "Draft Deck" });

    expect(await repository.loadAsset(asset.id)).toMatchObject({ id: asset.id, deckId: deck.id });
    expect(await repository.listAssets(deck.id)).toHaveLength(1);
    expect(await repository.loadDraft(deck.id)).toMatchObject({ title: "Draft Deck" });

    await repository.delete(deck.id);

    expect(await repository.loadAsset(asset.id)).toBeNull();
    expect(await repository.listAssets(deck.id)).toHaveLength(0);
    expect(await repository.loadDraft(deck.id)).toBeNull();
  });
});
