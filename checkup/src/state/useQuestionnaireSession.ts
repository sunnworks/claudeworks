import { useCallback, useMemo, useState } from 'react';
import { QUESTIONNAIRE, SCENARIOS } from '../data/questionnaire.v2026';
import {
  buildContext,
  computeProgress,
  findIncompleteQuestions,
  findModule,
  findQuestion,
  neighbourQuestionId,
  pruneOrphanAnswers,
  selectModules,
  visibleQuestions,
} from '../domain/questionnaireEngine';
import { isSelfHarmResponse, scoreInstruments } from '../domain/scoring';
import { validateAnswer } from '../domain/validation';
import type { Answer, AnswerMap, ScenarioDefinition, SessionContext } from '../domain/types';

export type ScreenId =
  | 'intro'
  | 'scenario'
  | 'writer'
  | 'modules'
  | 'question'
  | 'moduleDone'
  | 'review'
  | 'summary';

export interface RemovalNotice {
  count: number;
  labels: string[];
}

/**
 * 문진 세션 상태.
 * 메모리에만 보관한다. localStorage·sessionStorage·URL 에 답변을 남기지 않는다.
 */
export function useQuestionnaireSession() {
  const [screen, setScreen] = useState<ScreenId>('intro');
  const [scenario, setScenario] = useState<ScenarioDefinition | undefined>();
  const [proxyWriting, setProxyWriting] = useState(false);
  const [preferredCommunication, setPreferredCommunication] = useState<string[]>([]);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [currentQuestionId, setCurrentQuestionId] = useState<string | undefined>();
  const [completedModuleId, setCompletedModuleId] = useState<string | undefined>();
  const [removalNotice, setRemovalNotice] = useState<RemovalNotice | undefined>();
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [safetyFlagged, setSafetyFlagged] = useState(false);
  const [showIncomplete, setShowIncomplete] = useState(false);

  const session: SessionContext | undefined = useMemo(
    () => (scenario ? { scenario, proxyWriting, preferredCommunication } : undefined),
    [scenario, proxyWriting, preferredCommunication],
  );

  const context = useMemo(
    () => (session ? buildContext(session, answers) : undefined),
    [session, answers],
  );

  const modules = useMemo(() => (session ? selectModules(session) : []), [session]);
  const questions = useMemo(() => (context ? visibleQuestions(context) : []), [context]);
  const progress = useMemo(
    () => (context ? computeProgress(context) : { requiredTotal: 0, requiredAnswered: 0, percent: 0 }),
    [context],
  );
  const incomplete = useMemo(() => (context ? findIncompleteQuestions(context) : []), [context]);
  const scores = useMemo(
    () => scoreInstruments(answers, modules.map((module) => module.moduleId)),
    [answers, modules],
  );

  const currentQuestion = currentQuestionId ? findQuestion(currentQuestionId) : undefined;

  const startScenario = useCallback((next: ScenarioDefinition) => {
    setScenario(next);
    setProxyWriting(next.defaultProxyWriting);
    setPreferredCommunication([]);
    setAnswers({});
    setCurrentQuestionId(undefined);
    setSafetyFlagged(false);
    setSafetyOpen(false);
    setShowIncomplete(false);
    setRemovalNotice(undefined);
    setScreen('writer');
  }, []);

  const beginQuestions = useCallback(() => {
    if (!session) return;
    const first = visibleQuestions(buildContext(session, answers))[0];
    setCurrentQuestionId(first?.questionId);
    setScreen('question');
  }, [session, answers]);

  /** 답변을 반영하고 비대상이 된 하위답변을 폐기한다. 상태 갱신 함수 안에서 부수효과를 내지 않는다. */
  const applyAnswers = useCallback(
    (changes: Array<[string, Answer | undefined]>) => {
      if (!session) return;
      const draft: AnswerMap = { ...answers };
      for (const [questionId, answer] of changes) {
        if (answer === undefined) delete draft[questionId];
        else draft[questionId] = answer;
      }

      const pruned = pruneOrphanAnswers(session, draft);
      setAnswers(pruned.answers);
      setRemovalNotice(
        pruned.removedQuestionIds.length > 0
          ? {
              count: pruned.removedQuestionIds.length,
              labels: pruned.removedQuestionIds.map(
                (id) => findQuestion(id)?.officialText.slice(0, 24) ?? id,
              ),
            }
          : undefined,
      );

      const phq9 = changes.find(([questionId]) => questionId === 'PHQ9-09');
      if (phq9 && phq9[1] && isSelfHarmResponse({ 'PHQ9-09': phq9[1] })) {
        setSafetyOpen(true);
        setSafetyFlagged(true);
      }
    },
    [session, answers],
  );

  const setAnswer = useCallback(
    (questionId: string, answer: Answer | undefined) => applyAnswers([[questionId, answer]]),
    [applyAnswers],
  );

  /** 과거력처럼 묶인 문항을 한 번에 '해당 없음'으로 표시한다. */
  const setBulkNone = useCallback(
    (group: string) => {
      if (!context) return;
      const targets = visibleQuestions(context)
        .filter((question) => question.bulkNoneGroup === group)
        .map((question) => [question.questionId, { kind: 'choices', values: ['NONE'] } as Answer] as [string, Answer]);
      applyAnswers(targets);
    },
    [applyAnswers, context],
  );

  const dismissRemovalNotice = useCallback(() => setRemovalNotice(undefined), []);
  const acknowledgeSafety = useCallback(() => setSafetyOpen(false), []);

  const goNext = useCallback(() => {
    if (!context || !currentQuestionId) return;
    const nextId = neighbourQuestionId(currentQuestionId, 1, context);
    if (!nextId) {
      setScreen('review');
      return;
    }
    const currentModule = findQuestion(currentQuestionId)?.moduleId;
    const nextModule = findQuestion(nextId)?.moduleId;
    setCurrentQuestionId(nextId);
    if (currentModule && nextModule && currentModule !== nextModule) {
      setCompletedModuleId(currentModule);
      setScreen('moduleDone');
    }
  }, [context, currentQuestionId]);

  const goPrev = useCallback(() => {
    if (!context || !currentQuestionId) return;
    const prevId = neighbourQuestionId(currentQuestionId, -1, context);
    if (!prevId) {
      setScreen('modules');
      return;
    }
    setCurrentQuestionId(prevId);
  }, [context, currentQuestionId]);

  const jumpToQuestion = useCallback((questionId: string) => {
    setCurrentQuestionId(questionId);
    setScreen('question');
  }, []);

  const finishReview = useCallback(() => {
    if (incomplete.length > 0) {
      setShowIncomplete(true);
      return false;
    }
    setShowIncomplete(false);
    setScreen('summary');
    return true;
  }, [incomplete.length]);

  const restart = useCallback(() => {
    setScenario(undefined);
    setAnswers({});
    setCurrentQuestionId(undefined);
    setCompletedModuleId(undefined);
    setRemovalNotice(undefined);
    setSafetyFlagged(false);
    setSafetyOpen(false);
    setShowIncomplete(false);
    setScreen('intro');
  }, []);

  const answerStatus = useCallback(
    (questionId: string) => {
      const question = findQuestion(questionId);
      if (!question || !context) return { complete: false, errors: [] as string[] };
      return validateAnswer(question, answers[questionId], context);
    },
    [answers, context],
  );

  return {
    // 화면
    screen,
    setScreen,
    // 세션
    scenarios: SCENARIOS,
    scenario,
    session,
    proxyWriting,
    setProxyWriting,
    preferredCommunication,
    setPreferredCommunication,
    startScenario,
    beginQuestions,
    restart,
    // 문항
    definition: QUESTIONNAIRE,
    modules,
    questions,
    currentQuestion,
    currentQuestionId,
    setAnswer,
    setBulkNone,
    answers,
    answerStatus,
    goNext,
    goPrev,
    jumpToQuestion,
    // 진행·검증
    progress,
    incomplete,
    showIncomplete,
    finishReview,
    completedModule: completedModuleId ? findModule(completedModuleId) : undefined,
    // 알림·안전
    removalNotice,
    dismissRemovalNotice,
    safetyOpen,
    safetyFlagged,
    acknowledgeSafety,
    // 점수
    scores,
    context,
  };
}

export type QuestionnaireSession = ReturnType<typeof useQuestionnaireSession>;
