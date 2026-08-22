# Amazon Search Filter

Amazonの検索パラメータをポップアップから指定して、条件付き検索をすばやく実行するChrome拡張機能です。

## できること

- キーワード検索
- 「Amazonが発送する商品」フィルターの適用
- `parametor.txt` に定義したAmazon直販商品フィルターの適用
- 10%、20%、30%、40%、50%以上の割引率フィルター
- 検索結果を新しいタブで開く
- 開発者への任意のコーヒー1杯分の支援

検索URLには、次のAmazonパラメータを使用します。

| GUI項目 | パラメータ | 内容 |
| --- | --- | --- |
| 検索キーワード | `k` | 検索語 |
| Amazonが発送する商品 | `rh=p_6:AN1VRQENFRJNWY` | Amazon発送の商品に絞り込み |
| Amazon直販商品 | `parametor.txt` の定義 | 定義ファイルのパラメータを適用 |
| 割引率 | `pct-off` | 指定した割合以上の割引商品に絞り込み |

### パラメータ定義の追加

`parametor.txt` は、パラメータ本体を `&名前=値`、説明を次の行に `--` で記述します。

```text
&emi=AN1VRQENFRJN5
-- amazon直販商品への絞り込み
```

現在はファイル内の最初のパラメータを「Amazon直販商品」に適用します。今後、複数の定義をGUIへ追加する場合は、定義ファイルを項目ごとの構造へ拡張します。

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

## 開発者を支援するリンクの設定

この拡張機能は、機能を制限せず無料で提供し、利用者が任意のタイミングで支援できる形にしています。支援リンクはポップアップの「開発者を支援する」から新しいタブで開きます。

1. Buy Me a Coffeeなどの支援サービスで自分のページを作成します。
2. 支援ページURLは `https://buymeacoffee.com/maylab` に設定済みです。支援先を変更する場合は、`popup.html` のリンクを置き換えてください。
3. Chromeの拡張機能一覧で「更新」をクリックします。

支援サービスのURLや決済情報は拡張機能内に保存・処理しません。支援ページ側で決済が行われます。

## 外部バックエンド（現在は使用しません）

以前検討した外部バックエンドとExtensionPayは、寄付型モデルへの変更に伴い現在の拡張機能では使用しません。`backend/` 関連ファイルも削除済みです。


## ファイル構成

```text
amazon-search-extension/
├── manifest.json  # Chrome拡張機能の定義
├── popup.html     # ポップアップのUI
├── popup.js       # 検索URL生成とタブ遷移
├── parametor.txt  # Amazon検索パラメータの定義
└── README.md      # 導入・利用手順
```

## 注意事項

- 現在の検索先はAmazon.co.jpです。
- `popup.js` の `associateTag` は仮値 `xxxx-22` です。公開前にAmazonから発行された実際のアソシエイトタグへ変更してください。
- Amazon側の仕様変更により、検索パラメータの動作が変わる場合があります。
- この拡張機能は商品情報を収集・保存せず、検索URLを生成してAmazonを開くだけです。# amazon-search-extension
