import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 데모 서버는 사내망 태블릿에서 접속하는 경우가 있으므로 개발 오리진을 넓게 허용한다.
  experimental: {},
  // 약봉투 이미지는 서버 메모리에서만 처리하고 디스크에 남기지 않는다.
  poweredByHeader: false,
};

export default nextConfig;
