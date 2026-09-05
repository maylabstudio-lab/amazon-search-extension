// Amazon.co.jp 用 content script
//
// 1. すべての amazon.co.jp ページに、折りたためるオプションパネルを常時表示する
//    （拡張機能アイコンを押さなくても、その場で設定を変えて検索・再検索できる）。
// 2. 検索結果ページ（/s）では、Amazon の商品名規約（ブランド名＋商品名＋仕様）に沿わない
//    出品（禁止ワードを含む／商品名の先頭が宣伝文句・装飾記号など）を
//      - 「正規品に絞る」ON  → 隠し、パネルに「N件を非表示」と「すべて表示」を出す
//      - OFF                 → 隠さず注意ラベルだけ付ける
//
// 除外を Amazon の検索クエリ（-キーワード）で行わないのは、amazon.co.jp が
// その構文を安定して解釈せず、結果が 0 件になることがあるため。表示側で隠す方が確実。
//
// Amazon の DOM はクラス名・属性が変わりやすいため、商品セレクタは候補配列で順に試す。

(() => {
  "use strict";

  const LOG_PREFIX = "[Amazon Search Filter]";

  const RESULT_ITEM_SELECTORS = [
    'div[data-component-type="s-search-result"]',
    'div.s-result-item[data-asin]:not([data-asin=""])',
    '.s-main-slot [data-asin]:not([data-asin=""])',
    '[data-asin]:not([data-asin=""])',
  ];

  const TITLE_SELECTORS = [
    "h2 a span",
    "h2 span",
    '[data-cy="title-recipe"] span',
    "a.a-link-normal span.a-text-normal",
    "h2",
  ];

  const RESULTS_CONTAINER_SELECTORS = [
    ".s-main-slot",
    ".s-search-results",
    '[data-component-type="s-search-results"]',
  ];

  const COLLAPSE_KEY = "asf-panel-collapsed";

  // --- 状態 ----------------------------------------------------------------
  const SETTINGS_DEFAULTS = {
    excludeSuspicious: true,
    genuineEnabled: false,
    genuineCategory: "",
    showPanel: true,
  };
  let settings = { ...SETTINGS_DEFAULTS };
  let excludeWords = [];
  let observer = null;
  let rescanTimer = null;
  let matchedItemsEver = false;

  const flagged = []; // { item, hits }
  let revealed = false;
  let panel = null;

  const onSearchPage =
    /(^|\/)s(\/|$)/.test(location.pathname) || new URL(location.href).searchParams.has("k");

  // サインイン・購入・決済・アカウント系のページにはパネルを出さない
  const panelAllowedHere =
    !/^\/(ap|gp\/buy|checkout|gp\/css|gp\/payment|gp\/help)\b/.test(location.pathname);

  if (
    typeof getExcludeWords !== "function" ||
    typeof buildSearchUrl !== "function" ||
    typeof titleViolatesPolicy !== "function"
  ) {
    console.warn(LOG_PREFIX, "dictionary.js が読み込まれていません。処理を中止します。");
    return;
  }

  // --- ユーティリティ -----------------------------------------------------
  function firstMatch(root, selectors) {
    for (const sel of selectors) {
      try {
        const el = root.querySelector(sel);
        if (el) return el;
      } catch (_) {
        /* 無効なセレクタは無視 */
      }
    }
    return null;
  }

  function allMatches(root, selectors) {
    for (const sel of selectors) {
      try {
        const els = root.querySelectorAll(sel);
        if (els.length) return { selector: sel, elements: Array.from(els) };
      } catch (_) {
        /* 無効なセレクタは無視 */
      }
    }
    return { selector: null, elements: [] };
  }

  function getItemTitle(item) {
    const el = firstMatch(item, TITLE_SELECTORS);
    return el ? (el.textContent || "").trim() : "";
  }

  function saveSettings(patch) {
    Object.assign(settings, patch);
    try {
      chrome.storage.sync.set(patch);
    } catch (err) {
      console.warn(LOG_PREFIX, "設定を保存できません:", err);
    }
  }

  // --- 注意ラベル / 非表示 ---------------------------------------------
  function labelText(hits, reason) {
    if (hits.length) return `非正規品の可能性: 「${hits.join("／")}」を含む表記`;
    return `商品名がAmazonの表記規則（ブランド名＋商品名＋仕様）に沿っていません（${reason}）`;
  }

  function labelItem(item, hits, reason) {
    if (item.querySelector(".asf-warning-label")) return;

    const label = document.createElement("div");
    label.className = "asf-warning-label";
    label.setAttribute("role", "note");
    label.textContent = labelText(hits, reason);

    const anchor = firstMatch(item, ["h2", '[data-cy="title-recipe"]']);
    if (anchor && anchor.parentElement) {
      anchor.parentElement.insertBefore(label, anchor);
    } else {
      item.insertBefore(label, item.firstChild);
    }
    item.classList.add("asf-flagged");
  }

  function renderFlagged() {
    const hide = settings.excludeSuspicious && !revealed;
    for (const { item, hits, reason } of flagged) {
      item.classList.toggle("asf-hidden", hide);
      if (!hide) labelItem(item, hits, reason);
    }
    updatePanelStatus();
  }

  function processItems(root) {
    const { elements } = allMatches(root, RESULT_ITEM_SELECTORS);
    if (!elements.length) return;

    for (const item of elements) {
      try {
        if (item.dataset.asfProcessed === "1") continue;

        const title = getItemTitle(item);
        if (!title) continue; // タイトル未読込。処理済みにせず次の変化で再評価する

        item.dataset.asfProcessed = "1";

        const hits = excludeWords.filter((w) => title.includes(w));
        const policy = titleViolatesPolicy(title);
        if (!hits.length && !policy.violated) continue;

        flagged.push({ item, hits, reason: policy.reason });
        if (settings.excludeSuspicious && !revealed) {
          item.classList.add("asf-hidden");
        } else {
          labelItem(item, hits, policy.reason);
        }
      } catch (err) {
        console.warn(LOG_PREFIX, "商品の処理に失敗:", err);
      }
    }
  }

  // --- オプションパネル ------------------------------------------------
  function buildPanel() {
    const el = document.createElement("div");
    el.id = "asf-panel";
    el.innerHTML = [
      '<div class="asf-panel-head">',
      '  <span class="asf-panel-title">正規品フィルタ</span>',
      '  <button type="button" class="asf-panel-collapse" aria-label="開閉">▾</button>',
      "</div>",
      '<div class="asf-panel-body">',
      '  <div class="asf-panel-row">',
      '    <input type="search" class="asf-kw" placeholder="キーワードで検索" autocomplete="off">',
      '    <button type="button" class="asf-search">検索</button>',
      "  </div>",
      '  <label class="asf-check"><input type="checkbox" class="asf-opt-exclude"> 正規品に絞る（規約外の商品名を非表示）</label>',
      '  <label class="asf-check"><input type="checkbox" class="asf-opt-genuine"> 「正規品」を検索語に追加</label>',
      '  <select class="asf-opt-category"><option value="">カテゴリ: 指定なし</option></select>',
      '  <div class="asf-panel-status" hidden></div>',
      '  <a class="asf-support" href="https://buymeacoffee.com/maylab" target="_blank" rel="noopener noreferrer">☕ 開発者を支援</a>',
      "</div>",
    ].join("");

    const kw = el.querySelector(".asf-kw");
    const excludeCb = el.querySelector(".asf-opt-exclude");
    const genuineCb = el.querySelector(".asf-opt-genuine");
    const categorySel = el.querySelector(".asf-opt-category");

    for (const [key, value] of Object.entries(GENUINE_DICTIONARY.categories)) {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = "カテゴリ: " + value.label;
      categorySel.appendChild(opt);
    }

    if (onSearchPage) {
      kw.value = new URL(location.href).searchParams.get("k") || "";
    }

    const doSearch = () => {
      const term = kw.value.trim();
      if (!term) {
        kw.focus();
        return;
      }
      window.location.assign(buildSearchUrl(term, settings));
    };
    el.querySelector(".asf-search").addEventListener("click", doSearch);
    kw.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSearch();
    });

    excludeCb.addEventListener("change", () => {
      revealed = false;
      saveSettings({ excludeSuspicious: excludeCb.checked });
      renderFlagged();
    });
    genuineCb.addEventListener("change", () => {
      saveSettings({ genuineEnabled: genuineCb.checked });
    });
    categorySel.addEventListener("change", () => {
      saveSettings({ genuineCategory: categorySel.value });
      excludeWords = getExcludeWords(settings.genuineCategory);
      scan();
    });

    el.querySelector(".asf-panel-collapse").addEventListener("click", () => {
      const collapsed = el.getAttribute("data-collapsed") === "true";
      setCollapsed(el, !collapsed);
    });

    let startCollapsed = false;
    try {
      startCollapsed = localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch (_) {
      /* localStorage 不可なら展開状態で開始 */
    }
    setCollapsed(el, startCollapsed);

    return el;
  }

  function setCollapsed(el, collapsed) {
    el.setAttribute("data-collapsed", String(collapsed));
    el.querySelector(".asf-panel-collapse").textContent = collapsed ? "▸" : "▾";
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch (_) {
      /* 保存できなくても動作に影響なし */
    }
  }

  function syncPanelControls() {
    if (!panel) return;
    panel.querySelector(".asf-opt-exclude").checked = settings.excludeSuspicious;
    panel.querySelector(".asf-opt-genuine").checked = settings.genuineEnabled;
    const sel = panel.querySelector(".asf-opt-category");
    const exists = Array.from(sel.options).some((o) => o.value === settings.genuineCategory);
    sel.value = exists ? settings.genuineCategory : "";
  }

  function updatePanelStatus() {
    if (!panel) return;
    const status = panel.querySelector(".asf-panel-status");
    const count = flagged.length;

    if (!onSearchPage || !count) {
      status.hidden = true;
      status.textContent = "";
      return;
    }
    status.hidden = false;
    status.textContent = "";

    const text = document.createElement("span");
    if (settings.excludeSuspicious) {
      text.textContent = revealed
        ? `規約外の出品 ${count} 件を表示中`
        : `規約外の出品 ${count} 件を非表示`;
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "asf-reveal";
      toggle.textContent = revealed ? "再度隠す" : "すべて表示";
      toggle.addEventListener("click", () => {
        revealed = !revealed;
        renderFlagged();
      });
      status.appendChild(text);
      status.appendChild(toggle);
    } else {
      text.textContent = `規約外の出品 ${count} 件に注意ラベル`;
      status.appendChild(text);
    }
  }

  function ensurePanel() {
    if (!settings.showPanel || !panelAllowedHere) {
      if (panel) {
        panel.remove();
        panel = null;
      }
      return;
    }
    if (panel && document.body.contains(panel)) {
      syncPanelControls();
      updatePanelStatus();
      return;
    }
    panel = buildPanel();
    document.body.appendChild(panel);
    syncPanelControls();
    updatePanelStatus();
  }

  // --- 走査 ---------------------------------------------------------
  function scan() {
    try {
      ensurePanel();
      if (!onSearchPage) return;

      const { elements } = allMatches(document, RESULT_ITEM_SELECTORS);
      if (elements.length) {
        matchedItemsEver = true;
        processItems(document);
      }
      updatePanelStatus();
    } catch (err) {
      console.warn(LOG_PREFIX, "走査中にエラー:", err);
    }
  }

  function run() {
    scan();

    const target =
      (onSearchPage && firstMatch(document, RESULTS_CONTAINER_SELECTORS)) || document.body;
    if (observer) observer.disconnect();
    observer = new MutationObserver(() => {
      clearTimeout(rescanTimer);
      rescanTimer = setTimeout(scan, 200);
    });
    observer.observe(target, { childList: true, subtree: true });

    if (onSearchPage) {
      setTimeout(() => {
        if (!matchedItemsEver) {
          console.warn(
            LOG_PREFIX,
            "検索結果の商品要素が見つかりませんでした。AmazonのDOM構造が変わった可能性があります。"
          );
        }
      }, 5000);
    }
  }

  // --- 起動 -------------------------------------------------------
  try {
    chrome.storage.sync.get({ ...SETTINGS_DEFAULTS }, (stored) => {
      if (chrome.runtime.lastError) {
        console.warn(LOG_PREFIX, "設定の読み込みに失敗:", chrome.runtime.lastError);
      } else {
        settings = stored;
      }
      excludeWords = getExcludeWords(settings.genuineCategory);
      run();
    });
  } catch (err) {
    console.warn(LOG_PREFIX, "storage にアクセスできません。共通設定で実行します:", err);
    excludeWords = getExcludeWords("");
    run();
  }

  // 設定変更（ポップアップやパネルからの保存）を反映
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync") return;
      const keys = ["excludeSuspicious", "genuineCategory", "genuineEnabled", "showPanel"];
      if (!keys.some((k) => changes[k])) return;

      for (const k of keys) {
        if (changes[k]) settings[k] = changes[k].newValue;
      }
      excludeWords = getExcludeWords(settings.genuineCategory);
      ensurePanel();
      renderFlagged();
      scan();
    });
  } catch (_) {
    /* onChanged 未対応環境は無視 */
  }
})();
