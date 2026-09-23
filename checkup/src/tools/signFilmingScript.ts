import { MODULES, SCENARIOS } from '../data/questionnaire.v2026';
import type { OptionDef, QuestionDefinition } from '../domain/types';

/**
 * 수어 촬영 대본 추출기.
 *
 * 이 데모에서 화면에 나오는 모든 문장을 촬영 단위로 뽑는다.
 * - 같은 문장은 한 번만 남긴다(중복 촬영 방지). 어디에 쓰이는지는 usedIn 에 모은다.
 * - 선택지는 단어 중심으로 뽑고, 고르는 방법은 별도의 '응답안내' 문장으로 만든다.
 */
export type FilmingCategory =
  | '문항'
  | '쉬운설명'
  | '도움말'
  | '응답안내'
  | '선택지'
  | '표항목'
  | '화면안내'
  | '버튼'
  | '안전안내';

export interface FilmingRow {
  id: string;
  category: FilmingCategory;
  text: string;
  /** 이 문장이 쓰이는 곳 (문항 ID 또는 화면 이름) */
  usedIn: string[];
  module: string;
}

const quote = (labels: string[]): string => labels.map((label) => `'${label}'`).join(', ');

/** 낱말의 받침 여부. 한글이 아니면 받침이 없는 것으로 본다. */
function hasBatchim(word: string): boolean {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0);
  const isHangul = code >= 0xac00 && code <= 0xd7a3;
  return isHangul && (code - 0xac00) % 28 !== 0;
}

/** 받침에 맞는 조사를 붙인다. */
function withJosa(word: string, withBatchim: string, withoutBatchim: string): string {
  return `${word}${hasBatchim(word) ? withBatchim : withoutBatchim}`;
}

/** 따옴표로 감싼 뒤 낱말의 받침에 맞는 조사를 붙인다. 따옴표 때문에 조사가 틀리는 것을 막는다. */
function quotedWithJosa(label: string, withBatchim: string, withoutBatchim: string): string {
  return `'${label}'${hasBatchim(label) ? withBatchim : withoutBatchim}`;
}

const optionLabels = (options: OptionDef[] | undefined): string[] => (options ?? []).map((option) => option.label);

/** 문항 유형별로 '어떻게 답하는지' 안내 문장을 만든다. */
function answerGuide(question: QuestionDefinition): string[] {
  const guides: string[] = [];

  switch (question.type) {
    case 'single_choice': {
      guides.push(`${quote(optionLabels(question.options))} 중에서 한 개를 골라 체크해 주세요.`);
      for (const option of question.options ?? []) {
        if (option.numberField) {
          const field = option.numberField;
          guides.push(
            `${quotedWithJosa(option.label, '을', '를')} 골랐으면 ${field.label} 몇 ${field.unit}인지 숫자로 적어 주세요. ${field.min}${field.unit}부터 ${field.max}${field.unit}까지 적을 수 있습니다.`,
          );
        }
        if (option.textField) {
          const label = option.textField.label;
          const what = label.endsWith('?') ? label : withJosa(label, '을', '를');
          guides.push(`${quotedWithJosa(option.label, '을', '를')} 골랐으면 ${what} 글로 적어 주세요.`);
        }
      }
      break;
    }

    case 'multi_choice': {
      const normal = (question.options ?? []).filter((option) => !option.exclusive);
      const exclusive = (question.options ?? []).filter((option) => option.exclusive);
      guides.push(`${quote(normal.map((option) => option.label))} 중에서 해당하는 것을 모두 골라 체크해 주세요.`);
      if (exclusive.length > 0) {
        guides.push(`해당하는 것이 없으면 ${quote(exclusive.map((option) => option.label))}만 고르세요.`);
      }
      break;
    }

    case 'number': {
      for (const field of question.numberFields ?? []) {
        guides.push(
          `${field.label} 몇 ${field.unit}인지 숫자로 적어 주세요. ${field.min}${field.unit}부터 ${field.max}${field.unit}까지 적을 수 있습니다.`,
        );
      }
      break;
    }

    case 'duration':
      guides.push('몇 시간 몇 분인지 숫자로 적어 주세요. 분은 0분부터 59분까지 적습니다.');
      break;

    case 'text':
      guides.push('하고 싶은 말을 글로 적어 주세요. 없으면 비워 두어도 됩니다.');
      break;

    case 'scale': {
      const scale = question.scale;
      if (scale) {
        guides.push(
          `${scale.min}부터 ${scale.max}까지 중에서 한 개를 골라 주세요. ${scale.min}은 '${scale.minLabel}', ${scale.max}는 '${scale.maxLabel}'입니다.`,
        );
      }
      break;
    }

    case 'matrix': {
      const matrix = question.matrix;
      if (!matrix) break;
      if (matrix.mode === 'choice') {
        const rowsWithOwnOptions = matrix.rows.filter((row) => row.options);
        if (rowsWithOwnOptions.length > 0) {
          for (const row of rowsWithOwnOptions) {
            guides.push(
              `${quotedWithJosa(row.label, '은', '는')} ${quote(optionLabels(row.options))} 중에서 한 개를 골라 주세요.`,
            );
          }
          const shared = matrix.rows.filter((row) => !row.options);
          if (shared.length > 0) {
            guides.push(`나머지 줄은 ${quote(optionLabels(question.options))} 중에서 한 개씩 골라 주세요.`);
          }
        } else {
          guides.push(`줄마다 ${quote(optionLabels(question.options))} 중에서 한 개씩 골라 주세요.`);
        }
      }
      if (matrix.mode === 'checks') {
        guides.push(`줄마다 ${quote(optionLabels(matrix.columns))} 중에서 해당하는 것을 모두 골라 주세요.`);
        if (matrix.exclusiveOptions) {
          guides.push(`해당하는 것이 없으면 ${quote(optionLabels(matrix.exclusiveOptions))} 중 하나를 고르세요.`);
        }
      }
      if (matrix.mode === 'amount') {
        guides.push(
          `해당하는 줄에 얼마나 되는지 숫자를 적고 ${quote(optionLabels(matrix.units))} 중에서 단위를 골라 주세요. 해당 없는 줄은 비워 둡니다.`,
        );
      }
      break;
    }
  }

  return guides;
}

/** 화면 공통 문장. 화면 문구를 고치면 이 목록도 함께 고쳐야 한다. */
const SCREEN_TEXTS: Array<{ category: FilmingCategory; text: string; usedIn: string }> = [
  { category: '화면안내', text: '건강검진 문진표를 수어로 보고 직접 작성합니다.', usedIn: '시작 화면' },
  { category: '화면안내', text: '질문과 답을 모두 수어영상으로 볼 수 있습니다.', usedIn: '시작 화면' },
  { category: '화면안내', text: '문장 옆 손 모양 버튼을 누르면 그 문장을 수어로 보여 줍니다.', usedIn: '시작 화면' },
  { category: '화면안내', text: '작성한 내용은 저장하지 않습니다. 창을 닫으면 사라집니다.', usedIn: '시작 화면' },
  { category: '화면안내', text: '어떤 분의 문진표를 작성할지 고르세요.', usedIn: '대상 선택 화면' },
  { category: '화면안내', text: '누가 작성하나요? 본인인가요, 다른 사람이 대신 쓰나요?', usedIn: '작성자 화면' },
  { category: '선택지', text: '내가 직접 씁니다', usedIn: '작성자 화면' },
  { category: '선택지', text: '가족이나 도와주는 사람이 대신 씁니다', usedIn: '작성자 화면' },
  { category: '화면안내', text: '이런 질문들을 물어봅니다. 준비되면 시작하세요.', usedIn: '질문 안내 화면' },
  { category: '화면안내', text: '답에 따라 질문 수가 늘거나 줄 수 있습니다. 시간 제한은 없습니다.', usedIn: '질문 안내 화면' },
  { category: '화면안내', text: '답한 내용을 확인하세요. 고치고 싶으면 고치기를 누르세요.', usedIn: '검토 화면' },
  { category: '화면안내', text: '아직 답하지 않은 질문이 있습니다.', usedIn: '검토 화면' },
  { category: '화면안내', text: '모두 답했습니다.', usedIn: '검토 화면' },
  { category: '화면안내', text: '다 썼습니다. 이 화면을 인쇄해서 검진 날 가져가세요.', usedIn: '완료 화면' },
  { category: '화면안내', text: '이 내용은 저장되지 않습니다. 인쇄하거나 화면을 검진기관에 보여 주세요.', usedIn: '완료 화면' },
  { category: '화면안내', text: '병원이 미리 준비할 것을 정리했습니다.', usedIn: '완료 화면' },
  { category: '화면안내', text: '아래 점수는 병을 판정하는 것이 아닙니다. 의료진이 한 번 더 볼지 알려 주는 표시입니다.', usedIn: '완료 화면' },
  { category: '화면안내', text: '잘 모르겠다고 한 질문입니다. 검진 날 의료진과 같이 확인하세요.', usedIn: '완료 화면' },
  { category: '화면안내', text: '답이 바뀌어서 없어진 질문이 있습니다.', usedIn: '문항 화면' },
  { category: '버튼', text: '시작하기', usedIn: '여러 화면' },
  { category: '버튼', text: '다음', usedIn: '여러 화면' },
  { category: '버튼', text: '이전', usedIn: '문항 화면' },
  { category: '버튼', text: '뒤로', usedIn: '여러 화면' },
  { category: '버튼', text: '다 했어요', usedIn: '마지막 문항' },
  { category: '버튼', text: '고치기', usedIn: '검토 화면' },
  { category: '버튼', text: '작성 완료', usedIn: '검토 화면' },
  { category: '버튼', text: '지금까지 답 보기', usedIn: '모듈 완료 화면' },
  { category: '버튼', text: '인쇄하기', usedIn: '완료 화면' },
  { category: '버튼', text: '처음으로', usedIn: '완료 화면' },
  { category: '버튼', text: '잘 모르겠어요. 억지로 고르지 않아도 됩니다. 병원에서 같이 확인합니다.', usedIn: '문항 화면' },
  { category: '화면안내', text: '잘 모르겠다고 표시했습니다. 병원에서 같이 확인합니다.', usedIn: '문항 화면' },
  { category: '버튼', text: '이게 무슨 말인가요?', usedIn: '문항 화면' },
  { category: '버튼', text: '영상을 다시 보려면 다시 버튼을 누르세요.', usedIn: '영상 조작' },
  { category: '버튼', text: '영상이 빠르면 0.75배속이나 0.5배속으로 바꿀 수 있습니다.', usedIn: '영상 조작' },
  { category: '안전안내', text: '혼자 견디지 않아도 됩니다.', usedIn: '정신건강 안전안내' },
  { category: '안전안내', text: '지금 위험하거나 스스로를 해칠 것 같으면 아래 번호로 바로 연락하세요. 문자로도 연락할 수 있습니다.', usedIn: '정신건강 안전안내' },
  { category: '안전안내', text: '119 또는 112. 생명이 위급하거나 즉시 도움이 필요할 때 연락하세요.', usedIn: '정신건강 안전안내' },
  { category: '안전안내', text: '자살예방상담전화 109. 24시간 연락할 수 있습니다.', usedIn: '정신건강 안전안내' },
  { category: '안전안내', text: '검진 날 의료진과 같이 볼 수 있게 표시를 남깁니다. 문진표는 계속 쓸 수 있습니다.', usedIn: '정신건강 안전안내' },
  { category: '버튼', text: '알겠습니다', usedIn: '정신건강 안전안내' },
];

export function buildFilmingScript(): FilmingRow[] {
  const byText = new Map<string, FilmingRow>();
  const order: string[] = [];

  const add = (category: FilmingCategory, text: string, usedIn: string, module: string) => {
    const key = text.trim();
    if (key === '') return;
    const existing = byText.get(key);
    if (existing) {
      if (!existing.usedIn.includes(usedIn)) existing.usedIn.push(usedIn);
      return;
    }
    byText.set(key, { id: '', category, text: key, usedIn: [usedIn], module });
    order.push(key);
  };

  // 1) 대상자 안내
  for (const scenario of SCENARIOS) {
    add('화면안내', `${scenario.personLabel}의 문진표입니다.`, '대상 선택 화면', '공통');
  }

  // 2) 문항 · 쉬운설명 · 도움말 · 응답안내 · 선택지
  for (const module of MODULES) {
    for (const question of module.questions) {
      add('문항', question.officialText, question.questionId, module.title);
      if (question.easyText) add('쉬운설명', question.easyText, question.questionId, module.title);
      if (question.helpText) add('도움말', question.helpText, question.questionId, module.title);

      for (const guide of answerGuide(question)) {
        add('응답안내', guide, question.questionId, module.title);
      }

      for (const option of question.options ?? []) {
        add('선택지', option.label, question.questionId, module.title);
      }
      for (const row of question.matrix?.rows ?? []) {
        add('표항목', row.label, question.questionId, module.title);
        for (const option of row.options ?? []) add('선택지', option.label, question.questionId, module.title);
      }
      for (const column of question.matrix?.columns ?? []) {
        add('선택지', column.label, question.questionId, module.title);
      }
      for (const unit of question.matrix?.units ?? []) {
        add('선택지', unit.label, question.questionId, module.title);
      }
      for (const option of question.matrix?.exclusiveOptions ?? []) {
        add('선택지', option.label, question.questionId, module.title);
      }
    }

    if (module.purposeNotice) add('화면안내', module.purposeNotice, `${module.moduleId} 모듈 안내`, module.title);
    if (module.instrumentNotice) add('화면안내', module.instrumentNotice, `${module.moduleId} 모듈 안내`, module.title);
    add('화면안내', `${module.title} 끝났습니다. 다음으로 갑니다.`, `${module.moduleId} 완료 화면`, module.title);
  }

  // 3) 화면 공통 문장
  for (const item of SCREEN_TEXTS) {
    add(item.category, item.text, item.usedIn, '공통');
  }

  // 4) 촬영 ID 부여
  const prefix: Record<FilmingCategory, string> = {
    문항: 'Q',
    쉬운설명: 'E',
    도움말: 'H',
    응답안내: 'A',
    선택지: 'C',
    표항목: 'R',
    화면안내: 'G',
    버튼: 'B',
    안전안내: 'S',
  };
  const counters: Record<string, number> = {};
  const rows = order.map((key) => byText.get(key)!);
  for (const row of rows) {
    const code = prefix[row.category];
    counters[code] = (counters[code] ?? 0) + 1;
    row.id = `KSL-${code}-${String(counters[code]).padStart(3, '0')}`;
  }
  return rows;
}
