const form = document.getElementById("search-form");
const keywordInput = document.getElementById("keyword");
const fulfilledCheckbox = document.getElementById("amazon-fulfilled");
const directCheckbox = document.getElementById("amazon-direct");
const discountSelect = document.getElementById("discount");
const excludeSuspiciousCheckbox = document.getElementById("exclude-suspicious");
const genuineEnabledCheckbox = document.getElementById("genuine-enabled");
const genuineCategorySelect = document.getElementById("genuine-category");
const showPanelCheckbox = document.getElementById("show-panel");

// 永続化する設定の既定値。キーワードは保存しない。
const SETTINGS_DEFAULTS = {
  amazonFulfilled: false,
  amazonDirect: false,
  discount: "",
  excludeSuspicious: true,
  genuineEnabled: false,
  genuineCategory: "",
  showPanel: true,
};

// カテゴリ選択肢を辞書から生成
function populateCategoryOptions() {
  if (typeof GENUINE_DICTIONARY === "undefined") return;
  for (const [key, value] of Object.entries(GENUINE_DICTIONARY.categories)) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = value.label;
    genuineCategorySelect.appendChild(option);
  }
}

function currentSettings() {
  return {
    amazonFulfilled: fulfilledCheckbox.checked,
    amazonDirect: directCheckbox.checked,
    discount: discountSelect.value,
    excludeSuspicious: excludeSuspiciousCheckbox.checked,
    genuineEnabled: genuineEnabledCheckbox.checked,
    genuineCategory: genuineCategorySelect.value,
    showPanel: showPanelCheckbox.checked,
  };
}

function applySettings(settings) {
  fulfilledCheckbox.checked = settings.amazonFulfilled;
  directCheckbox.checked = settings.amazonDirect;
  discountSelect.value = settings.discount;
  excludeSuspiciousCheckbox.checked = settings.excludeSuspicious;
  genuineEnabledCheckbox.checked = settings.genuineEnabled;
  showPanelCheckbox.checked = settings.showPanel;
  // 保存済みカテゴリが辞書に存在しない場合に備えて存在チェック
  const hasCategory = Array.from(genuineCategorySelect.options).some(
    (o) => o.value === settings.genuineCategory
  );
  genuineCategorySelect.value = hasCategory ? settings.genuineCategory : "";
}

function saveSettings() {
  try {
    chrome.storage.sync.set(currentSettings());
  } catch (err) {
    console.warn("[Amazon Search Filter] 設定を保存できません:", err);
  }
}

function restoreSettings() {
  try {
    chrome.storage.sync.get(SETTINGS_DEFAULTS, (stored) => {
      if (chrome.runtime.lastError) {
        console.warn("[Amazon Search Filter] 設定を読み込めません:", chrome.runtime.lastError);
        return;
      }
      applySettings(stored);
    });
  } catch (err) {
    console.warn("[Amazon Search Filter] storage にアクセスできません:", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  populateCategoryOptions();
  restoreSettings();

  for (const el of [
    fulfilledCheckbox,
    directCheckbox,
    discountSelect,
    excludeSuspiciousCheckbox,
    genuineEnabledCheckbox,
    genuineCategorySelect,
    showPanelCheckbox,
  ]) {
    el.addEventListener("change", saveSettings);
  }
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

  // 「正規品」付加語とアソシエイトタグの付与は dictionary.js に集約
  const url = new URL(buildSearchUrl(keyword, currentSettings()));

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
