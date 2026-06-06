import type { ExportDialogState } from "./deckFileFlows.js";

export type ExportActionControl = {
  disabled: boolean;
  removeAttribute: (name: string) => void;
  setAttribute: (name: string, value: string) => void;
};

export type ExportPanelElements = {
  exportJsonAction: ExportActionControl;
  exportPdfAction: ExportActionControl;
  exportPngAction: ExportActionControl;
  exportPortableAction: ExportActionControl;
  exportStatus: { textContent: string | null };
};

export function renderExportPanelState(elements: ExportPanelElements, state: ExportDialogState) {
  elements.exportStatus.textContent = state.statusText;
  elements.exportJsonAction.disabled = !state.canExportJson;
  elements.exportPortableAction.disabled = !state.canExportPortable;
  elements.exportPdfAction.disabled = !state.canExportPdf;
  elements.exportPngAction.disabled = !state.canExportPng;
}

export function setExportActionBusy(control: ExportActionControl, busy: boolean) {
  control.disabled = busy;
  if (busy) {
    control.setAttribute("aria-busy", "true");
    return;
  }

  control.removeAttribute("aria-busy");
}
