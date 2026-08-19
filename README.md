# Amazon Search Filter

Amazonの検索パラメータをポップアップから指定して、条件付き検索をすばやく実行するChrome拡張機能です。

## できること

- キーワード検索
- 「Amazonが発送する商品」フィルターの適用
- 10%、20%、30%、40%、50%以上の割引率フィルター
- 検索結果を新しいタブで開く

検索URLには、次のAmazonパラメータを使用します。

| GUI項目 | パラメータ | 内容 |
| --- | --- | --- |
| 検索キーワード | `k` | 検索語 |
| Amazonが発送する商品 | `rh=p_6:AN1VRQENFRJNWY` | Amazon発送の商品に絞り込み |
| 割引率 | `pct-off` | 指定した割合以上の割引商品に絞り込み |

## 導入方法

### 1. ファイルを用意する

このリポジトリをクローンするか、GitHubの「Code」からZIPでダウンロードして展開します。

```bash
git clone https://github.com/maylabstudio-lab/amazon-search-extension.git
cd amazon-search-extension
```

### 2. Chromeに読み込む

1. Google Chromeで `chrome://extensions` を開きます。
2. 右上の「デベロッパーモード」を有効にします。
3. 「パッケージ化されていない拡張機能を読み込む」をクリックします。
4. `manifest.json` が入っている `amazon-search-extension` フォルダを選択します。
5. 拡張機能一覧に「Amazon Search Filter」が表示されれば導入完了です。

## 使い方

1. Chromeのツールバーにある拡張機能アイコンをクリックします。
2. 「Amazon Search Filter」を選択し、必要な条件を指定します。
3. キーワードを入力して「Amazonで検索する」をクリックします。
4. Amazon.co.jpの検索結果が新しいタブで開きます。

拡張機能をツールバーへ固定すると、次回からすぐに開けます。

## ソースを変更した場合

`chrome://extensions` の拡張機能一覧で、この拡張機能の「更新」ボタンをクリックしてください。変更後の `manifest.json`、`popup.html`、`popup.js` が読み込まれます。

## ファイル構成

```text
amazon-search-extension/
├── manifest.json  # Chrome拡張機能の定義
├── popup.html     # ポップアップのUI
├── popup.js       # 検索URL生成とタブ遷移
└── README.md      # 導入・利用手順
```

## 注意事項

- 現在の検索先はAmazon.co.jpです。
- Amazon側の仕様変更により、検索パラメータの動作が変わる場合があります。
- この拡張機能は商品情報を収集・保存せず、検索URLを生成してAmazonを開くだけです。