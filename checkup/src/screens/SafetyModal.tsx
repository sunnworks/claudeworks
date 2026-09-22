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
        <h2 id="safety-title">혼자 견디지 않아도 됩니다</h2>

        <div className="notice notice--danger">
          <strong>지금 위험하거나 스스로를 해칠 것 같다면</strong>
          아래 번호로 바로 연락하세요. 문자로도 연락할 수 있습니다.
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

        <p>검진 날 의료진과 같이 볼 수 있게 표시를 남깁니다. 문진표는 계속 쓸 수 있습니다.</p>

        <div className="btn-row btn-row--end">
          <button type="button" className="btn btn--primary" onClick={onAcknowledge} autoFocus>
            알겠습니다
          </button>
        </div>
      </div>
    </div>
  );
}
