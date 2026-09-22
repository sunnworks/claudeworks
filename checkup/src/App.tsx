import { useEffect } from 'react';
import { AccessibilityBar } from './components/AccessibilityBar';
import { SignVideoPanel } from './components/SignVideoPanel';
import { SignVideoProvider } from './components/SignVideoContext';
import { questionPosition } from './domain/questionnaireEngine';
import { IntroScreen } from './screens/IntroScreen';
import { ModuleDoneScreen } from './screens/ModuleDoneScreen';
import { ModulesScreen } from './screens/ModulesScreen';
import { QuestionScreen } from './screens/QuestionScreen';
import { ReviewScreen } from './screens/ReviewScreen';
import { SafetyModal } from './screens/SafetyModal';
import { ScenarioScreen } from './screens/ScenarioScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { WriterScreen } from './screens/WriterScreen';
import { DisplaySettingsProvider } from './state/DisplaySettings';
import { useQuestionnaireSession } from './state/useQuestionnaireSession';
import './styles/app.css';

function AppShell() {
  const s = useQuestionnaireSession();
  const showProgress = ['question', 'moduleDone', 'review'].includes(s.screen);

  // 화면이 바뀌면 문서 맨 위에서 시작한다.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [s.screen]);

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        본문으로 바로가기
      </a>

      <header className="topbar">
        <div className="topbar__inner">
          <h1 className="topbar__title">건강검진 수어 문진표</h1>
          <AccessibilityBar />
          {s.scenario && <span className="topbar__meta">{s.scenario.personLabel}</span>}
        </div>
        {showProgress && s.context && (
          <div className="progress">
            <div className="progress__label">
              <span>
                {s.progress.requiredAnswered} / {s.progress.requiredTotal}
              </span>
            </div>
            <div
              className="progress__track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={s.progress.percent}
              aria-label="문진 진행률"
            >
              <div className="progress__bar" style={{ width: `${s.progress.percent}%` }} />
            </div>
          </div>
        )}
      </header>

      <main className="app__main" id="main">
        {s.removalNotice && (
          <div className="notice notice--warn" role="status" aria-live="polite">
            답이 바뀌어서 질문 {s.removalNotice.count}개가 없어졌습니다.
            <div className="btn-row" style={{ marginTop: 8 }}>
              <button type="button" className="btn btn--small btn--ghost" onClick={s.dismissRemovalNotice}>
                확인
              </button>
            </div>
          </div>
        )}

        {/* 수어영상 패널은 모든 화면에 같은 자리에 있다. 농인이 영상만 보고도 끝까지 진행할 수 있어야 한다. */}
        <div className="app__layout">
          <div className="app__layout__video">
            <SignVideoPanel />
          </div>

          <div className="app__layout__content">
            {s.screen === 'intro' && <IntroScreen onStart={() => s.setScreen('scenario')} />}

            {s.screen === 'scenario' && <ScenarioScreen scenarios={s.scenarios} onSelect={s.startScenario} />}

            {s.screen === 'writer' && s.scenario && (
              <WriterScreen
                proxyWriting={s.proxyWriting}
                onProxyChange={s.setProxyWriting}
                onNext={() => s.setScreen('modules')}
                onBack={() => s.setScreen('scenario')}
              />
            )}

            {s.screen === 'modules' && s.context && (
              <ModulesScreen
                modules={s.modules}
                context={s.context}
                onStart={s.beginQuestions}
                onBack={() => s.setScreen('writer')}
              />
            )}

            {s.screen === 'question' && s.currentQuestion && s.context && s.currentQuestionId && (
              <QuestionScreen
                question={s.currentQuestion}
                answer={s.answers[s.currentQuestionId]}
                status={s.answerStatus(s.currentQuestionId)}
                context={s.context}
                unknown={s.unknownFlags[s.currentQuestionId] === true}
                onToggleUnknown={() => s.toggleUnknown(s.currentQuestionId!)}
                positionLabel={(() => {
                  const position = questionPosition(s.currentQuestionId, s.context);
                  return `${position.index + 1} / ${position.total}`;
                })()}
                onChange={(answer) => s.setAnswer(s.currentQuestionId!, answer)}
                onBulkNone={s.setBulkNone}
                onPrev={s.goPrev}
                onNext={s.goNext}
                isLast={questionPosition(s.currentQuestionId, s.context).index === s.questions.length - 1}
              />
            )}

            {s.screen === 'moduleDone' && (
              <ModuleDoneScreen
                module={s.completedModule}
                missingCount={s.incomplete.length}
                onContinue={() => s.setScreen('question')}
                onReview={() => s.setScreen('review')}
              />
            )}

            {s.screen === 'review' && s.context && (
              <ReviewScreen
                modules={s.modules}
                context={s.context}
                unknownFlags={s.unknownFlags}
                incompleteCount={s.incomplete.length}
                showIncomplete={s.showIncomplete}
                onJump={s.jumpToQuestion}
                onFinish={s.finishReview}
                onBack={() => s.setScreen('question')}
              />
            )}

            {s.screen === 'summary' && s.scenario && s.context && (
              <SummaryScreen
                scenario={s.scenario}
                proxyWriting={s.proxyWriting}
                modules={s.modules}
                context={s.context}
                scores={s.scores}
                safetyFlagged={s.safetyFlagged}
                unknownQuestions={s.unknownQuestions}
                onRestart={s.restart}
              />
            )}
          </div>
        </div>
      </main>

      {s.safetyOpen && <SafetyModal onAcknowledge={s.acknowledgeSafety} />}
    </div>
  );
}

export default function App() {
  return (
    <DisplaySettingsProvider>
      <SignVideoProvider>
        <AppShell />
      </SignVideoProvider>
    </DisplaySettingsProvider>
  );
}
