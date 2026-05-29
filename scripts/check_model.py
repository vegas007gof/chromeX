#!/usr/bin/env python3
"""Exit 0 if models/ is valid, 1 otherwise."""

from __future__ import annotations

import sys
from pathlib import Path

from model_utils import is_valid_model, model_dir

ROOT = Path(__file__).resolve().parent.parent
path = model_dir(ROOT)

if is_valid_model(path):
    print("OK:", path)
    sys.exit(0)

if path.exists():
    print("INCOMPLETE:", path)
else:
    print("MISSING:", path)
sys.exit(1)
