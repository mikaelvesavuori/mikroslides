import { createTextElement, MikroDeck } from "../../src/index.js";
import { updateDeckRecord } from "../../src/presentation/deckMutations.js";
import { createDeckStateController } from "../../src/presentation/deckStateController.js";

function deckWithElements() {
  const deck = MikroDeck.create({ title: "State" }).toRecord();
  deck.slides[0].elements = [
    createTextElement({ id: "first" }),
    createTextElement({ id: "second" }),
  ];
  return deck;
}

function harness() {
  const calls: string[] = [];
  const controller = createDeckStateController({
    persistRecoveryDraft: async () => {
      calls.push("persist");
    },
    renderAll: (options = {}) => {
      calls.push(`render:${options.inspector === false ? "no-inspector" : "default"}`);
    },
    scheduleAutosave: () => calls.push("autosave"),
  });

  return { calls, controller };
}

describe("deck state controller", () => {
  it("normalizes selection against the active slide", () => {
    const test = harness();
    test.controller.setDeck(deckWithElements());

    test.controller.selectElements(["missing", "second", "first"]);

    expect(test.controller.getSelectedElementIds()).toEqual(["second", "first"]);
    expect(test.controller.getSelectedElements().map((element) => element.id)).toEqual([
      "second",
      "first",
    ]);
  });

  it("commits mutations, selected ids, and render side effects", () => {
    const test = harness();
    const deck = deckWithElements();
    test.controller.setDeck(deck);

    test.controller.commitDeckMutation(
      {
        deck: updateDeckRecord(deck, { title: "Changed" }),
        selectedElementIds: ["second"],
      },
      { inspector: false },
    );

    expect(test.controller.getDeck()?.title).toBe("Changed");
    expect(test.controller.getSelectedElementIds()).toEqual(["second"]);
    expect(test.calls).toEqual(["persist", "render:no-inspector", "autosave"]);
  });

  it("undoes and redoes committed deck changes", () => {
    const test = harness();
    const deck = deckWithElements();
    test.controller.setDeck(deck);
    test.controller.commitDeckMutation(updateDeckRecord(deck, { title: "Changed" }));

    expect(test.controller.canUndo).toBe(true);
    test.controller.undo();
    expect(test.controller.getDeck()?.title).toBe("State");
    expect(test.controller.canRedo).toBe(true);

    test.controller.redo();
    expect(test.controller.getDeck()?.title).toBe("Changed");
  });
});
