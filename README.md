# 카드뜰 (SOMA17 AI 17조 메인 프로젝트)

소상공인을 위한 인스타 카드뉴스 도우미. 사진 한 장과 가게 정보만 입력하면
AI 가 카드뉴스 4컷, 홍보 문구, 해시태그까지 만들어 줍니다.

- Next.js 16 (App Router) + React 19
- Tailwind v4 + shadcn/ui (Radix · Nova preset)
- Motion (애니메이션) · html-to-image (PNG 다운로드) · react-dropzone
- Upstage Solar (텍스트 생성) — 키 미설정 시 fallback 카피
- 이미지 생성은 외부 API 미정으로 데모 mock

## 화면 구성

- `/` — 랜딩 (Hero + 4단계 안내 + CTA)
- `/studio` — 4단계 위저드
  1. 사진 업로드 (드래그&드롭 / 최대 4장)
  2. 가게 정보 입력 (이름 · 업종 · 홍보 목적 · 톤 · 핵심 키워드 · 상세 · 가격/CTA)
  3. AI 작업 (애니메이션 진행 표시)
  4. 결과 확인 (카드 4컷 미리보기 · 캡션 · 해시태그 · PNG 다운로드)

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 열기.

## 환경 변수

`.env.example` 을 `.env.local` 로 복사 후 채우세요. 모두 서버 전용입니다.

```bash
UPSTAGE_API_KEY=
UPSTAGE_MODEL=solar-pro3
UPSTAGE_BASE_URL=https://api.upstage.ai/v1
```

`UPSTAGE_API_KEY` 가 없거나 호출이 실패하면 fallback 카피를 반환합니다.

## API

- `GET  /api/health` — `{ ok, solarConfigured, imageProvider }`
- `POST /api/cards/generate` — body: `{ brief, photoIds[], count?, seed? }`

## 검증

```bash
npm run lint        # eslint + tsc 미포함, 별도로 tsc 호출 권장
npm run build       # next build (TypeScript 체크 포함)
npm run test:e2e    # Playwright smoke (PLAYWRIGHT_BASE_URL 환경변수)
```

배포 후 production 검증:

```bash
PLAYWRIGHT_BASE_URL=https://soma17-ai17-main-project.vercel.app npm run test:e2e
```

## Vercel 배포

- Vercel CLI 로 배포되어 있습니다 (`vercel --prod`).
- env 에 `UPSTAGE_API_KEY` 를 설정해야 Solar 카피가 켜집니다.
- 미설정 시 fallback 카피 + mock 이미지로 정상 동작합니다.
