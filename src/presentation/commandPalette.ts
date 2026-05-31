export interface CommandAction {
  detail: string;
  id: string;
  keywords?: string;
  run: () => Promise<void> | void;
  shortcut?: string;
  title: string;
}

type CommandPaletteOptions = {
  dialog: HTMLDialogElement;
  getActions: () => CommandAction[];
  input: HTMLInputElement;
  list: HTMLElement;
  onError: (error: unknown) => void;
};

export class CommandPalette {
  private index = 0;

  constructor(private readonly options: CommandPaletteOptions) {
    this.connect();
  }

  open() {
    this.index = 0;
    this.options.input.value = "";
    this.render();
    if (!this.options.dialog.open) {
      this.options.dialog.showModal();
    }
    window.setTimeout(() => this.options.input.focus(), 0);
  }

  close() {
    if (this.options.dialog.open) {
      this.options.dialog.close();
    }
  }

  private connect() {
    this.options.input.addEventListener("input", () => this.syncResults());
    this.options.input.addEventListener("search", () => this.syncResults());
    this.options.input.addEventListener("keydown", (event) => void this.handleKeydown(event));
    this.options.dialog.addEventListener("click", (event) => {
      if (event.target === this.options.dialog) {
        this.close();
      }
    });
    this.options.dialog.addEventListener("close", () => {
      this.index = 0;
      this.options.input.value = "";
      this.options.input.blur();
      this.options.list.replaceChildren();
    });
  }

  private syncResults() {
    this.index = 0;
    this.render();
  }

  private render() {
    const commands = this.filteredActions();
    this.index = commands.length ? Math.min(this.index, commands.length - 1) : 0;
    this.options.list.dataset.size =
      commands.length === 0 ? "empty" : commands.length === 1 ? "single" : "many";
    this.options.list.replaceChildren(
      ...(commands.length
        ? commands.map((command, index) => this.commandItem(command, index))
        : [emptyCommandElement()]),
    );
    this.options.list
      .querySelector<HTMLElement>("[data-active='true']")
      ?.scrollIntoView({ block: "nearest" });
  }

  private commandItem(command: CommandAction, index: number) {
    const item = document.createElement("button");
    const text = document.createElement("span");
    const title = document.createElement("strong");
    const detail = document.createElement("small");
    item.type = "button";
    item.className = "command-item";
    item.dataset.active = String(index === this.index);
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", String(index === this.index));
    title.textContent = command.title;
    detail.textContent = command.detail;
    text.className = "command-item-text";
    text.append(title, detail);
    item.append(text);
    item.addEventListener("mousemove", () => {
      if (this.index !== index) {
        this.index = index;
        this.render();
      }
    });
    item.addEventListener("click", () => {
      void this.run(command);
    });
    return item;
  }

  private async handleKeydown(event: KeyboardEvent) {
    const commands = this.filteredActions();
    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.index = commands.length ? Math.min(this.index + 1, commands.length - 1) : 0;
      this.render();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      this.index = Math.max(this.index - 1, 0);
      this.render();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const command = commands[this.index];
      if (command) {
        await this.run(command);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      this.close();
    }
  }

  private async run(command: CommandAction) {
    this.close();
    try {
      await command.run();
    } catch (error) {
      this.options.onError(error);
    }
  }

  private filteredActions() {
    return filterCommandActions(this.options.getActions(), this.options.input.value);
  }
}

export function filterCommandActions(commands: CommandAction[], input: string) {
  const query = normalizeCommandText(input);
  if (!query) {
    return commands;
  }

  return commands.filter((command) => commandMatchesQuery(command, query));
}

export function commandMatchesQuery(command: CommandAction, query: string) {
  return normalizeCommandText(
    `${command.id} ${command.title} ${command.detail} ${command.keywords ?? ""} ${command.shortcut ?? ""}`,
  ).includes(query);
}

export function normalizeCommandText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function emptyCommandElement() {
  const element = document.createElement("div");
  element.className = "command-empty";
  element.textContent = "No matching commands.";
  return element;
}
