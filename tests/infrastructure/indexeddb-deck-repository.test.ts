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
});
