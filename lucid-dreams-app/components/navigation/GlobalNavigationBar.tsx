import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
  LayoutChangeEvent,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Home, BarChart2, Archive, Phone } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import DreamLogsIcon from './DreamLogsIcon';
import SanctuaryIcon from './SanctuaryIcon';
import EmergencyQuickContactModal from './EmergencyQuickContactModal';
import SanctuaryQuickMenuModal from './SanctuaryQuickMenuModal';
import { trackNavigationTransition, saveLastVisitedSection } from '../../utils/navigationPersistence';

export type GlobalNavSection = 'home' | 'dream_logs' | 'insights' | 'wellness' | 'sanctuary' | 'emergency';

interface NavItemConfig {
  id: GlobalNavSection;
  label: string;
  route: string;
  slotIndex: number;
}

const NAV_ITEMS: NavItemConfig[] = [
  { id: 'home', label: 'Home', route: '/(tabs)', slotIndex: 0 },
  { id: 'dream_logs', label: 'Dream Logs', route: '/(tabs)/add', slotIndex: 1 },
  { id: 'insights', label: 'Insights', route: '/(tabs)/insights', slotIndex: 2 },
  { id: 'wellness', label: 'Wellness', route: '/(tabs)/explore', slotIndex: 3 },
  { id: 'sanctuary', label: 'Memory Support', route: '/(tabs)/sanctuary', slotIndex: 4 },
  { id: 'emergency', label: 'Emergency Contact', route: '#emergency', slotIndex: 5 },
];

const DOT_SIZE = 6;
const CONTAINER_HEIGHT = 68;
const PADDING_HORIZONTAL = 12;

interface NavButtonProps {
  item: NavItemConfig;
  isActive: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  showBadge?: boolean;
  onButtonLayout?: (slotIndex: number, event: LayoutChangeEvent) => void;
}

function NavButton({
  item,
  isActive,
  onPress,
  onLongPress,
  showBadge = false,
  onButtonLayout,
}: NavButtonProps) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withTiming(0.92, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 14, stiffness: 220 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconColor = isActive ? '#FFFFFF' : '#808080';
  const iconSize = 24;
  const strokeWidth = 1.8;

  const renderIcon = () => {
    switch (item.id) {
      case 'home':
        return <Home size={iconSize} color={iconColor} strokeWidth={strokeWidth} />;
      case 'dream_logs':
        return <DreamLogsIcon size={iconSize} color={iconColor} strokeWidth={strokeWidth} />;
      case 'insights':
        return <BarChart2 size={iconSize} color={iconColor} strokeWidth={strokeWidth} />;
      case 'wellness':
        return <Archive size={iconSize} color={iconColor} strokeWidth={strokeWidth} />;
      case 'sanctuary':
        return <SanctuaryIcon size={iconSize} color={iconColor} strokeWidth={strokeWidth} />;
      case 'emergency':
        return <Phone size={iconSize} color={iconColor} strokeWidth={strokeWidth} />;
      default:
        return null;
    }
  };

  return (
    <Animated.View
      style={[styles.tabButton, animatedStyle]}
      onLayout={(e) => onButtonLayout && onButtonLayout(item.slotIndex, e)}
    >
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={350}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
        style={styles.touchArea}
        accessibilityRole={item.id === 'emergency' ? 'button' : 'tab'}
        accessibilityState={{ selected: isActive }}
        accessibilityLabel={item.label}
      >
        <View style={styles.iconWrapper}>
          <View style={styles.iconContainer}>
            {renderIcon()}
            {showBadge && <View style={styles.alertBadge} />}
          </View>
          {/* Reserved slot ensuring consistent vertical clearance and horizontal centering */}
          <View style={styles.dotSlot} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export interface GlobalNavigationBarProps {
  state?: any;
  descriptors?: any;
  navigation?: any;
  activeSectionOverride?: GlobalNavSection;
  showSanctuaryBadge?: boolean;
}

export default function GlobalNavigationBar({
  state,
  descriptors,
  navigation,
  activeSectionOverride,
  showSanctuaryBadge = false,
}: GlobalNavigationBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { width: windowWidth } = useWindowDimensions();

  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [sanctuaryMenuOpen, setSanctuaryMenuOpen] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  // Reanimated shared values for smooth active indicator dot glide
  const dotTranslateX = useSharedValue(0);
  const dotOpacity = useSharedValue(0);
  const isFirstRender = useRef(true);
  const buttonPositions = useRef<{ [key: number]: number }>({});

  // Determine active section
  let currentSection: GlobalNavSection = 'home';

  if (activeSectionOverride) {
    currentSection = activeSectionOverride;
  } else if (state && state.routes) {
    const activeRoute = state.routes[state.index];
    const routeName = activeRoute?.name;

    if (routeName === 'index') currentSection = 'home';
    else if (routeName === 'add') currentSection = 'dream_logs';
    else if (routeName === 'insights') currentSection = 'insights';
    else if (routeName === 'explore') currentSection = 'wellness';
    else if (routeName === 'sanctuary') currentSection = 'sanctuary';
    else if (routeName === 'support') currentSection = 'emergency';
  } else if (pathname) {
    if (pathname.includes('/memory-support') || pathname.includes('/sanctuary')) {
      currentSection = 'sanctuary';
    } else if (pathname.includes('/insights')) {
      currentSection = 'insights';
    } else if (pathname.includes('/explore') || pathname.includes('/wellness')) {
      currentSection = 'wellness';
    } else if (pathname.includes('/add') || pathname.includes('/dream')) {
      currentSection = 'dream_logs';
    } else {
      currentSection = 'home';
    }
  }

  // Active slot index (0 to 4 for tabs; 5 is emergency action)
  const activeItem = NAV_ITEMS.find((item) => item.id === currentSection);
  const activeSlotIndex = activeItem && activeItem.slotIndex < 5 ? activeItem.slotIndex : 0;

  // Reposition dot whenever active section, button layout, or container width changes
  useEffect(() => {
    const availableWidth = containerWidth > 0 ? containerWidth - PADDING_HORIZONTAL * 2 : 0;
    const slotWidth = availableWidth > 0 ? availableWidth / 6 : 0;
    const fallbackCenter = PADDING_HORIZONTAL + (activeSlotIndex + 0.5) * slotWidth;
    const targetCenter = buttonPositions.current[activeSlotIndex] ?? (availableWidth > 0 ? fallbackCenter : null);

    if (targetCenter !== null) {
      const targetX = targetCenter - DOT_SIZE / 2;

      if (isFirstRender.current) {
        dotTranslateX.value = targetX;
        dotOpacity.value = 1;
        isFirstRender.current = false;
      } else {
        dotTranslateX.value = withTiming(targetX, {
          duration: 250,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        });
        dotOpacity.value = withTiming(1, { duration: 150 });
      }
    }
  }, [activeSlotIndex, containerWidth]);

  const handleContainerLayout = (event: LayoutChangeEvent) => {
    const measuredWidth = event.nativeEvent.layout.width;
    if (measuredWidth > 0 && Math.abs(measuredWidth - containerWidth) > 1) {
      setContainerWidth(measuredWidth);
    }
  };

  const handleButtonLayout = (slotIndex: number, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    const center = x + width / 2;
    buttonPositions.current[slotIndex] = center;

    if (slotIndex === activeSlotIndex) {
      const targetX = center - DOT_SIZE / 2;
      if (isFirstRender.current) {
        dotTranslateX.value = targetX;
        dotOpacity.value = 1;
        isFirstRender.current = false;
      } else {
        dotTranslateX.value = withTiming(targetX, {
          duration: 250,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        });
        dotOpacity.value = withTiming(1, { duration: 150 });
      }
    }
  };

  const handleItemPress = (item: NavItemConfig) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    if (item.id === 'emergency') {
      setEmergencyModalOpen(true);
      return;
    }

    // Persist section transition
    saveLastVisitedSection(item.id);
    trackNavigationTransition(item.id, 'enter');

    // Tab bar navigation vs standalone router navigation
    if (navigation && state) {
      const targetRouteName =
        item.id === 'home'
          ? 'index'
          : item.id === 'dream_logs'
          ? 'add'
          : item.id === 'insights'
          ? 'insights'
          : item.id === 'wellness'
          ? 'explore'
          : 'sanctuary';

      const targetRoute = state.routes.find((r: any) => r.name === targetRouteName);
      if (targetRoute) {
        const event = navigation.emit({
          type: 'tabPress',
          target: targetRoute.key,
          canPreventDefault: true,
        });

        if (!event.defaultPrevented) {
          navigation.navigate(targetRouteName);
        }
        return;
      }
    }

    // Fallback: router navigation
    if (item.id === 'sanctuary') {
      router.push('/(tabs)/sanctuary' as any);
    } else {
      router.push(item.route as any);
    }
  };

  const handleItemLongPress = (item: NavItemConfig) => {
    if (item.id === 'sanctuary') {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
      setSanctuaryMenuOpen(true);
    }
  };

  const dotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dotTranslateX.value }],
    opacity: dotOpacity.value,
  }));

  // Hide tab bar if screen options explicitly hide it
  if (state && descriptors) {
    const activeRoute = state.routes[state.index];
    const activeOptions = descriptors[activeRoute?.key]?.options;
    if (activeOptions?.tabBarStyle?.display === 'none') {
      return null;
    }
  }

  return (
    <>
      <View
        style={[
          styles.tabBarWrapper,
          windowWidth >= 768 && styles.tabBarWrapperDesktop,
        ]}
        pointerEvents="box-none"
      >
        <View
          style={styles.tabBarPill}
          onLayout={handleContainerLayout}
          accessibilityRole="tablist"
          aria-label="Main navigation"
        >
          {/* Animated Gliding Active Purple Dot */}
          <Animated.View style={[styles.activeIndicatorDot, dotAnimatedStyle]} />

          {/* 6 Icons equally spaced */}
          {NAV_ITEMS.map((item) => {
            const isActive = currentSection === item.id;
            return (
              <NavButton
                key={item.id}
                item={item}
                isActive={isActive}
                onPress={() => handleItemPress(item)}
                onLongPress={() => handleItemLongPress(item)}
                showBadge={item.id === 'sanctuary' && showSanctuaryBadge}
                onButtonLayout={handleButtonLayout}
              />
            );
          })}
        </View>
      </View>

      {/* Emergency Quick Contact Modal (Position 6) */}
      <EmergencyQuickContactModal
        visible={emergencyModalOpen}
        onClose={() => setEmergencyModalOpen(false)}
      />

      {/* Sanctuary Quick Access Menu (Position 5 Long-Press) */}
      <SanctuaryQuickMenuModal
        visible={sanctuaryMenuOpen}
        onClose={() => setSanctuaryMenuOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 16,
    right: 16,
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 9999,
    elevation: 9999,
  },
  tabBarWrapperDesktop: {
    left: 0,
    right: 0,
    alignSelf: 'center',
    maxWidth: 540,
    bottom: 24,
  },
  tabBarPill: {
    position: 'relative',
    flexDirection: 'row',
    backgroundColor: '#1A1A1A', // Dark neutral, near-black per spec
    borderRadius: 16, // Minimized curvature (12-16px) for clinical aesthetic
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(208, 208, 208, 0.25)', // 1px light gray subtle divider
    paddingVertical: 10,
    paddingHorizontal: PADDING_HORIZONTAL,
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: CONTAINER_HEIGHT,
    ...Platform.select({
      web: {
        boxShadow: '0 -2px 12px rgba(0, 0, 0, 0.25)',
        contain: 'layout style',
      },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 10,
      },
    }),
  },
  activeIndicatorDot: {
    position: 'absolute',
    bottom: 16, // Precisely aligned with dotSlot, ~5px below the 24px icon
    left: 0,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: '#8B5CF6', // Muted clinical purple per spec
    zIndex: 10,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
  },
  touchArea: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    minWidth: 48,
    minHeight: 48,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 35, // 24px icon + 5px clearance + 6px dot
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  dotSlot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    marginTop: 5, // Exact 5px clearance below icon
  },
  alertBadge: {
    position: 'absolute',
    top: -2,
    right: -3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8B4513', // Dark red/brown alert badge per spec
  },
});
