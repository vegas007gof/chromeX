#!/usr/bin/env python3
"""Download the embedding model once into ./models/ (offline use, no auto-updates)."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"
MODEL_DIR = ROOT / "models" / MODEL_NAME


def main() -> None:
    if MODEL_DIR.is_dir() and any(MODEL_DIR.iterdir()):
        print(f"Model already exists: {MODEL_DIR}")
        print("Delete that folder to re-download.")
        return

    print(f"Downloading {MODEL_NAME} (~120 MB)...")
    print("This runs once. The server will use the local copy only.\n")

    try:
        from sentence_transformers import SentenceTransformer
    except ImportError:
        print("Install dependencies first: pip install -r requirements.txt")
        sys.exit(1)

    MODEL_DIR.parent.mkdir(parents=True, exist_ok=True)
    model = SentenceTransformer(MODEL_NAME)
    model.save(str(MODEL_DIR))

    print(f"\nDone. Model saved to:\n  {MODEL_DIR}")
    print("\nNext: run_server.bat or launch_browser.bat")


if __name__ == "__main__":
    main()
