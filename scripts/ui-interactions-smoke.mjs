import {
  loadPlaywright,
  smokeTargetUrl,
  startStaticServer,
  waitForServer,
} from "./smoke-utils.mjs";

const port = Number(process.env.SMOKE_PORT ?? 4179);
const targetUrl = smokeTargetUrl(port);

async function main() {
  const server = startStaticServer(port);
  try {
    await waitForServer(targetUrl);
    const { webkit } = await loadPlaywright();
    const browser = await webkit.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();

    await page.goto(targetUrl, { waitUntil: "networkidle" });
    await page.waitForSelector("#slide-canvas");

    await assertPresenterNotes(page);
    await ensureCanvasElements(page);
    await assertFontDialogCatalogGate(page);
    await assertMarqueeMultiSelect(page);
    await assertMultiSelectInspector(page);
    await assertDoubleClickTextEditing(page);
    await assertCanvasContextMenu(page);
    await assertSlideDragReorder(page);

    const canvasElements = await page.locator("#slide-canvas [data-element-id]").count();
    await browser.close();
    console.log(
      JSON.stringify(
        {
          canvasElements,
          contextMenu: "app menu opened",
          fontCatalog: "font catalog stayed gated",
          inspector: "multi-select inspector summarized selection",
          multiSelect: "marquee selected multiple elements",
          presenterNotes: "speaker notes accepted input",
          slideReorder: "drag reordered thumbnails",
          textEditing: "double-click entered editor",
        },
        null,
        2,
      ),
    );
  } finally {
    server?.kill("SIGINT");
  }
}

async function assertPresenterNotes(page) {
  await page.fill("#speaker-notes", "Remember to ship the demo.");
  await page.waitForFunction(
    () => document.querySelector("#speaker-notes")?.value === "Remember to ship the demo.",
  );
}

async function ensureCanvasElements(page) {
  await page.click("#add-text-btn");
  await page.click("#add-shape-btn");
  await page.waitForFunction(
    () => document.querySelectorAll("#slide-canvas [data-element-id]").length >= 2,
  );
}

async function assertFontDialogCatalogGate(page) {
  await page
    .locator('#slide-canvas [data-element-id][data-kind="text"]', { hasText: "New text" })
    .click({ force: true });
  await page.locator("#manage-fonts-btn").evaluate((button) => button.click());
  await page.waitForFunction(() => document.querySelector("#font-dialog")?.open);
  await page.waitForFunction(
    () =>
      document.querySelector("#load-font-catalog-btn")?.textContent?.trim() === "Load catalog" &&
      document.querySelector("#font-catalog-status")?.textContent?.trim() === "Curated",
  );
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector("#font-dialog")?.open);
}

async function assertMarqueeMultiSelect(page) {
  const canvas = page.locator("#slide-canvas");
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error("Could not measure slide canvas.");
  }

  await page.mouse.move(box.x + 6, box.y + 6);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 6, box.y + box.height - 6, { steps: 8 });
  await page.waitForSelector(".selection-marquee");
  await page.mouse.up();
  await page.waitForFunction(
    () =>
      document.querySelectorAll('#slide-canvas [data-element-id][data-selected="true"]').length >=
      2,
  );
}

async function assertMultiSelectInspector(page) {
  await page.waitForFunction(() =>
    /Objects/.test(document.querySelector("#object-inspector-title")?.textContent ?? ""),
  );
}

async function assertDoubleClickTextEditing(page) {
  await page.locator("#slide-canvas [data-text-editor]", { hasText: "New text" }).dblclick();
  await page.waitForSelector('[data-text-editor][contenteditable="true"]');
}

async function assertCanvasContextMenu(page) {
  await page.click('#slide-canvas [data-element-id][data-kind="shape"]', { button: "right" });
  await page.waitForFunction(
    () => !document.querySelector("#context-menu")?.hasAttribute("hidden"),
  );
}

async function assertSlideDragReorder(page) {
  await page.click("#add-slide-btn");
  await page.waitForFunction(() => document.querySelectorAll(".slide-thumb").length >= 2);

  const before = await slideIds(page);
  await page.locator(".slide-thumb").first().dragTo(page.locator(".slide-thumb").nth(1));
  await page.waitForFunction((initialIds) => {
    const ids = Array.from(document.querySelectorAll(".slide-thumb"), (thumb) =>
      thumb.getAttribute("data-slide-id"),
    );
    return ids.join(",") !== initialIds.join(",");
  }, before);
}

async function slideIds(page) {
  return page
    .locator(".slide-thumb")
    .evaluateAll((thumbs) => thumbs.map((thumb) => thumb.getAttribute("data-slide-id")));
}

await main();
