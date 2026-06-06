import {
  type ExportActionControl,
  renderExportPanelState,
  setExportActionBusy,
} from "../../src/presentation/exportPanel.js";

function control(): ExportActionControl & { attributes: Record<string, string> } {
  return {
    attributes: {},
    disabled: false,
    removeAttribute(name: string) {
      delete this.attributes[name];
    },
    setAttribute(name: string, value: string) {
      this.attributes[name] = value;
    },
  };
}

describe("export panel", () => {
  it("applies export availability state to controls", () => {
    const elements = {
      exportJsonAction: control(),
      exportPdfAction: control(),
      exportPngAction: control(),
      exportPortableAction: control(),
      exportStatus: { textContent: "" },
    };

    renderExportPanelState(elements, {
      canExportJson: true,
      canExportPdf: false,
      canExportPng: true,
      canExportPortable: false,
      statusText: "Ready",
    });

    expect(elements.exportStatus.textContent).toBe("Ready");
    expect(elements.exportJsonAction.disabled).toBe(false);
    expect(elements.exportPdfAction.disabled).toBe(true);
    expect(elements.exportPngAction.disabled).toBe(false);
    expect(elements.exportPortableAction.disabled).toBe(true);
  });

  it("toggles busy state on export controls", () => {
    const button = control();

    setExportActionBusy(button, true);
    expect(button.disabled).toBe(true);
    expect(button.attributes["aria-busy"]).toBe("true");

    setExportActionBusy(button, false);
    expect(button.disabled).toBe(false);
    expect(button.attributes["aria-busy"]).toBeUndefined();
  });
});
