import type { CommandAction } from "./commandPalette.js";

export type CommandTemplate = {
  id: string;
  name: string;
};

export type MikroSlidesCommandCallbacks = {
  addImage: () => Promise<void> | void;
  addShape: () => Promise<void> | void;
  addSlide: () => Promise<void> | void;
  addText: () => Promise<void> | void;
  applyTemplate: (templateId: string) => Promise<void> | void;
  createDeck: () => Promise<void> | void;
  deleteSlide: () => Promise<void> | void;
  duplicateSlide: () => Promise<void> | void;
  exportJson: () => Promise<void> | void;
  exportPdf: () => Promise<void> | void;
  exportPng: () => Promise<void> | void;
  exportPortable: () => Promise<void> | void;
  focusSpeakerNotes: () => Promise<void> | void;
  moveSlideDown: () => Promise<void> | void;
  moveSlideUp: () => Promise<void> | void;
  openExport: () => Promise<void> | void;
  openLibrary: () => Promise<void> | void;
  openOutline: () => Promise<void> | void;
  polishDeck: () => Promise<void> | void;
  present: () => Promise<void> | void;
  redo: () => Promise<void> | void;
  toggleTheme: () => Promise<void> | void;
  undo: () => Promise<void> | void;
};

export function buildMikroSlidesCommandActions(options: {
  callbacks: MikroSlidesCommandCallbacks;
  templates: CommandTemplate[];
}): CommandAction[] {
  const { callbacks, templates } = options;
  const layoutCommands = templates.map((template) => ({
    id: `layout-${template.id}`,
    title: `Apply ${template.name}`,
    detail: "Change the current slide layout",
    keywords: `template layout slide ${template.name}`,
    run: () => callbacks.applyTemplate(template.id),
  }));

  return [
    {
      id: "new-deck",
      title: "New deck",
      detail: "Create a fresh local deck",
      keywords: "create file",
      shortcut: "Cmd/Ctrl+N",
      run: callbacks.createDeck,
    },
    {
      id: "open-library",
      title: "Open library",
      detail: "Show locally stored decks",
      keywords: "decks files recent",
      run: callbacks.openLibrary,
    },
    {
      id: "outline-deck",
      title: "Deck from outline",
      detail: "Create slides from pasted Markdown",
      keywords: "markdown import notes gamma",
      run: callbacks.openOutline,
    },
    {
      id: "polish-deck",
      title: "Polish deck",
      detail: "Tighten layout, spacing, and type scale",
      keywords: "beautify tidy align layout",
      run: callbacks.polishDeck,
    },
    {
      id: "new-slide",
      title: "New slide",
      detail: "Add a slide after the current one",
      run: callbacks.addSlide,
    },
    {
      id: "duplicate-slide",
      title: "Duplicate slide",
      detail: "Copy the current slide",
      shortcut: "Cmd/Ctrl+D",
      run: callbacks.duplicateSlide,
    },
    {
      id: "delete-slide",
      title: "Delete slide",
      detail: "Remove the current slide",
      run: callbacks.deleteSlide,
    },
    {
      id: "move-slide-up",
      title: "Move slide up",
      detail: "Move the current slide earlier",
      run: callbacks.moveSlideUp,
    },
    {
      id: "move-slide-down",
      title: "Move slide down",
      detail: "Move the current slide later",
      run: callbacks.moveSlideDown,
    },
    {
      id: "add-text",
      title: "Add text",
      detail: "Insert a text box",
      run: callbacks.addText,
    },
    {
      id: "add-image",
      title: "Add image",
      detail: "Insert a local or remote image",
      run: callbacks.addImage,
    },
    {
      id: "add-shape",
      title: "Add shape",
      detail: "Insert a simple shape",
      run: callbacks.addShape,
    },
    {
      id: "speaker-notes",
      title: "Add speaker notes",
      detail: "Focus notes for the current slide",
      run: callbacks.focusSpeakerNotes,
    },
    {
      id: "present",
      title: "Present",
      detail: "Start presentation mode",
      shortcut: "Cmd/Ctrl+Enter",
      run: callbacks.present,
    },
    {
      id: "open-export",
      title: "Export",
      detail: "Choose JSON, portable, PDF, or PNG",
      keywords: "download save file",
      run: callbacks.openExport,
    },
    {
      id: "export-json",
      title: "Export JSON",
      detail: "Download editable MikroSlides data",
      run: callbacks.exportJson,
    },
    {
      id: "export-portable",
      title: "Export portable file",
      detail: "Download a self-contained MikroSlides file",
      run: callbacks.exportPortable,
    },
    {
      id: "export-pdf",
      title: "Export PDF",
      detail: "Use the browser print/PDF flow",
      shortcut: "Cmd/Ctrl+P",
      run: callbacks.exportPdf,
    },
    {
      id: "export-png",
      title: "Export PNG",
      detail: "Download the current slide as an image",
      keywords: "image current slide",
      run: callbacks.exportPng,
    },
    {
      id: "toggle-theme",
      title: "Toggle app theme",
      detail: "Switch light or dark chrome",
      run: callbacks.toggleTheme,
    },
    {
      id: "undo",
      title: "Undo",
      detail: "Revert the last slide edit",
      shortcut: "Cmd/Ctrl+Z",
      run: callbacks.undo,
    },
    {
      id: "redo",
      title: "Redo",
      detail: "Reapply the last reverted edit",
      shortcut: "Cmd/Ctrl+Shift+Z",
      run: callbacks.redo,
    },
    ...layoutCommands,
  ];
}
