"""Check whether the local model folder is complete."""

from __future__ import annotations

from pathlib import Path

MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"


def model_dir(root: Path) -> Path:
    return root / "models" / MODEL_NAME


def is_valid_model(path: Path) -> bool:
    if not path.is_dir():
        return False
    names = {p.name for p in path.iterdir()}
    if "config.json" not in names:
        return False
    if "model.safetensors" in names or "pytorch_model.bin" in names:
        return True
    return any(path.rglob("*.safetensors")) or any(path.rglob("*.bin"))
