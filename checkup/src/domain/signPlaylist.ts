import type { QuestionDefinition } from './types';

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
