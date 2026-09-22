interface Props {
  onAcknowledge: () => void;
}

/**
 * S07 정신건강 안전안내.
 * PHQ-9 9번 문항에 1점 이상 답하면 다음 버튼보다 먼저 표시한다.
 * 연락처는 임의로 추가·변경하지 않는다.
 */
export function SafetyModal({ onAcknowledge }: Props) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="safety-title">
      <div className="modal">
        <h2 id="safety-title">잠시만요. 꼭 읽어 주세요</h2>
        <p className="lead">
          방금 답한 내용은 힘든 상태일 수 있다는 뜻입니다. 혼자 견디지 않아도 됩니다.
        </p>

        <div className="notice notice--danger">
          <strong>지금 위험하거나 스스로를 해칠 것 같다면</strong>
          아래 번호로 바로 연락하세요. 수어통역이 필요하면 영상통화나 문자로 연락할 수 있습니다.
        </div>

        <ul className="contact-list">
          <li>
            119 또는 112
            <span>생명이 위급하거나 즉시 도움이 필요할 때</span>
          </li>
          <li>
            자살예방상담전화 109
            <span>24시간 운영</span>
          </li>
        </ul>

        <p>
          검진 당일 의료진이 함께 확인할 수 있도록 <strong>의료진 확인 필요</strong> 표시를 남깁니다.
          문진은 계속 진행할 수 있습니다.
        </p>
        <p className="field__hint">
          이 안내는 상담이나 진료를 대신하지 않습니다. 화면 안내만으로 위기 대응이 끝난 것으로 보지 않습니다.
        </p>

        <div className="btn-row btn-row--end">
          <button type="button" className="btn btn--primary" onClick={onAcknowledge} autoFocus>
            안내를 확인했습니다
          </button>
        </div>
      </div>
    </div>
  );
}
