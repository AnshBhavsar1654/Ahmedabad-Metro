"""Self-ping so Render's free tier doesn't spin the service down while the metro is open.

The ping goes to the service's public URL (Render sets RENDER_EXTERNAL_URL), so it passes through
Render's proxy and counts as real inbound traffic. Locally the variable is unset and nothing runs.

Pings only run between KEEPALIVE_START_HOUR and KEEPALIVE_END_HOUR, Ahmedabad time (Render's servers
run on UTC), so the service is free to sleep overnight instead of using up the workspace's 750 free
instance hours. Note that a sleeping process cannot wake itself: an outside caller (a scheduled ping)
has to make the first request of the day.
"""
import os
import threading
import time
from datetime import datetime
from zoneinfo import ZoneInfo

import requests

IST = ZoneInfo("Asia/Kolkata")
DEFAULT_INTERVAL_SECONDS = 600  # 10 minutes; Render sleeps free services after 15
DEFAULT_START_HOUR = 6
DEFAULT_END_HOUR = 23
TICK_SECONDS = 60


def _target_url():
    base = os.getenv("KEEPALIVE_URL") or os.getenv("RENDER_EXTERNAL_URL")
    return f"{base.rstrip('/')}/health" if base else None


def _interval_seconds():
    try:
        return max(60, int(os.getenv("KEEPALIVE_INTERVAL_SECONDS", DEFAULT_INTERVAL_SECONDS)))
    except ValueError:
        return DEFAULT_INTERVAL_SECONDS


def _hour(name, default):
    try:
        hour = int(os.getenv(name, default))
    except ValueError:
        return default
    return hour if 0 <= hour <= 24 else default


def _active(now):
    """True inside the daily window, in Ahmedabad time (Render's servers run on UTC)."""
    start = _hour("KEEPALIVE_START_HOUR", DEFAULT_START_HOUR)
    end = _hour("KEEPALIVE_END_HOUR", DEFAULT_END_HOUR)
    return start <= now.hour < end


def start_keepalive():
    """Start the ping loop in a daemon thread. Returns a stop() callable (a no-op if disabled)."""
    url = _target_url()
    if not url:
        return lambda: None

    interval = _interval_seconds()
    stop_event = threading.Event()
    last_ping = 0.0

    def loop():
        nonlocal last_ping
        while not stop_event.wait(TICK_SECONDS):
            if not _active(datetime.now(IST)):
                last_ping = 0.0  # the first ping after the window opens is immediate
                continue
            if time.monotonic() - last_ping < interval:
                continue
            try:
                requests.get(url, timeout=15)
            except requests.RequestException as exc:
                print(f"[keepalive] ping failed: {exc}")
            last_ping = time.monotonic()

    threading.Thread(target=loop, name="keepalive", daemon=True).start()
    start = _hour("KEEPALIVE_START_HOUR", DEFAULT_START_HOUR)
    end = _hour("KEEPALIVE_END_HOUR", DEFAULT_END_HOUR)
    print(f"[keepalive] pinging {url} every {interval}s between {start:02d}:00 and {end:02d}:00 IST")
    return stop_event.set
