# Macrogics · 매크로직스

API 연동, 디자인 시스템과 마지막 팔로우 카드를 보관하는 프로젝트다.

## 구성

- `integrations/`: FRED, Twelve Data, Finnhub, ElevenLabs, 모델 API, RSS, State Street 및 Farside 연결·파서
- `src/`: 색상·서체·레이아웃·차트·도식·팔로우 카드 컴포넌트
- `public/fonts/`, `public/branding/`, `public/logo*`: 기존 폰트와 브랜드 자산
- `public/audio/follow-click.wav`, `assets/audio/`: 팔로우 카드 클릭음
- `config/integrations.json`, `config/brand.json`: 연결 설정과 브랜드 규격

## 사용

`npm install`로 의존성을 설치한다. API 인증은 기존 `.env` 또는 `.env.example`의 환경변수를 사용한다. 호출 측에서 환경변수를 로드하며, 라이브러리를 가져오는 것만으로 API를 호출하지 않는다. 자세한 연결 방식은 [DATA.md](DATA.md)에 있다.

`npm run dev`는 디자인 시스템과 팔로우 카드 미리보기를 연다. `DesignSystem`은 서체·배치 견본이고 `FollowCard`는 기존 96프레임 카드와 클릭음이다. `npm run check`와 `npm test`는 남아 있는 코드와 디자인/API 동작을 검사한다.

디자인 규격은 [DESIGN.md](DESIGN.md), 컴포넌트 구조는 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)를 참조한다.
