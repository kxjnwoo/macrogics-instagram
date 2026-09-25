# API 연동

연동 코드의 공용 진입점은 `integrations/index.ts`다. 함수는 명시적으로 호출될 때만 요청하며 파일 저장이나 예약 실행을 하지 않는다. 기존 `.env`는 유지하며 사용자가 호출 환경에서 로드한다.

| 서비스 | 연결 | 설정 |
|---|---|---|
| FRED | `fetchSeries` | `FRED_API_KEY` |
| Twelve Data | `fetchSeries` | `TWELVE_DATA_API_KEY` (기존 `TWELVEDATA_API_KEY`도 지원) |
| Finnhub | `companyProfile` | `FINNHUB_API_KEY` |
| ElevenLabs | `speechClient`, `textToSpeech` | SDK: `ELEVENLABS_API_KEY`; 음성: `ELEVENLABS_VOICE_ID` |
| 모델 API | `chatCompletion` | `EDITOR_API_KEY`, 선택적 `EDITOR_API_URL`, `EDITOR_MODEL`, `EDITOR_REASONING_EFFORT` |
| 공식 RSS | `collectFeeds(since, until)` | `config/integrations.json`의 Fed/BLS/BEA/ECB 피드 |
| State Street | `fetchSectorValuation`, `parseSectorPage` | 공개 섹터 페이지 |
| Farside | `parseFarsideTable`, `farsideSeries` | 호출자가 제공하는 원문 표 |

## 시계열 계약

`integrations/schema.ts`의 `DataRequest`는 provider/id/symbol/title/start/end/semantics를 받는다. 반환 `Series`는 출처 URL, 수집 시각, 단위·빈도·조정 기준, 날짜별 실제 값과 null을 보존한다. 공급자가 발행 시각을 주지 않으면 `published_at`은 null이다.

FRED는 단위·빈도·계절조정 메타데이터를 확인하며 vintage가 요청 기준일을 넘으면 거부한다. 지원 의미는 국채 수익률, 문서화된 WTI/Brent 현물, 경제지표다. Twelve Data는 일별 close/adjusted_close/FX를 지원하고 조정 여부와 통화 방향을 명시한다. 종료일은 거래소 현지 날짜의23:59:59까지 요청하며 범위 밖 응답을 거부한다. 결측 종가는 null, 결측 OHLC는 생략하며 0으로 바꾸지 않는다.

Twelve Data의 거래소·MIC·상품 유형을 보존한다. `src/chart-observations.ts`와 `src/market-session.ts`는 지원되는 날짜/시장에 한해 휴장과 세션을 계산한다. 미국 주식 휴장표는2026년, FRED 국채 관련 휴장표는2026–2030년으로 범위가 제한된다. 미확인 시장·휴일을 티커만으로 추정하지 않는다.

State Street 파서는 Index Characteristics의 Price/Earnings Ratio FY1만 읽는다. Fund Characteristics의 PER과 구분한다. Farside 파서는 US$m를 USD로 정확히 변환하고 괄호는 유출로 읽는다. 미보고 펀드 셀이 있는 행은 합계 표기가0이어도 null로 남긴다.

## 음성과 모델 연결

ElevenLabs의 기존 기본값은 Juan(`8lidWTlnwgjObqCImnE2`), `eleven_multilingual_v2`, speed1.11이다. Codex 플러그인의 OAuth 연결은 독립 SDK 인증과 별개이며 유지된다. SDK 래퍼는 오디오와 alignment 응답만 반환하고 유료 호출을 자동 재시도하지 않는다. 효과음 등 다른 SDK API는 `speechClient()`로 접근할 수 있다.

모델 연결의 기존 기본값은 `gpt-6-astra` / low이며 환경변수로 바꿀 수 있다. `chatCompletion`은 호출자가 넘긴 메시지만 전송한다.
