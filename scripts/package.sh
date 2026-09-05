#!/bin/sh
# Chrome ウェブストア提出用の ZIP を作る。
# 実行時に読み込まれるファイルだけを含め、ドキュメントや開発用ファイルは除外する。
#
#   sh scripts/package.sh
#
# 出力: dist/amazon-search-filter.zip

set -e
cd "$(dirname "$0")/.."

OUT_DIR="dist"
OUT="$OUT_DIR/amazon-search-filter.zip"

FILES="
manifest.json
popup.html
popup.js
dictionary.js
content.js
content.css
parametor.txt
icons/icon16.png
icons/icon32.png
icons/icon48.png
icons/icon128.png
"

# 必須ファイルの存在チェック
missing=""
for f in $FILES; do
  [ -f "$f" ] || missing="$missing $f"
done
if [ -n "$missing" ]; then
  echo "次のファイルがありません:$missing" >&2
  echo "アイコンは 'sh scripts/make-icons.sh' で生成できます。" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
rm -f "$OUT"
# shellcheck disable=SC2086
zip -q "$OUT" $FILES

echo "作成: $OUT"
unzip -l "$OUT"
