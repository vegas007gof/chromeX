ChromeX — перенос на другой ПК / флешку
========================================

ПРОБЛЕМА "No Python at C:\Users\NN\..."
  Папка .venv скопирована с другого компьютера.
  Внутри неё прописан чужой путь к Python.

РЕШЕНИЕ (один раз на новом ПК):
  1. Установите Python 3.10+ с python.org (галочка "Add to PATH")
  2. Запустите repair_venv.bat
  3. Запустите launch_browser.bat

ЧТО КОПИРОВАТЬ НА ФЛЕШКУ (вся папка chromeX):
  requirements.txt   <-- обязательно
  models/
  server/
  browser/
  scripts/
  chromex_browser.py, run_server.py
  repair_venv.bat, launch_browser.bat, setup_portable.bat, *.bat

МОЖНО НЕ КОПИРОВАТЬ .venv — тогда на новом ПК repair_venv.bat (~1 ГБ pip).

МОДЕЛЬ (~120 МБ) — проще СКОПИРОВАТЬ папку models\ с рабочего ПК,
чем качать заново на медленном интернете.

Если скачивание не идёт:
  download_model_mirror.bat
или скопируйте models\paraphrase-multilingual-MiniLM-L12-v2\
с компьютера, где ChromeX уже запускался.
