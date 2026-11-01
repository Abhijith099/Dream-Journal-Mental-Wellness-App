import React from 'react';
import Animated from 'react-native-reanimated';
import { Hand } from 'lucide-react-native';

export function HelloWave() {
  return (
    <Animated.View
      style={{
        marginTop: -4,
        animationName: {
          '50%': { transform: [{ rotate: '25deg' }] },
        },
        animationIterationCount: 4,
        animationDuration: '300ms',
      }}>
      <Hand size={28} color="#8B5CF6" strokeWidth={1.5} />
    </Animated.View>
  );
}
