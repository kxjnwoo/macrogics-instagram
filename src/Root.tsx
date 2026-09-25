import React from "react";
import { Composition } from "remotion";
import { DesignFrame } from "./components/DesignFrame";
import { FollowCard } from "./components/FollowCard";
import { MixedText } from "./components/MixedText";
import { FOLLOW_PROMPT_FRAMES } from "./components/FollowPrompt";
import { tokens } from "./tokens";
import "./index.css";

const DesignPreview = () => (
  <DesignFrame
    headline="디자인 시스템"
    caption="자막 서체와 배치"
    source="Macrogics · Design"
    qa
  >
    <div
      data-qa="body"
      style={{
        fontSize: tokens.size.body,
        lineHeight: 1.4,
        margin: `0 ${tokens.layout.bodyInset}px`,
      }}
    >
      <MixedText text="한글 본문과 숫자 123" variant="body" />
    </div>
  </DesignFrame>
);
const FollowPreview = () => <DesignFrame qa overlay={<FollowCard />} />;
export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="DesignSystem"
      component={DesignPreview}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={1}
    />
    <Composition
      id="FollowCard"
      component={FollowPreview}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={FOLLOW_PROMPT_FRAMES}
    />
  </>
);
