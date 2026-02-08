import React from "react";
import Svg, { Path } from "react-native-svg";

export default function AddManualIcon({ width = 27, height = 27, color = "#141B34" }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 27 27" fill="none">
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M19.2209 3.89329C18.9007 3.57301 18.3814 3.57301 18.0611 3.89329L15.3604 6.59395L19.8009 11.0344L22.5014 8.33373C22.8217 8.01344 22.8217 7.49415 22.5014 7.17387L19.2209 3.89329ZM18.641 12.1943L14.2005 7.75381L4.93874 17.0156C4.83363 17.1207 4.75907 17.2524 4.72301 17.3966L3.62949 21.7707C3.55961 22.0502 3.64151 22.3458 3.84522 22.5495C4.04892 22.7533 4.34458 22.8352 4.62406 22.7653L8.99817 21.6718C9.14237 21.6357 9.27407 21.5611 9.37918 21.456L18.641 12.1943Z"
        fill={color}
      />
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M19.6835 22.6907H12.0288V20.5036H19.6835V22.6907Z"
        fill={color}
      />
    </Svg>
  );
}
