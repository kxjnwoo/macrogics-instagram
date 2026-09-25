# Macrogics

이 저장소는 API 연동, 디자인 시스템, 마지막 팔로우 카드만 보관한다.

- 디자인 기준은 DESIGN.md, 화면 값의 기준은 src/tokens.ts와 src/typography.ts다.
- 기존 로고·로컬 폰트·Instagram 안전 영역·팔로우 카드와 클릭음을 보존한다.
- API 연동은 integrations/와 config/integrations.json에 있다. 인증 값은 .env에서만 읽으며 로그나 Git에 노출하지 않는다.
- 변경 확인은 npm run check와 npm test로 수행한다.
