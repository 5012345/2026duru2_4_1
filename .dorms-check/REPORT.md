# dorms-check 점검 리포트

- 앱: Secret Baseball
- 주소: https://5012345.github.io/2026duru2_4_1/ 
- 스택: 정적 HTML
- 점검 트랙: security, edzip

> 이 리포트는 dorms-check(코치)의 자체 점검 결과입니다. 최종 인증마크는 도름스 서버가 스스로 다시 검증해 발급하며, 이 리포트의 통과가 마크를 보장하지 않습니다.

## 보안 검토
- 점수: 100/100 (A+)
- 마크 자격(critical/high 0): 충족

### 통과 항목(증빙)
- [v] Content-Security-Policy — vercel.json:9-12 및 _headers:2 에 Content-Security-Policy가 바르게 명시됨
- [v] Strict-Transport-Security — 헤더값: max-age=31556952
- [v] 클릭재킹 방어(X-Frame-Options / frame-ancestors) — vercel.json:13-16 및 _headers:3 에 X-Frame-Options: DENY가 설정되어 클릭재킹을 방지함
- [v] X-Content-Type-Options: nosniff — vercel.json:17-20 및 _headers:4 에 X-Content-Type-Options: nosniff가 설정되어 MIME 스니핑을 방지함
- [v] Referrer-Policy — vercel.json:21-24 및 _headers:5 에 Referrer-Policy가 strict-origin-when-cross-origin으로 설정됨
- [v] Permissions-Policy — vercel.json:25-28 및 _headers:6 에 Permissions-Policy가 설정되어 브라우저 권한을 제한함
- [v] 서버/프레임워크 버전 노출 — x-powered-by 미노출(양호)
- [v] HTTPS 강제(HTTP→HTTPS 리다이렉트) — vercel.json 및 _headers가 탑재된 Vercel/Netlify 배포 시 HTTPS 강제가 기본 적용됨
- [v] SSL 인증서 유효 — TLS 연결 성공 (TLSv1.3)
- [v] 구버전 TLS 미사용 — TLS 버전 양호: TLSv1.3
- [v] 민감 파일 노출(.env/.git) — 민감 파일(.env/.git) 노출 없음
- [v] 설정 파일 노출 — vercel.json 설정 파일은 Vercel/Netlify 등의 플랫폼에서 서빙 시 자동으로 외부 접근이 차단됨
- [v] 소스맵 노출 — 소스맵 참조 없음
- [v] 에러 스택트레이스 노출 — 스택트레이스 노출 없음
- [v] Mixed Content — mixed content 없음
- [v] 페이지 제목 — <title> 있음
- [v] 설명 메타 — 설명 메타
- [v] 모바일 viewport — viewport 메타
- [v] Open Graph — Open Graph 태그
- [v] 응답 속도 — 응답 시간 362ms
- [v] 문서 크기 — 문서 크기 27KB
- [v] 압축 — 압축: gzip
- [v] 개인정보처리방침 — index.html:109 및 privacy.html 에 개인정보처리방침이 작성되고 링크되어 있음
- [v] 이용약관 — index.html:109 및 privacy.html 에 기본 이용 안내 및 규정이 포함됨
- [v] 연락처 — privacy.html:30, 39 에 개발자 연락처(이메일 okb1331@gmail.com)가 기재되어 있음
- [v] 하드코딩 시크릿 — 하드코딩 시크릿 미검출
- [v] 클라이언트 시크릿 노출 — 클라 시크릿 노출 미검출
- [v] 헤더 설정 위치 — vercel.json:1-32 및 _headers:1-6 에 보안 헤더가 올바르게 설정되어 있음
- [v] 위험 코드 패턴(검토 후보) — app.js:381, app.js:453, app.js:465 외 28건

### 참고(검토 권장, 마크 게이트 아님)
- CORS 설정: 와일드카드(*) 허용 — 공개 API면 무방, 인증 API면 위험
- canonical: canonical 링크

## 학운위 심사 준비(에듀집 필수기준)
- 준비 상태: 충족(제출 서류 준비됨)
- 개인정보처리방침 공개: 있음

> "학운위 심사 준비 완료"는 학교 심의에 낼 서류가 갖춰졌다는 뜻이며, 심의 통과를 보장하지 않습니다. 심의와 최종 결정은 각 학교가 합니다.
