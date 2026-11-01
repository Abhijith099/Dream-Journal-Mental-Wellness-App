import React from 'react';
import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { SanctuaryProvider } from '../../context/SanctuaryContext';
import { SundownProvider } from '../../context/SundownContext';
import { MemorySupportProvider } from '../../context/MemorySupportContext';
import GlobalNavigationBar from '../../components/navigation/GlobalNavigationBar';

export default function MemorySupportLayout() {
  return (
    <SundownProvider>
      <MemorySupportProvider>
        <SanctuaryProvider>
          <View style={styles.container}>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                contentStyle: { backgroundColor: '#FAF9FB' },
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="voices" options={{ headerShown: false }} />
              <Stack.Screen name="presence" options={{ headerShown: false }} />
              <Stack.Screen name="emergency" options={{ headerShown: false }} />
              <Stack.Screen name="feelings" options={{ headerShown: false }} />
              <Stack.Screen name="faces" options={{ headerShown: false }} />
              <Stack.Screen name="music" options={{ headerShown: false }} />
              <Stack.Screen name="vault" options={{ headerShown: false }} />
              <Stack.Screen name="caregiver" options={{ headerShown: false }} />
            </Stack>

            {/* Persistent Global Navigation Bar across all Sanctuary screens */}
            <GlobalNavigationBar activeSectionOverride="sanctuary" />
          </View>
        </SanctuaryProvider>
      </MemorySupportProvider>
    </SundownProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9FB',
  },
});
