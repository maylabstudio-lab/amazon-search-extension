# Amazon Search Filter

Amazonの検索パラメータをポップアップから指定して、条件付き検索をすばやく実行するChrome拡張機能です。

## できること

- キーワード検索
- 「Amazonが発送する商品」フィルターの適用
- `parametor.txt` に定義したAmazon直販商品フィルターの適用
- 10%、20%、30%、40%、50%以上の割引率フィルター
- 検索結果を新しいタブで開く
- プロ版で検索条件のプリセットを保存・読み込み・削除

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

## プロ版・ExtensionPayの設定

プロ版プリセットの保存には `chrome.storage.local` の `isProUser` フラグを使用します。現在のリポジトリは無料版として動作し、`isProUser` が `true` の場合だけプリセット保存を許可します。

決済を有効化する場合は、次の手順が必要です。

1. ExtensionPayでアプリを作成し、アプリIDを取得します。
2. ExtensionPayの公式ライブラリを `extpay.js` という名前でプロジェクト直下に配置します。
3. `background.js` の `REPLACE_WITH_EXTENSIONPAY_APP_ID` を取得したアプリIDに置き換えます。
4. `background.js` は `ExtPay(...).getUser()` の `user.paid` を確認し、`isProUser` を同期します。
5. `chrome://extensions` で拡張機能を更新して動作確認します。

アプリIDや決済状態をソースコードに直接公開しないでください。ExtensionPayの公式ドキュメントと利用規約、Chrome Web Storeの課金要件を確認してから公開してください。

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
- この拡張機能は商品情報を収集・保存せず、検索URLを生成してAmazonを開くだけです。