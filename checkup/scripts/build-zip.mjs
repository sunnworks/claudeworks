#!/usr/bin/env node
/**
 * 배포용 ZIP 을 만든다. 압축을 풀고 index.html 을 더블클릭하면 바로 실행된다.
 * ZIP 안의 파일명은 모두 영문으로 둔다. 한글 파일명은 Windows 탐색기에서 깨질 수 있다.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const outDir = join(root, 'dist-zip');
const name = 'deaf-checkup-sign-questionnaire-demo';
const folder = join(outDir, name);

rmSync(outDir, { recursive: true, force: true });
mkdirSync(folder, { recursive: true });

cpSync(join(root, 'dist-standalone', 'index.html'), join(folder, 'index.html'));

// 영상은 index.html 안에 이미 들어 있다. 그래도 원본 파일을 함께 넣어
// ZIP 안을 열었을 때 수어영상이 들어 있는지 눈으로 확인할 수 있게 한다.
cpSync(join(root, 'public', 'sign-samples'), join(folder, 'sign-samples'), { recursive: true });

writeFileSync(
  join(folder, 'HOW-TO-START.txt'),
  [
    '농인용 건강검진 수어 사전문진 데모 — 실행 방법',
    '',
    '1. 이 폴더의 index.html 을 더블클릭합니다.',
    '2. 인터넷 연결이 없어도 됩니다. 수어영상은 index.html 안에 들어 있습니다.',
    '3. 크롬, 엣지, 사파리에서 열립니다.',
    '',
    '폴더 안에 무엇이 있나요',
    '- index.html : 문진표 화면. 수어영상 8편이 이 파일 안에 들어 있습니다.',
    '- sign-samples : 같은 수어영상의 원본 파일입니다. 확인용이며 실행에는 필요 없습니다.',
    '- HOW-TO-START.txt : 이 파일입니다.',
    '',
    '주의',
    '- 시연용 데모입니다. 병원이나 국민건강보험공단으로 전송되지 않습니다.',
    '- 답변은 저장되지 않습니다. 새로고침하거나 창을 닫으면 모두 사라집니다.',
    '- 진단하지 않습니다. 표시되는 점수는 의료진 확인이 필요한지 알려 주는 용도입니다.',
    '- 현재 수어영상은 문항별 번역본이 아닌 샘플영상이며 화면에 그렇게 표시됩니다.',
    '',
    '정신건강 위기 상황에서는 119 또는 112, 자살예방상담전화 109로 연락하세요.',
    '',
  ].join('\r\n'),
  'utf8',
);

execFileSync('zip', ['-qr', `${name}.zip`, name], { cwd: outDir, stdio: 'inherit' });
console.log(`생성: ${join(outDir, `${name}.zip`)}`);
