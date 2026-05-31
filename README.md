# MikroSlides

**The minimalist presentation app that's all yours.**

MikroSlides is an ultra-minimal, local-first presentation editor for modern browsers. It gives you focused deck creation, browser-local storage, JSON file exchange, and clean PDF distribution without a heavy SaaS surface.

## Features

- **Local-first decks** stored in browser IndexedDB
- **Responsive slide editor** with 16:9, 4:3, and 1:1 decks, thumbnails, speaker notes, and a focused inspector
- **Object editing** for text, shapes, and images
- **Direct canvas controls** including select, multi-select, drag, resize, copy, paste, duplicate, delete, zoom, alignment, layering, and keyboard nudging
- **Undo and redo** for deck and slide edits
- **Slide layouts** for title, section, image/text, quote, and closing slides
- **Markdown outline import** for quickly generating a deck from notes
- **Deterministic polish pass** that tightens layouts, spacing, theme colors, and type scale locally
- **Deck themes** with familiar MikroSuite defaults and editable slide backgrounds
- **Saved slide templates** for reusable local layouts
- **Presentation mode** for local playback
- **JSON import/export** using the `.mikroslides.json` envelope
- **Portable `.mikroslides` export** with embedded local/data URL images and best-effort remote image embedding
- **Current-slide PNG export** for fast sharing
- **PDF export** through the browser print/save-to-PDF flow
- **Static deployment** for any host that can serve HTML, CSS, and JavaScript

## Quick Start

### Development

```sh
npm install
npm run dev:web
```

Open `http://127.0.0.1:4175`.

### Verification

```sh
npm run verify
```

The full suite runs Biome, TypeScript, Vitest with coverage, and the production build.

### Production build

```sh
npm run build
```

The static bundle is written to `dist/` and can be served from any static host.

### Cloudflare deploy

```sh
npm run deploy:cloudflare
```

`wrangler.toml` is configured for Cloudflare Workers static assets.

## Technology

- **Frontend**: Vanilla HTML, CSS, and TypeScript compiled with esbuild
- **Storage**: IndexedDB for browser-local decks
- **Architecture**: Clean Architecture and DDD-style boundaries in one `src/` tree
- **File exchange**: MikroSlides JSON and portable deck envelopes with schema-version validation
- **Distribution**: Browser print output for PDF export and client-side PNG export
- **Testing**: Vitest
- **Tooling**: Biome, TypeScript, esbuild, Wrangler

## Project Structure

- `src/domain`, `src/application`, `src/infrastructure`, `src/interfaces`, and `src/shared` contain the app core
- `src/presentation`, `src/config`, `src/ui`, and `src/public` contain the browser surface
- `tests/` contains focused domain, application, and infrastructure tests
- `docs/` contains manual QA and privacy/security notes

## Local Data And Privacy

MikroSlides is local-first. Decks, saved templates, focus-mode preference, and recovery drafts live in the browser via IndexedDB and localStorage. The app does not require an account or backend service.

Exporting is initiated by the user. Portable export and PNG export may fetch remote image URLs already present in a deck so those assets can be embedded or rendered. Local image files inserted into a deck are stored as data URLs in the browser and can be included in exported files.

See [Privacy And Security](docs/privacy-security.md) for operational notes.

## Manual QA

See [Manual QA](docs/manual-qa.md) for the release smoke checklist covering edit flows, outline import, storage, presenter mode, and all export formats.

## License

MIT. See [LICENSE](LICENSE).
