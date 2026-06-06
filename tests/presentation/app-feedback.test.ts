import {
  createToastController,
  formatError,
  openDialog,
} from "../../src/presentation/appFeedback.js";

describe("app feedback", () => {
  it("shows toast messages and hides them after the timeout", () => {
    let timeoutCallback = () => undefined;
    const cleared: number[] = [];
    const toast = { dataset: {}, textContent: "" };
    const timerHost = {
      clearTimeout: (timer?: number) => {
        if (timer) {
          cleared.push(timer);
        }
      },
      setTimeout: (callback: TimerHandler) => {
        timeoutCallback = () => {
          if (typeof callback === "function") {
            callback();
          }
        };
        return 7;
      },
    } satisfies Pick<Window, "clearTimeout" | "setTimeout">;
    const controller = createToastController(toast as unknown as HTMLElement, timerHost, 100);

    controller.show("Saved");
    expect(toast.textContent).toBe("Saved");
    expect(toast.dataset).toMatchObject({ visible: "true" });

    controller.show("Updated");
    expect(cleared).toEqual([7]);
    timeoutCallback();
    expect(toast.dataset).toMatchObject({ visible: "false" });
  });

  it("formats errors and opens closed dialogs", () => {
    expect(formatError(new Error("Broken"), "Fallback")).toBe("Broken");
    expect(formatError("nope", "Fallback")).toBe("Fallback");

    let opened = false;
    openDialog({
      open: false,
      showModal: () => {
        opened = true;
      },
    } as unknown as HTMLDialogElement);

    expect(opened).toBe(true);
  });
});
