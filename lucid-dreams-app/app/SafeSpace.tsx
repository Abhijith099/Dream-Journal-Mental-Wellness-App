import React, { useEffect, useRef } from "react";
import { StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, View } from "react-native";
import { useRouter, Stack, useNavigation } from "expo-router";
import { X } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";

// Drifting Particle Component
function Particle() {
  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);
  const left = useRef(Math.random() * 100).current;
  const size = useRef(Math.random() * 6 + 3).current; // 3 to 9 pixels

  useEffect(() => {
    const animate = () => {
      translateY.value = 100;
      opacity.value = 0;

      const duration = 12000 + Math.random() * 10000;
      const delay = Math.random() * 8000;

      translateY.value = withDelay(
        delay,
        withTiming(-950, { duration, easing: Easing.linear }, (finished) => {
          if (finished) {
            runOnJS(animate)();
          }
        })
      );

      // Fade in to 0.15, then fade out before the top
      opacity.value = withDelay(
        delay,
        withTiming(0.18, { duration: duration * 0.3 }, (f) => {
          if (f) {
            opacity.value = withTiming(0, { duration: duration * 0.7 });
          }
        })
      );
    };

    animate();
  }, [translateY, opacity]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        style,
        {
          left: `${left}%`,
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    />
  );
}

export default function SafeSpaceScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  // Hide tab bar when focused
  useEffect(() => {
    navigation.getParent()?.setOptions({ tabBarStyle: { display: "none" } });
    navigation.setOptions({ tabBarStyle: { display: "none" } });
    return () => {
      navigation.getParent()?.setOptions({ tabBarStyle: undefined });
      navigation.setOptions({ tabBarStyle: undefined });
    };
  }, [navigation]);

  // Very slow background gradient animation (25 seconds loop)
  const bgPulse = useSharedValue(0);
  useEffect(() => {
    bgPulse.value = withRepeat(
      withTiming(1, { duration: 25000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [bgPulse]);

  // Concentric circle bloom animations with timing offset
  const pulse1 = useSharedValue(0);
  const pulse2 = useSharedValue(0);
  const pulse3 = useSharedValue(0);

  const runLoop = () => {
    // Inhale: expand (4.2 seconds)
    pulse1.value = withTiming(1, { duration: 4200, easing: Easing.bezier(0.37, 0, 0.63, 1) });
    pulse2.value = withDelay(150, withTiming(1, { duration: 4200, easing: Easing.bezier(0.37, 0, 0.63, 1) }));
    pulse3.value = withDelay(300, withTiming(1, { duration: 4200, easing: Easing.bezier(0.37, 0, 0.63, 1) }, (f) => {
      if (f) {
        runOnJS(onPeak)();
      }
    }));
  };

  const onPeak = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // Exhale: contract (5.2 seconds, slightly slower/asymmetrical)
    pulse1.value = withTiming(0, { duration: 5200, easing: Easing.bezier(0.37, 0, 0.63, 1) });
    pulse2.value = withDelay(150, withTiming(0, { duration: 5200, easing: Easing.bezier(0.37, 0, 0.63, 1) }));
    pulse3.value = withDelay(300, withTiming(0, { duration: 5200, easing: Easing.bezier(0.37, 0, 0.63, 1) }, (f) => {
      if (f) {
        runOnJS(runLoop)();
      }
    }));
  };

  useEffect(() => {
    runLoop();
  }, []);

  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgPulse.value,
  }));

  // Style mappings for concentric bloom circles
  const animatedCircle1 = useAnimatedStyle(() => ({
    transform: [{ scale: 1.0 + pulse1.value * 1.3 }],
    opacity: 0.12 + pulse1.value * 0.28, // 0.12 to 0.40 (inner)
  }));

  const animatedCircle2 = useAnimatedStyle(() => ({
    transform: [{ scale: 1.2 + pulse2.value * 1.7 }],
    opacity: 0.08 + pulse2.value * 0.17, // 0.08 to 0.25 (middle)
  }));

  const animatedCircle3 = useAnimatedStyle(() => ({
    transform: [{ scale: 1.4 + pulse3.value * 2.1 }],
    opacity: 0.03 + pulse3.value * 0.12, // 0.03 to 0.15 (outer)
  }));

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" hidden />
      
      {/* Background Gradient 1 */}
      <LinearGradient
        colors={["#F5F4F8", "#ECEBF1", "#E3E2E9"]}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Background Gradient 2 (Slow cross-fade overlay) */}
      <Animated.View style={[StyleSheet.absoluteFillObject, bgStyle]}>
        <LinearGradient
          colors={["#EAE8F0", "#E1DFE8", "#D8D6E0"]}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      {/* Floating Particles */}
      {Array.from({ length: 12 }).map((_, i) => (
        <Particle key={i} />
      ))}

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Layered Blooming Breathing Circles */}
          <View style={styles.circleContainer}>
            <Animated.View style={[styles.breathingCircle, styles.outerCircle, animatedCircle3]} />
            <Animated.View style={[styles.breathingCircle, styles.middleCircle, animatedCircle2]} />
            <Animated.View style={[styles.breathingCircle, styles.innerCircle, animatedCircle1]} />
          </View>

          {/* BlurView Exit Button */}
          <TouchableOpacity 
            style={styles.exitButton}
            onPress={() => router.back()}
            activeOpacity={0.6}
          >
            <BlurView intensity={25} style={styles.blurExitContainer}>
              <X size={22} color="rgba(45, 45, 45, 0.4)" strokeWidth={1.5} />
            </BlurView>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  circleContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 300,
    height: 300,
  },
  breathingCircle: {
    position: "absolute",
    borderRadius: 50,
    backgroundColor: "#8069BF", // Primary purple
  },
  innerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  middleCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  outerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  particle: {
    position: "absolute",
    bottom: -50,
    backgroundColor: "#8069BF",
  },
  exitButton: {
    position: "absolute",
    top: 20,
    right: 24,
  },
  blurExitContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
});
