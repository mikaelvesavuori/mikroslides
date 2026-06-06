import { MikroDeck } from "../../src/index.js";
import { DeckHistory } from "../../src/presentation/deckHistory.js";

describe("deck history", () => {
  it("captures staged deck snapshots for undo and redo", () => {
    const history = new DeckHistory();
    const original = MikroDeck.create({ title: "Original" }).toRecord();
    const edited = { ...original, title: "Edited" };

    expect(history.stage(original)).toBe(true);
    expect(history.pending).toBe(true);
    expect(history.flush()).toBe(true);
    expect(history.canUndo).toBe(true);

    const previous = history.undo(edited);
    expect(previous?.title).toBe("Original");
    expect(history.canRedo).toBe(true);

    const next = history.redo(previous);
    expect(next?.title).toBe("Edited");
  });

  it("keeps staged snapshots immutable", () => {
    const history = new DeckHistory();
    const original = MikroDeck.create({ title: "Original" }).toRecord();

    history.stage(original);
    original.title = "Mutated after stage";
    history.flush();

    expect(history.undo({ ...original, title: "Edited" })?.title).toBe("Original");
  });
});
