const form = document.getElementById("search-form");
const keywordInput = document.getElementById("keyword");
const fulfilledCheckbox = document.getElementById("amazon-fulfilled");
const discountSelect = document.getElementById("discount");

form.addEventListener("submit", (event) => {
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

  if (discountSelect.value) {
    url.searchParams.set("pct-off", `${discountSelect.value}-`);
  }

  chrome.tabs.create({ url: url.href });
});