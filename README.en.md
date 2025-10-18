Language: [中文](README.zh-CN.md) | [English](README.en.md)

## AIOC Frontend (Vue 3 + Vite)

This is an AI platform based on Spring Boot 3 and Vue 3, integrating AI Chat, Image Generation, Video Generation, AI PPT creation, and membership top-up features.

- Backend repo: https://github.com/WangJunqing-coder/AIOC
- Frontend repo: https://github.com/WangJunqing-coder/AIOC

## Prerequisites

- Node.js 20.x or 22.x (engines specified in `package.json`)
- npm (or a compatible package manager)

## Quick Start (Windows cmd)

1) Install dependencies

```bat
npm install
```

2) Configure backend base URL (optional)

Default backend is `http://localhost:8080`. To change it, create `.env.development` and set:

```env
VITE_API_BASE=http://127.0.0.1:8080
```

Proxy is configured in `vite.config.js`: requests starting with `/api` will be forwarded to `VITE_API_BASE`.

3) Start dev server

```bat
npm run dev
```

You will see local URL like `http://localhost:5173/`.

## Build & Preview

```bat
npm run build
npm run preview
```

Artifacts are in `dist/` and can be deployed to any static host (Nginx, static site hosting, etc.).

## API & Auth Conventions

- Axios baseURL: `import.meta.env.VITE_API_BASE || http://localhost:8080`
- Header: after login, `Authorization: Bearer <token>` is attached automatically (see `src/api/http.js`)
- Unified response: when backend returns `{ code, message, data }`, the client unwraps it and shows message when appropriate
- 401 handling: clears local token; router guard may redirect to login (already handled in this project)

## FAQ

- 404 or CORS: ensure backend is up and ports match; use proxy in dev (configured in `vite.config.js`).
- Protected pages inaccessible: login first; check if token is saved in `localStorage`.
- Style issues: verify Element Plus version and CSS imports; try clearing cache.
- Different env base URLs: create `.env.development`, `.env.production`, etc., and set `VITE_API_BASE` accordingly.

## Directory Structure (brief)

```
front/
├── public/
├── src/
│   ├── api/           # http wrapper and modular APIs
│   ├── layouts/
│   ├── pages/
│   ├── router/
│   ├── stores/
│   ├── styles/
│   └── main.js / App.vue
├── index.html
├── vite.config.js
└── package.json
```

## Deployment Guide (example)

1) Deploy backend on a server and configure Nginx reverse proxy to port 8080;
2) Run `npm run build` and upload `dist/` to Nginx static root;
3) In Nginx, proxy `/api` to the backend service and use `try_files` for SPA routing.

More environments or one-click scripts may be added later.
