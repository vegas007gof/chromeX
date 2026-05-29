ChromeX — перенос на другой ПК / флешку
========================================

ПРОБЛЕМА "No Python at C:\Users\NN\..."
  Папка .venv скопирована с другого компьютера.
  Внутри неё прописан чужой путь к Python.

РЕШЕНИЕ (один раз на новом ПК):
  1. Установите Python 3.10+ с python.org (галочка "Add to PATH")
  2. Запустите repair_venv.bat
  3. Запустите launch_browser.bat

ЧТО КОПИРОВАТЬ НА ФЛЕШКУ:
  - models/          (обязательно — модель)
  - server/
  - browser/
  - chromex_browser.py, run_server.py, requirements.txt
  - *.bat
  - .venv/           (можно, но на новом ПК всё равно repair_venv.bat)

МОЖНО НЕ КОПИРОВАТЬ .venv — тогда на новом ПК только repair_venv.bat
(скачает пакеты ~1 ГБ, модель уже в models/).
