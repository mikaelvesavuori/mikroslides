import {
  cpSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { extname, join, relative } from "node:path";

import { build } from "esbuild";
import { minify } from "html-minifier-terser";
import { transform } from "lightningcss";

const webSrcDir = "src";
const uiDir = join(webSrcDir, "ui");
const publicDir = join(webSrcDir, "public");
const distDir = "dist";
const distAssetsDir = join(distDir, "assets");
const packageVersion = JSON.parse(readFileSync("./package.json", "utf8")).version as string;
const skippedStaticAssetExtensions = new Set([".css", ".html", ".js", ".mjs", ".ts", ".mts"]);
const skippedMetadataFiles = new Set([".DS_Store", "Thumbs.db"]);

async function buildWebApp() {
  console.log("Building app bundle...");

  await build({
    entryPoints: [{ in: "./src/presentation/main.ts", out: "main" }],
    outdir: distAssetsDir,
    bundle: true,
    format: "esm",
    minify: true,
    platform: "browser",
    sourcemap: false,
    target: ["chrome109", "safari16", "edge109", "firefox109"],
    treeShaking: true,
    banner: {
      js: `/* MikroSlides v${packageVersion} | ${new Date().toISOString()} */`,
    },
  });
}

function buildCss() {
  console.log("Optimizing CSS...");

  const cssInput = readFileSync(join(uiDir, "styles.css"));
  const { code } = transform({
    filename: "styles.css",
    code: cssInput,
    minify: true,
    sourceMap: false,
  });

  writeFileSync(join(distAssetsDir, "styles.css"), code);
}

async function buildHtml() {
  console.log("Optimizing HTML...");

  const html = readFileSync(join(uiDir, "index.html"), "utf8");
  const optimizedHtml = await minify(html, {
    collapseWhitespace: true,
    removeComments: true,
    minifyCSS: false,
    minifyJS: false,
    removeRedundantAttributes: true,
    removeOptionalTags: true,
    removeEmptyAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    useShortDoctype: true,
  });

  writeFileSync(join(distDir, "index.html"), optimizedHtml);
}

function statExists(filePath: string) {
  try {
    statSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function shouldSkipStaticAsset(entry: string) {
  if (skippedMetadataFiles.has(entry) || entry.startsWith(".")) {
    return true;
  }

  return skippedStaticAssetExtensions.has(extname(entry));
}

function copyStaticAssets(sourceDir: string, targetDir: string) {
  if (!statExists(sourceDir)) {
    return;
  }

  for (const entry of readdirSync(sourceDir)) {
    if (shouldSkipStaticAsset(entry)) {
      continue;
    }

    const sourcePath = join(sourceDir, entry);
    const targetPath = join(targetDir, entry);
    const stats = statSync(sourcePath);

    if (stats.isDirectory()) {
      mkdirSync(targetPath, { recursive: true });
      copyStaticAssets(sourcePath, targetPath);
      continue;
    }

    mkdirSync(targetDir, { recursive: true });
    cpSync(sourcePath, targetPath);
  }
}

async function main() {
  const startTime = Date.now();

  rmSync(distDir, { force: true, recursive: true });
  mkdirSync(distAssetsDir, { recursive: true });

  await buildWebApp();
  buildCss();
  await buildHtml();
  copyStaticAssets(uiDir, distDir);
  copyStaticAssets(publicDir, distDir);

  const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`Build completed in ${durationSeconds}s`);
  console.log("Output:");
  console.log(`  ${relative(process.cwd(), join(distDir, "index.html"))}`);
  console.log(`  ${relative(process.cwd(), join(distAssetsDir, "main.js"))}`);
}

main().catch((error) => {
  console.error("Build failed:", error);
  process.exit(1);
});
