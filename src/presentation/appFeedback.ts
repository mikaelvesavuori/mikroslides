type TimerHost = Pick<Window, "clearTimeout" | "setTimeout">;

export function createToastController(
  toast: HTMLElement,
  timerHost: TimerHost = window,
  durationMs = 2600,
) {
  let timer: number | null = null;

  return {
    show(message: string) {
      toast.textContent = message;
      toast.dataset.visible = "true";
      if (timer) {
        timerHost.clearTimeout(timer);
      }

      timer = timerHost.setTimeout(() => {
        toast.dataset.visible = "false";
      }, durationMs);
    },
  };
}

export function formatError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function openDialog(dialog: HTMLDialogElement) {
  if (!dialog.open) {
    dialog.showModal();
  }
}
