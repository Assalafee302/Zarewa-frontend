# Zarewa frontend

Single-page application for Zarewa: **React 19**, **Vite 8**, **React Router 7**, **Tailwind CSS 4**, **Firebase** (Auth, Firestore, Storage, Functions, optional Analytics), and **Vitest** for unit tests. The UI talks to a separate HTTP API under `/api` (proxied in dev, or pointed at with `VITE_API_BASE` in production).

If you use the full monorepo, the API lives in the sibling **`backend/`** package. The backend may import shared logic from this repo’s **`src/lib/`** — keep the frontend co-located with that backend, or follow **`../backend/docs/DUAL_REPO_BACKEND.md`** when the backend is a separate clone.

---

## Prerequisites

- **Node.js**: use a current **LTS** release (Vite 8 and the toolchain expect a modern Node; if installs or dev fail, upgrade Node first).
- **npm** (ships with Node).
- **Backend** (for real data in development): run the API so it listens on **`127.0.0.1:8787`** unless you override the port (see below).

---

## Quick start (development)

```bash
npm install
cp .env.example .env.local   # then edit with your Firebase + optional API settings
npm run dev
```

- **Vite** serves the app (default **http://localhost:5173** unless the port is taken).
- Requests to **`/api`** are **proxied** to `http://127.0.0.1:${E2E_API_PORT || 8787}` (see `vite.config.js`). Start your backend (for example `npm run server` in `../backend`) so the API is reachable on that port.
- If the API runs on another host or port, set **`VITE_API_BASE`** to the full origin (e.g. `http://127.0.0.1:9000`) so `apiFetch` uses that instead of same-origin `/api`.

### Environment files

| File | Purpose |
|------|--------|
| **`.env.example`** | Documented template; safe to commit. |
| **`.env.local`**, **`.env`** | Local overrides; **do not commit** secrets. Vite loads `.env`, `.env.local`, `.env.[mode]`, etc. ([Vite env precedence](https://vite.dev/guide/env-and-mode.html)). |

Variables must be prefixed with **`VITE_`** to be exposed to the browser.

**Firebase (recommended for sign-in and app features)**  
Copy the Web App config from Firebase Console → Project settings → Your apps. Required keys are listed in `.env.example`. If they are missing, the app still runs but **Google sign-in is disabled** (see `src/lib/firebase.js`).

**Optional**

- **`VITE_FIREBASE_FUNCTIONS_REGION`** — Cloud Functions region when not using the default.
- **`VITE_FIREBASE_USE_EMULATORS`**, **`VITE_FIREBASE_EMULATOR_HOST`** — point Auth, Firestore, Storage, and Functions at local [Firebase emulators](https://firebase.google.com/docs/emulator-suite).
- **`E2E_API_PORT`** — only for tooling/tests that need the Vite proxy to target a non-8787 API port.

---

## npm scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server (HMR, `/api` proxy). |
| `npm run build` | Production build to **`dist/`**. |
| `npm run preview` | Serve **`dist/`** locally (uses the same `/api` proxy as dev). |
| `npm run lint` | ESLint over `src/**/*.{js,jsx}`. |
| `npm run test` | Run Vitest once. |
| `npm run test:watch` | Vitest watch mode. |
| `npm run test:critical-lib` | Focused tests for shared `src/lib` modules. |
| `npm run verify:ci` | **`lint` + `build`** — useful in CI or before a release. |

---

## Production build and deploy

### Build

Environment values are **baked in at build time**. Set everything the browser needs before `npm run build`:

```bash
VITE_API_BASE=https://api.yourdomain.com npm run build
```

- **`VITE_API_BASE`**: set to your **public API origin** (no trailing slash). The app calls `apiUrl('/api/...')` from `src/lib/apiBase.js`, so the final request base is this origin plus path.
- **Omit `VITE_API_BASE`** only if the static site and API share the **same origin** (e.g. API behind the same domain and reverse proxy that serves `/api`). Otherwise the browser cannot reach a different host without an explicit base URL.
- **Firebase `VITE_*` variables** must match the **production** Firebase project (or the project you intend to use in that environment).

Output: **`dist/`** — static assets only.

### Hosting

1. Upload **`dist/`** to your static host (S3+CloudFront, Netlify, Vercel, nginx, etc.).
2. Configure **SPA fallback**: every path that is not a static file should serve **`index.html`** so client-side routing works.
3. Ensure **HTTPS** in production; Firebase Auth and secure cookies expect a real TLS context.
4. **Cookies and CORS**: the client uses **`credentials: 'include'`** and CSRF via the `zarewa_csrf` cookie (`src/lib/apiFetch`). Your API and CDN must allow the production web origin, credentials, and any required headers — align this with how the backend is deployed.

### Smoke-check locally after build

```bash
npm run build && npm run preview
```

Point `VITE_API_BASE` (or the preview proxy target) at a running API to verify end-to-end.

---

## Shared constants with the backend

Some values are duplicated under **`src/shared/`** so the frontend can ship standalone. Before releases, sync with the backend **`shared/`** tree — see **[`docs/SYNC_FROM_BACKEND.md`](docs/SYNC_FROM_BACKEND.md)**.

---

## Troubleshooting

| Symptom | Things to check |
|--------|-------------------|
| API returns HTML / “route not found” | Backend version and routes; dev: API on **8787** (or set **`E2E_API_PORT`** / **`VITE_API_BASE`**). |
| Sign-in missing | Fill all required **`VITE_FIREBASE_*`** keys in `.env.local`. |
| Works on laptop but not phone on LAN | Vite is started with **`host: true`**; use your machine’s LAN IP and ensure the API allows that origin if not using the proxy. |
| Production build missing env | Rebuild with the correct **`VITE_*`** vars in the CI or deploy environment; they are not read from the server at runtime. |

---

## Project layout (high level)

- **`src/`** — application code (routes, components, hooks).
- **`src/lib/`** — API helpers, Firebase bootstrap, domain logic shared with backend in monorepo setups.
- **`src/shared/`** — constants kept in sync with backend (see docs above).
- **`vite.config.js`** — dev/preview proxy, Vitest (`jsdom`, `src/test/setup.js`).

For deeper API and dual-repo layout, refer to the **backend** repository’s documentation.
