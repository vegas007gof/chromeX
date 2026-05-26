const { app, BrowserWindow, ipcMain, shell, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { spawn } = require("child_process");

const ROOT = path.join(__dirname, "..");
const PYTHON = path.join(ROOT, ".venv", "Scripts", "python.exe");
const SERVER_SCRIPT = path.join(ROOT, "run_server.py");
const API = "http://127.0.0.1:8765";
const FILTER_SCRIPT = path.join(__dirname, "filter-inject.js");

let mainWindow = null;
let settingsWindow = null;
let serverProcess = null;

function apiGet(pathname) {
  return new Promise((resolve, reject) => {
    http
      .get(`${API}${pathname}`, (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

function waitForServer(maxMs = 120000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      apiGet("/health")
        .then((h) => {
          if (h.status === "ok") resolve(h);
          else if (Date.now() - start > maxMs) reject(new Error("Server timeout"));
          else setTimeout(tick, 500);
        })
        .catch(() => {
          if (Date.now() - start > maxMs) reject(new Error("Server not responding"));
          else setTimeout(tick, 800);
        });
    };
    tick();
  });
}

function startServer() {
  if (!fs.existsSync(PYTHON)) {
    console.error("Python venv not found:", PYTHON);
    return Promise.reject(new Error("Run setup_portable.bat first"));
  }

  return apiGet("/health")
    .then(() => {
      console.log("Filter server already running");
      return waitForServer();
    })
    .catch(() => {
      return new Promise((resolve, reject) => {
        serverProcess = spawn(PYTHON, [SERVER_SCRIPT], {
          cwd: ROOT,
          stdio: "pipe",
          windowsHide: true,
        });
        serverProcess.stdout?.on("data", (d) => process.stdout.write(d));
        serverProcess.stderr?.on("data", (d) => process.stderr.write(d));
        serverProcess.on("error", reject);
        waitForServer().then(resolve).catch(reject);
      });
    });
}

function injectFilter(webContents) {
  if (!webContents || webContents.isDestroyed()) return;
  const url = webContents.getURL();
  if (!/google\.(com|ru|by|kz|com\.ua)/i.test(url)) return;
  if (!/\/search|q=/.test(url)) return;

  const script = fs.readFileSync(FILTER_SCRIPT, "utf8");
  webContents.executeJavaScript(script).catch((err) => {
    console.warn("Filter inject failed:", err.message);
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    title: "ChromeX",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    mainWindow.loadURL(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("did-finish-load", () => {
    injectFilter(mainWindow.webContents);
  });

  mainWindow.webContents.on("did-navigate-in-page", () => {
    injectFilter(mainWindow.webContents);
  });

  mainWindow.loadURL("https://www.google.com");
}

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 520,
    height: 640,
    title: "ChromeX — настройки",
    parent: mainWindow,
    modal: false,
    webPreferences: {
      preload: path.join(__dirname, "settings-preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  settingsWindow.loadFile(path.join(__dirname, "settings.html"));
  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });
}

ipcMain.handle("open-settings", () => createSettingsWindow());
ipcMain.handle("open-external", (_e, url) => shell.openExternal(url));
ipcMain.handle("get-paths", () => ({
  root: ROOT,
  forbidden: path.join(ROOT, "server", "forbidden.txt"),
  config: path.join(ROOT, "server", "config.json"),
  model: path.join(ROOT, "models", "paraphrase-multilingual-MiniLM-L12-v2"),
}));
ipcMain.handle("read-file", (_e, filePath) => {
  if (!filePath.startsWith(ROOT)) throw new Error("Access denied");
  return fs.readFileSync(filePath, "utf8");
});
ipcMain.handle("write-file", (_e, filePath, content) => {
  if (!filePath.startsWith(ROOT)) throw new Error("Access denied");
  fs.writeFileSync(filePath, content, "utf8");
});
ipcMain.handle("api-get", (_e, pathname) => apiGet(pathname));
ipcMain.handle("api-post-config", (_e, body) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      `${API}/config`,
      { method: "POST", headers: { "Content-Type": "application/json" } },
      (res) => {
        let b = "";
        res.on("data", (c) => (b += c));
        res.on("end", () => resolve(JSON.parse(b)));
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
});

function buildMenu() {
  const template = [
    {
      label: "ChromeX",
      submenu: [
        {
          label: "Настройки фильтра",
          accelerator: "Ctrl+,",
          click: () => createSettingsWindow(),
        },
        { type: "separator" },
        { role: "reload" },
        { role: "forceReload" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Переход",
      submenu: [
        {
          label: "Google",
          click: () => mainWindow?.loadURL("https://www.google.com"),
        },
        { role: "toggleDevTools" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(async () => {
  buildMenu();
  try {
    await startServer();
  } catch (err) {
    console.error(err);
  }
  createMainWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }
});
