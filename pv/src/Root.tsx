import React from "react";
import { Composition } from "remotion";
import { Main, Probe } from "./Main";
import { AlignPreview } from "./AlignPreview";
import { CompTest } from "./CompTest";
import features from "../public/features.json";

export const FPS = 30;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="NetsuIjou"
      component={Main}
      durationInFrames={Math.ceil(features.duration * FPS)}
      fps={FPS}
      width={1920}
      height={1080}
    />
    <Composition
      id="Probe"
      component={Probe}
      durationInFrames={1}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{ times: [10] as number[] }}
      calculateMetadata={({ props }) => ({ durationInFrames: props.times.length })}
    />
    <Composition
      id="AlignPreview"
      component={AlignPreview}
      durationInFrames={Math.ceil(features.duration * FPS)}
      fps={FPS}
      width={1920}
      height={1080}
    />
    <Composition id="CompTest" component={CompTest} durationInFrames={150} fps={FPS} width={1920} height={1080} />
  </>
);
