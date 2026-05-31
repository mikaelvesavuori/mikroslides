# Privacy And Security

MikroSlides is designed as a local-first browser app. There is no account system and no application backend in the current product.

## Local Storage

- Decks are stored in browser IndexedDB.
- Saved slide templates, focus-mode preference, active deck id, and recovery drafts are stored in localStorage.
- Clearing browser site data removes local decks and preferences.

## Network Access

- The app shell can be served from any static host.
- A deck can reference remote image URLs. The browser loads those images when the slide renders.
- Portable export and PNG export may fetch remote image URLs already present in the deck to embed or render them.
- The app does not send deck data to a MikroSlides service.

## File Exports

- `.mikroslides.json` contains editable deck data.
- `.mikroslides` contains editable deck data plus embedded image assets where available.
- PNG export renders the current slide in the browser.
- PDF export uses the browser print/save-to-PDF flow.

## Operational Notes

- Treat exported files as containing the full deck content, including speaker notes and embedded images.
- Review remote image usage before sharing portable files if the source URL itself is sensitive.
- For shared or managed machines, use a separate browser profile or clear site data after use.
