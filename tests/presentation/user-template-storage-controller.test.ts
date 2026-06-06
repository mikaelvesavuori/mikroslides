import { MikroDeck } from "../../src/index.js";
import { createUserTemplateStorageController } from "../../src/presentation/userTemplateStorageController.js";

describe("user template storage controller", () => {
  it("loads, saves, and recovers from bad template storage", () => {
    const values = new Map<string, string>();
    const calls: string[] = [];
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => {
        values.delete(key);
        calls.push(`remove:${key}`);
      },
      setItem: (key: string, value: string) => {
        values.set(key, value);
        calls.push(`set:${key}`);
      },
    } as unknown as Storage;
    const controller = createUserTemplateStorageController({
      localStorage: storage,
      showToast: (message) => calls.push(`toast:${message}`),
    });
    const slide = MikroDeck.create({ title: "Template" }).toRecord().slides[0];

    controller.save([{ createdAt: "2026-06-05T00:00:00.000Z", id: "a", name: "A", slide }]);
    expect(controller.load()).toHaveLength(1);

    values.set("mikroslides.userTemplates", "{bad");
    expect(controller.load()).toEqual([]);
    expect(calls).toContain("remove:mikroslides.userTemplates");
  });

  it("reports save failures without throwing", () => {
    const calls: string[] = [];
    const controller = createUserTemplateStorageController({
      localStorage: {
        getItem: () => null,
        removeItem: () => undefined,
        setItem: () => {
          throw new Error("quota");
        },
      } as unknown as Storage,
      showToast: (message) => calls.push(message),
    });

    controller.save([]);

    expect(calls).toEqual(["Could not save template locally"]);
  });
});
