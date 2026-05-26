#!/usr/bin/env python3
"""Start the semantic filter API on http://127.0.0.1:8765"""

import sys

import uvicorn


def main() -> None:
    print("Semantic filter server")
    print("  URL:    http://127.0.0.1:8765")
    print("  Health: http://127.0.0.1:8765/health")
    print("  Topics: server/forbidden.txt (reloads every 5s)")
    print("  Log:    server/filter.log")
    print()
    print("Model: models/ (offline). Download once: download_model.bat")
    print("Press Ctrl+C to stop.\n")

    try:
        uvicorn.run(
            "server.app:app",
            host="127.0.0.1",
            port=8765,
            log_level="info",
            reload=False,
        )
    except KeyboardInterrupt:
        print("\nServer stopped.")
        sys.exit(0)


if __name__ == "__main__":
    main()
