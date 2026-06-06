# Deployment

MikroSlides is a static browser app. Build it once and serve the files in `dist/` from any host that can serve HTML, CSS, and JavaScript.

## Build

```bash
npm install
npm run build
```

The production app is written to `dist/`.

## Static Hosting

Serve `dist/` with a static server. For a quick local check:

```bash
npx http-server dist -a 127.0.0.1 -p 8000 -c-1
```

Open `http://127.0.0.1:8000`.

## Cloudflare

The repository includes `wrangler.toml` configured for Cloudflare static assets.

```bash
npm run deploy:cloudflare
```

The deploy command runs the full verification suite before publishing.

## Runtime Notes

MikroSlides does not need a database, auth service, API token, or server-side session. Browser storage is scoped to the deployed origin, so decks created on one host do not automatically appear on another host.

If you move between hosts or browser profiles, export a deck file and import it on the new origin.
