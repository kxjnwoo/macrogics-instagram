import React from "react";
import { textRoles } from "../typography";

/** Set em tracking on the SVG text itself; inherited SVG tracking is already a pixel length. */
export const ChartText: React.FC<React.SVGProps<SVGTextElement>> = ({
  children,
  style,
  ...props
}) => {
  const korean =
    typeof children === "string" && /\p{Script=Hangul}/u.test(children);
  const role = korean ? "chart" : "chart-latin";
  return (
    <text
      {...props}
      data-typography={role}
      style={{ ...textRoles[role], ...style }}
    >
      {children}
    </text>
  );
};
