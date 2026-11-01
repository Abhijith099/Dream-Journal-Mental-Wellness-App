import { Auth0Provider } from 'react-native-auth0';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Auth0Provider
      domain="dev-pimkwze13bc72sdk.eu.auth0.com"
      clientId="TuqG5H0jNg3RHw2dLkreziylCRpFQpqp"
    >
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="forgot-password" />
      </Stack>
    </Auth0Provider>
  );
}
