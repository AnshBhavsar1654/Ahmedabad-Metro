"""Site visit counter with live updates for the footer.

- The total lives in memory and is saved to a small JSON file after each visit, so it survives a process
  restart on the same disk. On Render's free tier the disk is wiped on every deploy, so the count restarts there.
- The browser decides what a visit is (once per browser per day) and reports it with POST /api/visits.
  The server also ignores more than a few visits per IP per hour, so a script can't inflate the number.
- Every open footer holds a server-sent-events stream; it gets the new numbers whenever the total or the
  number of people online changes. "Online" is the number of open streams.
"""
import asyncio
import json
import os
import time
from collections import deque
from typing import AsyncIterator, Dict

from metro import DATA_DIR

VISITS_FILE = os.getenv("VISITS_FILE", str(DATA_DIR / "visits.json"))
MAX_VISITS_PER_IP_PER_HOUR = 5
HEARTBEAT_SECONDS = 25  # keeps proxies from closing an idle stream


def _load() -> int:
    try:
        with open(VISITS_FILE, encoding="utf-8") as f:
            return max(0, int(json.load(f).get("total", 0)))
    except (OSError, ValueError, TypeError, AttributeError):
        return 0


class VisitCounter:
    def __init__(self) -> None:
        self.total = _load()
        self.online = 0
        self._version = 0
        self._changed = asyncio.Condition()
        self._recent: Dict[str, deque] = {}

    def snapshot(self) -> Dict[str, int]:
        return {"total": self.total, "online": self.online}

    def _allowed(self, ip: str) -> bool:
        now = time.monotonic()
        if len(self._recent) > 10000:  # forget idle clients
            for key in [k for k, q in self._recent.items() if not q or now - q[-1] > 3600]:
                del self._recent[key]
        times = self._recent.setdefault(ip, deque())
        while times and now - times[0] > 3600:
            times.popleft()
        if len(times) >= MAX_VISITS_PER_IP_PER_HOUR:
            return False
        times.append(now)
        return True

    def _save(self) -> None:
        try:
            tmp = f"{VISITS_FILE}.tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump({"total": self.total}, f)
            os.replace(tmp, VISITS_FILE)
        except OSError as exc:  # read-only disk: keep counting in memory
            print(f"[visits] could not save: {exc}")

    async def _notify(self) -> None:
        async with self._changed:
            self._version += 1
            self._changed.notify_all()

    async def record(self, ip: str) -> Dict[str, int]:
        if self._allowed(ip):
            self.total += 1
            self._save()
            await self._notify()
        return self.snapshot()

    async def stream(self) -> AsyncIterator[Dict[str, int]]:
        """Current numbers now, then again after every change. Counts as one person online while open."""
        self.online += 1
        await self._notify()
        try:
            seen = self._version
            yield self.snapshot()
            while True:
                async with self._changed:
                    try:
                        await asyncio.wait_for(self._changed.wait_for(lambda: self._version != seen), HEARTBEAT_SECONDS)
                    except asyncio.TimeoutError:
                        yield {}  # heartbeat
                        continue
                    seen = self._version
                yield self.snapshot()
        finally:
            self.online -= 1
            # Not awaited: this runs while the stream is being cancelled (the visitor left).
            task = asyncio.ensure_future(self._notify())
            self._pending = task


counter = VisitCounter()
