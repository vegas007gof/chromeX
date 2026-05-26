#!/usr/bin/env python3
"""ChromeX browser — Google + semantic filter (pywebview, no Node.js)."""

from __future__ import annotations

import json
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PYTHON = ROOT / ".venv" / "Scripts" / "python.exe"
SERVER_SCRIPT = ROOT / "run_server.py"
FILTER_JS_PATH = ROOT / "browser" / "filter-inject.js"
SETTINGS_HTML_PATH = ROOT / "browser" / "settings_pywebview.html"
API = "http://127.0.0.1:8765"

server_process: subprocess.Popen | None = None
main_window = None


def http_get(path: str) -> dict:
    with urllib.request.urlopen(f"{API}{path}", timeout=5) as resp:
        return json.loads(resp.read().decode("utf-8"))


def http_post(path: str, body: dict) -> dict:
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        f"{API}{path}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=5) as resp:
        return json.loads(resp.read().decode("utf-8"))


def server_is_up() -> bool:
    try:
        return http_get("/health").get("status") == "ok"
    except (urllib.error.URLError, TimeoutError, OSError):
        return False


def start_server() -> None:
    global server_process
    if server_is_up():
        print("Filter server already running")
        return

    if not PYTHON.exists():
        print("Run setup_portable.bat first (.venv missing)")
        sys.exit(1)

    flags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
    server_process = subprocess.Popen(
        [str(PYTHON), str(SERVER_SCRIPT)],
        cwd=ROOT,
        creationflags=flags,
    )

    print("Starting filter server...")
    for _ in range(180):
        if server_is_up():
            print("Server ready:", API)
            return
        time.sleep(1)

    print("ERROR: server did not start in time")
    sys.exit(1)


def inject_filter(window) -> None:
    if not FILTER_JS_PATH.exists():
        return
    script = FILTER_JS_PATH.read_text(encoding="utf-8")
    try:
        window.evaluate_js(script)
    except Exception as exc:
        print("Filter inject:", exc)


class SettingsApi:
    def load(self) -> dict:
        forbidden_path = ROOT / "server" / "forbidden.txt"
        text = forbidden_path.read_text(encoding="utf-8") if forbidden_path.exists() else ""
        try:
            cfg = http_get("/config")
            threshold = float(cfg.get("threshold", 0.72))
        except Exception:
            threshold = 0.72
        return {"forbidden": text, "threshold": threshold}

    def save(self, forbidden: str, threshold: float) -> str:
        (ROOT / "server" / "forbidden.txt").write_text(forbidden, encoding="utf-8")
        http_post("/config", {"threshold": threshold, "filter_enabled": True})
        return "ok"


class BrowserApi:
    def open_settings(self) -> None:
        html = SETTINGS_HTML_PATH.read_text(encoding="utf-8")
        webview.create_window(
            "ChromeX — настройки",
            html=html,
            js_api=SettingsApi(),
            width=520,
            height=640,
        )


def main() -> None:
    global main_window

    model_dir = ROOT / "models" / "paraphrase-multilingual-MiniLM-L12-v2"
    if not model_dir.is_dir():
        print("Model not found. Run download_model.bat first.")
        sys.exit(1)

    start_server()

    import webview

    main_window = webview.create_window(
        "ChromeX",
        "https://www.google.com",
        width=1280,
        height=860,
        js_api=BrowserApi(),
    )

    def on_loaded() -> None:
        inject_filter(main_window)

    main_window.events.loaded += on_loaded

    print("ChromeX started. Use gear button on Google search for settings.")
    try:
        webview.start(gui="edgechromium", debug=False)
    except Exception:
        webview.start(debug=False)


if __name__ == "__main__":
    main()
