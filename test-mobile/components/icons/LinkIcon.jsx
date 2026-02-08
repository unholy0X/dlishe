import React from "react";
import Svg, { Path } from "react-native-svg";

export default function LinkIcon({ width = 24, height = 24, color = "#B4B4B4" }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7 8C4.79086 8 3 9.79086 3 12C3 14.2091 4.79086 16 7 16H10.5V18H7C3.68629 18 1 15.3137 1 12C1 8.68629 3.68629 6 7 6H10.5V8H7ZM17 8H13.5V6H17C20.3137 6 23 8.68629 23 12C23 15.3137 20.3137 18 17 18H13.5V16H17C19.2091 16 21 14.2091 21 12C21 9.79086 19.2091 8 17 8Z"
        fill={color}
      />
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16 13H8V11H16V13Z"
        fill={color}
      />
    </Svg>
  );
}
