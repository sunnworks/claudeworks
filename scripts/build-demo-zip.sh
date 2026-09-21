#!/usr/bin/env bash
# 약사님 PC에서 index.html 더블클릭만으로 열리는 배포용 ZIP을 만든다.
# 수어영상·약봉투 예시 이미지는 public/ 에 있는 것을 그대로 담는다.
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="${1:-dist}"
# ZIP 안의 이름은 전부 영문으로 둔다. 한글 파일명은 ZIP 규격상 인코딩 표시가
# 함께 저장되지 않으면 Windows 탐색기에서 깨져 압축이 제대로 풀리지 않는다.
NAME="KSL-sign-pharmacy-demo"
rm -rf "$OUT/$NAME" "$OUT/$NAME.zip"
mkdir -p "$OUT/$NAME"

cp demo/index.html "$OUT/$NAME/index.html"
cp demo/HOW-TO-START.txt "$OUT/$NAME/HOW-TO-START.txt"
cp demo/USER-MANUAL.pdf "$OUT/$NAME/USER-MANUAL.pdf"
cp -r public/avatar-samples "$OUT/$NAME/avatar-samples"
cp -r public/samples "$OUT/$NAME/samples"

# 이름에 한글이 없으므로 어떤 압축 프로그램에서도 그대로 풀린다
(cd "$OUT" && zip -qr "$NAME.zip" "$NAME")
echo "생성: $OUT/$NAME.zip"
