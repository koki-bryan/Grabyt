# Backend Fix Plan

## Status: ✅ NO CODE CHANGES REQUIRED

The backend was working correctly all along. The issue was entirely on the frontend side (missing Vite proxy + SSR intercepting API requests). See `frontend/FIX_PLAN.md` for the applied fix.

## What Happened

The frontend's React Router SSR server intercepted all `/api/*` requests before they could be proxied to the backend. The backend never received any traffic, which is why no logs appeared. After fixing the frontend (dev proxy + disabling SSR), the backend immediately started receiving and processing requests correctly.

## Stale Data Cleanup (Completed)

Old test records from prior debugging sessions were left in the database. Fixed with:

```sql
TRUNCATE TABLE downloads;
```

## Optional Improvements

These are not required for the app to function but improve developer experience and operational visibility.

### 1. Request Logging Middleware (Recommended)

Adds per-request logging with timing info. Useful for debugging and monitoring:

```python
# In main.py, after CORS middleware
import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        logger.info("%s %s (from %s)", request.method, request.url.path, request.client.host)
        response = await call_next(request)
        elapsed = (time.perf_counter() - start) * 1000
        logger.info("%s %s → %d (%.1fms)", request.method, request.url.path, response.status_code, elapsed)
        return response


app.add_middleware(RequestLoggingMiddleware)
```

### 2. Expand CORS Origins

Add `127.0.0.1` variant since browsers treat it as a different origin from `localhost`:

```env
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173
```

### 3. Explicit Host/Port Configuration

Make the server binding configurable via `.env`:

```python
# In app/config.py
class Settings(BaseSettings):
    ...
    port: int = 8000
    host: str = "0.0.0.0"
```

```bash
uv run uvicorn main:app --reload --host $HOST --port $PORT
```

## Priority

| Improvement | Priority | Impact |
|-------------|----------|--------|
| Request logging middleware | Medium | Better observability for future debugging |
| CORS expansion | Low | Prevents edge-case browser CORS errors |
| Explicit port config | Low | Cleaner deployment configuration |

## Verification (Completed)

- ✅ `GET /api/health` → `{"status": "ok"}`
- ✅ `GET /api/downloads` → returns download list
- ✅ `POST /api/downloads` → creates and processes download
- ✅ `GET /api/downloads/{id}/file` → serves downloaded file
- ✅ Backend logs show incoming requests from frontend after fix
