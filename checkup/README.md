# 농인용 건강검진 수어 사전문진 데모

성인 국가건강검진 사전문진을 **수어영상과 쉬운 한국어**로 확인하고 직접 답하는 작동형 데모입니다.
화면 시안이 아니라 **분기 규칙, 점수 계산, 답변 검토, 안전 플로우, 개인정보 안전선**이 실제로 동작합니다.

구현 근거: `농인용 건강검진 수어문진 서비스 기획설계서 v1.0` (부록 A~I) 및 `Claude Code 개발 지시문`.

> 시연용 데모입니다. 진단하지 않으며 병원이나 국민건강보험공단으로 전송하지 않습니다.
> 답변은 브라우저 메모리에만 있고 새로고침하면 사라집니다.

---

## 1. 실행 방법

### (1) 개발자 PC — Node.js 20 이상

```bash
cd checkup
npm install
npm run dev            # http://localhost:5173
npm run dev:lan        # 같은 와이파이의 태블릿·휴대폰에서 http://<PC의 IP>:5173
```

### (2) 발표·시연용 — ZIP을 풀고 index.html 더블클릭

```bash
npm run build:zip      # dist-zip/deaf-checkup-sign-questionnaire-demo.zip 생성
```

* ZIP을 풀면 `index.html` 한 개와 `HOW-TO-START.txt`만 들어 있습니다.
* `index.html`을 더블클릭하면 **인터넷 연결 없이** 바로 실행됩니다. 수어영상 3편이 파일 안에 들어 있습니다.
* ZIP 안의 파일명은 모두 영문입니다. 한글 파일명은 Windows 탐색기에서 깨질 수 있어 쓰지 않았습니다.
* 저장소에 미리 만들어 둔 결과물: `demo/index.html`, `demo/deaf-checkup-sign-questionnaire-demo.zip`

### (3) 웹 배포 — GitHub Pages

`main` 계열 브랜치에 push하면 `.github/workflows/deploy-checkup.yml`이 `checkup/dist`를 GitHub Pages로 올립니다.
저장소 **Settings → Pages → Source 를 GitHub Actions** 로 한 번 설정해야 동작합니다.

---

## 2. 검증 명령

| 명령 | 내용 |
| --- | --- |
| `npm run typecheck` | TypeScript 타입 검사 |
| `npm run test` | 규칙엔진·점수계산·검증·문항데이터 단위테스트 |
| `npm run test:e2e` | 4개 시나리오 완주와 인수기준 E2E (데스크톱 1280 / 모바일 360) |
| `npm run build` | 타입검사 + 프로덕션 빌드 |
| `npm run verify` | typecheck + test + build |

E2E는 Chromium이 필요합니다. 이 저장소가 실행되는 환경처럼 브라우저 경로가 다르면
`CHROMIUM_PATH=/경로/chrome npm run test:e2e` 로 지정합니다.

> 참고: Playwright 기본 Chromium은 H.264 코덱이 없어 E2E 화면에서는 수어영상 대신 자막 대체화면이 나옵니다.
> Chrome, Edge, Safari 등 실제 브라우저에서는 정상 재생됩니다. 이 동작 자체가 AC-08(재생 실패 시 자막·재시도) 검증입니다.

---

## 3. 화면 흐름

| ID | 화면 | 내용 |
| --- | --- | --- |
| S01 | 서비스 안내 | 데모 한계, 비저장 고지, 수어 지원 설명 |
| S02 | 시나리오 선택 | A 45세 남성 / B 50세 여성 / C 28세 성인 / D 70세 성인 |
| S03 | 작성자와 지원 설정 | 본인·대리작성, 선호 의사소통 방법 |
| S04 | 모듈 안내 | 적용 모듈, 문항 수, 예상 소요시간(추정) |
| S05·S06 | 문항 작성 | 수어영상 + 공식문구 + 쉬운설명 + 응답, 숫자·단위 검증 |
| S07 | 정신건강 안전안내 | PHQ-9 9번 1점 이상이면 즉시 표시 |
| S08 | 모듈 완료 | 누락 문항 안내 |
| S09 | 전체 검토 | 모듈별 답변 요약과 문항 단위 수정 |
| S10 | 데모 확인표 | 미제출 표시, 인쇄 |

---

## 4. 수어영상 처리 방식 (중요)

현재 데모에는 **문항별로 검수 완료된 한국수어 영상이 없습니다.**
그래서 실제 촬영된 **샘플 수어영상 3편을 무작위로 재생**하고, 화면에 항상
`샘플 수어영상 · 이 문항의 번역본이 아닙니다` 배지를 표시합니다.
설계서의 "가짜 수어영상을 생성하지 않는다"(부록 I) 원칙을 지키기 위한 처리입니다.

* 영상 파일: `public/sign-samples/ksl-sample-01.mp4` ~ `ksl-sample-03.mp4` (1920×1080, H.264, 무음)
* 문항 영상: 문항 화면을 열 때마다 직전과 다른 샘플을 무작위로 고릅니다.
* 선택지 영상: 선택지 옆 **수어 보기**를 누르면 그 선택지 자막과 함께 샘플영상이 재생됩니다.
* 자동재생하지 않습니다. 재생·정지·다시보기·0.75배속·전체화면·다른 샘플영상을 제공합니다.
* 재생 실패 시 자막과 다시 시도 버튼으로 대체합니다.

### 실제 수어영상으로 교체하는 방법

1. 검수 완료(approved) 영상을 `public/sign-samples/` 에 넣습니다. 예: `ksl-gen-smk-01-v1.mp4`
2. `src/data/signAssets.ts` 의 `APPROVED_SIGN_ASSETS` 에 문항의 `signAssetId` → 파일명을 등록합니다.

```ts
export const APPROVED_SIGN_ASSETS: Record<string, string> = {
  'ksl-gen-smk-01-v1': 'ksl-gen-smk-01-v1.mp4',
};
```

3. 등록된 문항은 무작위 샘플 대신 그 영상을 재생하고, 샘플 배지가 사라집니다.
4. 외부 CDN 주소를 쓰려면 `resolveSignVideoUrl()` 한 함수만 고치면 됩니다.

---

## 5. 문항 데이터 수정 방법

문항은 UI에 하드코딩하지 않고 버전된 데이터 파일로 분리했습니다.

```text
src/data/questionnaire.v2026.ts   모듈 구성·시나리오·서식 버전
src/data/modules/support.ts       검진지원 9문항        (부록 A)
src/data/modules/general.ts       일반 건강검진 35문항  (부록 B)
src/data/modules/oral.ts          구강검진 15문항       (부록 C)
src/data/modules/cancer.ts        암검진 15문항         (부록 D)
src/data/modules/older.ts         노인기능 10문항       (부록 E)
src/data/modules/kdsq.ts          KDSQ-C 15문항        (부록 F)
src/data/modules/phq9.ts          PHQ-9 9문항          (부록 G)
src/data/modules/cape15.ts        CAPE-15 15문항       (부록 G)
src/data/modules/lifestyle.ts     담배사용 평가 8문항   (부록 H)
```

* 공식문구(`officialText`)는 서식 원문입니다. **임의로 바꾸지 마세요.**
* 쉬운 설명(`easyText`)은 서비스 기획 문구입니다. 검증형 척도(KDSQ-C·PHQ-9·CAPE-15)에는 넣지 않습니다.
* 문항 수를 바꾸면 `src/tests/questionnaireData.test.ts` 의 기대값도 함께 고쳐야 합니다(서식 개정 감지용).
* 분기 조건은 `eligibility` 규칙으로 적습니다. 예: `{ type: 'answerEquals', questionId: 'GEN-SMK-01', value: 'Y' }`

---

## 6. 구조

```text
src/
  data/           문항 데이터, 수어영상 자산
  domain/         순수 규칙엔진 (UI 참조 없음)
    types.ts               문항·응답·규칙 타입
    rules.ts               규칙 평가기
    questionnaireEngine.ts 모듈조립·분기·답변폐기·진행률
    validation.ts          필수·범위·배타 선택 검증
    scoring.ts             PHQ-9 / CAPE-15 / KDSQ-C 점수와 플래그
    answerFormat.ts        검토·확인표용 답변 문장
  state/          메모리 세션 훅
  components/     수어영상 패널, 문항 렌더러, 입력 컴포넌트
  screens/        S01~S10 화면
  tests/          단위테스트
e2e/              시나리오 E2E
scripts/          단일 index.html · 배포 ZIP 생성
```

---

## 7. 점수와 안전 처리

| 도구 | 계산 | 의료진 확인 플래그 |
| --- | --- | --- |
| PHQ-9 | 9문항 각 0~3, 총 0~27 | 총점 10 이상 **또는** 9번 문항 1 이상 |
| CAPE-15 | 빈도·고통 각 0~3, 각 총 0~45 | 빈도 또는 고통 총점 6 이상 |
| KDSQ-C | 15문항 각 0~2, 총 0~30 | 총점 6 이상 |

* PHQ-9 9번 문항에 1점 이상 답하면 **다음 버튼보다 먼저** 안전안내가 표시됩니다.
  안내에는 119 또는 112, 자살예방상담전화 109가 들어갑니다.
* 사용자에게 진단명이나 확정 판정을 보여주지 않습니다. 점수는 의료진 확인 플래그 생성에만 씁니다.
* CAPE-15는 빈도가 '없음'이면 고통을 묻지 않고 0으로 계산합니다.

---

## 8. 개인정보 안전선

* 실명·주민등록번호·전화번호를 입력받지 않습니다.
* 서버와 데이터베이스가 없습니다. 답변은 React 메모리 상태로만 존재합니다.
* `localStorage`, `sessionStorage`, URL, 콘솔 로그, 분석 이벤트에 건강답변을 남기지 않습니다. (E2E로 검증)
* 확인표는 화면과 브라우저 인쇄로만 제공합니다. 파일 다운로드를 만들지 않습니다.

---

## 9. 접근성 (한국형 웹 콘텐츠 접근성 지침 2.2)

* 키보드만으로 시작 → 영상 제어 → 응답 → 이전·다음 → 검토·수정 → 완료가 가능합니다.
* 모든 입력에 `label`이 연결되어 있고 오류는 live region으로 알립니다.
* 선택 상태를 색상만으로 구분하지 않습니다(테두리 + ✔ 표시 병행).
* 본문 16px 이상, 조작 라벨 14px 이상, 터치 목표 44×44 CSS px 이상.
* 영상은 자동재생하지 않으며 자막과 재생 제어를 제공합니다.
* 360px 폭부터 데스크톱까지 가로 스크롤이 없습니다. 시간 제한이 없습니다.

---

## 10. 인수기준 검증표

| ID | 완료 조건 | 검증 방법 | 상태 |
| --- | --- | --- | --- |
| AC-01 | 4개 시나리오가 정의된 모듈을 정확히 구성 | `engine.test.ts` · E2E | 자동 |
| AC-02 | 필수문항 전 완료 불가 | `engine.test.ts` · 검토화면 버튼 비활성 | 자동 |
| AC-03 | 흡연·음주·운동·암 분기 일치 | `engine.test.ts` | 자동 |
| AC-04 | 선행 답변 변경 시 비대상 하위답변 삭제 | `engine.test.ts` + 화면 알림 | 자동 |
| AC-05 | 이전·수정 후 진행률과 요약 즉시 갱신 | `engine.test.ts` · 검토화면 | 자동 |
| AC-06 | PHQ-9 9번 1점 이상에서 안전안내·플래그 | `scoring.test.ts` · E2E | 자동 |
| AC-07 | 세 척도 점수와 기준값 단위테스트 | `scoring.test.ts` (경계값 포함) | 자동 |
| AC-08 | 수어영상 실패 시 자막·재시도 UI | 패널 fallback (E2E 환경에서 실제 발생) | 자동 |
| AC-09 | 새로고침 후 답변 없음 | E2E `reload` 검증 | 자동 |
| AC-10 | 콘솔·URL·저장소에 건강답변 없음 | E2E 저장소·URL·콘솔 검사 | 자동 |
| AC-11 | 360px~데스크톱 잘림 없음 | E2E 가로 스크롤 검사 | 자동 |
| AC-12 | 키보드·스크린리더로 전체 흐름 | E2E 키보드 조작 + 수동 점검 필요 | 자동 + 수동 |
| AC-13 | 인쇄 확인표에 데모·미제출 표시 | 확인표 화면 · `@media print` | 수동 |
| AC-14 | 공식 문항·선택지 개수 일치 | `questionnaireData.test.ts` (131문항) | 자동 |

---

## 11. 남은 과제 (TODO)

* 문항별 한국수어 영상 제작과 검수(draft → medical_review → deaf_review → approved → published).
* 검증형 척도(KDSQ-C·PHQ-9·CAPE-15)의 수어 번역은 임상·도구 저작 검수와 농인 검수가 함께 필요합니다.
* 시나리오의 `eligibleExams`·자격 flag는 데모 가정값입니다. 실서비스는 공단·병원 자격조회로 대체해야 합니다.
* 생활습관 후속평가는 담배사용 8문항만 구현했습니다(설계서 부록 H 범위).
* 스크린리더 수동 점검(NVDA·VoiceOver)과 농인 당사자 사용성 점검은 별도로 수행해야 합니다.
