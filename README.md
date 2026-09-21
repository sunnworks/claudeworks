# 약봉투 OCR 기반 농인 대상 수어 복약지도 서비스 — 약사용 태블릿 데모

약사가 약봉투를 촬영·확인하고 **최종 승인한 내용만** 농인 환자에게 수어 아바타와 쉬운 한국어 자막으로
안내하는 데모입니다. 안내 완료 후 최종 승인본을 **48시간 동안** QR로 다시 볼 수 있고 이후 자동 만료·파기됩니다.

> 모든 환자·의약품 데이터는 **시연용 가상 데이터**입니다. 실제 의약품이나 처방이 아니며, 본 안내로 법정
> 복약지도 의무가 충족된다고 전제하지 않습니다.

구현 근거: `약봉투 OCR 기반 농인 대상 수어 복약지도 서비스 설계 시나리오 v1.0` — 특히 `부록 C Claude Code 개발 지시문`.

---

## 1. 빠른 실행

```bash
npm install
cp .env.example .env.local     # 기본값이 샘플 모드이므로 수정 없이 시연 가능
npm run dev                    # http://localhost:3000
```

카운터 태블릿에서 열려면(같은 네트워크):

```bash
npm run dev:tablet             # 0.0.0.0:3000 으로 바인딩
# 태블릿 브라우저에서 http://<PC의 IP>:3000/login
```

운영 빌드:

```bash
npm run verify                 # typecheck + 단위테스트 + production build
npm run build && npm run start:tablet
```

검증 명령: `npm run typecheck` · `npm run lint` · `npm run test` · `npm run test:e2e` · `npm run build`

---

## 2. 현장 시연 방법 (실제 약봉투 없이)

실제 약국 약봉투는 양식이 제각각이고 시연 현장에는 실물이 없으므로, 입력 채널을 3가지로 분리했습니다.

| 방식 | 준비물 | 동작 | 용도 |
| --- | --- | --- | --- |
| **① 시연 케이스 선택** (권장) | 없음 | 케이스를 누르면 고정 OCR 결과로 즉시 검토 화면 진입 | 발표·제안 시연 |
| **② 인쇄물 촬영** | A4 출력물 1장 | 촬영한 사진이 원문 이미지가 되고, 미리 지정한 케이스의 고정 OCR 결과 적용 | 촬영 동작까지 보여줄 때 |
| **③ 라이브 OCR** | OCR 사업자 키 | 업로드·촬영 이미지의 문자를 실제로 인식 | 실제 정확도 검증 |

### ① 케이스 선택 시연 순서

1. `/login` → **데모계정으로 바로 시작**
2. **새 복약안내 시작**
3. 촬영 화면 왼쪽에서 **카메라 켜기**로 촬영 가이드를 보여주며 현장 절차를 설명 (촬영은 생략 가능)
4. 오른쪽 **시연 케이스 선택**에서 `감기 · 1회 1포 · 1일 3회 · 3일분 · 식후 30분` → **이 케이스로 시연**
5. OCR 검토 → 안내카드 구성 → 약사 확인 체크 5개 → **수어 안내 승인**
6. **환자 화면 보여주기**로 태블릿을 환자에게 돌려 수어 재생 → 질문 → 완료 → 48시간 QR

시연 케이스에 붙은 질환 이름(감기·통증·불면)은 **분류 태그**일 뿐입니다. 복약정보는 각 케이스의 약봉투 OCR
결과만 사용하며, 질환으로 복용법을 추정하지 않습니다(설계서 12 4).

### ② 인쇄물 촬영 시연

1. `/print/samples`를 A4·배율 100퍼센트로 인쇄 (또는 `public/samples/bag-regular.png` 1장만 인쇄)
2. 촬영 화면에서 **촬영 이미지에 적용할 시연 케이스**를 지정 (기본값: 감기)
3. **카메라 켜기 → 약봉투 촬영하기** → 촬영한 사진이 원문 이미지로 들어가고 바로 검토 화면으로 이동
4. 검토 화면에는 촬영 이미지임을 알리는 안내가 표시됩니다(원문 강조 위치는 근사값)

### ③ 라이브 OCR

`.env.local`에 `OCR_PROVIDER=live`와 `OCR_API_URL`, `OCR_API_KEY`를 설정하면 촬영·업로드 이미지를 서버 경유로
OCR 사업자에게 보내 실제 인식 결과를 사용합니다. 연동 지점은 `src/lib/ocr/live.ts` 한 파일에 모여 있습니다.

### 실제 약봉투 양식 대응 (설계서 10 4)

실제 조제약 봉투·복약안내문의 표기를 반영했습니다.

| 실제 표기 | 예시 | 처리 |
| --- | --- | --- |
| 복약안내 압축 문자열 | `1정씩3회3일분` | 1회 1정 · 1일 3회 · 3일로 분해 (`parseCompactDosage`) |
| 표 열 분리형 | `시연용 A정 / 1.00 / 3 / 3` | 행 단위 해석, 소수 지원 (`parseTableRows`) |
| 소수 투여량 | `0.50` | 자막에서 **반 알**로 안내 (`formatAmount`) |
| 복용시점 체크·기입형 | `○식후30분 ○공복시 ○취침전`, `매 식 전·간·후 __시 __분` | **값을 추정하지 않고** 후보만 제시 → 약사가 검토 화면에서 선택 |
| 보관·주의 문자 | `밀폐용기, 실온보관` | 검수 문구ID로 매핑 (`detectCautionIds`) |
| 단위 없는 표 | 열에 `1.00`만 있고 정/포 표기 없음 | 단위를 만들지 않고 약사 확인 요구 → 미입력 시 승인 차단 |

같은 복용법(1회량·횟수·기간·시점)을 가진 약은 한 문장으로 묶고, 복용법이 다른 약은 약품명을 밝혀 문장을
분리합니다(설계서 12 1 원칙 3). 시연 케이스 `표 양식`(`SAMPLE_BAG_5`)이 이 흐름을 그대로 보여줍니다.

### 48시간 만료 시연

완료 화면의 **데모 시간 이동**에서 `+47시간 54분`(재생 가능) → `+48시간`(만료) → **시계 초기화** 순으로 누르면
서버 시계를 바꾸지 않고 QR 생명주기를 시연할 수 있습니다. **QR 즉시 폐기**도 같은 화면에 있습니다.

---

## 3. 화면과 API

### 라우트 (부록 C 3)

| 경로 | 화면 | 설계서 ID |
| --- | --- | --- |
| `/login` | 약사 로그인 | P01 |
| `/pharmacist` | 대시보드 · 태블릿 연결 · 최근 세션 | P02 |
| `/pharmacist/scan` | 촬영·업로드·시연 케이스 선택 | P03 P04 |
| `/pharmacist/review` | OCR 원문 대조와 필드 수정 | P05 |
| `/pharmacist/compose` | 안내카드 선택·순서변경·자막 미리보기 | P06 |
| `/pharmacist/approve` | 약사 확인 체크 5개와 최종 승인 | P07 |
| `/patient` | 환자 대기·안내 시작·수어 재생·이해 확인 | U01–U04 |
| `/pharmacist/complete` | 질문 대응 · 완료 · 48시간 QR 발급 | P08 P09 U05 |
| `/r/[token]` | QR 재열람과 만료 화면 | Q01 |
| `/print/samples` | 시연용 약봉투 인쇄 | 데모 보조 |

### API (부록 C 8)

`POST /api/sessions` · `GET /api/sessions` · `GET /api/sessions/[id]` · `POST /api/ocr` ·
`POST /api/sessions/[id]/bags` · `PATCH /api/sessions/[id]/medications` · `POST /api/sessions/[id]/compose` ·
`PATCH /api/sessions/[id]/cards` · `POST|DELETE /api/sessions/[id]/approve` · `POST /api/avatar/jobs` ·
`GET /api/sessions/[id]/patient` · `POST|PATCH /api/sessions/[id]/reactions` ·
`POST /api/sessions/[id]/complete` · `GET /api/r/[token]` · `GET|DELETE /api/shares/[id]` ·
`GET /api/samples` · `GET|POST /api/demo/clock`(데모 전용)

---

## 4. 안전 규칙 구현 (부록 C 5)

| 규칙 | 구현 위치 |
| --- | --- |
| 약사 승인 전 환자 API가 복약내용을 반환하지 않음 | `src/lib/state.ts` `isPatientVisible` · `session-service.ts` `patientPayload` |
| 약봉투에 없는 정보 생성 금지 | `src/lib/parser.ts`(인식 실패 시 null) · `compose.ts`(필수 슬롯 없으면 문장 미생성) |
| 질환 추정·자동 처방 금지 | 질환은 분류 태그만 사용(`fixtures/bags.ts` `caseTag`), 문장 생성에 미사용 |
| 필수값 누락·낮은 신뢰도 시 승인 차단 | `src/lib/validation.ts` `canApprove` · `canProceedToCompose` |
| 자유 생성형 문장 금지 | `src/lib/templates.ts`의 표준 문장 모듈과 검수 문구DB만 사용 |
| QR 토큰 원문 미저장, 서버에 해시만 보관 | `src/lib/share.ts` `hashToken` · `ShareLink.tokenHash` |
| 만료·폐기 토큰에 복약내용 미반환 | `session-service.ts` `readShareByToken` |
| 환자 식별정보·약봉투 원본 미저장 | `ShareLink.patientIdentifiers = null` · `sourceImageStored = false` · 완료 시 `imageRef` 제거 |
| 시연용 가상 데이터 표시 | 모든 화면의 `DemoBanner` |
| OCR·아바타 키 클라이언트 비노출 | 서버 라우트만 `serverConfig` 참조 |

신뢰도 임계값(초록 0.90 이상 / 노랑 0.75 이상 0.90 미만 / 빨강 0.75 미만)은 설계서 10 3의 작업 가설이며
`CONFIDENCE_HIGH`, `CONFIDENCE_REVIEW` 환경변수로 조정합니다.

---

## 5. 수어 아바타

현재는 **데모용 샘플 수어영상 5종**(`public/avatar-samples/sign-1~5.mp4`)을 문장마다 무작위로 배정해
재생합니다. 배정 결과는 승인본에 저장되므로 환자 화면과 QR 재열람이 같은 순서를 재생합니다.

- 화면에는 `※ 이 수어 영상은 데모용 샘플입니다. 자막 내용과 일치하지 않습니다.` 문구가 항상 표시됩니다.
- 브라우저가 영상 코덱을 지원하지 않으면 도형 플레이어로 자동 대체하고 그 사실을 화면에 표시합니다.
- KLcube 아바타 API 연동 지점은 `src/lib/avatar/live.ts` 한 파일에 TODO로 모여 있습니다.
  `AVATAR_PROVIDER=live`, `AVATAR_API_URL`, `AVATAR_API_KEY`를 설정하면 전환됩니다.

---

## 6. 환경변수 (설계서 14 6)

`.env.example` 참고. 기본값은 `DEMO_MODE=true`, `OCR_PROVIDER=mock`, `AVATAR_PROVIDER=mock`,
`SESSION_IMAGE_PERSIST=false`, `QR_TTL_HOURS=48`입니다. `QR_TTL_HOURS`는 데모와 운영 모두 48시간으로
고정되어 있습니다(코드 상수). 운영 배포 시 `QR_TOKEN_SECRET`을 반드시 교체하세요.

---

## 7. 테스트

```bash
npm run test        # 단위테스트 75개 (파서 정규화, 검증, 상태전이, QR 생명주기, 아바타 배정)
npm run test:e2e    # 브라우저 E2E 5개 시나리오
```

단위테스트는 설계서 10 2 정규화 예시(`한번에 한알 → 1회 1정`, `삼일분 → 3일`, `식후 삼십분 → 식후 30분`,
`통증 시 → 필요시 복용`)와 QR 경계값(발급 직후 / 47시간 59분 / **정확히 48시간** / 48시간 이후 / 즉시폐기 /
자동파기)을 직접 검증합니다.

E2E는 `부록 A 2 기본 시나리오`와 시험 ID `T01 T02 T04 T05 T08 T09 T10 T11 T12 T13`을 커버합니다.

---

## 8. 데모 제외 범위 (설계서 13 3)

약국 조제·청구 프로그램 실연계, 건강보험·DUR 연계, 실제 환자정보 저장과 회원가입, 의약품 전체 DB 자동 매칭과
상호작용 판단, 질환 진단·처방 추천, 결제·과금·태블릿 MDM, 법적 효력을 전제한 전자서명.

데모 저장소는 프로세스 메모리이므로 서버를 재시작하면 세션과 QR이 사라집니다.

---

## 9. 남은 연동 작업

| 항목 | 파일 | 필요 정보 |
| --- | --- | --- |
| 실제 OCR 사업자 연동 | `src/lib/ocr/live.ts` | 요청 형식, 블록·좌표·신뢰도 응답 매핑, 국외이전·보관정책 |
| KLcube 아바타 API 연동 | `src/lib/avatar/live.ts` | 엔드포인트·인증, 출력 형식(영상·시퀀스·GLB), 문장 타임코드 |
| 검수된 수어 표현 | `src/lib/templates.ts` | 표준 문장 모듈별 글로스 검수본 |
| 약봉투 양식 파서 | `src/lib/parser.ts` | 실제 약봉투 표본(라벨형·표형·문장형·아이콘형) |
| 영구 저장·계정·운영 콘솔 | 미구현 | 개인정보 영향평가와 보관정책 확정 후 설계 |
