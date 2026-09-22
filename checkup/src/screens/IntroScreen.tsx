interface Props {
  onStart: () => void;
}

/** S01 서비스 안내와 비저장 고지 */
export function IntroScreen({ onStart }: Props) {
  return (
    <div>
      <div className="card">
        <h2>농인용 건강검진 수어 사전문진</h2>
        <p className="lead">
          국가건강검진 문진표를 수어영상과 쉬운 한국어로 확인하고, 화면에서 직접 답하는 데모입니다.
          작성한 내용은 검진 당일 의료진이 확인할 수 있도록 정리해 보여 줍니다.
        </p>

        <div className="notice notice--warn">
          <strong>이 화면은 시연용 데모입니다</strong>
          실제 병원이나 국민건강보험공단으로 전송되지 않습니다. 진단을 하지 않으며, 표시되는 점수는 의료진 확인이
          필요한지 알려 주는 용도로만 사용합니다.
        </div>

        <div className="notice notice--info">
          <strong>개인정보를 저장하지 않습니다</strong>
          이름, 주민등록번호, 전화번호를 묻지 않습니다. 답변은 이 브라우저 화면에만 남고 서버로 보내지 않습니다.
          새로고침하거나 창을 닫으면 모두 사라집니다.
        </div>

        <h3>수어 안내에 대해</h3>
        <ul className="list">
          <li>문항과 선택지마다 <strong>수어 보기</strong> 버튼이 있습니다. 누르면 수어영상이 재생됩니다.</li>
          <li>
            현재 데모에는 문항별로 검수 완료된 수어영상이 없습니다. 실제 촬영한 <strong>샘플 수어영상</strong>을
            무작위로 재생하며, 화면에 항상 샘플이라는 배지를 표시합니다.
          </li>
          <li>영상은 자동으로 재생되지 않습니다. 재생·정지·다시보기·0.75배속·전체화면을 직접 조작할 수 있습니다.</li>
          <li>영상이 재생되지 않아도 공식 문구와 자막을 읽고 답할 수 있습니다.</li>
        </ul>

        <h3>진행 순서</h3>
        <ol className="list">
          <li>시나리오 선택 → 작성자와 지원 설정</li>
          <li>적용 모듈 확인 → 문항 작성</li>
          <li>전체 답변 검토와 수정 → 데모 확인표 인쇄</li>
        </ol>
      </div>

      <div className="btn-row btn-row--end">
        <button type="button" className="btn btn--primary" onClick={onStart}>
          시작하기
        </button>
      </div>
    </div>
  );
}
