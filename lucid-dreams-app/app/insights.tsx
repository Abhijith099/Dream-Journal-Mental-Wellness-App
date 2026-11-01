import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export default function InsightsRedirectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();
    // Redirect directly to the tabs insights screen
    router.replace({
      pathname: '/(tabs)/insights',
      params: params as any,
    });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#F9F9F7', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="small" color="#1DB954" />
    </View>
  );
}
