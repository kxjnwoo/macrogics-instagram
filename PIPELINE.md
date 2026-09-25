# 디자인 컴포넌트 참조

공통 화면은 `DesignFrame`, 혼합 서체는 `MixedText`와 `ChartText`가 담당한다. 중앙 영역에는 `Charts`, `ChartTakeaway`, `CentralVisual`, `VisualComposition`, `CompositionDiagram`, `SectorValuationChart`를 배치할 수 있다.

컴포넌트에는 표시할 데이터와 프레임·큐 시각을 직접 전달한다. 배치는 `tokens.layout`, 글자 크기는 `tokens.size`와 `tokens.visualText`를 사용한다. 차트 설명56px와 일반 본문64px의 구분을 유지한다.

`FollowCard`는 마지막 팔로우 캡슐과 한 번의 클릭음을 묶는다. 시작 프레임은 호출자가 정하며 지속 시간은96프레임이다. 상세 규격은 [DESIGN.md](DESIGN.md)에 있다.
