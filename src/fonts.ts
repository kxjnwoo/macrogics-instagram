import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";
export const fontReady = Promise.all([
  loadFont({
    family: "Prociono",
    url: staticFile("fonts/Prociono/Prociono-Regular.ttf"),
  }),
  loadFont({
    family: "Instrument Serif",
    url: staticFile("fonts/Instrument_Serif/InstrumentSerif-Regular.ttf"),
  }),
  loadFont({
    family: "Chosun",
    url: staticFile("fonts/Chosun/ChosunNm.woff2"),
  }),
  loadFont({
    family: "Noto Serif KR",
    weight: "600",
    url: staticFile("fonts/Noto_Serif_KR/NotoSerifKR-VariableFont_wght.ttf"),
  }),
  loadFont({
    family: "Pretendard",
    weight: "600",
    url: staticFile("fonts/Pretendard/static/Pretendard-SemiBold.otf"),
  }),
  loadFont({
    family: "Editorial",
    url: staticFile(
      "fonts/PP_Editorial_New/PPEditorialNew-Regular-BF644b214ff145f.otf",
    ),
  }),
  loadFont({
    family: "Batang",
    url: staticFile("fonts/KoPubWorld/KoPubWorld Batang Medium.ttf"),
  }),
  loadFont({
    family: "Pretendard",
    url: staticFile("fonts/Pretendard/static/Pretendard-Regular.otf"),
  }),
]);
