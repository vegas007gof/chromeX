# Сборка EXE (оценка размера)

## Реальный размер (не 50 ГБ)

| Компонент | Размер |
|-----------|--------|
| PyTorch (CPU) | ~2–3 ГБ |
| sentence-transformers + зависимости | ~0.5–1 ГБ |
| Модель `models/paraphrase-multilingual-MiniLM-L12-v2` | ~0.12 ГБ |
| Python runtime (PyInstaller) | ~0.05–0.1 ГБ |
| pywebview / WebView2 | в системе (не в EXE) |
| **Итого папка / one-folder** | **~3–5 ГБ** |
| **Один файл one-file EXE** | **~3–6 ГБ** (распаковка при старте) |

**50 ГБ не нужно** — это был бы запас в сотни раз больше необходимого.

## Рекомендуемый вариант

**Папка на флешке** (как сейчас) — быстрее стартует, проще обновлять `forbidden.txt` и модель.

**EXE one-folder** (PyInstaller `--onedir`) — один `ChromeX.exe` + рядом `_internal/` и `models/`.

## Если делать EXE

```bat
pip install pyinstaller
pyinstaller --onedir --name ChromeX ^
  --add-data "models;models" ^
  --add-data "server;server" ^
  --add-data "browser;browser" ^
  chromex_browser.py
```

Сервер фильтра лучше запускать **в том же процессе** (уже так) или отдельным EXE — два EXE усложняют portable.

## WebView2

На целевом ПК нужен [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) (~150 МБ, часто уже установлен).
