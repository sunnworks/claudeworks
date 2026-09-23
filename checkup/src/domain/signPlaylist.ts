import type { QuestionDefinition } from './types';

/** 짧은 단어로 보는 최대 글자 수 */
export const SHORT_CAPTION_MAX_CHARS = 12;
/** 짧은 단어를 보여 주는 최대 시간(밀리초) */
export const SHORT_ITEM_MAX_MS = 5000;

/**
 * 이 문구를 정해진 시간에서 끊어도 되는가.
 *
 * '기타', '안내견' 같은 짧은 선택지는 수어로 1~2초면 끝난다.
 * 그런데 지금 샘플영상은 문항 내용과 무관한 10초짜리라 기다리는 시간이 길다.
 * 짧은 선택지에만 시간 제한을 두고, 질문처럼 긴 문장은 절대 끊지 않는다.
 * 문장을 중간에 끊으면 수어의 뜻이 달라진다.
 */
export function isShortChoice(kind: string, caption: string): boolean {
  return kind === '선택지' && caption.trim().length <= SHORT_CAPTION_MAX_CHARS;
}

export interface SignPlaylistItem {
  caption: string;
  kind: '문항' | '선택지' | '안내';
  signAssetId?: string;
}

/**
 * 한 문항을 수어로 이어서 보여 줄 순서를 만든다.
 * 질문 → 쉬운 설명 → 고를 수 있는 것들 순서로 하나씩 보여 준다.
 */
export function buildQuestionPlaylist(question: QuestionDefinition): SignPlaylistItem[] {
  const items: SignPlaylistItem[] = [
    { caption: question.officialText, kind: '문항', signAssetId: question.signAssetId },
  ];

  if (question.easyText) items.push({ caption: question.easyText, kind: '안내' });

  if (question.type === 'single_choice' || question.type === 'multi_choice') {
    for (const option of question.options ?? []) {
      items.push({ caption: option.label, kind: '선택지' });
    }
  }

  if (question.type === 'matrix' && question.matrix) {
    const matrix = question.matrix;
    for (const option of matrix.exclusiveOptions ?? []) {
      items.push({ caption: option.label, kind: '선택지' });
    }
    for (const row of matrix.rows) {
      items.push({ caption: row.label, kind: '선택지' });
    }
    if (matrix.mode === 'choice') {
      for (const option of question.options ?? []) {
        items.push({ caption: option.label, kind: '선택지' });
      }
    }
    if (matrix.mode === 'checks') {
      for (const column of matrix.columns ?? []) {
        items.push({ caption: column.label, kind: '선택지' });
      }
    }
    if (matrix.mode === 'amount') {
      for (const unit of matrix.units ?? []) {
        items.push({ caption: unit.label, kind: '선택지' });
      }
    }
  }

  if (question.type === 'scale' && question.scale) {
    items.push({ caption: question.scale.minLabel, kind: '선택지' });
    items.push({ caption: question.scale.maxLabel, kind: '선택지' });
  }

  // 같은 문구가 이어서 두 번 나오지 않게 한다.
  return items.filter((item, index) => items.findIndex((other) => other.caption === item.caption) === index);
}
