#!/usr/bin/env bash
# 약사님 PC에서 index.html 더블클릭만으로 열리는 배포용 ZIP을 만든다.
# 수어영상·약봉투 예시 이미지는 public/ 에 있는 것을 그대로 담는다.
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="${1:-dist}"
NAME="수어복약지도데모"
rm -rf "$OUT/$NAME" "$OUT/$NAME.zip"
mkdir -p "$OUT/$NAME"

cp demo/index.html "$OUT/$NAME/index.html"
cp demo/먼저읽어주세요.txt "$OUT/$NAME/먼저읽어주세요.txt"
cp -r public/avatar-samples "$OUT/$NAME/avatar-samples"
cp -r public/samples "$OUT/$NAME/samples"

(cd "$OUT" && zip -qr "$NAME.zip" "$NAME")
echo "생성: $OUT/$NAME.zip"
