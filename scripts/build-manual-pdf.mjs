// demo/manual/사용설명서.html 을 A4 PDF로 만든다.
//   node scripts/build-manual-pdf.mjs [출력경로]
// 한글 본문은 demo/manual/fonts 의 Noto Sans KR(woff2)을 @font-face로 심어 쓴다.
// reportlab 등 내장 폰트 방식은 한글 글리프가 없어 이 방식을 쓴다.
import { chromium } from 'playwright';
import { resolve } from 'path';
import { existsSync } from 'fs';

const html = resolve('demo/manual/사용설명서.html');
const out = resolve(process.argv[2] ?? 'demo/USER-MANUAL.pdf');

// 이 환경에는 Chromium이 /opt/pw-browsers 에 미리 설치되어 있다.
const preinstalled = '/opt/pw-browsers/chromium';
const browser = await chromium.launch(
  existsSync(preinstalled) ? { executablePath: preinstalled } : {},
);
const page = await browser.newPage();
const problems = [];
page.on('pageerror', (e) => problems.push('스크립트 오류: ' + e.message));
page.on('requestfailed', (r) => problems.push('불러오기 실패: ' + r.url().split('/').pop()));

await page.goto('file://' + html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);

const missing = await page.$$eval('img', (els) => els.filter((i) => !i.naturalWidth).map((i) => i.getAttribute('src')));
if (missing.length) problems.push('이미지 누락: ' + missing.join(', '));

await page.pdf({
  path: out,
  format: 'A4',
  printBackground: true,
  margin: { top: '16mm', bottom: '14mm', left: '15mm', right: '15mm' },
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate:
    '<div style="width:100%;font-family:sans-serif;font-size:7.6pt;color:#8a97ab;padding:0 15mm;display:flex;justify-content:space-between">' +
    '<span>수어 복약지도 시연 앱 사용 설명서 · KLcube</span><span class="pageNumber"></span></div>',
});
await browser.close();

console.log('생성:', out);
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
