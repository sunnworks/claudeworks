import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '수어 복약지도 데모 · 약봉투 OCR 기반',
  description:
    '약봉투 OCR로 복약정보를 확인하고 약사가 승인한 내용을 농인 환자에게 수어 아바타로 안내하는 데모입니다. 모든 데이터는 시연용 가상 데이터입니다.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  // 카운터 태블릿에서 주소창 색을 브랜드색으로 맞춘다.
  themeColor: '#0d5bd4',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
