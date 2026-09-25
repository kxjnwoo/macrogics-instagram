# 디자인 시스템 구조

`src/tokens.ts`는 색상·글자 크기·간격·영역·모션·팔로우 클릭 볼륨을 정의한다. `fonts.ts`가 로컬 서체를 로드하고 `typography.ts`, `MixedText`, `ChartText`가 문자 역할별 표시를 적용한다.

`DesignFrame`은 머리말·날짜·제목·중앙 영역·자막·출처를 제공한다. 중앙 영역의 시각 요소는 `CentralVisual`, `VisualComposition`, `CompositionDiagram`과 차트 컴포넌트로 구성한다. `design-schema.ts`와 `composition-schema.ts`는 표시 데이터와 배치 형식만 정의한다.

`FollowPrompt`는 기존 유리 캡슐과 버튼·커서를 표시하며 `FollowCard`가 원본 클릭음을 결합한다. `Root.tsx`에는 디자인 견본과 팔로우 카드 미리보기가 있다.

`platform-layout.ts`, `LayoutQA`, `bar-qa.ts`는 화면 경계·겹침·서체·차트 기하를 검사한다. 모든 주요 좌표와 크기는 [DESIGN.md](../DESIGN.md)에 정리되어 있다.
