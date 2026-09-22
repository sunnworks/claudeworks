import type { OptionDef, QuestionDefinition } from '../../domain/types';

/** CAPE-15 빈도 응답값 */
export const CAPE_FREQUENCY_OPTIONS: OptionDef[] = [
  { value: 'NEVER', label: '없음', score: 0 },
  { value: 'SOMETIMES', label: '가끔', score: 1 },
  { value: 'OFTEN', label: '자주', score: 2 },
  { value: 'ALMOST_ALWAYS', label: '거의 항상', score: 3 },
];

/** CAPE-15 고통 응답값 */
export const CAPE_DISTRESS_OPTIONS: OptionDef[] = [
  { value: 'NONE', label: '없음', score: 0 },
  { value: 'A_LITTLE', label: '조금', score: 1 },
  { value: 'QUITE', label: '상당히', score: 2 },
  { value: 'VERY', label: '매우', score: 3 },
];

export const CAPE_FREQUENCY_ROW = 'frequency';
export const CAPE_DISTRESS_ROW = 'distress';

const officialTexts = [
  '사람들이 당신에 대해 넌지시 말하거나 숨겨진 의미로 어떤 말을 하는 것 같은 느낌이 든 적이 있습니까?',
  '어떤 사람들이 겉으로 보이는 것과 다른 것 같다는 느낌이 든 적이 있습니까?',
  '어떤 식으로든 당신이 괴롭힘당하고 있는 것 같다는 느낌이 든 적이 있습니까?',
  '당신을 둘러싼 음모가 있는 것 같은 느낌이 든 적이 있습니까?',
  '당신의 외모 때문에 사람들이 당신을 이상하게 쳐다보는 것 같은 느낌이 든 적이 있습니까?',
  '컴퓨터와 같은 전자기기들이 당신이 생각하는 방식에 영향을 끼치는 것처럼 느껴질 때가 있습니까?',
  '당신의 머릿속 생각들을 누군가 빼앗아가고 있는 것처럼 느껴질 때가 있습니까?',
  '당신의 머릿속 생각들이 자신의 것이 아닌 것처럼 느껴질 때가 있습니까?',
  '당신의 생각들이 너무 생생해서 다른 사람들이 당신의 생각을 들을까 봐 걱정된 적이 있습니까?',
  '당신의 생각을 메아리처럼 들어본 적이 있습니까?',
  '어떤 기운이나 힘이 당신을 통제하는 것처럼 느껴질 때가 있습니까?',
  '가족이나 친구, 지인들과 똑같이 생긴 분신이 나타난 것처럼 느껴질 때가 있습니까?',
  '혼자 있을 때 어떤 음성을 들은 적이 있습니까?',
  '혼자 있을 때 어떤 사람들이 서로 말하는 것을 들은 적이 있습니까?',
  '다른 사람 눈에는 보이지 않는 사물이나 사람 또는 동물을 본 적이 있습니까?',
];

/**
 * 부록 G CAPE-15. 빈도를 먼저 묻고, 빈도가 '없음'이 아닐 때만 고통을 묻는다.
 * 검증형 도구이므로 easyText 를 제공하지 않는다.
 */
export const CAPE15_QUESTIONS: QuestionDefinition[] = officialTexts.map((text, index) => {
  const no = String(index + 1).padStart(2, '0');
  return {
    questionId: `CAPE-${no}`,
    moduleId: 'CAPE15',
    officialText: text,
    type: 'matrix',
    matrix: {
      mode: 'choice',
      rows: [
        { key: CAPE_FREQUENCY_ROW, label: '얼마나 자주 그런가요?', options: CAPE_FREQUENCY_OPTIONS },
        {
          key: CAPE_DISTRESS_ROW,
          label: '그때 얼마나 괴로운가요?',
          options: CAPE_DISTRESS_OPTIONS,
          visibleWhen: { row: CAPE_FREQUENCY_ROW, notIn: ['NEVER'] },
        },
      ],
      requireRows: 'all',
    },
    required: true,
    signAssetId: `ksl-cape-${no}-v1`,
    section: 'CAPE-15',
  };
});
