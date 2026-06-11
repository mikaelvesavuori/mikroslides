import { defaultDeckTheme, type MikroDeckRecord, type MikroSlideRecord } from "../index.js";
import { openDialog } from "./appFeedback.js";
import { applyTemplateToActiveSlide } from "./deckMutations.js";
import { createTemplateSlide } from "./slideLayouts.js";
import {
  createUserTemplateFromSlide,
  createUserTemplateSlide,
  prependUserTemplate,
  type UserTemplate,
} from "./userTemplates.js";

export type TemplateOutlineControllerElements = {
  outlineDialog: HTMLDialogElement;
  outlineInput: HTMLTextAreaElement;
  templateDialog: HTMLDialogElement;
  templateNameInput: HTMLInputElement;
  templateSelect: HTMLSelectElement;
};

export type TemplateOutlineControllerOptions = {
  clearHistory: () => void;
  commitDeckMutation: (
    result:
      | MikroDeckRecord
      | {
          deck: MikroDeckRecord;
          selectedElementIds?: string[];
        }
      | null,
  ) => boolean;
  createDeckFromMarkdown: (
    markdown: string,
    options: Pick<MikroDeckRecord, "aspectRatio" | "theme">,
  ) => MikroDeckRecord;
  elements: TemplateOutlineControllerElements;
  formatError: (error: unknown, fallback: string) => string;
  getDeck: () => MikroDeckRecord | null;
  getSlide: () => MikroSlideRecord | null;
  getStorageAvailable: () => boolean;
  getUserTemplates: () => UserTemplate[];
  localStorage: Storage;
  refreshLibrary: (options?: { render?: boolean }) => Promise<void>;
  rememberDeck: (storage: Storage, deck: MikroDeckRecord) => void;
  renderAll: () => void;
  renderTemplateOptions: () => void;
  saveCurrentDeck: (snapshot?: boolean) => Promise<void>;
  saveDeckRecord: (
    deck: MikroDeckRecord,
    options: { saveSnapshot: boolean; snapshotReason: "manual" | "autosave" | "import" },
  ) => Promise<MikroDeckRecord>;
  saveUserTemplates: () => void;
  selectSlide: () => void;
  setDeck: (deck: MikroDeckRecord) => void;
  setUserTemplates: (templates: UserTemplate[]) => void;
  showToast: (message: string) => void;
  syncAssetObjectUrls: () => Promise<void>;
  windowRef: Pick<Window, "setTimeout">;
};

const defaultOutlineText =
  "---\ntitle: Launch Plan\naspect: 16:9\n---\n\n# Launch Plan\nA short subtitle for the deck.\n\n---\nlayout: bullets\n# Why now\n- Customer demand\n- Internal readiness\n\n---\nlayout: bullets\n# Next steps\n- Pilot\n- Measure\n- Roll out\n\nnotes:\nMention owner and timing.";

export function createTemplateOutlineController(options: TemplateOutlineControllerOptions) {
  return {
    applySelectedTemplate() {
      const template = options.elements.templateSelect.value;
      options.elements.templateSelect.value = "";
      if (!template) {
        return;
      }

      const slide = options.getSlide();
      const deck = options.getDeck();
      if (!deck || !slide) {
        return;
      }

      const templateSlide = template.startsWith("custom:")
        ? createUserTemplateSlide(
            options.getUserTemplates(),
            template.replace(/^custom:/, ""),
            slide,
          )
        : createTemplateSlide(template, slide, deck.theme);
      if (!templateSlide) {
        options.showToast("Template not found");
        return;
      }

      const nextDeck = applyTemplateToActiveSlide(deck, templateSlide);
      if (nextDeck) {
        options.commitDeckMutation({ deck: nextDeck, selectedElementIds: [] });
      }
    },
    async createDeckFromOutlineText(markdown: string) {
      const text = markdown.trim();
      if (!text) {
        options.showToast("Paste Markdown first");
        return;
      }

      await options.saveCurrentDeck(false);
      try {
        const currentDeck = options.getDeck();
        let nextDeck = options.createDeckFromMarkdown(text, {
          aspectRatio: currentDeck?.aspectRatio ?? "16:9",
          theme: currentDeck?.theme ?? defaultDeckTheme,
        });
        if (options.getStorageAvailable()) {
          nextDeck = await options.saveDeckRecord(nextDeck, {
            saveSnapshot: true,
            snapshotReason: "import",
          });
          await options.refreshLibrary({ render: false });
        }
        options.setDeck(nextDeck);
        options.selectSlide();
        options.clearHistory();
        options.rememberDeck(options.localStorage, nextDeck);
        options.elements.outlineDialog.close();
        await options.syncAssetObjectUrls();
        options.renderAll();
        options.showToast("Deck created from Markdown");
      } catch (error) {
        options.showToast(options.formatError(error, "Could not create deck from Markdown"));
      }
    },
    openOutlineDialog() {
      options.elements.outlineInput.value ||= defaultOutlineText;
      openDialog(options.elements.outlineDialog);
      options.windowRef.setTimeout(() => {
        options.elements.outlineInput.focus();
        options.elements.outlineInput.select();
      }, 0);
    },
    openTemplateDialog() {
      const slide = options.getSlide();
      if (!slide) {
        return;
      }

      options.elements.templateNameInput.value = slide.title || "Untitled template";
      openDialog(options.elements.templateDialog);
      options.windowRef.setTimeout(() => {
        options.elements.templateNameInput.focus();
        options.elements.templateNameInput.select();
      }, 0);
    },
    saveUserTemplateFromDialog() {
      const slide = options.getSlide();
      if (!slide) {
        return;
      }

      const name =
        options.elements.templateNameInput.value.trim() || slide.title || "Untitled template";
      options.setUserTemplates(
        prependUserTemplate(options.getUserTemplates(), createUserTemplateFromSlide(slide, name)),
      );
      options.saveUserTemplates();
      options.renderTemplateOptions();
      options.elements.templateDialog.close();
      options.showToast("Template saved");
    },
  };
}
