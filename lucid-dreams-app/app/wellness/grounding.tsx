import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, StatusBar, Platform } from "react-native";
import { useRouter, Stack, useNavigation } from "expo-router";
import { X, Eye, Hand, Ear, Feather, Smile } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { Fonts } from "@/constants/theme";

const PROMPTS = [
  "Name 5 things you can see",
  "Name 4 things you can touch",
  "3 things you can hear",
  "2 things you can smell",
  "1 thing you can taste",
  "That's it."
];

// Particle component for background
function Particle() {
  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);
  const left = useRef(Math.random() * 100).current;
  const size = useRef(Math.random() * 5 + 3).current;

  useEffect(() => {
    const animate = () => {
      translateY.value = 100;
      opacity.value = 0;

      const duration = 12000 + Math.random() * 10000;
      const delay = Math.random() * 6000;

      translateY.value = withDelay(
        delay,
        withTiming(-950, { duration, easing: Easing.linear }, (finished) => {
          if (finished) {
            runOnJS(animate)();
          }
        })
      );

      opacity.value = withDelay(
        delay,
        withTiming(0.12, { duration: duration * 0.3 }, (f) => {
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

export default function GroundingExerciseScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [step, setStep] = useState(0);

  // Animation values for transition (opacity & scale)
  const textOpacity = useSharedValue(1);
  const textScale = useSharedValue(1);
  
  // Staggered breathing loops for visual depth behind text
  const pulse1 = useSharedValue(0);
  const pulse2 = useSharedValue(0);
  const pulse3 = useSharedValue(0);

  // Completion bloom scale boost
  const completionBloom = useSharedValue(0);

  // Hide tab bar while focused
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

  // Passive ambient breathing circle loop
  const runBreathingLoop = () => {
    pulse1.value = withTiming(1, { duration: 4200, easing: Easing.bezier(0.37, 0, 0.63, 1) });
    pulse2.value = withDelay(150, withTiming(1, { duration: 4200, easing: Easing.bezier(0.37, 0, 0.63, 1) }));
    pulse3.value = withDelay(300, withTiming(1, { duration: 4200, easing: Easing.bezier(0.37, 0, 0.63, 1) }, (f) => {
      if (f) {
        pulse1.value = withTiming(0, { duration: 5200, easing: Easing.bezier(0.37, 0, 0.63, 1) });
        pulse2.value = withDelay(150, withTiming(0, { duration: 5200, easing: Easing.bezier(0.37, 0, 0.63, 1) }));
        pulse3.value = withDelay(300, withTiming(0, { duration: 5200, easing: Easing.bezier(0.37, 0, 0.63, 1) }, (f2) => {
          if (f2) {
            runOnJS(runBreathingLoop)();
          }
        }));
      }
    }));
  };

  useEffect(() => {
    runBreathingLoop();
  }, []);

  const changeStep = (nextStep: number) => {
    setStep(nextStep);
  };

  const handleNext = () => {
    if (step < PROMPTS.length - 1) {
      const nextStep = step + 1;
      const isFinishing = nextStep === PROMPTS.length - 1;

      // Crossfade + scale down outgoing text
      textOpacity.value = withTiming(0, { duration: 350, easing: Easing.out(Easing.ease) });
      textScale.value = withTiming(0.94, { duration: 350, easing: Easing.out(Easing.ease) }, (finished) => {
        if (finished) {
          runOnJS(changeStep)(nextStep);
          // Setup incoming text state
          textScale.value = 1.06;
          textOpacity.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.ease) });
          textScale.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.ease) });

          if (isFinishing) {
            runOnJS(triggerCompletion)();
          } else {
            runOnJS(triggerStepTick)();
          }
        }
      });
    } else {
      router.back();
    }
  };

  const triggerStepTick = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const triggerCompletion = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    // Burst bloom effect briefly behind "That's it."
    completionBloom.value = withTiming(1.6, { duration: 1000, easing: Easing.out(Easing.ease) }, (f) => {
      if (f) {
        completionBloom.value = withTiming(0, { duration: 1400 });
      }
    });
  };

  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgPulse.value,
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ scale: textScale.value }],
  }));

  // Low-opacity background bloom mapping
  const animatedCircle1 = useAnimatedStyle(() => {
    const scale = 1.0 + pulse1.value * 1.3 + completionBloom.value;
    const baseOpacity = 0.05 + pulse1.value * 0.15;
    const extraOpacity = completionBloom.value ? 0.25 : 0;
    return {
      transform: [{ scale }],
      opacity: Math.min(0.5, baseOpacity + extraOpacity),
    };
  });

  const animatedCircle2 = useAnimatedStyle(() => {
    const scale = 1.2 + pulse2.value * 1.7 + completionBloom.value * 1.3;
    const baseOpacity = 0.03 + pulse2.value * 0.10;
    const extraOpacity = completionBloom.value ? 0.18 : 0;
    return {
      transform: [{ scale }],
      opacity: Math.min(0.4, baseOpacity + extraOpacity),
    };
  });

  const animatedCircle3 = useAnimatedStyle(() => {
    const scale = 1.4 + pulse3.value * 2.1 + completionBloom.value * 1.6;
    const baseOpacity = 0.01 + pulse3.value * 0.06;
    const extraOpacity = completionBloom.value ? 0.10 : 0;
    return {
      transform: [{ scale }],
      opacity: Math.min(0.3, baseOpacity + extraOpacity),
    };
  });

  const isLastStep = step === PROMPTS.length - 1;

  // Step Icon helper
  const renderStepIcon = () => {
    switch (step) {
      case 0:
        return <Eye size={32} color="#8069BF" strokeWidth={1.5} />;
      case 1:
        return <Hand size={32} color="#8069BF" strokeWidth={1.5} />;
      case 2:
        return <Ear size={32} color="#8069BF" strokeWidth={1.5} />;
      case 3:
        return <Feather size={32} color="#8069BF" strokeWidth={1.5} />;
      case 4:
        return <Smile size={32} color="#8069BF" strokeWidth={1.5} />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />

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
      {Array.from({ length: 8 }).map((_, i) => (
        <Particle key={i} />
      ))}

      {/* Layered Blooming Breathing Circles (Low opacity for background ambiance) */}
      <View style={[StyleSheet.absoluteFillObject, styles.backgroundBloomContainer]}>
        <Animated.View style={[styles.breathingCircle, styles.outerCircle, animatedCircle3]} />
        <Animated.View style={[styles.breathingCircle, styles.middleCircle, animatedCircle2]} />
        <Animated.View style={[styles.breathingCircle, styles.innerCircle, animatedCircle1]} />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={{ width: 44 }} />
          <Text style={styles.headerTitle}>Grounding Exercise</Text>
          
          <TouchableOpacity 
            style={styles.exitButton}
            onPress={() => router.back()}
            activeOpacity={0.6}
          >
            <BlurView intensity={20} style={styles.blurExitContainer}>
              <X size={22} color="rgba(45, 45, 45, 0.4)" strokeWidth={1.5} />
            </BlurView>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Subtle Segmented Progress Indicator */}
          {!isLastStep && (
            <View style={styles.progressContainer}>
              {[0, 1, 2, 3, 4].map((i) => (
                <View 
                  key={i} 
                  style={[
                    styles.progressSegment, 
                    i <= step ? styles.progressSegmentActive : styles.progressSegmentInactive
                  ]} 
                />
              ))}
            </View>
          )}

          {/* Prompt Section with Crossfade / Scale animations */}
          <Animated.View style={[styles.promptContainer, animatedTextStyle]}>
            <View style={styles.iconContainer}>
              {renderStepIcon()}
            </View>
            <Text style={[styles.promptText, isLastStep && styles.lastStepText]}>
              {PROMPTS[step]}
            </Text>
          </Animated.View>

          {/* Next / Finish control */}
          <TouchableOpacity 
            style={styles.nextButton}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.nextButtonText}>
              {isLastStep ? "Finish" : "Next"}
            </Text>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: "#8A8A8A",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  exitButton: {
    width: 44,
    height: 44,
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
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 30,
    paddingBottom: 40,
  },
  progressContainer: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
  },
  progressSegment: {
    width: 24,
    height: 4,
    borderRadius: 2,
  },
  progressSegmentActive: {
    backgroundColor: "#8069BF",
  },
  progressSegmentInactive: {
    backgroundColor: "rgba(45, 45, 45, 0.08)",
  },
  promptContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  iconContainer: {
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  promptText: {
    fontSize: 26,
    fontFamily: Fonts.bold,
    color: "#2D2D2D",
    textAlign: "center",
    lineHeight: 38,
  },
  lastStepText: {
    fontSize: 32,
    color: "#8069BF",
  },
  nextButton: {
    width: "100%",
    height: 56,
    borderRadius: 28,
    backgroundColor: "#8069BF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#8069BF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  nextButtonText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
  },
  backgroundBloomContainer: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: -1,
  },
  breathingCircle: {
    position: "absolute",
    borderRadius: 50,
    backgroundColor: "#8069BF",
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
});
