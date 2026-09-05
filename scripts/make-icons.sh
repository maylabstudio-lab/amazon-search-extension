#!/bin/sh
# icons/icon.svg から Chrome ウェブストア用の PNG（16/32/48/128px）を生成する。
# macOS の sips のみ使用（追加インストール不要）。
#
#   sh scripts/make-icons.sh
#
# 別デザインに差し替えるときは icons/icon.svg を編集して再実行する。

set -e
cd "$(dirname "$0")/.."

SRC="icons/icon.svg"
TMP="icons/.icon-1024.png"

command -v sips >/dev/null 2>&1 || {
  echo "sips が見つかりません。macOS 以外では rsvg-convert / ImageMagick 等で"
  echo "icons/icon.svg を 16,32,48,128px の PNG に書き出してください。" >&2
  exit 1
}

# いったん大きめにラスタライズしてから各サイズへ縮小する（縁がきれいに出る）
sips -s format png "$SRC" --out "$TMP" >/dev/null
sips -z 1024 1024 "$TMP" --out "$TMP" >/dev/null

for size in 16 32 48 128; do
  sips -z "$size" "$size" "$TMP" --out "icons/icon${size}.png" >/dev/null
  echo "icons/icon${size}.png"
done

rm -f "$TMP"
