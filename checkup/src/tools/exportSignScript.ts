import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { buildFilmingScript } from './signFilmingScript';

const rows = buildFilmingScript();
const out = process.argv[2] ?? 'scripts/out/sign-script.json';
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(rows, null, 2), 'utf8');
console.log(`촬영 문장 ${rows.length}개를 ${out} 에 저장했습니다.`);
