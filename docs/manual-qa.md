# Manual QA

Use this checklist before tagging a build or deploying a preview.

## Setup

- Run `npm run verify`.
- Run `npm run smoke:ui`.
- Run `PORT=4175 npm run dev:web`.
- Open `http://127.0.0.1:4175` in Chromium and one secondary browser.

## Core Editing

- Create a new deck and rename it.
- Add, duplicate, reorder, skip/show, copy, paste, and delete slides from the left rail.
- Confirm the slide rail scrolls without thumbnail overlap at short viewport heights.
- Add text, shape, and image objects.
- Drag, resize, duplicate, delete, copy, paste, and keyboard-nudge objects.
- Hold Shift while dragging an object and confirm movement constrains to one axis.
- Hold Option/Alt while dragging an object and confirm it duplicates before moving.
- Double-click text to edit; single-click edited text again and confirm it selects the object instead of staying in text editing mode.
- Press Backspace while editing text and confirm the object is not deleted.
- Multi-select objects and align left, center, right, top, middle, and bottom.
- Move objects front, forward, backward, and back.
- Verify undo and redo across slide and object edits.
- Change deck aspect ratio to 16:9, 4:3, and 1:1.
- Change deck theme and slide background.
- Manage fonts, import a local font, and apply it to text.
- Zoom out, fit, and in; verify the canvas remains scrollable and selectable.
- Run Polish deck and verify layout, spacing, and type scale improve without losing slide content.

## Layouts And Templates

- Apply every built-in layout from the toolbar.
- Confirm the layout selector shows the current layout without duplicating the selected option.
- Save the current slide as a template and apply it to another slide.
- Reload the app and confirm the saved template is still available.

## Import

- Import a Markdown outline with headings, bullets, and speaker-note-like paragraphs.
- Confirm imported outlines choose varied layouts for timelines, metrics, quotes, statements, and ordinary bullets.
- Import a `.mikroslides.json` file exported by the current build.
- Import a `.mikroslides` portable file exported by the current build.
- Try importing raw deck JSON without a MikroSlides envelope and confirm it is rejected.

## Export

- Open the export dialog from the header.
- Export JSON and import it back into a clean browser profile.
- Export portable with a local image and confirm the image survives re-import.
- Export portable with a local font and confirm the font survives re-import.
- Export portable with a remote image URL and confirm the export completes with a clear toast if the image cannot be fetched.
- Export PDF through the browser print flow and inspect page size for the selected aspect ratio.
- Export PNG for the current slide and verify the image is not blank and has no selection handles.

## Presenter Mode

- Start presenter mode from the header, command palette, and `Cmd/Ctrl+Enter`.
- Navigate with buttons, click, arrow keys, page keys, and space.
- Confirm skipped slides are excluded from navigation and the presenter count.
- Exit with Escape.

## Storage And Recovery

- Reload after an autosave and confirm the latest deck opens.
- Make an edit, reload before autosave, and confirm recovery draft behavior.
- Duplicate and delete a deck from the library.
- Search library by deck title, notes, and text object content.

## Responsive Smoke

- Verify desktop, tablet-width, mobile-width, and short-height layouts.
- Confirm dialogs fit within the viewport.
- Confirm toolbar text and icon controls do not overlap.
- Confirm the top bar remains centered and less than full viewport width on desktop.
