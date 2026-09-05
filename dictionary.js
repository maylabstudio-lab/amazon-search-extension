// 正規品クエリ辞書
//
// popup.js（検索URL生成）と content.js（検索結果ページでの出品の非表示・注意ラベル）の
// 両方から参照する。ES モジュールにはせず、グローバルに GENUINE_DICTIONARY を定義する。
//   - popup.html は <script src="dictionary.js"> を popup.js より前に読み込む
//   - content_scripts は manifest.json で ["dictionary.js", "content.js"] の順に読み込む
//
// queries       … 「正規品ワードを追加」が有効なときに検索語へ足す語
// excludeWords  … 検索結果ページで、この語を商品タイトルに含む出品を非表示
//                 （設定オフ時は注意ラベル）にするための判定語
//
// excludeWords はタイトルの部分一致で出品を隠すため、正規品まで巻き込む
// 一般的すぎる語（例:「風」「カスタム」「セット」）は入れない。精度は初期値で、
// 実検索での調整が前提。

const GENUINE_DICTIONARY = {
  // カテゴリを問わず常に付く共通部分。
  common: {
    label: "共通",
    // 「正規品ワードを追加」で付加する語
    queries: ["正規品", "国内正規品"],
    // カテゴリ未選択でも常に除外してよい語
    excludeWords: [
      "スーパーコピー",
      "コピー品",
      "偽物",
      "模倣品",
      "レプリカ",
      "海賊版",
      "令和最新版",
      "令和最新モデル",
    ],
  },

  // カテゴリ別。キーは storage に保存する識別子。日常的な言葉でラベル付けし、
  // 一般的な商品がどれかに収まるよう広めに用意する。
  categories: {
    appliance: {
      label: "家電・PC・スマホ周辺機器",
      queries: ["国内正規品", "メーカー保証", "純正"],
      excludeWords: ["互換品", "互換バッテリー", "ノーブランド", "海外版", "並行輸入", "粗悪品"],
    },
    cosme: {
      label: "化粧品・スキンケア",
      queries: ["正規品"],
      excludeWords: ["テスター", "小分け", "使いかけ", "並行輸入", "海外版"],
    },
    brand: {
      label: "ブランド品・ファッション",
      queries: ["正規品", "国内正規品"],
      excludeWords: ["スーパーコピー", "レプリカ", "類似品", "n級", "N級", "コピー品"],
    },
    watch: {
      label: "時計・アクセサリー",
      queries: ["正規品", "国内正規品", "メーカー保証"],
      excludeWords: ["スーパーコピー", "レプリカ", "n級", "N級", "類似品", "コピー品", "ノーブランド"],
    },
    supplement: {
      label: "サプリ・健康食品",
      queries: ["国内正規品"],
      excludeWords: ["個人輸入", "並行輸入", "海外版", "国内未発売"],
    },
    sports: {
      label: "スポーツ・アウトドア・シューズ",
      queries: ["正規品"],
      excludeWords: ["レプリカ", "類似品", "スーパーコピー", "偽物"],
    },
    toy: {
      label: "玩具・ホビー・ベビー用品",
      queries: ["正規品", "国内正規品"],
      excludeWords: ["模造品", "類似品", "海外版", "並行輸入", "ノーブランド"],
    },
    food: {
      label: "食品・飲料",
      queries: ["国内正規品"],
      excludeWords: ["並行輸入", "個人輸入", "海外版", "訳あり", "賞味期限間近"],
    },
    daily: {
      label: "日用品・キッチン用品",
      queries: ["正規品"],
      excludeWords: ["ノーブランド", "類似品", "模造品", "並行輸入"],
    },
  },
};

// 設定から、検索キーワードへ付加する「正規品」系の語の配列を返す。
//
// settings = {
//   genuineEnabled: boolean,           「正規品」「国内正規品」等を検索語へ足すか
//   genuineCategory: ""|<categories のキー>,
// }
function buildGenuineQueryWords(settings) {
  const s = settings || {};
  if (!s.genuineEnabled) return [];

  const words = [...GENUINE_DICTIONARY.common.queries];

  const category = s.genuineCategory && GENUINE_DICTIONARY.categories[s.genuineCategory];
  if (category) {
    for (const w of category.queries) words.push(w);
  }

  return words.filter((w, i) => words.indexOf(w) === i);
}

// 指定カテゴリ（＋共通）の除外ワード配列を返す。
// 結果ページで該当出品を非表示／注意ラベルにする判定に使う。
function getExcludeWords(categoryKey) {
  const words = [...GENUINE_DICTIONARY.common.excludeWords];
  const category = categoryKey && GENUINE_DICTIONARY.categories[categoryKey];
  if (category) {
    for (const w of category.excludeWords) words.push(w);
  }
  return words.filter((w, i) => words.indexOf(w) === i);
}

// Amazon の商品名ガイドライン（おおよそ「ブランド名 ＋ 商品名 ＋ 仕様・型番・カラー・サイズ」）
// に沿っているかを、商品名の「先頭」だけ見て判定するためのデータ。
// ブランド名で始まるべき位置に、装飾記号・宣伝文句・年号アピールが来ていれば規則違反とみなす。
const TITLE_POLICY = {
  // 先頭に来たら規則違反とみなす装飾記号（絵文字は別途正規表現で判定）
  leadingSymbols: [
    "★", "☆", "◆", "◇", "■", "□", "●", "○", "◎", "※", "♪", "→", "⇒", "≪", "《",
    "✅", "✔", "❤", "🔥", "✨", "💯", "‼", "!!", "!!!", "【★", "\\",
  ],
  // 先頭（先頭カッコがあればその直後）がこれで始まれば宣伝文句とみなす。
  // 先頭カッコの中身にこれらが含まれる場合も宣伝カッコとみなす。
  leadingPromoPhrases: [
    "令和最新", "令和", "最新版", "最新モデル", "最新型", "最新式", "新登場", "新発売", "業界最", "世界最",
    "楽天", "期間限定", "数量限定", "本日限定", "当日限定", "タイムセール", "在庫処分", "在庫一掃",
    "送料無料", "即納", "即日発送", "あす楽", "訳あり", "大特価", "特価", "激安", "超特価",
    "ポイント消化", "ポイント消費", "話題", "人気", "売れ筋", "ランキング", "第1位", "NO.1", "No.1",
    "最安", "最強", "高コスパ", "コスパ最強", "爆売れ", "SNSで話題", "神",
    "高品質", "高級", "高性能", "高機能", "プロ仕様", "本格",
  ],
  // 先頭カッコ（【】[] （） 《》 〈〉 「」 『』）の中身がこの正規表現に当たれば宣伝カッコとみなす。
  // 「正規」「保証」「代理店」などは正規表記でも使われるため含めない。
  promoBracketPattern:
    "(送料無料|あす楽|即日|翌日|タイムセール|ランキング|[0-9]+\\s*位|ポイント|クーポン|[0-9]+\\s*[%％]|OFF|割引|楽天|話題|人気|お得|数量限定|期間限定|本日限定|プレゼント|ギフト対応|爆買|神コスパ|最新|新型|20[0-9]{2}|令和)",
};

// 商品名が Amazon の表記規則に沿っていないと疑われるかを判定する。
// 戻り値: { violated: boolean, reason: string }
function titleViolatesPolicy(title) {
  const t = String(title || "").trim();
  if (!t) return { violated: false, reason: "" };

  // 1. 先頭が装飾記号
  for (const s of TITLE_POLICY.leadingSymbols) {
    if (t.startsWith(s)) return { violated: true, reason: `先頭に「${s}」` };
  }
  // 1'. 先頭が絵文字・矢印・各種記号（矢印, 技術記号, 装飾, 各種シンボル, 絵文字）
  if (
    /^[←-⇿⌀-⏿①-➿⬀-⯿\u{1F000}-\u{1FAFF}]/u.test(t)
  ) {
    return { violated: true, reason: "先頭が絵文字・記号" };
  }

  // 2. 先頭カッコの中身が宣伝的
  const bracket = t.match(/^\s*[【\[（(《〈「『]([^】\]）)》〉」』]{1,30})[】\]）)》〉」』]/);
  if (bracket) {
    const inner = bracket[1];
    const promoInBracket =
      new RegExp(TITLE_POLICY.promoBracketPattern, "i").test(inner) ||
      TITLE_POLICY.leadingPromoPhrases.some((p) => inner.includes(p));
    if (promoInBracket) {
      return { violated: true, reason: `先頭カッコ「${inner}」が宣伝文句` };
    }
  }

  // 3. 先頭（カッコがあればその後ろ）が年号アピール・宣伝フレーズ
  const head = (bracket ? t.slice(bracket[0].length) : t).trim();
  if (/^(20[0-9]{2}|令和\s*[0-9]?|平成\s*[0-9]{1,2})\s*年?\s*(最新|新春|春|夏|秋|冬|版|モデル|新)?/.test(head)) {
    return { violated: true, reason: "先頭が年号・最新アピール" };
  }
  for (const p of TITLE_POLICY.leadingPromoPhrases) {
    if (head.startsWith(p)) return { violated: true, reason: `先頭が「${p}」` };
  }

  return { violated: false, reason: "" };
}

// キーワードに「正規品」系の付加語を重複なく足した検索文字列を返す。popup.js で使う。
//
// 怪しい語の除外はここでは行わない。amazon.co.jp は「-キーワード」構文を安定して
// 解釈せず（結果が 0 件になることがある）、除外は検索結果ページ側で該当出品を
// 非表示にする方式（content.js）に任せる。
function applyGenuineQuery(keyword, settings) {
  const tokens = String(keyword || "")
    .split(/\s+/)
    .filter(Boolean);
  const has = (t) => tokens.includes(t);

  for (const w of buildGenuineQueryWords(settings)) {
    if (!has(w)) tokens.push(w);
  }

  return tokens.join(" ");
}

// Amazon アソシエイトのトラッキングID。
// v1 では空文字にして「タグを一切付けない」状態で公開する。
// アソシエイト・プログラムの規約上、ブラウザ拡張機能でのリンク付与は制限や審査の
// 対象になることがあるため、可否を確認し ID を取得できてから設定すること。
// 設定すると buildSearchUrl() が検索URLに &tag=<ID> を付ける。
// 有効化する場合は、あわせてストア掲載文・プライバシーポリシー・ポップアップに
// アフィリエイト利用の開示を戻すこと（RELEASE.md 参照）。
const ASSOCIATE_TAG = "";

// キーワードと設定から Amazon.co.jp の検索URL文字列を組み立てる。
// popup.js とページ内パネル（content.js）で共用。発送元・割引率などの追加条件は
// 呼び出し側が返り値の URL に足す。
function buildSearchUrl(keyword, settings) {
  const url = new URL("https://www.amazon.co.jp/s");
  url.searchParams.set("k", applyGenuineQuery(keyword, settings));
  if (ASSOCIATE_TAG) url.searchParams.set("tag", ASSOCIATE_TAG);
  return url.href;
}

// content_scripts / popup はグローバルを共有するため、明示的な export は不要。
// テスト等で参照できるよう、CommonJS 環境でのみ module.exports を用意する。
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    GENUINE_DICTIONARY,
    TITLE_POLICY,
    ASSOCIATE_TAG,
    buildGenuineQueryWords,
    getExcludeWords,
    titleViolatesPolicy,
    applyGenuineQuery,
    buildSearchUrl,
  };
}
