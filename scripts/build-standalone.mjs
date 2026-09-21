// demo/index.html 의 수어영상·약봉투 이미지를 파일 안에 그대로 심어
// 외부 파일이 전혀 필요 없는 index.html 한 장을 만든다.
//   node scripts/build-standalone.mjs <출력경로>
//
// 왜 필요한가: 휴대전화나 태블릿에서 압축을 풀고 열면, 파일 관리자가 HTML을
// content:// 주소로 띄우는 경우가 있어 같은 폴더의 mp4·svg를 찾지 못한다.
// 그러면 수어영상이 재생되지 않고 그림 아바타로 넘어간다. 매체를 파일 안에
// 심어 두면 어떤 방식으로 열어도 그대로 재생된다.
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const src = resolve('demo/index.html');
const out = resolve(process.argv[2] ?? 'dist/index.html');

const MEDIA = [
  ...[1, 2, 3, 4, 5].map((n) => ({ path: `avatar-samples/sign-${n}.mp4`, from: `public/avatar-samples/sign-${n}.mp4`, type: 'video/mp4' })),
  ...['regular', 'asneeded', 'blur', 'glare', 'table', 'handwritten'].map((n) => ({
    path: `samples/bag-${n}.svg`, from: `public/samples/bag-${n}.svg`, type: 'image/svg+xml',
  })),
];

let html = readFileSync(src, 'utf8');
let inlined = 0;
for (const m of MEDIA) {
  const before = html.split(m.path).length - 1;
  if (before === 0) throw new Error(`참조를 찾지 못했습니다: ${m.path}`);
  const data = `data:${m.type};base64,${readFileSync(resolve(m.from)).toString('base64')}`;
  html = html.split(m.path).join(data);
  inlined += before;
}
if (/(avatar-samples|samples)\//.test(html)) {
  throw new Error('아직 바깥 파일을 가리키는 경로가 남아 있습니다');
}
writeFileSync(out, html);
console.log(`생성: ${out} (${(Buffer.byteLength(html) / 1048576).toFixed(1)}MB, 매체 ${MEDIA.length}개 · 참조 ${inlined}곳)`);
