"""Semantic filter API: embeddings + cosine similarity vs forbidden topics."""

from __future__ import annotations

import json
import logging
import os
import threading
import time
from collections import OrderedDict
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer
from sentence_transformers.util import cos_sim

MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"
SIMILARITY_THRESHOLD = 0.72
FORBIDDEN_RELOAD_SEC = 5
TEXT_CACHE_MAX = 1000
TEXT_CACHE_TTL_SEC = 300

ROOT_DIR = Path(__file__).resolve().parent.parent
SERVER_DIR = Path(__file__).resolve().parent
MODEL_DIR = ROOT_DIR / "models" / MODEL_NAME
FORBIDDEN_PATH = SERVER_DIR / "forbidden.txt"
FILTER_LOG_PATH = SERVER_DIR / "filter.log"
CONFIG_PATH = SERVER_DIR / "config.json"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("semantic-filter")

_model: SentenceTransformer | None = None
_model_lock = threading.Lock()
_model_ready = threading.Event()


def _local_model_exists() -> bool:
    return MODEL_DIR.is_dir() and any(MODEL_DIR.iterdir())


def _enable_offline_mode() -> None:
    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"


def get_model() -> SentenceTransformer:
    global _model
    if _model is not None:
        return _model

    with _model_lock:
        if _model is not None:
            return _model

        if _local_model_exists():
            _enable_offline_mode()
            logger.info("Loading local model from %s (offline)", MODEL_DIR)
            _model = SentenceTransformer(str(MODEL_DIR), local_files_only=True)
        else:
            logger.warning(
                "Local model not found at %s — run: py -3 scripts/download_model.py",
                MODEL_DIR,
            )
            logger.info("Downloading model once from Hugging Face...")
            _model = SentenceTransformer(MODEL_NAME)
            MODEL_DIR.parent.mkdir(parents=True, exist_ok=True)
            _model.save(str(MODEL_DIR))
            logger.info("Model saved to %s — next starts use offline copy", MODEL_DIR)
            _enable_offline_mode()

        _model_ready.set()
        return _model


def _warmup_model() -> None:
    try:
        get_model()
        forbidden_store.rebuild_embeddings()
        logger.info("Model ready")
    except Exception:
        logger.exception("Model warmup failed")


def load_config() -> dict[str, Any]:
    defaults = {"threshold": SIMILARITY_THRESHOLD, "filter_enabled": True}
    if not CONFIG_PATH.exists():
        return defaults
    try:
        data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
        return {**defaults, **data}
    except json.JSONDecodeError:
        return defaults


def save_config(data: dict[str, Any]) -> None:
    CONFIG_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def get_threshold() -> float:
    return float(load_config().get("threshold", SIMILARITY_THRESHOLD))


class CheckRequest(BaseModel):
    text: str = Field(..., min_length=1)


class CheckResponse(BaseModel):
    block: bool
    score: float
    matched: str = ""


class ConfigUpdate(BaseModel):
    threshold: float | None = Field(None, ge=0.0, le=1.0)
    filter_enabled: bool | None = None


class TTLRUCache:
    def __init__(self, maxsize: int, ttl_sec: float) -> None:
        self._maxsize = maxsize
        self._ttl = ttl_sec
        self._data: OrderedDict[str, tuple[np.ndarray, float]] = OrderedDict()
        self._lock = threading.Lock()

    def get(self, key: str) -> np.ndarray | None:
        with self._lock:
            entry = self._data.get(key)
            if entry is None:
                return None
            vec, ts = entry
            if time.time() - ts > self._ttl:
                del self._data[key]
                return None
            self._data.move_to_end(key)
            return vec

    def set(self, key: str, value: np.ndarray) -> None:
        with self._lock:
            self._data[key] = (value, time.time())
            self._data.move_to_end(key)
            while len(self._data) > self._maxsize:
                self._data.popitem(last=False)


class ForbiddenStore:
    def __init__(self, path: Path) -> None:
        self._path = path
        self._lock = threading.Lock()
        self._topics: list[str] = []
        self._embeddings: np.ndarray | None = None
        self._mtime: float = 0.0
        self.reload(force=True)

    def reload(self, force: bool = False) -> None:
        if not self._path.exists():
            with self._lock:
                self._topics = []
                self._embeddings = None
            logger.warning("forbidden.txt not found: %s", self._path)
            return

        mtime = self._path.stat().st_mtime
        if not force and mtime == self._mtime:
            return

        raw = self._path.read_text(encoding="utf-8")
        topics = [
            line.strip()
            for line in raw.splitlines()
            if line.strip() and not line.strip().startswith("#")
        ]

        with self._lock:
            self._topics = topics
            self._mtime = mtime
            self._embeddings = None

        logger.info("Loaded %d forbidden topic(s)", len(topics))
        if topics and _model_ready.is_set():
            self.rebuild_embeddings()

    def rebuild_embeddings(self) -> None:
        with self._lock:
            topics = list(self._topics)

        if not topics:
            with self._lock:
                self._embeddings = None
            return

        m = get_model()
        embeddings = m.encode(topics, convert_to_numpy=True, show_progress_bar=False)
        with self._lock:
            self._embeddings = embeddings

    def check(self, text_embedding: np.ndarray) -> tuple[float, str]:
        with self._lock:
            topics = list(self._topics)
            embeddings = self._embeddings

        if not topics or embeddings is None:
            return 0.0, ""

        query = text_embedding.reshape(1, -1) if text_embedding.ndim == 1 else text_embedding
        scores = cos_sim(query, embeddings)[0].cpu().numpy()
        idx = int(np.argmax(scores))
        return float(scores[idx]), topics[idx]


forbidden_store = ForbiddenStore(FORBIDDEN_PATH)
text_cache = TTLRUCache(TEXT_CACHE_MAX, TEXT_CACHE_TTL_SEC)


def _reload_loop() -> None:
    while True:
        time.sleep(FORBIDDEN_RELOAD_SEC)
        try:
            forbidden_store.reload()
        except Exception:
            logger.exception("Failed to reload forbidden.txt")


threading.Thread(target=_reload_loop, daemon=True).start()


def _embed_text(text: str) -> np.ndarray:
    cached = text_cache.get(text)
    if cached is not None:
        return cached
    vec = get_model().encode(text, convert_to_numpy=True, show_progress_bar=False)
    text_cache.set(text, vec)
    return vec


def _log_block(text: str, score: float, matched: str) -> None:
    preview = text[:200].replace("\n", " ")
    line = f"BLOCK score={score:.4f} matched={matched!r} text={preview!r}\n"
    with open(FILTER_LOG_PATH, "a", encoding="utf-8") as f:
        f.write(line)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    threading.Thread(target=_warmup_model, daemon=True).start()
    yield


app = FastAPI(title="Semantic Search Filter", version="1.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "model_loaded": _model_ready.is_set(),
        "model_path": str(MODEL_DIR),
        "model_local": _local_model_exists(),
        "topics": len(forbidden_store._topics),
        "threshold": get_threshold(),
        "offline": os.environ.get("HF_HUB_OFFLINE") == "1",
    }


@app.get("/config")
def get_config() -> dict[str, Any]:
    cfg = load_config()
    cfg["forbidden_path"] = str(FORBIDDEN_PATH)
    cfg["model_local"] = _local_model_exists()
    return cfg


@app.post("/config")
def update_config(body: ConfigUpdate) -> dict[str, Any]:
    cfg = load_config()
    if body.threshold is not None:
        cfg["threshold"] = body.threshold
    if body.filter_enabled is not None:
        cfg["filter_enabled"] = body.filter_enabled
    save_config(cfg)
    return cfg


@app.post("/check", response_model=CheckResponse)
def check(body: CheckRequest) -> CheckResponse:
    text = body.text.strip()
    if not text:
        return CheckResponse(block=False, score=0.0, matched="")

    if not load_config().get("filter_enabled", True):
        return CheckResponse(block=False, score=0.0, matched="")

    with forbidden_store._lock:
        need_topics = forbidden_store._embeddings is None and bool(forbidden_store._topics)
    if need_topics:
        forbidden_store.rebuild_embeddings()

    embedding = _embed_text(text)
    score, matched = forbidden_store.check(embedding)
    threshold = get_threshold()
    block = score > threshold

    if block:
        _log_block(text, score, matched)
        logger.info("Blocked (%.3f): %s", score, matched)

    return CheckResponse(
        block=block,
        score=round(score, 4),
        matched=matched if block else "",
    )
