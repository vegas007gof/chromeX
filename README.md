# ChromeX — семантический фильтр Google

Локальная нейросеть проверяет заголовки и сниппеты результатов поиска. Два режима:

1. **ChromeX Browser** — свой браузер (Electron), настройки, фильтр встроены — удобно для флешки.
2. **Расширение Chrome** + сервер — если хотите обычный Chrome.

## Модель: скачать один раз, без обновлений

Модель лежит в папке `models/` и **не качается из интернета** при каждом запуске (режим offline).

```text
download_model.bat     # один раз, ~120 МБ
```

После этого сервер стартует быстрее: модель только загружается в RAM (~5–15 с), без загрузки из сети.

## Быстрый старт (портативный браузер)

**Один раз:**

```text
setup_portable.bat
```

Создаёт `.venv`, скачивает модель в `models/`, ставит pywebview (**Node.js не нужен**).

**Каждый запуск:**

```text
launch_browser.bat
```

- **Стартовое окно** — поиск и статус сервера
- **Панель справа** — настройки семантического фильтра (темы, порог, вкл/выкл)
- После поиска открывается Google; кнопка **«Фильтр: ВКЛ»** на выдаче

### EXE (если понадобится)

Оценка размера: **3–5 ГБ**, не 50 ГБ. Подробнее: [docs/BUILD_EXE.md](docs/BUILD_EXE.md).

## Флешка

Скопируйте **всю папку** `chromeX` на USB (после `setup_portable.bat`).

На другом ПК нужен только **Python 3.10+** и **WebView2** (обычно уже есть в Windows 10/11).

Размер: ~1–1.2 ГБ (venv + torch + модель).

## Режим: Chrome + расширение

1. `download_model.bat` (если ещё не скачали)
2. `run_server.bat`
3. `install_extension.bat` → загрузить папку `extension/`

## Настройки

| Файл | Назначение |
|------|------------|
| `server/forbidden.txt` | Запрещённые темы (строка = тема) |
| `server/config.json` | Порог `threshold`, вкл/выкл фильтра |
| `server/filter.log` | Лог блокировок |

В браузере ChromeX: меню **ChromeX → Настройки фильтра** или **Ctrl+,**.

Порог по умолчанию: **0.72** (чем выше — тем меньше блокировок).

## API (localhost:8765)

| Метод | Путь |
|--------|------|
| GET | `/health` |
| GET | `/config` |
| POST | `/config` |
| POST | `/check` |

## Структура

```
chromeX/
├── setup_portable.bat      # полная установка
├── download_model.bat      # только модель → models/
├── launch_browser.bat      # ChromeX Browser
├── run_server.bat          # только API
├── stop_server.bat
├── models/                 # локальная модель (offline)
├── server/
│   ├── app.py
│   ├── forbidden.txt
│   └── config.json
├── chromex_browser.py      # Браузер (pywebview)
├── browser/                # скрипты фильтра и настройки
├── extension/              # для обычного Chrome
└── scripts/
    └── download_model.py
```

## Устранение неполадок

| Проблема | Решение |
|----------|---------|
| Долгая первая загрузка | Нормально один раз; дальше — из `models/` |
| Порт 8765 занят | `stop_server.bat` или сервер уже работает |
| «Нет сервера» на Google | Запустите `run_server.bat` или `launch_browser.bat` |
| `python` не найден | Используйте `py -3` или `.bat` файлы |
| `launch_browser.bat` не работает | Node.js **не нужен**. Запустите `setup_portable.bat`, затем `launch_browser.bat` |
| Ошибка WebView2 | Установите [Microsoft Edge WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) |

## Лицензия

См. [LICENSE](LICENSE).
