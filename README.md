# MikroSlides

**Local-first presentation decks without the SaaS ceremony.**

MikroSlides is a minimalist presentation editor for modern browsers. It keeps decks in browser storage by default, gives you a focused slide canvas, and exports portable files, images, and PDFs when you need to move work elsewhere.

_Use MikroSlides online for free at [slides.mikrosuite.com](https://slides.mikrosuite.com). It runs over HTTPS, needs no account, and stores decks privately in browser storage for that site unless you export them._

## Why MikroSlides

- **Own the deck**: decks stay in browser-local storage until you export JSON, portable MikroSlides files, PNG, or PDF.
- **Work directly**: add slides, text, shapes, images, notes, and layouts without a heavy workspace model.
- **Move quickly**: start from Markdown outlines, reuse slide templates, and polish spacing locally.
- **Present simply**: hide slides, keep speaker notes, and run a local presenter view from the browser.
- **Deploy easily**: the app is static HTML, CSS, and JavaScript.

## Features

- **Local-first deck library** with IndexedDB persistence, rename, duplicate, delete, import, and recovery draft flows
- **Slide rail** with add, reorder, duplicate, copy, paste, delete, and skip/show slide controls
- **Responsive editor** for 16:9, 4:3, and square decks
- **Object editing** for text, shapes, and images with drag, resize, align, layer, duplicate, copy, paste, delete, and keyboard nudging
- **Familiar canvas gestures** including Shift-drag axis constraint and Option/Alt-drag duplication
- **Text editing** by double-click, with normal object selection and resizing on single click
- **Built-in slide layouts** plus saved local templates
- **Markdown outline import** for turning notes into a first deck
- **Local polish pass** that tightens layout, spacing, color, and type scale
- **Speaker notes and presentation mode** with skipped slides excluded
- **Theme, aspect ratio, slide background, and font controls**
- **JSON, portable `.mikroslides`, PDF, and current-slide PNG export**
- **Static deployment** for any host that can serve the built files

## Quick Start

Open [slides.mikrosuite.com](https://slides.mikrosuite.com) to use MikroSlides immediately, securely, and without an account.

### Download the App

```bash
curl -sSL -o mikroslides.zip https://releases.mikrosuite.com/mikroslides_latest.zip
unzip mikroslides.zip -d mikroslides
```

Serve the extracted files with any static web server. For a quick local check:

```bash
cd mikroslides/*
npx http-server . -a 127.0.0.1 -p 8000 -c-1
```

Open `http://127.0.0.1:8000`.

## Using MikroSlides

- [Docs home](docs/index.md)
- [Create your first deck](docs/first-deck.md)
- [Edit and present decks](docs/editing-and-presenting.md)
- [Import and export](docs/import-export.md)
- [Local data and backups](docs/local-data.md)
- [Deployment](docs/deployment.md)
- [Privacy and security](docs/privacy-security.md)

## Runtime Configuration

MikroSlides is a static local-first app. It does not need server credentials, an account system, or runtime secrets. Decks, templates, and recovery drafts are stored in the current browser profile for the current origin.

Browser deployments use download-based import and export. A static host is enough for the app shell; remote image URLs inside a deck are loaded by the browser when the slide renders.

## Development

```bash
npm install
npm run dev:web
```

Open `http://127.0.0.1:4175`.

Run the full local check before shipping:

```bash
npm run verify
npm run smoke:ui
```

## Release Downloads

Latest release download:

- `https://releases.mikrosuite.com/mikroslides_latest.zip`

GitHub Releases provide versioned archives for pinned deployments.

## Technology

- **Frontend**: Vanilla HTML, CSS, and TypeScript compiled with esbuild
- **Storage**: IndexedDB and localStorage for browser-local decks and preferences
- **Export**: Editable MikroSlides JSON, portable deck bundles, browser PDF, and client-side PNG
- **Build**: Prebuilt static release archive

## License

MIT. See [LICENSE](./LICENSE).
