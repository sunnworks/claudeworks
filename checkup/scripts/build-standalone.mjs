#!/usr/bin/env node
/**
 * dist/ 빌드 결과를 index.html 한 파일로 합친다.
 *
 * - CSS·JS 를 본문에 넣는다. (file:// 로 열면 외부 module 스크립트를 못 읽는 브라우저가 있다)
 * - 수어영상은 base64 로 넣고 실행 시 Blob 주소로 바꾼다. 휴대전화 브라우저가 아주 긴 data: 주소를
 *   재생하지 못하는 문제를 피하기 위해서다.
 */
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const dist = join(root, 'dist');
const output = resolve(process.argv[2] ?? join(root, 'dist-standalone', 'index.html'));

const html = readFileSync(join(dist, 'index.html'), 'utf8');
const assets = readdirSync(join(dist, 'assets'));
const cssFile = assets.find((name) => name.endsWith('.css'));
const jsFile = assets.find((name) => name.endsWith('.js'));
if (!cssFile || !jsFile) throw new Error('dist/assets 에서 css·js 를 찾지 못했습니다. 먼저 npm run build 를 실행하세요.');

const css = readFileSync(join(dist, 'assets', cssFile), 'utf8');
const js = readFileSync(join(dist, 'assets', jsFile), 'utf8');

const videoDir = join(root, 'public', 'sign-samples');
const videos = Object.fromEntries(
  readdirSync(videoDir)
    .filter((name) => name.endsWith('.mp4'))
    .map((name) => [name, `data:video/mp4;base64,${readFileSync(join(videoDir, name)).toString('base64')}`]),
);

const embed = `<script>window.__KSL_EMBEDDED_VIDEOS__=${JSON.stringify(videos)};</script>`;

// replace() 의 치환문자열은 $& · $` 같은 패턴을 해석하므로 반드시 함수로 넘긴다.
// CSS·JS 안의 $ 문자가 깨지면 스크립트 전체가 문법오류가 된다.
let out = html
  .replace(/<script type="module"[^>]*src="[^"]*"[^>]*><\/script>/, () => '')
  .replace(/<link rel="stylesheet"[^>]*href="[^"]*"[^>]*>/, () => `<style>${css}</style>`)
  .replace('</body>', () => `${embed}\n<script>${js}</script>\n</body>`);

// 단일 파일임을 사람이 알아볼 수 있게 표시
out = out.replace('</head>', () => '  <meta name="build" content="standalone-single-file" />\n  </head>');

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, out, 'utf8');

const mb = (Buffer.byteLength(out, 'utf8') / 1024 / 1024).toFixed(2);
console.log(`생성: ${output} (${mb} MB, 수어영상 ${Object.keys(videos).length}편 포함)`);
