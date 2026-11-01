import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface SanctuaryIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export default function SanctuaryIcon({
  size = 24,
  color = '#808080',
  strokeWidth = 1.8,
}: SanctuaryIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Outer brain / grounding lobes contour matching reference design */}
      <Path
        d="M12 4.2C10.6 2.7 8.1 2.4 6.4 3.7C4.6 5 4.3 7.4 5.1 9.4C3.6 10.8 3.3 13.2 4.6 15.2C5.6 16.7 7.3 17.3 9.1 17.1L12 21L14.9 17.1C16.7 17.3 18.4 16.7 19.4 15.2C20.7 13.2 20.4 10.8 18.9 9.4C19.7 7.4 19.4 5 17.6 3.7C15.9 2.4 13.4 2.7 12 4.2Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Central grounding axis */}
      <Path
        d="M12 4.8V19.2"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Central focal node & cross-ticks */}
      <Path
        d="M9.5 12H14.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Circle
        cx="12"
        cy="12"
        r="1.8"
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
}
