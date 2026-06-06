import { MikroDeck } from "../../src/index.js";
import {
  nextActiveDeckAfterDelete,
  selectInitialDeck,
  shouldUseRecoveryDraft,
} from "../../src/presentation/deckSession.js";

describe("deck session", () => {
  it("selects the stored deck before falling back to the first deck", () => {
    const first = { ...MikroDeck.create({ title: "First" }).toRecord(), id: "first" };
    const second = { ...MikroDeck.create({ title: "Second" }).toRecord(), id: "second" };

    expect(selectInitialDeck([first, second], "second")?.id).toBe("second");
    expect(selectInitialDeck([first, second], "missing")?.id).toBe("first");
    expect(selectInitialDeck([], "missing")).toBeNull();
  });

  it("uses recovery drafts only when they are newer for the same deck", () => {
    const deck = {
      ...MikroDeck.create({ title: "Deck" }).toRecord(),
      id: "deck",
      updatedAt: "2026-06-04T00:00:00.000Z",
    };
    const older = { ...deck, updatedAt: "2026-06-03T00:00:00.000Z" };
    const newer = { ...deck, updatedAt: "2026-06-05T00:00:00.000Z" };

    expect(shouldUseRecoveryDraft(deck, newer)).toBe(true);
    expect(shouldUseRecoveryDraft(deck, older)).toBe(false);
    expect(shouldUseRecoveryDraft(deck, { ...newer, id: "other" })).toBe(false);
  });

  it("finds a replacement only when the active deck was deleted", () => {
    const first = { ...MikroDeck.create({ title: "First" }).toRecord(), id: "first" };
    const second = { ...MikroDeck.create({ title: "Second" }).toRecord(), id: "second" };

    expect(nextActiveDeckAfterDelete([first, second], "first", "first")?.id).toBe("second");
    expect(nextActiveDeckAfterDelete([first, second], "second", "first")).toBeNull();
  });
});
