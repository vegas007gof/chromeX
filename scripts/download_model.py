#!/usr/bin/env python3
"""Download the embedding model once into ./models/ (offline use, no auto-updates)."""

from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT / "scripts"))

from model_utils import MODEL_NAME, is_valid_model, model_dir

MODEL_DIR = model_dir(ROOT)


def main() -> None:
    print(f"ChromeX model installer")
    print(f"Target folder:\n  {MODEL_DIR}\n")

    if is_valid_model(MODEL_DIR):
        print("Model already installed.")
        return

    if MODEL_DIR.exists():
        print("Removing incomplete model folder...")
        shutil.rmtree(MODEL_DIR, ignore_errors=True)

    print(f"Downloading {MODEL_NAME} (~120 MB)...")
    print("Needs internet. May take 5–15 minutes.\n")

    try:
        from sentence_transformers import SentenceTransformer
    except ImportError:
        print("ERROR: sentence-transformers not installed.")
        print("Run repair_venv.bat first.")
        sys.exit(1)

    MODEL_DIR.parent.mkdir(parents=True, exist_ok=True)

    try:
        model = SentenceTransformer(MODEL_NAME)
        print("Saving to disk...")
        model.save(str(MODEL_DIR))
    except Exception as exc:
        print(f"\nERROR: download failed:\n  {exc}\n")
        print("Try:")
        print("  1) Check internet / VPN")
        print("  2) Mirror: set USE_HF_MIRROR=1 and run again")
        print("  3) Copy folder models\\ from a PC where ChromeX already works")
        shutil.rmtree(MODEL_DIR, ignore_errors=True)
        sys.exit(1)

    if not is_valid_model(MODEL_DIR):
        print("ERROR: files saved but model folder looks incomplete.")
        shutil.rmtree(MODEL_DIR, ignore_errors=True)
        sys.exit(1)

    size_mb = sum(f.stat().st_size for f in MODEL_DIR.rglob("*") if f.is_file()) / (1024 * 1024)
    print(f"\nDone. Model saved ({size_mb:.0f} MB):\n  {MODEL_DIR}")
    print("\nNext: launch_browser.bat")


if __name__ == "__main__":
    if os.environ.get("USE_HF_MIRROR") == "1":
        os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")
        print("Using HF mirror:", os.environ["HF_ENDPOINT"], "\n")
    main()
