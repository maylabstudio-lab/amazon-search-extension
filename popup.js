const form = document.getElementById("search-form");
const keywordInput = document.getElementById("keyword");
const fulfilledCheckbox = document.getElementById("amazon-fulfilled");
const directCheckbox = document.getElementById("amazon-direct");
const discountSelect = document.getElementById("discount");
const presetNameInput = document.getElementById("preset-name");
const presetList = document.getElementById("preset-list");
const presetMessage = document.getElementById("preset-message");
const associateTag = "xxxx-22";

async function isPro() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "get-pro-status" });
    if (response && typeof response.isProUser === "boolean") return response.isProUser;
  } catch {
    // バックグラウンドが利用できない場合はローカル状態を使います。
  }
  const { isProUser = false } = await chrome.storage.local.get("isProUser");
  return isProUser === true;
}

function showProMessage() {
  presetMessage.textContent = "この機能はプロ版です。決済設定後に利用できます。";
}

function getCurrentOptions() {
  return {
    amazonFulfilled: fulfilledCheckbox.checked,
    amazonDirect: directCheckbox.checked,
    discount: discountSelect.value
  };
}

function applyOptions(options) {
  fulfilledCheckbox.checked = options.amazonFulfilled === true;
  directCheckbox.checked = options.amazonDirect === true;
  discountSelect.value = options.discount || "";
}

async function loadPresets() {
  const { presets = [] } = await chrome.storage.local.get("presets");
  presetList.replaceChildren();
  for (const preset of presets) {
    const row = document.createElement("div");
    row.className = "preset-item";
    const loadButton = document.createElement("button");
    loadButton.className = "preset-load";
    loadButton.type = "button";
    loadButton.textContent = preset.name;
    loadButton.addEventListener("click", () => applyOptions(preset.options));
    const deleteButton = document.createElement("button");
    deleteButton.className = "secondary";
    deleteButton.type = "button";
    deleteButton.textContent = "削除";
    deleteButton.addEventListener("click", async () => {
      await chrome.storage.local.set({ presets: presets.filter((item) => item.id !== preset.id) });
      loadPresets();
    });
    row.append(loadButton, deleteButton);
    presetList.append(row);
  }
}

document.getElementById("save-preset").addEventListener("click", async () => {
  if (!(await isPro())) {
    showProMessage();
    return;
  }
  const name = presetNameInput.value.trim();
  if (!name) {
    presetMessage.textContent = "プリセット名を入力してください。";
    presetNameInput.focus();
    return;
  }
  const { presets = [] } = await chrome.storage.local.get("presets");
  const nextPresets = [...presets.filter((preset) => preset.name !== name), {
    id: crypto.randomUUID(),
    name,
    options: getCurrentOptions()
  }];
  await chrome.storage.local.set({ presets: nextPresets });
  presetNameInput.value = "";
  presetMessage.textContent = "プリセットを保存しました。";
  loadPresets();
});

async function loadParameterDefinitions() {
  const response = await fetch("parametor.txt");
  if (!response.ok) {
    throw new Error(`パラメータ定義を読み込めません: ${response.status}`);
  }

  const definitions = {};
  const lines = (await response.text()).split(/\r?\n/);
  for (const line of lines) {
    const definition = line.trim();
    if (!definition || definition.startsWith("--")) continue;

    const separator = definition.indexOf("=");
    if (separator <= 1 || !definition.startsWith("&")) continue;

    const name = definition.slice(1, separator);
    const value = decodeURIComponent(definition.slice(separator + 1));
    definitions[name] = value;
  }
  return definitions;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const keyword = keywordInput.value.trim();
  if (!keyword) {
    keywordInput.focus();
    return;
  }

  const url = new URL("https://www.amazon.co.jp/s");
  url.searchParams.set("k", keyword);
  url.searchParams.set("tag", associateTag);

  if (fulfilledCheckbox.checked) {
    url.searchParams.set("rh", "p_6:AN1VRQENFRJNWY");
  }

  if (directCheckbox.checked) {
    const definitions = await loadParameterDefinitions();
    const directParameter = Object.entries(definitions)[0];
    if (directParameter) {
      url.searchParams.set(directParameter[0], directParameter[1]);
    }
  }

  if (discountSelect.value) {
    url.searchParams.set("pct-off", `${discountSelect.value}-`);
  }

  chrome.tabs.create({ url: url.href });
});

loadPresets();