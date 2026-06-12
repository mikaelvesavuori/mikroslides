import type { MikroDeckRecord } from "../index.js";
import { escapeHtml } from "./htmlEscape.js";

export type DeckLibraryAction = "delete-deck" | "duplicate-deck" | "open-deck";

export type DeckLibraryClickAction = {
  action: DeckLibraryAction;
  deckId: string;
};

export function renderDeckLibraryRows(decks: MikroDeckRecord[], formatDate = formatLibraryDate) {
  return decks
    .map(
      (deck) => `
        <div class="deck-row" data-deck-id="${escapeHtml(deck.id)}">
          <button class="deck-row-main" type="button" data-action="open-deck">
            <span class="deck-row-title">${escapeHtml(deck.title)}</span>
            <span class="deck-row-meta">${escapeHtml(formatDate(deck.updatedAt))}</span>
          </button>
          <span class="deck-row-actions">
            <button class="tool-btn icon-btn" type="button" data-action="duplicate-deck" title="Duplicate" aria-label="Duplicate deck">
              <svg class="icon" aria-hidden="true"><use href="#icon-copy"></use></svg>
            </button>
            <button class="tool-btn icon-btn danger" type="button" data-action="delete-deck" title="Delete" aria-label="Delete deck">
              <svg class="icon" aria-hidden="true"><use href="#icon-trash"></use></svg>
            </button>
          </span>
        </div>
      `,
    )
    .join("");
}

export function deckLibraryActionFromEvent(event: MouseEvent): DeckLibraryClickAction | null {
  const target = event.target instanceof HTMLElement ? event.target : null;
  const row = target?.closest<HTMLElement>("[data-deck-id]");
  const action = target?.closest<HTMLElement>("[data-action]")?.dataset.action;
  const deckId = row?.dataset.deckId;

  if (!deckId || !isDeckLibraryAction(action)) {
    return null;
  }

  return { action, deckId };
}

function isDeckLibraryAction(value: string | undefined): value is DeckLibraryAction {
  return value === "open-deck" || value === "duplicate-deck" || value === "delete-deck";
}

function formatLibraryDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}
