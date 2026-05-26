#!/usr/bin/env python3
"""Quick calibration of /check scores (run while server is up)."""

import httpx

TESTS = [
    "лучшие онлайн казино с бонусом",
    "онлайн казино слоты",
    "азартные игры и онлайн-казино",
    "игровые автоматы казино",
    "как купить наркотики в интернете",
]

def main() -> None:
    for text in TESTS:
        r = httpx.post("http://127.0.0.1:8765/check", json={"text": text}, timeout=30)
        data = r.json()
        print(f"{data['score']:.4f} block={data['block']}  {text!r}")


if __name__ == "__main__":
    main()
