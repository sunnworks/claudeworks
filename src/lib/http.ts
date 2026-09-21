import { NextResponse } from 'next/server';

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, { status: 200, ...init });
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 });
}

export function badRequest(message: string, extra?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ error: message, ...extra }, { status: 400 });
}

export function notFound(message = '대상을 찾을 수 없습니다.'): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverError(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 500 });
}

export function handle(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : '처리 중 오류가 발생했습니다.';
  // 상태 전이·검증 실패는 사용자 입력 문제이므로 400으로 응답한다.
  if (/찾을 수 없습니다/.test(message)) return notFound(message);
  if (/허용되지 않은|남아 있어|없는 세션|없습니다|주세요/.test(message)) return badRequest(message);
  return serverError(message);
}

/** 요청 오리진 기준 base URL — QR 주소 생성에 사용한다 */
export function baseUrlFrom(request: Request): string {
  const configured = process.env.PUBLIC_BASE_URL;
  if (configured !== undefined && configured !== '') return configured;
  const url = new URL(request.url);
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const host = forwardedHost ?? url.host;
  const proto = forwardedProto ?? url.protocol.replace(':', '');
  return `${proto}://${host}`;
}
