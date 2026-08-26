# Frontend Fix Plan

## Status: ✅ RESOLVED (2026-08-27)

## Problem Summary

API calls to `/api/downloads` never reached the backend (FastAPI on port 8000). Instead, React Router's SSR server intercepted them and threw:

```
Error: No route matches URL "/api/downloads"
```

The request never left the frontend dev server — the backend received zero traffic and logged nothing.

## Root Cause

Two compounding issues:

1. **No Vite dev proxy** — `vite.config.ts` had no `server.proxy` configuration to forward `/api/*` requests to the backend at `localhost:8000`.

2. **SSR intercepted all requests** — React Router v8 with `ssr: true` ran a server-side request handler that tried to match *every* incoming request (including `/api/*`) against the route definitions in `routes.ts`. Since no route matched `/api/downloads`, it errored out before Vite's proxy would even get a chance to forward it.

## Applied Fix

### 1. Added Vite Dev Proxy (`vite.config.ts`)

```ts
export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
```

### 2. Disabled SSR (`react-router.config.ts`)

```ts
export default {
  ssr: false,
} satisfies Config;
```

**Why this works:** With SSR disabled, the frontend serves the HTML shell for all page routes and lets the browser handle API calls via `fetch()`. The Vite proxy forwards `/api/*` to the backend during development.

## Remaining Considerations

### Production Deployment

The Vite proxy only works in development. For production, you'll need one of:

- **Reverse proxy (recommended):** Put both frontend and backend behind nginx/Caddy that routes `/api/*` to the backend and everything else to the frontend static build.
- **Environment variable:** Update `app/services/api.ts` to support a configurable base URL:

  ```ts
  const API_BASE = import.meta.env.VITE_API_BASE || "/api";
  ```

  Then set `VITE_API_BASE=http://your-backend-host:8000/api` at build time if not using a reverse proxy.

### If SSR Is Ever Needed Again

Use a custom server entry that proxies `/api/*` before React Router handles routing:

```ts
// server.ts
import { createRequestHandler } from "@react-router/node";
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();

app.use("/api", createProxyMiddleware({ target: "http://localhost:8000", changeOrigin: true }));
app.all("*", createRequestHandler({ build: () => import("./build/server/index.js") }));
app.listen(3000);
```

## Verification (Completed)

- ✅ Frontend loads without errors
- ✅ API requests to `/api/downloads` return data from backend
- ✅ Download submission works end-to-end
- ✅ File download works
- ✅ Stale DB entries cleaned up via `TRUNCATE TABLE downloads`
