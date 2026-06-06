import type { MikroDeckRecord } from "../index.js";

export const activeDeckStorageKey = "mikroslides.activeDeckId";
export const autosaveDelayMs = 450;

export function selectInitialDeck(
  decks: MikroDeckRecord[],
  storedDeckId: string | null,
): MikroDeckRecord | null {
  return decks.find((deck) => deck.id === storedDeckId) ?? decks[0] ?? null;
}

export function shouldUseRecoveryDraft(
  deck: MikroDeckRecord | null,
  recoveryDeck: MikroDeckRecord | null,
) {
  return Boolean(
    deck &&
      recoveryDeck &&
      recoveryDeck.id === deck.id &&
      recoveryDeck.updatedAt.localeCompare(deck.updatedAt) > 0,
  );
}

export function rememberActiveDeckId(storage: Storage, deck: MikroDeckRecord) {
  storage.setItem(activeDeckStorageKey, deck.id);
}

export function nextActiveDeckAfterDelete(
  decks: MikroDeckRecord[],
  deletedDeckId: string,
  activeDeckId: string | null,
) {
  if (activeDeckId !== deletedDeckId) {
    return null;
  }

  return decks.find((deck) => deck.id !== deletedDeckId) ?? null;
}
