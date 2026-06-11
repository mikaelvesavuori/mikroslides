import { buildMikroSlidesCommandActions } from "../../src/presentation/commandActions.js";

describe("command actions", () => {
  it("builds core commands and template commands from callbacks", () => {
    const calls: string[] = [];
    const actions = buildMikroSlidesCommandActions({
      templates: [{ id: "title", name: "Title" }],
      callbacks: {
        addImage: () => {
          calls.push("addImage");
        },
        addShape: () => {
          calls.push("addShape");
        },
        addSlide: () => {
          calls.push("addSlide");
        },
        addText: () => {
          calls.push("addText");
        },
        applyTemplate: (templateId) => {
          calls.push(`template:${templateId}`);
        },
        createDeck: () => {
          calls.push("createDeck");
        },
        deleteSlide: () => {
          calls.push("deleteSlide");
        },
        duplicateSlide: () => {
          calls.push("duplicateSlide");
        },
        exportJson: () => {
          calls.push("exportJson");
        },
        exportPdf: () => {
          calls.push("exportPdf");
        },
        exportPng: () => {
          calls.push("exportPng");
        },
        exportPortable: () => {
          calls.push("exportPortable");
        },
        focusSpeakerNotes: () => {
          calls.push("focusSpeakerNotes");
        },
        moveSlideDown: () => {
          calls.push("moveSlideDown");
        },
        moveSlideUp: () => {
          calls.push("moveSlideUp");
        },
        openExport: () => {
          calls.push("openExport");
        },
        openLibrary: () => {
          calls.push("openLibrary");
        },
        openOutline: () => {
          calls.push("openOutline");
        },
        present: () => {
          calls.push("present");
        },
        redo: () => {
          calls.push("redo");
        },
        toggleTheme: () => {
          calls.push("toggleTheme");
        },
        undo: () => {
          calls.push("undo");
        },
      },
    });

    expect(actions.map((action) => action.id)).toContain("new-deck");
    expect(actions.map((action) => action.id)).toContain("layout-title");

    actions.find((action) => action.id === "layout-title")?.run();
    actions.find((action) => action.id === "undo")?.run();
    expect(calls).toEqual(["template:title", "undo"]);
  });
});
