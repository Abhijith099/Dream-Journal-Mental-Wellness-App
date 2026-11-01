// Fallback using lucide-react-native icons for Android, iOS, and web.

import React from 'react';
import { Home, Send, Code, ChevronRight, LucideIcon } from 'lucide-react-native';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { OpaqueColorValue, type StyleProp, type ViewStyle } from 'react-native';

const MAPPING: Record<string, LucideIcon> = {
  'house.fill': Home,
  'paperplane.fill': Send,
  'chevron.left.forwardslash.chevron.right': Code,
  'chevron.right': ChevronRight,
};

type IconSymbolName = keyof typeof MAPPING;

/**
 * An icon component that standardizes on lucide-react-native across platforms.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  const IconComponent = MAPPING[name] || ChevronRight;
  return <IconComponent color={color as string} size={size} strokeWidth={1.5} style={style} />;
}
