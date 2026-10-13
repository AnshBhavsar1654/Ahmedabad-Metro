"""Self-ping so Render's free tier doesn't spin the service down after ~15 minutes without traffic.

The ping goes to the service's public URL (Render sets RENDER_EXTERNAL_URL), so it passes through
Render's proxy and counts as real inbound traffic. Locally the variable is unset and nothing runs.
"""
import os
import threading

import requests

DEFAULT_INTERVAL_SECONDS = 600  # 10 minutes; Render sleeps free services after 15


def _target_url():
    base = os.getenv("KEEPALIVE_URL") or os.getenv("RENDER_EXTERNAL_URL")
    return f"{base.rstrip('/')}/health" if base else None


def _interval_seconds():
    try:
        return max(60, int(os.getenv("KEEPALIVE_INTERVAL_SECONDS", DEFAULT_INTERVAL_SECONDS)))
    except ValueError:
        return DEFAULT_INTERVAL_SECONDS


def start_keepalive():
    """Start the ping loop in a daemon thread. Returns a stop() callable (a no-op if disabled)."""
    url = _target_url()
    if not url:
        return lambda: None

    interval = _interval_seconds()
    stop_event = threading.Event()

    def loop():
        # wait() returns True when stopped, so the first ping happens one interval after startup.
        while not stop_event.wait(interval):
            try:
                requests.get(url, timeout=15)
            except requests.RequestException as exc:
                print(f"[keepalive] ping failed: {exc}")

    threading.Thread(target=loop, name="keepalive", daemon=True).start()
    print(f"[keepalive] pinging {url} every {interval}s")
    return stop_event.set
