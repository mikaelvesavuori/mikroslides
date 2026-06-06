import {
  loadPlaywright,
  smokeTargetUrl,
  startStaticServer,
  waitForServer,
} from "./smoke-utils.mjs";

const providerPattern =
  /(fonts\.bunny\.net|rsms\.me|cdn\.jsdelivr\.net|vercel\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|fontsource\.org)/i;
const port = Number(process.env.SMOKE_PORT ?? 4178);
const targetUrl = smokeTargetUrl(port);

async function main() {
  const server = startStaticServer(port);
  try {
    await waitForServer(targetUrl);
    const { webkit } = await loadPlaywright();
    const browser = await webkit.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const providerRequests = [];
    page.on("request", (request) => {
      const url = request.url();
      if (providerPattern.test(url)) {
        providerRequests.push(url);
      }
    });

    await page.goto(targetUrl, { waitUntil: "networkidle" });
    providerRequests.length = 0;
    await page.evaluate(() => {
      document.querySelector("#manage-fonts-btn")?.click();
    });
    await page.waitForSelector("#font-dialog[open]");
    await page.waitForTimeout(750);
    if (providerRequests.length > 0) {
      throw new Error(`Font dialog opened provider requests: ${providerRequests.join(", ")}`);
    }

    const bunnyRequestPromise = page.waitForRequest(
      (request) => request.url().includes("fonts.bunny.net/list"),
      { timeout: 5000 },
    );
    await page.click("#load-font-catalog-btn");
    const bunnyRequest = await bunnyRequestPromise;

    const interRequestPromise = page.waitForRequest(
      (request) => request.url().includes("rsms.me/inter/font-files/InterVariable.woff2"),
      { timeout: 5000 },
    );
    await page.click('[data-source-font-id="inter"]');
    const interRequest = await interRequestPromise;

    await browser.close();
    console.log(
      JSON.stringify(
        {
          afterOpenProviderRequests: 0,
          bunnyRequest: bunnyRequest.url(),
          interRequest: interRequest.url(),
        },
        null,
        2,
      ),
    );
  } finally {
    server?.kill("SIGINT");
  }
}

await main();
