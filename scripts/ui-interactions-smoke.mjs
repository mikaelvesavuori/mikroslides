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

    await assertTopBarIsFloatingWidth(page);
    await assertSlideInspectorOmitsTitleInput(page);
    await assertPresenterNotes(page);
    await ensureCanvasElements(page);
    await assertFontDialogCatalogGate(page);
    await assertMarqueeMultiSelect(page);
    await assertMultiSelectInspector(page);
    await assertDoubleClickTextEditing(page);
    await assertCanvasContextMenu(page);
    await assertCanvasModifierDrag(page);
    await assertSlideRailClipboard(page);
    await assertSlideSkipInPresenter(page);
    await assertSlideDragReorder(page);
    await assertSlideRailScrollsAtShortHeights(page);

    const canvasElements = await page.locator("#slide-canvas [data-element-id]").count();
    await browser.close();
    console.log(
      JSON.stringify(
        {
          canvasElements,
          contextMenu: "app menu opened",
          fontCatalog: "font catalog stayed gated",
          header: "top bar stayed centered and less than full width",
          inspector: "multi-select inspector summarized selection",
          modifierDrag: "option-drag duplicated and shift-drag constrained movement",
          multiSelect: "marquee selected multiple elements",
          presenterNotes: "speaker notes accepted input",
          slideInspector: "slide title input stayed removed",
          slideRailClipboard: "thumbnail rail copied, pasted, and deleted a slide",
          slideRailScroll: "thumbnail rail scrolled without collapsed rows",
          slideSkip: "skipped thumbnail was excluded from presenter count",
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

async function assertTopBarIsFloatingWidth(page) {
  const metrics = await page.locator(".app-header").evaluate((header) => {
    const headerRect = header.getBoundingClientRect();
    return {
      borderRadius: getComputedStyle(header).borderTopLeftRadius,
      left: headerRect.left,
      viewportWidth: window.innerWidth,
      width: headerRect.width,
    };
  });

  if (metrics.width >= metrics.viewportWidth - 16) {
    throw new Error("Top bar still spans the full viewport width.");
  }
  if (Math.abs(metrics.left - (metrics.viewportWidth - metrics.width) / 2) > 2) {
    throw new Error("Top bar is not centered in the viewport.");
  }
  if (Number.parseFloat(metrics.borderRadius) < 6) {
    throw new Error("Top bar lost its floating rounded chrome.");
  }
}

async function assertSlideInspectorOmitsTitleInput(page) {
  const titleInputCount = await page.locator("#slide-inspector #slide-title-input").count();
  if (titleInputCount !== 0) {
    throw new Error("Slide inspector still exposes the slide title input.");
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
  const beforeCount = await page.locator("#slide-canvas [data-element-id]").count();
  await page.locator("#slide-canvas [data-text-editor]", { hasText: "New text" }).dblclick();
  await page.waitForSelector('[data-text-editor][contenteditable="true"]');
  await page.keyboard.press("Backspace");
  await page.waitForFunction(
    (count) => document.querySelectorAll("#slide-canvas [data-element-id]").length === count,
    beforeCount,
  );
  await page.locator('[data-text-editor][contenteditable="true"]').click();
  await page.waitForFunction(
    () => !document.querySelector('#slide-canvas [data-text-editor][contenteditable="true"]'),
  );
}

async function assertCanvasContextMenu(page) {
  await page.click('#slide-canvas [data-element-id][data-kind="shape"]', { button: "right" });
  await page.waitForFunction(
    () => !document.querySelector("#context-menu")?.hasAttribute("hidden"),
  );
}

async function assertCanvasModifierDrag(page) {
  const shape = page.locator('#slide-canvas [data-element-id][data-kind="shape"]').first();
  await shape.click({ force: true });
  const beforeCount = await page.locator("#slide-canvas [data-element-id]").count();
  await dragElementCenter(page, shape, { dx: 100, dy: 40, modifier: "Alt" });
  await page.waitForFunction(
    (count) => document.querySelectorAll("#slide-canvas [data-element-id]").length === count + 1,
    beforeCount,
  );

  const selected = page.locator('#slide-canvas [data-element-id][data-selected="true"]').first();
  const before = await elementGeometry(selected);
  await dragElementCenter(page, selected, { dx: 120, dy: 48, modifier: "Shift" });
  const after = await elementGeometry(selected);

  if (after.x <= before.x || Math.abs(after.y - before.y) > 0.1) {
    throw new Error(
      `Shift-drag did not constrain movement horizontally: before=${JSON.stringify(
        before,
      )} after=${JSON.stringify(after)}`,
    );
  }
}

async function assertSlideRailClipboard(page) {
  const beforeCount = await page.locator(".slide-thumb").count();
  const beforeIds = await slideIds(page);
  await page.locator(".slide-thumb").first().click();
  await page.waitForFunction(() =>
    document.activeElement?.closest('.slide-thumb[aria-current="true"]'),
  );

  await page.keyboard.press("Control+C");
  await page.keyboard.press("Control+V");
  await page.waitForFunction(
    (count) => document.querySelectorAll(".slide-thumb").length === count + 1,
    beforeCount,
  );
  await page.waitForFunction(() =>
    document.activeElement?.closest('.slide-thumb[aria-current="true"]'),
  );

  await page.keyboard.press("Delete");
  await page.waitForFunction(
    (count) => document.querySelectorAll(".slide-thumb").length === count,
    beforeCount,
  );

  const afterIds = await slideIds(page);
  if (afterIds.join(",") !== beforeIds.join(",")) {
    throw new Error("Slide rail copy/paste/delete did not restore the original slide order.");
  }
}

async function dragElementCenter(page, locator, options) {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error("Could not measure draggable element.");
  }

  const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.keyboard.down(options.modifier);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + options.dx, start.y + options.dy, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up(options.modifier);
}

async function elementGeometry(locator) {
  return locator.evaluate((element) => ({
    x: Number.parseFloat(element.style.getPropertyValue("--x")),
    y: Number.parseFloat(element.style.getPropertyValue("--y")),
  }));
}

async function assertSlideSkipInPresenter(page) {
  const slideCount = await page.locator(".slide-thumb").count();
  if (slideCount < 2) {
    await page.click("#add-slide-btn");
    await page.waitForFunction(() => document.querySelectorAll(".slide-thumb").length >= 2);
  }

  const count = await page.locator(".slide-thumb").count();
  await page.locator(".slide-thumb").last().hover();
  await page.locator(".slide-thumb").last().locator(".slide-skip-btn").click();
  await page.waitForFunction(
    () =>
      document.querySelector(".slide-thumb:last-child")?.getAttribute("data-skipped") === "true",
  );

  await page.locator(".slide-thumb").first().click();
  await page.click("#present-btn");
  await page.waitForFunction(() => document.querySelector("#presenter-dialog")?.open);
  await page.waitForFunction(
    (visibleCount) =>
      document.querySelector("#presenter-meta")?.textContent?.includes(`1 / ${visibleCount}`),
    count - 1,
  );
  await page.locator('[data-close-dialog="presenter-dialog"]').click();
  await page.waitForFunction(() => !document.querySelector("#presenter-dialog")?.open);

  await page.locator(".slide-thumb").last().hover();
  await page.locator(".slide-thumb").last().locator(".slide-skip-btn").click();
  await page.waitForFunction(
    () =>
      document.querySelector(".slide-thumb:last-child")?.getAttribute("data-skipped") === "false",
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

async function assertSlideRailScrollsAtShortHeights(page) {
  while ((await page.locator(".slide-thumb").count()) < 6) {
    await page.click("#add-slide-btn");
    await page.waitForTimeout(20);
  }

  await page.setViewportSize({ width: 1440, height: 520 });
  await page.waitForFunction(() => document.querySelectorAll(".slide-thumb").length >= 6);
  await page.waitForFunction(() => {
    const list = document.querySelector(".slide-list");
    return Boolean(list && list.scrollHeight > list.clientHeight + 8);
  });

  const metrics = await page.locator(".slide-list").evaluate((list) => {
    const listRect = list.getBoundingClientRect();
    const thumbs = Array.from(list.querySelectorAll(".slide-thumb"), (thumb) => {
      const rect = thumb.getBoundingClientRect();
      return { bottom: rect.bottom, height: rect.height, top: rect.top };
    });
    return {
      clientHeight: list.clientHeight,
      scrollHeight: list.scrollHeight,
      listBottom: listRect.bottom,
      listTop: listRect.top,
      thumbs,
    };
  });

  if (metrics.scrollHeight <= metrics.clientHeight) {
    throw new Error("Slide rail did not become scrollable at a short viewport height.");
  }

  for (let index = 0; index < metrics.thumbs.length - 1; index += 1) {
    const current = metrics.thumbs[index];
    const next = metrics.thumbs[index + 1];
    if (current.height < 48) {
      throw new Error(`Slide thumbnail ${index + 1} collapsed to ${current.height}px.`);
    }
    if (current.bottom > next.top + 1) {
      throw new Error(`Slide thumbnails ${index + 1} and ${index + 2} overlap.`);
    }
  }
}

async function slideIds(page) {
  return page
    .locator(".slide-thumb")
    .evaluateAll((thumbs) => thumbs.map((thumb) => thumb.getAttribute("data-slide-id")));
}

await main();
