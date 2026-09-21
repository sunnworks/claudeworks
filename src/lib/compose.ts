/**
 * 안내카드 구성 — 설계서 8 5 안내카드 생성 / 12 안내문 생성과 수어 변환 규칙.
 *
 * 생성 원칙 (설계서 12 1):
 *  1. 약봉투에 없는 의학적 사실을 생성하지 않는다.
 *  2. 필수정보가 누락되면 문장을 추정하지 않는다.
 *  3. 동일 복용법을 가진 약은 한 문장으로 묶고 예외약은 별도 문장으로 분리한다.
 *  5. 주의사항은 승인된 문구ID를 우선 사용하고 자유입력은 약사 책임 표시를 남긴다.
 */

import { nextId } from './store';
import { REVIEWED_CAUTIONS, SENTENCE_TEMPLATES, mealsLabel, timingLabel } from './templates';
import type { GuidanceCard, MedicationBag, MedicationGroup, Session, TimingCode } from './types';

function buildCard(params: {
  type: GuidanceCard['type'];
  templateId: string;
  slots: Record<string, string | number | boolean | null>;
  required: boolean;
  sourceType: GuidanceCard['sourceType'];
  groupId: string | null;
  bagId: string | null;
  order: number;
  pharmacistAuthored?: boolean;
  overrideText?: string;
}): GuidanceCard | null {
  const template = SENTENCE_TEMPLATES[params.templateId];
  if (template === undefined) return null;

  // 필수 슬롯이 하나라도 비어 있으면 문장을 만들지 않는다.
  for (const slot of template.requiredSlots) {
    const value = params.slots[slot];
    if (value === null || value === undefined || value === '') return null;
  }

  return {
    cardId: nextId('CARD'),
    type: params.type,
    sourceType: params.sourceType,
    required: params.required,
    selected: params.required,
    pharmacistVerified: false,
    displayText: params.overrideText ?? template.render(params.slots),
    signPayload: {
      templateId: template.templateId,
      slots: params.slots,
      gloss: template.gloss(params.slots),
    },
    groupId: params.groupId,
    bagId: params.bagId,
    pharmacistAuthored: params.pharmacistAuthored ?? false,
    order: params.order,
  };
}

/** 정규 복용약 그룹의 필수카드 (복용량·횟수·기간·복용시점) */
function regularCards(bag: MedicationBag, group: MedicationGroup, startOrder: number): GuidanceCard[] {
  const cards: GuidanceCard[] = [];
  let order = startOrder;

  const amount = group.doseAmount.value;
  const unit = group.doseUnit.value;
  const times = group.frequencyPerDay.value;
  const days = group.durationDays.value;
  const timing = group.timingCode.value;

  // 복용량 + 횟수 + 기간을 한 문장으로 묶는다 (설계서 11 1 DOSING_STANDARD_V1)
  const dosing = buildCard({
    type: 'DOSING',
    templateId: 'DOSING_STANDARD_V1',
    slots: { times, amount, unit, days },
    required: true,
    sourceType: 'BAG_OCR',
    groupId: group.groupId,
    bagId: bag.bagId,
    order: order++,
  });
  if (dosing !== null) {
    cards.push(dosing);
  } else {
    // 묶을 수 없으면 확보된 값만 개별 문장으로 만든다.
    const partials: (GuidanceCard | null)[] = [
      buildCard({
        type: 'DOSING',
        templateId: 'DOSE_AMOUNT_V1',
        slots: { amount, unit },
        required: true,
        sourceType: 'BAG_OCR',
        groupId: group.groupId,
        bagId: bag.bagId,
        order: order++,
      }),
      buildCard({
        type: 'FREQUENCY',
        templateId: 'FREQUENCY_V1',
        slots: { times },
        required: true,
        sourceType: 'BAG_OCR',
        groupId: group.groupId,
        bagId: bag.bagId,
        order: order++,
      }),
      buildCard({
        type: 'DURATION',
        templateId: 'DURATION_V1',
        slots: { days },
        required: true,
        sourceType: 'BAG_OCR',
        groupId: group.groupId,
        bagId: bag.bagId,
        order: order++,
      }),
    ];
    for (const card of partials) if (card !== null) cards.push(card);
  }

  // 복용시점 — 1일 3회이면 아침·점심·저녁 표현을 사용한다.
  if (timing !== null) {
    const meals = times === null ? null : mealsLabel(times);
    const isMealBased = timing === 'AFTER_MEAL_30' || timing === 'BEFORE_MEAL_30';
    const timingCard =
      isMealBased && meals !== null && times === 3
        ? buildCard({
            type: 'TIMING',
            templateId: 'TIMING_MEALS_V1',
            slots: { timing: timingLabel(timing), timingCode: timing, meals, minutes: 30 },
            required: true,
            sourceType: 'BAG_OCR',
            groupId: group.groupId,
            bagId: bag.bagId,
            order: order++,
            overrideText:
              timing === 'AFTER_MEAL_30'
                ? `${meals} 식사 후 30분에 드세요.`
                : `${meals} 식사 전 30분에 드세요.`,
          })
        : buildCard({
            type: 'TIMING',
            templateId: 'TIMING_V1',
            slots: { timing: timingLabel(timing), timingCode: timing },
            required: true,
            sourceType: 'BAG_OCR',
            groupId: group.groupId,
            bagId: bag.bagId,
            order: order++,
          });
    if (timingCard !== null) cards.push(timingCard);

    // 기간이 묶이지 않은 경우 별도 기간 카드를 추가한다.
    if (dosing !== null && days !== null) {
      const durationCard = buildCard({
        type: 'DURATION',
        templateId: 'DURATION_V1',
        slots: { days },
        required: false,
        sourceType: 'BAG_OCR',
        groupId: group.groupId,
        bagId: bag.bagId,
        order: order++,
      });
      if (durationCard !== null) cards.push(durationCard);
    }
  }

  return cards;
}

/** 필요시약 그룹 — 정규약과 분리된 조건카드 */
function asNeededCards(bag: MedicationBag, group: MedicationGroup, startOrder: number): GuidanceCard[] {
  const card = buildCard({
    type: 'AS_NEEDED',
    templateId: 'AS_NEEDED_V1',
    slots: {
      symptom: group.symptomText ?? '증상',
      amount: group.doseAmount.value,
      unit: group.doseUnit.value,
    },
    required: true,
    sourceType: 'BAG_OCR',
    groupId: group.groupId,
    bagId: bag.bagId,
    order: startOrder,
  });
  return card === null ? [] : [card];
}

/**
 * 주의카드 — 약봉투에 기재됐거나 검수된 문구ID로 매칭된 경우에만 추천한다.
 * recommendOnlyWhenPrinted 문구는 기본 선택하지 않고 약사가 판단한다.
 */
function cautionCards(session: Session, startOrder: number): GuidanceCard[] {
  const cards: GuidanceCard[] = [];
  const seen = new Set<string>();
  let order = startOrder;

  for (const bag of session.bags) {
    for (const group of bag.groups) {
      for (const cautionId of group.cautionIds) {
        if (seen.has(cautionId)) continue;
        seen.add(cautionId);
        const caution = REVIEWED_CAUTIONS[cautionId];
        cards.push({
          cardId: nextId('CARD'),
          type: caution.type,
          sourceType: 'REVIEWED_PHRASE_DB',
          required: false,
          // 약봉투에 기재된 주의문구는 기본 선택하되 약사가 최종 판단한다.
          selected: true,
          pharmacistVerified: false,
          displayText: caution.displayText,
          signPayload: {
            templateId: `CAUTION_${cautionId}_V1`,
            slots: { cautionId },
            gloss: caution.gloss,
          },
          groupId: group.groupId,
          bagId: bag.bagId,
          pharmacistAuthored: false,
          order: order++,
        });
      }
    }
  }
  return cards;
}

/**
 * 세션의 검증된 복약정보로 안내카드를 생성한다.
 * 기존 카드의 선택 상태와 약사 입력카드는 유지한다.
 */
export function composeCards(session: Session): GuidanceCard[] {
  const cards: GuidanceCard[] = [];
  let order = 0;

  const intro = buildCard({
    type: 'INTRO',
    templateId: 'INTRO_V1',
    slots: {},
    required: true,
    sourceType: 'REVIEWED_PHRASE_DB',
    groupId: null,
    bagId: null,
    order: order++,
  });
  if (intro !== null) cards.push(intro);

  for (const bag of session.bags) {
    for (const group of bag.groups) {
      const groupCards = group.asNeeded.value
        ? asNeededCards(bag, group, order)
        : regularCards(bag, group, order);
      cards.push(...groupCards);
      order += Math.max(groupCards.length, 1);

      if (group.pharmacistNote !== null && group.pharmacistNote.trim() !== '') {
        const note = buildCard({
          type: 'PHARMACIST_NOTE',
          templateId: 'PHARMACIST_NOTE_V1',
          slots: { text: group.pharmacistNote.trim() },
          required: false,
          sourceType: 'PHARMACIST_INPUT',
          groupId: group.groupId,
          bagId: bag.bagId,
          order: order++,
          pharmacistAuthored: true,
        });
        if (note !== null) {
          cards.push({ ...note, selected: true });
        }
      }
    }
  }

  const cautions = cautionCards(session, order);
  cards.push(...cautions);
  order += cautions.length;

  const closing = buildCard({
    type: 'CLOSING',
    templateId: 'CLOSING_V1',
    slots: {},
    required: true,
    sourceType: 'REVIEWED_PHRASE_DB',
    groupId: null,
    bagId: null,
    order: order + 100,
  });
  if (closing !== null) cards.push(closing);

  // 이전 구성에서 약사가 바꾼 선택 상태를 같은 문장에 다시 적용한다.
  const previous = new Map(session.cards.map((card) => [card.displayText, card]));
  return cards
    .map((card) => {
      const prior = previous.get(card.displayText);
      if (prior === undefined) return card;
      return { ...card, selected: prior.selected, pharmacistVerified: prior.pharmacistVerified };
    })
    .sort((a, b) => a.order - b.order)
    .map((card, index) => ({ ...card, order: index }));
}

/** 환자에게 전송할 최종 자막 목록 */
export function selectedCards(session: Session): GuidanceCard[] {
  return session.cards.filter((card) => card.selected).sort((a, b) => a.order - b.order);
}

/** 질문 유형에 대응하는 카드 — 약사가 해당 문장만 다시 전송할 때 사용한다 (부록 A 2 10번) */
export function cardForQuestion(session: Session, questionType: string): GuidanceCard | null {
  const map: Record<string, GuidanceCard['type'][]> = {
    WHEN_TO_TAKE: ['TIMING'],
    HOW_MANY: ['DOSING', 'FREQUENCY'],
    WHAT_IS_THIS: ['INTRO'],
    DROWSY: ['CAUTION'],
    SIDE_EFFECT: ['ADVERSE_REACTION', 'CAUTION'],
    OTHER: [],
  };
  const types = map[questionType] ?? [];
  for (const type of types) {
    const card = selectedCards(session).find((item) => item.type === type);
    if (card !== undefined) return card;
  }
  return null;
}

export function timingCodeOf(group: MedicationGroup): TimingCode | null {
  return group.timingCode.value;
}
