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
          <h1 className="topbar__title">농인용 건강검진 수어 사전문진</h1>
          <AccessibilityBar />
          <span className="topbar__meta">
            <span className="demo-badge">데모 · 저장하지 않음</span>
            {s.scenario && (
              <span>
                {' '}
                {s.scenario.title} · {s.scenario.personLabel}
              </span>
            )}
          </span>
        </div>
        {showProgress && s.context && (
          <div className="progress">
            <div className="progress__label">
              <span>
                필수문항 {s.progress.requiredAnswered} / {s.progress.requiredTotal}
              </span>
              <span>{s.progress.percent}%</span>
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
            <strong>답변이 바뀌어 {s.removalNotice.count}개 문항이 대상에서 빠졌습니다</strong>
            빠진 문항의 답변은 삭제했습니다: {s.removalNotice.labels.join(' / ')}
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
                scenario={s.scenario}
                proxyWriting={s.proxyWriting}
                onProxyChange={s.setProxyWriting}
                onNext={() => s.setScreen('modules')}
                onBack={() => s.setScreen('scenario')}
              />
            )}

            {s.screen === 'modules' && s.scenario && s.context && (
              <ModulesScreen
                scenario={s.scenario}
                modules={s.modules}
                context={s.context}
                proxyWriting={s.proxyWriting}
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

      <p className="footer-note">
        시연용 데모입니다. 진단하지 않으며 병원으로 전송하지 않습니다. 공식 문항과 응답값은 서식 원문을 따릅니다.
        정신건강 위기 상황에서는 119 또는 112, 자살예방상담전화 109로 연락하세요.
      </p>

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
