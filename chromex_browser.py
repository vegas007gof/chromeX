#!/usr/bin/env python3
"""ChromeX browser — start screen, Google, dedicated settings panel."""

from __future__ import annotations

import json
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BROWSER_DIR = ROOT / "browser"
PYTHON = Path(sys.executable)
SERVER_SCRIPT = ROOT / "run_server.py"
FILTER_JS_PATH = BROWSER_DIR / "filter-inject.js"
START_HTML = BROWSER_DIR / "start.html"
SETTINGS_PANEL_HTML = BROWSER_DIR / "settings_panel.html"
API = "http://127.0.0.1:8765"

server_process: subprocess.Popen | None = None
main_window = None
settings_window = None


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
        print("Python not found:", PYTHON)
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
        import time

        time.sleep(1)

    print("ERROR: server did not start in time")
    sys.exit(1)


def file_url(path: Path) -> str:
    return path.resolve().as_uri()


def is_google_search(url: str) -> bool:
    u = url.lower()
    return (
        "google." in u
        and ("/search" in u or "q=" in u or "query=" in u)
    )


def inject_filter(window) -> None:
    if not FILTER_JS_PATH.exists():
        return
    script = FILTER_JS_PATH.read_text(encoding="utf-8")
    try:
        window.evaluate_js(script)
    except Exception as exc:
        print("Filter inject:", exc)


class SettingsPanelApi:
    """API for the right-hand settings panel window."""

    def load(self) -> dict:
        forbidden_path = ROOT / "server" / "forbidden.txt"
        text = forbidden_path.read_text(encoding="utf-8") if forbidden_path.exists() else ""
        try:
            cfg = http_get("/config")
            return {
                "forbidden": text,
                "threshold": float(cfg.get("threshold", 0.72)),
                "filter_enabled": bool(cfg.get("filter_enabled", True)),
            }
        except Exception:
            return {"forbidden": text, "threshold": 0.72, "filter_enabled": True}

    def save(self, forbidden: str, threshold: float, filter_enabled: bool) -> str:
        (ROOT / "server" / "forbidden.txt").write_text(forbidden, encoding="utf-8")
        http_post(
            "/config",
            {"threshold": threshold, "filter_enabled": filter_enabled},
        )
        return "ok"


class MainBrowserApi:
    """API for start page and navigation."""

    def get_health(self) -> dict:
        return http_get("/health")

    def open_google(self, query: str) -> None:
        global main_window
        q = urllib.parse.quote(query.strip())
        url = f"https://www.google.com/search?q={q}"
        if main_window:
            main_window.load_url(url)

    def open_start(self) -> None:
        global main_window
        if main_window:
            main_window.load_url(file_url(START_HTML))


def main() -> None:
    global main_window, settings_window

    sys.path.insert(0, str(ROOT / "scripts"))
    from model_utils import is_valid_model, model_dir

    mdir = model_dir(ROOT)
    if not is_valid_model(mdir):
        print(f"Model not found or incomplete:\n  {mdir}")
        print("Run download_model.bat or copy models\\ from another PC.")
        sys.exit(1)

    start_server()

    import webview

    # Layout: settings panel (right) + main browser (left)
    settings_w = 400
    main_w = 940
    h = 900
    x0 = 80
    y0 = 40

    settings_window = webview.create_window(
        "ChromeX — настройки",
        url=file_url(SETTINGS_PANEL_HTML),
        width=settings_w,
        height=h,
        x=x0 + main_w + 8,
        y=y0,
        resizable=True,
        min_size=(320, 500),
        js_api=SettingsPanelApi(),
    )

    main_window = webview.create_window(
        "ChromeX",
        url=file_url(START_HTML),
        width=main_w,
        height=h,
        x=x0,
        y=y0,
        resizable=True,
        min_size=(640, 500),
        js_api=MainBrowserApi(),
    )

    def on_main_loaded() -> None:
        url = main_window.get_current_url() if hasattr(main_window, "get_current_url") else ""
        if not url:
            return
        if is_google_search(url):
            inject_filter(main_window)

    main_window.events.loaded += on_main_loaded

    print("ChromeX: start screen + settings panel on the right")
    try:
        webview.start(gui="edgechromium", debug=False)
    except Exception:
        webview.start(debug=False)


if __name__ == "__main__":
    main()
