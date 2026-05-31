import {
  type CommandAction,
  commandMatchesQuery,
  filterCommandActions,
  normalizeCommandText,
} from "../../src/presentation/commandPalette.js";

describe("command palette helpers", () => {
  const commands: CommandAction[] = [
    {
      id: "export-json",
      title: "Export JSON",
      detail: "Download editable data",
      keywords: "backup native",
      shortcut: "Cmd/Ctrl+E",
      run: () => undefined,
    },
    {
      id: "present",
      title: "Present",
      detail: "Start presentation mode",
      run: () => undefined,
    },
  ];

  it("normalizes and matches command text", () => {
    expect(normalizeCommandText("  Export   JSON ")).toBe("export json");
    expect(commandMatchesQuery(commands[0], "backup")).toBe(true);
    expect(commandMatchesQuery(commands[1], "backup")).toBe(false);
  });

  it("filters commands by title, detail, keywords, and shortcut", () => {
    expect(filterCommandActions(commands, "")).toHaveLength(2);
    expect(filterCommandActions(commands, "presentation")).toEqual([commands[1]]);
    expect(filterCommandActions(commands, "cmd/ctrl+e")).toEqual([commands[0]]);
  });
});
