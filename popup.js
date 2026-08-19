const form = document.getElementById("search-form");
const keywordInput = document.getElementById("keyword");
const fulfilledCheckbox = document.getElementById("amazon-fulfilled");
const directCheckbox = document.getElementById("amazon-direct");
const discountSelect = document.getElementById("discount");

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