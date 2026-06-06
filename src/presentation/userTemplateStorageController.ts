import { parseUserTemplates, type UserTemplate, userTemplatesStorageKey } from "./userTemplates.js";

export type UserTemplateStorageControllerOptions = {
  localStorage: Storage;
  showToast: (message: string) => void;
};

export function createUserTemplateStorageController(options: UserTemplateStorageControllerOptions) {
  return {
    load() {
      try {
        return parseUserTemplates(options.localStorage.getItem(userTemplatesStorageKey));
      } catch {
        options.localStorage.removeItem(userTemplatesStorageKey);
        return [];
      }
    },
    save(templates: UserTemplate[]) {
      try {
        options.localStorage.setItem(userTemplatesStorageKey, JSON.stringify(templates));
      } catch {
        options.showToast("Could not save template locally");
      }
    },
  };
}
