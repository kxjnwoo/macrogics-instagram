import { displayUsdAmounts } from "../currency-notation";
import React from "react";
import { tokens as t } from "../tokens";
import { textRoles } from "../typography";
// A mixed-script word (20bp는) remains unbroken. Korean inherits its context;
// Latin styling is contextual: body uses Instrument Serif, captions use Editorial,
// other content uses Instrument Serif. Keep these overrides local to the text role.
export const MixedText: React.FC<{
  text: string;
  variant?: "default" | "body" | "caption" | "chart";
}> = ({ text, variant = "default" }) => (
  <span style={variant === "default" ? undefined : textRoles[variant]}>
    {displayUsdAmounts(text)
      .replace(/(\S+) 수 (있\S*|없\S*)/gu, "$1\u00a0수\u00a0$2")
      .split(/([ \t\r\n]+)/u)
      .map((word, i) =>
        /^[ \t\r\n]+$/.test(word) ? (
          word
        ) : (
          <span key={i} style={{ whiteSpace: "nowrap" }}>
            {word
              .split(/([\p{Script=Hangul}]+)/gu)
              .filter(Boolean)
              .map((part, j) =>
                /\p{Script=Hangul}/u.test(part) ? (
                  <span
                    key={j}
                    data-script="korean"
                    data-typography={
                      variant === "default" ? undefined : variant
                    }
                    // Resolve em at the actual text size, not a smaller ancestor.
                    style={
                      variant === "default" ? undefined : textRoles[variant]
                    }
                  >
                    {part}
                  </span>
                ) : (
                  <span
                    key={j}
                    data-script="latin"
                    data-typography={
                      variant === "default" ? "body-latin" : `${variant}-latin`
                    }
                    style={{
                      fontFamily:
                        variant === "caption"
                          ? t.font.captionLatin
                          : t.font.latin,
                      fontWeight: 400,
                      // Editorial's baseline metrics must not enlarge the
                      // caption parent's fixed two-line rhythm.
                      ...(variant === "caption" ? { lineHeight: 1 } : {}),
                      letterSpacing:
                        variant === "caption"
                          ? t.tracking.caption
                          : variant === "chart"
                            ? t.tracking.chart
                            : "normal",
                    }}
                  >
                    {part}
                  </span>
                ),
              )}
          </span>
        ),
      )}
  </span>
);
