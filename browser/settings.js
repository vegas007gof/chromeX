const threshold = document.getElementById("threshold");
const thresholdVal = document.getElementById("thresholdVal");
const forbidden = document.getElementById("forbidden");
const status = document.getElementById("status");

let paths = {};

threshold.addEventListener("input", () => {
  thresholdVal.textContent = Number(threshold.value).toFixed(2);
});

async function load() {
  paths = await window.chromexSettings.getPaths();
  forbidden.value = await window.chromexSettings.readFile(paths.forbidden);
  const cfg = await window.chromexSettings.apiGet("/config");
  threshold.value = cfg.threshold ?? 0.72;
  thresholdVal.textContent = Number(threshold.value).toFixed(2);
}

document.getElementById("save").addEventListener("click", async () => {
  await window.chromexSettings.writeFile(paths.forbidden, forbidden.value);
  await window.chromexSettings.apiPostConfig({
    threshold: Number(threshold.value),
    filter_enabled: true,
  });
  status.textContent = "Сохранено. Изменения тем подхватятся за ~5 сек.";
});

document.getElementById("reload").addEventListener("click", load);

load().catch((e) => {
  status.style.color = "#c5221f";
  status.textContent = "Ошибка: " + e.message;
});
