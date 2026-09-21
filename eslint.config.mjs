import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescriptConfig from 'eslint-config-next/typescript';

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'test-results/**', 'playwright-report/**', '*.tmp.mjs'] },
  ...coreWebVitals,
  ...typescriptConfig,
  {
    rules: {
      /*
       * 데모 화면은 마운트 시 세션을 조회하고 일정 간격으로 폴링해 약사 승인 상태를 동기화한다
       * (설계서 C 2 권장 데모안: 세션코드와 폴링). 이 패턴은 effect 안에서 상태를 갱신하므로
       * 해당 규칙과 충돌한다. 운영 구현에서는 데이터 조회 라이브러리나 실시간 채널로 대체한다.
       */
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];

export default config;
