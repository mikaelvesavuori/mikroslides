# MikroSlides Lightweight Spec

Draft date: 2026-05-25

## One-Liner

MikroSlides is a local-only presentation app for making clean, useful decks without accounts, subscriptions, heavyweight office suites, or cloud lock-in.

## Product Intent

MikroSlides should feel like a small, excellent replacement for Keynote, Pitch, Gamma, and Google Slides when the user values ownership, speed, self-hosting, and local-only data more than enterprise collaboration machinery.

It should help someone go from "I need to explain this clearly" to "I have a polished deck I can present or export" without making them manage a workspace, wait on a slow app shell, or hand their material to a SaaS platform.

The spirit is:

- Keynote polish, but browser-native and ownable.
- Pitch structure and brand consistency, but without per-seat business machinery.
- Gamma speed from rough input to usable deck, but local-only by default and explicit about AI boundaries.
- Google Slides familiarity, but without assuming the cloud is the product.

## MikroSuite Fit

MikroSlides should inherit the MikroSuite rules:

- Static web app where possible.
- Local-only data in IndexedDB by default.
- Portable files as the source of long-term ownership.
- No account required for solo/local use.
- Clean modern UI with minimal interface noise.
- Fast load, small bundle, boring storage, understandable code.
- Free MIT software.
- Works online as a hosted static app and self-hosts as plain files.

MikroCanvas is the closest sibling. MikroSlides should use established Mikro visual UI and UX conventions as the baseline, then adapt only where slide authoring genuinely needs domain-specific changes.

- App shell with direct manipulation first.
- Compact top controls and floating context tools.
- Local library of user-created documents.
- Import/export as first-class actions.
- Command palette for fast access.
- Undo/redo as a basic expectation.
- Vanilla TypeScript architecture with domain/application/infrastructure/presentation boundaries.

MikroSlides should feel like it belongs in the same suite as MikroCanvas, not like a separate product with a presentation-app skin. Domain-specific changes are expected for slide thumbnails, fixed-ratio canvases, presenter mode, speaker notes, layouts, and export flows.

## Target Users

- Solo builders making pitch decks, product updates, talks, demos, lessons, and internal explainers.
- Small teams that want self-hosted presentation tooling without seat licenses.
- Consultants/freelancers who need client decks but do not want their work inside a SaaS.
- Teachers, developers, and community organizers who want simple decks that export cleanly.
- Privacy-conscious users who prefer explicit files over platform workspaces.

MVP should not overfit one presentation genre. The first release should serve general-purpose deck creation through strong defaults and a small layout set. If a narrower first audience becomes obvious later, tune the default templates and themes without changing the core product model.

## Core Promise

MikroSlides lets you make, present, and export a good-looking deck from your browser, while keeping the deck yours.

That means:

- Your work autosaves locally.
- Deck data stays local-only unless the user explicitly imports, exports, self-hosts, syncs through browser/profile features, or enables a remote integration.
- You can export a durable data-only `.mikroslides.json` file.
- You can export a full portable MikroSlides file that includes deck data and local assets.
- You can export a PDF for real-world sharing.
- You can export image assets for places that do not handle decks well.
- You can self-host the app without running a database or application server.

## Critical User Journeys

These journeys should shape MVP decisions more than a raw feature checklist.

### 1. Make A Useful Deck From Nothing

User opens MikroSlides, creates a deck, adds 8-12 slides, uses layouts, adds text/images/shapes, presents it, and exports PDF.

Success means:

- The user never needs docs.
- The deck looks decent before manual tweaking.
- Common edits are discoverable in the UI and command palette.
- Export matches the editor closely enough to trust.

### 2. Turn Notes Into Slides

User pastes a Markdown outline, MikroSlides creates a first deck, and the user edits from there.

Success means:

- The outline parser handles headings and bullets predictably.
- Generated slides are not visually embarrassing.
- The user can regenerate or reapply layout without losing all edits accidentally.

### 3. Keep A Deck With A Project

User exports a `.mikroslides.json` file, stores it in a project folder or repo, later imports it on another machine or host.

Success means:

- Import/export round-trips without data loss.
- The file format is versioned.
- Missing local fonts/assets are explained clearly.
- Self-contained export is available for important decks.

### 4. Present Reliably

User opens a deck, starts present mode, navigates with keyboard/click/touch, exits cleanly, and can export a PDF backup.

Success means:

- Present mode is fast and distraction-free.
- The current slide, next slide, and notes story has a credible path.
- The app does not depend on a network connection during presentation.

## Product Shape

MikroSlides is a slide editor, not a full design suite.

It has:

- A deck library.
- A slide navigator.
- A fixed-format slide canvas.
- A simple element toolbar.
- A context inspector for selected objects.
- A presentation mode.
- Import/export.
- A command palette.

It should avoid:

- A giant template marketplace.
- Deep enterprise permissions.
- Heavy plugin architecture in the core app.
- Default cloud storage.
- Analytics/tracking as a core product surface.
- Trying to exactly clone PowerPoint.

## Design Principles

### 0. Follow Mikro Conventions

MikroSlides should start from the shared Mikro product language:

- Quiet, focused app shell.
- Minimal chrome.
- Clear icon-first controls with labels/tooltips.
- Floating/contextual tools instead of always-visible panels when practical.
- Direct manipulation over wizard flows.
- Command palette for breadth without permanent UI weight.
- Local library plus explicit import/export.
- Light/dark theme support.
- Small, readable code organized around plain domain/application/infrastructure/presentation layers.

The app can diverge where the presentation domain demands it: slide thumbnails, fixed slide aspect ratios, layout presets, speaker notes, presenter mode, export fidelity, and theme typography are presentation-specific and should be optimized for that workflow.

### 1. Start Fast

Opening the app should land directly in the editor or the deck library. No dashboard theater. No marketing screen. No workspace selection unless a self-hosted team mode exists later.

### 2. Make The Default Deck Look Good

The app should protect users from ugly blank-slide syndrome. A new deck gets a restrained default theme, useful layouts, sensible type scale, good spacing, and low-friction image handling.

### 3. Let Power Users Stay On The Keyboard

Common actions should be available through shortcuts and a command palette:

- New slide
- Duplicate slide
- Delete slide
- Move slide up/down
- Add text/image/shape
- Present
- Export
- Toggle theme
- Search commands

### 4. Prefer Layout Help Over Template Sprawl

Instead of hundreds of templates, ship a small set of excellent layouts:

- Title
- Section
- Statement
- Bullets
- Two-column
- Image left/right
- Quote
- Comparison
- Timeline
- Chart/data
- Closing

Users should be able to swap layout without destroying content where practical.

### 5. Files Are The Escape Hatch

The durable format is not a SaaS record. It is an ordinary exported file.

The native file should be JSON, versioned, readable, and stable enough to keep next to a project.

## MVP Scope

### Browser Support

MVP should target the latest stable versions of:

- Chrome/Chromium
- Edge
- Safari
- Firefox

The primary development target can be Chromium, but export and present mode should be checked in Safari because many Mac users will expect Keynote-adjacent polish there.

Mobile and tablet should be able to view and present decks. Full authoring can be desktop-first for MVP.

### Deck Library

MVP should include:

- Create deck
- Rename deck
- Duplicate deck
- Delete deck
- Open recent decks
- Import `.mikroslides.json`
- Export `.mikroslides.json`
- Sort by updated date

Storage:

- IndexedDB database: `mikroslides`
- Object store: `decks`
- Browser origin scoped, documented clearly

### Editor Layout

Recommended first screen:

- Left rail: slide thumbnails
- Center: slide canvas
- Top bar: deck title, present, import/export, theme toggle, library
- Bottom/right floating controls: zoom, undo/redo, grid/guides if useful
- Context toolbar/inspector appears only when something is selected

Keep chrome light. The deck is the product.

### Slide Model

Each deck contains:

- `id`
- `title`
- `theme`
- `slides`
- `createdAt`
- `updatedAt`
- `version`

Each slide contains:

- `id`
- `title`
- `layout`
- `background`
- `elements`
- `notes`
- `transition`

Each element contains:

- `id`
- `type`
- `x`
- `y`
- `width`
- `height`
- `rotation`
- `style`
- type-specific content

Supported MVP element types:

- Text box
- Shape
- Image
- Line/arrow
- Simple table
- Code block
- Speaker note on slide, stored separately from the visible canvas

Nice-to-have MVP element types if implementation is already near:

- Chart from pasted CSV/table data
- Icon/symbol
- Callout

### Slide Canvas

MVP should support:

- 16:9 default aspect ratio
- 4:3 and square as deck-level options
- Select, drag, resize, rotate
- Multi-select
- Copy, cut, paste
- Duplicate
- Delete
- Bring forward/back
- Align left/center/right/top/middle/bottom
- Distribute horizontally/vertically
- Snap to slide bounds, center lines, and nearby objects
- Optional grid/guides
- Zoom in/out/fit

### Text Editing

MVP should support:

- Inline text editing
- Font family from safe local stack
- Font size
- Bold, italic
- Text color
- Alignment
- Lists
- Basic line height
- Links

Avoid rich text complexity that makes export unreliable. A constrained model beats a broken miniature word processor.

### Styling

MVP should support:

- Theme colors
- Slide background color/image
- Shape fill/stroke
- Text color
- Border width
- Corner radius
- Opacity
- Reusable deck theme

Themes should be few and good:

- Clean light
- Clean dark
- Editorial
- Technical
- Warm neutral
- High contrast

The theme system should be data, not hardcoded CSS assumptions.

### Fonts

MikroSlides should default to system fonts. The core app should not package fonts and should not silently load third-party font providers.

Font selection should use three tiers:

1. Curated system font stacks.
2. Custom local font names.
3. Optional imported or remotely hosted fonts.

Default font choices should be small and understandable:

- System Sans
- System Serif
- System Mono
- Humanist Sans
- Editorial Serif
- Technical Mono

These should be stored as theme tokens rather than raw UI-only choices:

```json
{
  "fontHeading": "system-sans",
  "fontBody": "system-sans",
  "fontMono": "system-mono"
}
```

Advanced users should be able to type a custom font family name such as `Aptos`, `Avenir Next`, or `Inter`. If the font is installed on the current system, the browser can use it. If not, MikroSlides should fall back to the deck theme's default stack.

For higher-fidelity brand decks, support user-imported font files:

- `.woff2`
- `.woff`
- `.ttf`
- `.otf`

Imported fonts should be stored as local deck assets in IndexedDB and included in full portable MikroSlides exports. This keeps brand-sensitive decks portable without making MikroSlides distribute fonts or depend on a remote provider. Data-only JSON exports can omit font payloads, but should warn that re-importing elsewhere may require the user to provide those font files again.

Remote fonts may be supported, but only as an explicit opt-in:

```json
{
  "remoteFonts": {
    "enabled": false,
    "allowedProviders": ["https://fonts.example.eu/catalog.json"]
  }
}
```

Provider preference:

1. Same-origin/self-hosted fonts.
2. User-imported fonts stored with the deck.
3. EU-hosted privacy-focused font provider, opt-in.
4. Google Fonts direct loading, discouraged.

Remote fonts should never load silently. Font requests can disclose network metadata such as IP address, requested URL, user agent, and referrer. This makes automatic third-party font loading a poor fit for MikroSuite's local-only privacy posture.

Export behavior:

- PDF, PNG, and HTML export should wait for fonts to load before rendering.
- If a referenced font is unavailable, export should use the resolved fallback stack.
- The export UI should warn when a deck references unavailable local or remote fonts.

### Images And Media

MVP should support:

- Add local image
- Store image as a data URL or Blob reference in IndexedDB
- Crop/fill/fit
- Replace image
- Alt text

Post-MVP:

- Video embed
- YouTube/Vimeo embed for browser presentations
- Audio

Media should not silently upload anywhere.

### Accessibility

MVP should include basic accessibility rather than treat it as a later rewrite.

Required:

- Keyboard navigation for deck library, slide list, command palette, dialogs, and present mode.
- Visible focus states.
- Buttons with clear labels/tooltips.
- Alt text for images.
- Sufficient contrast in built-in themes.
- Reduced-motion support for transitions.
- PDF export that preserves readable text where practical.

Post-MVP:

- Better slide reading order controls.
- Accessibility checker for missing alt text and low contrast.
- Presenter captions or transcript support if audio/video enters the product.

### Privacy And Security

MikroSlides should document privacy boundaries as clearly as MikroCanvas.

Default behavior:

- No account.
- No MikroSlides service receives deck data.
- Decks stay in IndexedDB for the current browser profile and origin.
- MikroSlides is local-only by default, not merely local-first.
- Data leaves the browser only through explicit import/export, self-hosting infrastructure, browser sync features, or opt-in remote integrations.
- Any feature that could send deck content or asset metadata over the network must be visibly opt-in.

Security posture:

- Imported JSON should be parsed and normalized, not blindly executed.
- Imported SVG should be sanitized or rasterized before use.
- Remote fonts/assets should be opt-in and visibly configured.
- Standalone HTML export should avoid executable user-provided scripts.

### Reliability And Recovery

MVP should make local-only software feel safe, not fragile.

Required:

- Autosave after edits.
- Undo/redo for slide edits.
- Clear import/export affordances.
- JSON export as backup habit.
- Friendly storage-unavailable state.
- Friendly corrupted-import state.
- File format versioning and migration path.

Nice to have:

- "Export all decks" backup.
- Recent local snapshots per deck.
- Duplicate-before-import option when replacing an existing deck.

### Present Mode

MVP should support:

- Fullscreen presentation
- Keyboard navigation
- Click/tap navigation
- Current slide number
- Escape to editor
- Hide editor chrome

This is enough for v1. Presenter view, timer, next-slide preview, and similar confidence features are valuable, but they should not block the first serious release.

P1 should add:

- Presenter view in a second window
- Speaker notes
- Timer
- Next slide preview
- Black screen
- Pointer/spotlight

Keynote is strong here. MikroSlides does not need all of Keynote, but presenter confidence matters.

### Export

MVP export:

- Data-only `.mikroslides.json` for editable deck data
- Full portable MikroSlides file for deck data plus local assets such as images and imported fonts
- PDF for sharing/presenting outside the app
- PNG export for current slide
- PNG zip for all slides if lightweight enough
- Standalone HTML presentation if feasible without much bundle weight

P1/P2 export:

- SVG per slide
- PPTX export

Important note on PPTX:

PPTX compatibility is strategically important but should not bloat the core app or force a fragile implementation too early. Treat it as an optional adapter if it cannot stay small and reliable. PDF plus native MikroSlides files can carry v1.

### Export Fidelity Contract

Exports are part of the core promise, not an afterthought.

For MVP:

- PDF export should be considered the canonical share format.
- PDF output should match slide size, background, text, images, and basic shapes.
- PNG export should match the visible slide.
- Data-only JSON export should round-trip every editable property that does not depend on external/local assets.
- Full portable MikroSlides export should round-trip deck data and local assets.
- HTML export, if included, should be view/present oriented rather than a second editor.

Known acceptable MVP limits:

- Font rendering may vary when using system or unavailable local fonts.
- Advanced transitions may be omitted from PDF/PNG.
- PPTX is explicitly not required for v1.

The app should surface these limits in plain language when exporting.

### Import

MVP import:

- `.mikroslides.json`
- Images
- Pasted text
- Pasted Markdown as slide outline

P1 import:

- Markdown file to deck
- CSV/table paste into table/chart
- Existing MikroCanvas board as image or linked object

P2 import:

- PPTX import
- Google Slides import via PPTX

### Outline Mode

This is one of the highest-leverage features.

MVP should let the user create a deck from plain text:

```text
# Launch Plan

## Why now
- Customer demand
- Internal readiness

## What changes
- New onboarding
- Better reporting

## Next steps
- Pilot
- Measure
- Roll out
```

The app turns this into:

- Title slide from H1
- One slide per H2
- Bullets as slide body
- Default layouts applied automatically

This gives MikroSlides some Gamma-like speed without requiring AI.

### Command Palette

Borrow the MikroCanvas pattern. MVP commands:

- New deck
- Open decks
- New slide
- Duplicate slide
- Delete slide
- Move slide up/down
- Add text
- Add image
- Add shape
- Add speaker notes
- Present
- Export JSON
- Export PDF
- Toggle theme
- Zoom to fit
- Undo/redo

### Keyboard Shortcuts

Baseline:

- `Cmd/Ctrl+Z`: undo
- `Cmd/Ctrl+Shift+Z`: redo
- `Cmd/Ctrl+C/X/V`: copy/cut/paste
- `Cmd/Ctrl+D`: duplicate
- `Delete/Backspace`: delete
- `Cmd/Ctrl+A`: select all elements on current slide
- `Cmd/Ctrl+K`: add/edit link
- `Cmd/Ctrl+Enter`: present
- `Cmd/Ctrl+P`: export/print PDF
- `/` or `Cmd/Ctrl+K` if not reserved: command palette
- Arrow keys: nudge
- Shift+arrow: larger nudge

## Competitive Learnings

### Keynote

What to learn:

- Presentations should feel polished by default.
- Themes and transitions matter, but only if they do not slow the editor down.
- Presenter view, notes, rehearsal/timer, and remote-presenting details create confidence.
- Shape and media handling should feel precise.

MikroSlides response:

- Small set of tasteful themes and layouts.
- Excellent PDF export.
- Presenter mode that feels calm and reliable.
- Minimal transitions: none, fade, slide, maybe zoom.

### Pitch

What to learn:

- Modern business decks need brand consistency, templates, comments, sharing, and analytics.
- Teams care about external guests and asset libraries.
- Business workflows are often about reusing the same deck structure.

MikroSlides response:

- Local reusable themes and deck templates.
- A small asset library stored locally per origin.
- Optional self-hosted/team mode later, but not required for solo/local.
- No analytics by default. If sharing analytics ever exists, it must be explicit and self-hosted.

### Gamma

What to learn:

- Users love getting a solid first draft from rough notes.
- Card-based thinking helps people avoid overstuffed slides.
- AI can help with structure, rewriting, and visual suggestions.
- Export still matters because people need to leave the tool.

MikroSlides response:

- Markdown/outline-to-deck as a non-AI fast path.
- No AI for v1.
- Layout suggestions, not magic lock-in.
- Native JSON plus PDF from day one.

### Google Slides

What to learn:

- Browser-native collaboration became the baseline for many users.
- Comments, sharing permissions, templates, import/export, and offline access are expected.
- Users expect familiar editing behavior more than novelty.

MikroSlides response:

- Familiar slide navigator/canvas/toolbar model.
- Comments can be local annotations first.
- Collaboration can be optional self-hosted sync later.
- Offline/local behavior is a strength, not an afterthought.

## Non-Goals For MVP

- Real-time multiplayer editing.
- Enterprise SSO and admin dashboards.
- Viewer analytics.
- Template marketplace.
- Full PowerPoint parity.
- Advanced animation timelines.
- Complex video/audio editing.
- Cloud asset hosting.
- AI generation.

## P1 Features

After the MVP feels stable:

- Presenter view with notes/timer/next slide.
- Markdown import/export.
- Reusable deck templates.
- Local asset library.
- Comments per slide/object.
- SVG export.
- Basic charts.
- Better image crop/mask tools.
- Theme editor.
- Slide master/layout editor, kept simple.
- Standalone HTML export.

## P2 Features

Later, if demand is real:

- PPTX export/import.
- Optional collaborative self-hosted mode.
- Share links from a self-hosted instance.
- Explicit self-hosted view analytics.
- Optional local/BYOK AI assistant only if it fits the local-only posture and real user demand appears.
- Remote presenter controls.
- Embeds for browser-only decks.
- MikroCanvas element import.

## Architecture Sketch

Follow the MikroCanvas structure:

```text
src/
  application/
    services/
    ports/
  domain/
    entities/
    services/
  infrastructure/
    persistence/
  interfaces/
  presentation/
  shared/
  ui/
```

Likely domain entities:

- `Deck`
- `Slide`
- `SlideElement`
- `Theme`
- `DeckTemplate`

Likely services:

- `DeckService`
- `SlideCommandService`
- `ExportService`
- `OutlineImportService`
- `ThemeService`

Persistence:

- `IndexedDbDeckRepository`

Presentation controllers:

- `SlidePointerController`
- `ViewportController`
- `KeyboardController`
- `CommandPalette`
- `InlineEditorController`
- `SlideListController`
- `ExportMenu`
- `PresenterController`

## Data Format Sketch

```json
{
  "format": "mikroslides",
  "version": 1,
  "deck": {
    "id": "deck_...",
    "title": "Untitled deck",
    "aspectRatio": "16:9",
    "theme": {
      "id": "clean-light",
      "tokens": {
        "background": "#f8fafc",
        "surface": "#ffffff",
        "text": "#1e293b",
        "muted": "#64748b",
        "accent": "#1665d8"
      }
    },
    "slides": [
      {
        "id": "slide_...",
        "title": "Opening",
        "layout": "title",
        "background": { "type": "theme" },
        "notes": "",
        "transition": "none",
        "elements": []
      }
    ],
    "createdAt": "2026-05-25T00:00:00.000Z",
    "updatedAt": "2026-05-25T00:00:00.000Z"
  }
}
```

## Quality Bar

MVP is good enough when:

- A user can make a clean 8-12 slide deck without reading docs.
- The first deck looks decent without manual styling.
- Editing text and moving objects feels immediate.
- PDF export looks like the editor.
- JSON export/import round-trips without data loss.
- Present mode is reliable.
- The app can be hosted as static files.
- Local data boundaries are documented clearly.

## Recommended Technical Bets

These are the calls I would make unless the existing MikroSlides code strongly suggests otherwise.

### Rendering

Use an HTML/CSS slide surface with absolutely positioned elements, plus inline SVG for shapes, arrows, and selection overlays where SVG is clearly better.

Why:

- Browser print/PDF export becomes more predictable.
- Text rendering matches the editor more closely.
- HTML export becomes natural.
- SVG can still handle crisp shapes and line work.
- The model stays easier to inspect than a canvas-only renderer.

### PDF First, PPTX Later

Make PDF export excellent before chasing PPTX. PPTX matters for compatibility, but bad PPTX export damages trust faster than no PPTX export. Keep PPTX as an adapter, optional package, or later milestone if it threatens the small static core. V1 can ship with PDF plus native MikroSlides exports.

### Outline Instead Of AI For V1

Build Markdown/outline-to-deck instead of AI generation for v1. It gives users a Gamma-like fast start while staying local, simple, testable, and provider-free.

### Native Export Files

Offer two native export paths:

- Data-only JSON for editable deck data.
- Full portable MikroSlides file for deck data plus local assets such as images and imported fonts.

This matches the broader Mikro pattern of separating data export from the full normal app file.

### Images

Store images in IndexedDB as local assets associated with a deck. Full portable export should include those assets; data-only JSON can reference them but should clearly warn when a re-import will not have the asset payload.

### Tests

Focus early tests on:

- Deck import/export round trips.
- Command service behavior.
- Layout-to-element generation from outlines.
- Theme token application.
- PDF/print rendering smoke checks.
- Presenter mode keyboard navigation.
- UI convention checks against MikroCanvas/MikroSuite patterns before introducing new interaction models.

## Performance Budget

MikroSlides should feel instant in the MikroSuite way.

Targets:

- Static release archive stays small enough to host and inspect comfortably.
- Initial editor load should feel immediate on a normal laptop.
- Editing should stay responsive with a 50-slide deck.
- Present mode should switch slides without visible jank for normal decks.
- Export should show progress for long decks rather than freeze without feedback.

Practical guardrails:

- Keep heavy optional features out of the core bundle where possible.
- Lazy-load export adapters and optional provider integrations.
- Avoid framework-sized dependencies unless they remove more complexity than they add.
- Treat large images as assets that may need compression or warnings.

## Release Criteria

A first public release should include:

- README with local-only promise, quick start, and export story.
- Docs for local data, import/export, deployment, and privacy/security.
- One screenshot that reflects the real app.
- MIT license.
- Static release archive.
- Basic icon/manifest/PWA metadata.
- Test coverage for deck model, persistence, command behavior, import/export, and outline import.
- Manual QA checklist for create/edit/present/export/import.

## Open Questions

- Does the existing MikroSlides implementation already have a renderer worth keeping, even if it differs from the HTML/CSS plus SVG recommendation?
- Which MikroCanvas/MikroSuite UI and UX conventions should be represented most directly in the initial implementation?
- What file extension should the full portable MikroSlides file use if data-only export remains `.mikroslides.json`?
- Should full portable exports be a zipped bundle, a JSON envelope with embedded assets, or another simple file format?
- Which first-run templates best serve a broad target audience without overfitting one deck genre?
- Should comments be visible objects on slides, sidebar notes, or both?

## Suggested Build Order

1. Deck model, IndexedDB repository, deck library.
2. Slide model, slide navigator, title editing.
3. Fixed-ratio slide canvas with text boxes.
4. Basic elements: shapes, images, lines.
5. Selection, drag, resize, reorder, duplicate, delete.
6. Undo/redo.
7. Context styling controls.
8. Theme tokens and 3-5 themes.
9. JSON import/export.
10. Present mode.
11. PDF export.
12. Outline-to-deck.
13. Command palette.
14. Polish pass with keyboard shortcuts, empty states, docs, and screenshots.

## Positioning Copy

Short version:

> MikroSlides is a local-only presentation app for clean decks you can own, export, and self-host.

Slightly longer:

> Make polished presentations in the browser without a workspace, account, or subscription. MikroSlides stores decks locally, exports portable files, and runs as a tiny static app you can host yourself.

README-style:

> MikroSlides is a lightweight local-only presentation app for creating, presenting, and exporting clean slide decks. It stores decks in browser storage, exports portable JSON and PDF files, and runs as static HTML, CSS, and JavaScript.

## Reference Links

- MikroSuite: <https://mikrosuite.com/>
- MikroCanvas local reference: `/Users/mikaelvesavuori/Code/mikrocanvas`
- Apple iWork/Keynote overview: <https://www.apple.com/iwork/>
- Apple Keynote support: <https://support.apple.com/keynote>
- Google Slides: <https://workspace.google.com/products/slides/>
- Pitch pricing/features: <https://pitch.com/pricing/us>
- Pitch templates: <https://pitch.com/templates/collections/Product>
- Gamma presentations: <https://gamma.app/products/presentations>
- Gamma export help: <https://help.gamma.app/fr/articles/8022861>
- MDN `@font-face`: <https://developer.mozilla.org/docs/Web/CSS/Reference/At-rules/%40font-face>
- MDN CSS Font Loading API: <https://developer.mozilla.org/en-US/docs/Web/API/CSS_Font_Loading_API>
- Bunny Fonts: <https://fonts.bunny.net/about>
- Fontsource self-hosted fonts: <https://fontsource.org/docs>
