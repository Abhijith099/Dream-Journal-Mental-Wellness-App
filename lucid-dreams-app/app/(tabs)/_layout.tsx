import { Tabs } from "expo-router";
import { View, StyleSheet, AppState, Linking } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle } from "react-native-reanimated";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import ReentrySplash from "../../components/ReentrySplash";
import GlobalNavigationBar from "../../components/navigation/GlobalNavigationBar";
import { SanctuaryProvider } from "../../context/SanctuaryContext";
import { SundownProvider } from "../../context/SundownContext";
import { MemorySupportProvider } from "../../context/MemorySupportContext";

export default function TabLayout() {
  const { user } = useAuth();
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    return Boolean(user && user.hasCompletedOnboarding);
  });

  const splashOpacity = useSharedValue(showSplash ? 1 : 0);
  const homeTranslateY = useSharedValue(showSplash ? 24 : 0);
  const lastActiveRef = useRef<number>(Date.now());

  // Deep link check: if app was launched via deep link, bypass splash
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) {
        setShowSplash(false);
        splashOpacity.value = 0;
        homeTranslateY.value = 0;
      }
    });
  }, []);

  // AppState listener for 30-minute background threshold
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        const minutesAway = (Date.now() - lastActiveRef.current) / 60000;
        if (minutesAway > 30 && user && user.hasCompletedOnboarding) {
          splashOpacity.value = 1;
          homeTranslateY.value = 24;
          setShowSplash(true);
        }
      } else if (state === "background") {
        lastActiveRef.current = Date.now();
      }
    });

    return () => subscription.remove();
  }, [user]);

  const animatedHomeStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: homeTranslateY.value }],
  }));

  return (
    <SundownProvider>
      <MemorySupportProvider>
        <SanctuaryProvider>
          <View style={{ flex: 1, backgroundColor: "#FAF9FB" }}>
            <Animated.View style={[{ flex: 1 }, animatedHomeStyle]}>
              <Tabs
                tabBar={(props) => <GlobalNavigationBar {...props} />}
                screenOptions={{
                  headerShown: false,
                }}
              >
                {/* Position 1: Home */}
                <Tabs.Screen
                  name="index"
                  options={{
                    title: "Home",
                  }}
                />

                {/* Position 2: Dream Logs */}
                <Tabs.Screen
                  name="add"
                  options={{
                    title: "Dream Logs",
                  }}
                />

                {/* Position 3: Insights */}
                <Tabs.Screen
                  name="insights"
                  options={{
                    title: "Insights",
                  }}
                />

                {/* Position 4: Wellness */}
                <Tabs.Screen
                  name="explore"
                  options={{
                    title: "Wellness",
                  }}
                />

                {/* Position 5: Memory Support (Sanctuary) */}
                <Tabs.Screen
                  name="sanctuary"
                  options={{
                    title: "Memory Support",
                  }}
                />

                {/* Hidden sub-routes with persistent access */}
                <Tabs.Screen
                  name="chatbot"
                  options={{
                    title: "Chatbot",
                    href: null,
                    tabBarStyle: { display: "none" },
                  }}
                />

                <Tabs.Screen
                  name="support"
                  options={{
                    title: "Support",
                    href: null,
                  }}
                />
              </Tabs>
            </Animated.View>

            {showSplash && (
              <ReentrySplash
                user={user}
                splashOpacity={splashOpacity}
                homeTranslateY={homeTranslateY}
                onComplete={() => {
                  setShowSplash(false);
                  homeTranslateY.value = 0;
                }}
              />
            )}
          </View>
        </SanctuaryProvider>
      </MemorySupportProvider>
    </SundownProvider>
  );
}
