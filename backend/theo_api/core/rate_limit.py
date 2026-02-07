import time
import asyncio
from typing import Dict
from fastapi import HTTPException, Request

# Simple in-memory token-bucket style limiter per key (IP). Not distributed.
class RateLimiter:
    def __init__(self, max_requests: int, per_seconds: int):
        self.max_requests = max_requests
        self.per_seconds = per_seconds
        self.state: Dict[str, list[float]] = {}
        self.lock = asyncio.Lock()

    async def hit(self, key: str) -> bool:
        now = time.time()
        async with self.lock:
            q = self.state.get(key) or []
            # drop old timestamps
            cutoff = now - self.per_seconds
            q = [t for t in q if t > cutoff]
            if len(q) >= self.max_requests:
                self.state[key] = q
                return False
            q.append(now)
            self.state[key] = q
            return True


# Default limiter: 60 requests per minute per IP
limiter = RateLimiter(max_requests=60, per_seconds=60)


async def rate_limit_dependency(request: Request):
    # Use client host as key; fall back to 'anon'
    key = "anon"
    try:
        key = request.client.host or "anon"
    except Exception:
        key = "anon"

    ok = await limiter.hit(key)
    if not ok:
        raise HTTPException(status_code=429, detail="Too many requests")
