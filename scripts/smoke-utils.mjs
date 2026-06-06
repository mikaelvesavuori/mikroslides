import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

export const smokeHost = "127.0.0.1";

export function smokeTargetUrl(port) {
  return process.env.SMOKE_TARGET_URL ?? `http://${smokeHost}:${port}`;
}

export async function loadPlaywright() {
  const playwrightModule = process.env.PLAYWRIGHT_MODULE ?? "playwright";
  try {
    return await import(playwrightModule);
  } catch (error) {
    throw new Error(
      `Could not load Playwright from ${playwrightModule}. Run with PLAYWRIGHT_MODULE=file:///path/to/playwright/index.mjs or install playwright.`,
      { cause: error },
    );
  }
}

export async function waitForServer(url) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      await delay(125);
    }
  }

  throw new Error(`Timed out waiting for ${url}`);
}

export function startStaticServer(port) {
  if (process.env.SMOKE_TARGET_URL) {
    return null;
  }

  return spawn("npx", ["http-server", "dist", "-a", smokeHost, "-p", String(port), "-c-1"], {
    stdio: "ignore",
  });
}
