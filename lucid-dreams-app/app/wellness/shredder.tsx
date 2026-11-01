import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Colors, Fonts } from "@/constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

export default function ShredderScreen() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [isShredding, setIsShredding] = useState(false);
  
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  const handleRelease = () => {
    if (!text.trim()) return;
    setIsShredding(true);
    Keyboard.dismiss();

    // Trigger the dissolve animation
    opacity.value = withTiming(0, { duration: 1500 });
    translateY.value = withTiming(-20, { duration: 1500 }, (finished) => {
      if (finished) {
        // Reset state after animation completes
        runOnJS(setText)("");
        runOnJS(setIsShredding)(false);
        opacity.value = 1;
        translateY.value = 0;
      }
    });
  };

  return (
    <LinearGradient
      colors={['#E9E4F5', '#F3E9E4']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>THOUGHT SHREDDER</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeButton}
            activeOpacity={0.7}
          >
            <X size={22} color={Colors.light.text} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.content}>
              <BlurView intensity={60} tint="light" style={styles.card}>
                <Text style={styles.instruction}>
                  Write what's on your mind. When you're ready, let it go. Nothing is saved here.
                </Text>

                <Animated.View style={[styles.inputContainer, animatedStyle]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Write what's on your mind..."
                    placeholderTextColor={Colors.light.secondaryText}
                    multiline
                    value={text}
                    onChangeText={setText}
                    editable={!isShredding}
                    autoFocus
                  />
                </Animated.View>

                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    onPress={handleRelease}
                    activeOpacity={0.8}
                    style={[
                      styles.releaseButton,
                      (!text.trim() || isShredding) && styles.releaseButtonDisabled
                    ]}
                    disabled={!text.trim() || isShredding}
                  >
                    <Text style={[
                      styles.releaseButtonText,
                      (!text.trim() || isShredding) && styles.releaseButtonTextDisabled
                    ]}>
                      Release
                    </Text>
                  </TouchableOpacity>
                </View>
              </BlurView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.light.secondaryText,
    letterSpacing: 1.5,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.4)',
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  card: {
    flex: 1,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
    width: "100%",
  },
  instruction: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.light.secondaryText,
    marginBottom: 24,
    lineHeight: 20,
  },
  inputContainer: {
    flex: 1,
    marginBottom: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    padding: 16,
    minHeight: 140,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.light.text,
    lineHeight: 22,
    textAlignVertical: "top",
  },
  buttonContainer: {
    alignItems: "center",
  },
  releaseButton: {
    backgroundColor: '#4C3B87',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: '#4C3B87',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  releaseButtonDisabled: {
    backgroundColor: "rgba(76, 59, 135, 0.4)",
    shadowOpacity: 0,
    elevation: 0,
  },
  releaseButtonText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
  },
  releaseButtonTextDisabled: {
    color: "rgba(255, 255, 255, 0.7)",
  }
});
