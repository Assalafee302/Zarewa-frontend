# Zarewa frontend (SPA)

React + Vite UI. The API lives in the **`backend/`** package (sibling in this monorepo, or a separate clone). The backend imports some modules from **`src/lib/`** — keep this package co-located or see `backend/docs/DUAL_REPO_BACKEND.md`.

## Quick start

```bash
npm install
npm run dev
```

Run **`backend`** (`npm run server` in `../backend`) so `/api` proxies to `http://127.0.0.1:8787`, or set **`VITE_API_BASE`** to your API origin (see `.env.example`).

## Build (split deploy)

```bash
VITE_API_BASE=https://your-api-host npm run build
```

Deploy the `dist/` folder to static hosting with SPA fallback.

## Shared constants

[`docs/SYNC_FROM_BACKEND.md`](docs/SYNC_FROM_BACKEND.md) — keep `src/shared/*.js` aligned with the backend `shared/` folder.
