import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface DreamLogsIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export default function DreamLogsIcon({
  size = 24,
  color = '#808080',
  strokeWidth = 1.8,
}: DreamLogsIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Book outline with spine and curved pages */}
      <Path
        d="M2.5 5.5C5 4.5 8.5 4.5 12 6.5C15.5 4.5 19 4.5 21.5 5.5V19.5C19 18.5 15.5 18.5 12 20.5C8.5 18.5 5 18.5 2.5 19.5V5.5Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Center spine */}
      <Path
        d="M12 6.5V20.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Left page text lines */}
      <Path
        d="M5.5 10.5H9"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Path
        d="M5.5 14H8.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Right page text lines */}
      <Path
        d="M15 10.5H18.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Path
        d="M15.5 14H18.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}
