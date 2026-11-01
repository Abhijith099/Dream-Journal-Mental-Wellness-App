import React, { useState } from 'react';
import { useAuth0 } from 'react-native-auth0';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../../context/AuthContext';
import { BACKEND_URL, apiFetch } from '../../utils/api';
import { Eye, EyeOff, Moon, AlertCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Colors, Fonts } from '@/constants/theme';

WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get('window');

function getReadableError(err: any): string {
  if (err?.name === 'AbortError') {
    return 'Request timed out (15s). Please check your internet connection.';
  }
  const msg = err?.message || '';
  if (msg.includes('Network request failed') || msg.includes('Failed to fetch')) {
    return 'Unable to reach the server. Please check your network connection.';
  }
  return msg || 'Authentication failed. Please try again.';
}

export default function LoginScreen() {
  const { login } = useAuth(); // Local app AuthContext
  const { authorize, isLoading: isAuth0Loading, user: auth0User, getCredentials } = useAuth0(); // Auth0 hook
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  // 1. Email/Password Login Handler
  const handleEmailLogin = async () => {
    if (!email.trim() || !password) {
      setAuthError('Please enter both email and password.');
      return;
    }
    setAuthError('');
    setEmailLoading(true);

    try {
      const res = await apiFetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Login failed (${res.status})`);
      }

      await login(data.token, data.user);
      router.replace('/(tabs)');
    } catch (err: any) {
      setAuthError(getReadableError(err));
    } finally {
      setEmailLoading(false);
    }
  };

  // 2. Auth0 Login Handler
  const handleAuth0Login = async () => {
    setAuthError('');
    try {
      console.log('Initiating Auth0 login...');
      // react-native-auth0 uses the native Android redirect scheme automatically:
      // luciddreamsapp://dev-pimkwze13bc72sdk.eu.auth0.com/android/com.anonymous.luciddreamsapp/callback
      const credentials = await authorize(
        { 
          scope: 'openid profile email',
          audience: 'https://dev-pimkwze13bc72sdk.eu.auth0.com/api/v2/',
        },
        { 
          customScheme: 'luciddreamsapp',
        }
      );
      
      console.log('Auth0 credentials returned:', credentials ? 'yes' : 'no');

      if (credentials?.accessToken) {
        let userName = auth0User?.name || auth0User?.nickname || 'Lucid Explorer';
        let userEmail = auth0User?.email || '';
        let userId = auth0User?.sub || 'auth0_user';

        if (credentials.idToken) {
          try {
            const base64Url = credentials.idToken.split('.')[1];
            if (base64Url) {
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
              const jsonPayload = decodeURIComponent(
                (global as any).atob
                  ? (global as any).atob(base64).split('').map((c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
                  : Buffer.from(base64, 'base64').toString('utf-8')
              );
              const decoded = JSON.parse(jsonPayload);
              if (decoded.sub) userId = decoded.sub;
              if (decoded.name || decoded.nickname) userName = decoded.name || decoded.nickname;
              if (decoded.email) userEmail = decoded.email;
            }
          } catch (decodeErr) {
            console.log('ID Token parse note:', decodeErr);
          }
        }

        await login(credentials.accessToken, {
          id: userId,
          name: userName,
          email: userEmail,
        });
        
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      console.log('Auth0 login encountered an issue:', e);
      const isCancelled = e?.message?.includes('cancelled') || e?.message?.includes('User cancelled');
      if (isCancelled) {
        setAuthError('Auth0 login window was closed. If a "Callback URL mismatch" error appeared in the browser, ensure your Auth0 dashboard includes the native callback URL.');
      } else {
        setAuthError(e?.message || 'Auth0 login failed. Please check your credentials or network.');
      }
    }
  };

  return (
    <LinearGradient
      colors={['#E9E4F5', '#F3E9E4']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

            {/* SHARED HEADER */}
            <View style={styles.header}>
              <View style={styles.iconCircle}>
                <Moon size={28} strokeWidth={1.5} color={Colors.light.primary} fill={Colors.light.primary} />
              </View>
              <Text style={styles.appTitle}>Lucid Dreams</Text>
              <Text style={styles.appSubtitle}>Return to your inner weather</Text>
            </View>

            {/* CARD */}
            <BlurView intensity={60} tint="light" style={styles.card}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="hello@example.com"
                  placeholderTextColor="#A0A0A0"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#A0A0A0"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  {showPassword ? <EyeOff size={18} strokeWidth={1.5} color="#8A9A9D" /> : <Eye size={18} strokeWidth={1.5} color="#8A9A9D" />}
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={() => router.push('/forgot-password')} style={styles.forgotBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleEmailLogin} style={styles.primaryBtn} disabled={emailLoading || isAuth0Loading}>
                {emailLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryBtnText}>Sign In</Text>}
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity onPress={handleAuth0Login} style={styles.secondaryBtn} disabled={isAuth0Loading || emailLoading}>
                {isAuth0Loading ? <ActivityIndicator color="#4C3B87" /> : <Text style={styles.secondaryBtnText}>Continue with Auth0</Text>}
              </TouchableOpacity>

              {/* ACTIONABLE ERROR STATE */}
              {!!authError && (
                <View style={styles.errorBox}>
                  <AlertCircle size={16} strokeWidth={1.5} color="#EF4444" style={{ marginTop: 2 }} />
                  <Text style={styles.errorBoxText}>{authError}</Text>
                </View>
              )}

              <View style={styles.footer}>
                <Text style={styles.footerText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/register')}>
                  <Text style={styles.linkText}>Sign up</Text>
                </TouchableOpacity>
              </View>
            </BlurView>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 },
  header: { alignItems: 'center', marginBottom: 28 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F0EEF8', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  appTitle: { fontSize: 24, fontFamily: Fonts.bold, color: '#17151C', textAlign: 'center' },
  appSubtitle: { fontSize: 14, fontFamily: Fonts.medium, color: '#79767D', marginTop: 4, textAlign: 'center' },
  card: { maxWidth: 440, width: '100%', alignSelf: 'center', borderRadius: 28, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 24, elevation: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', overflow: 'hidden' },
  label: { fontSize: 13, fontFamily: Fonts.medium, color: '#79767D', marginBottom: 8, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', height: 50, borderRadius: 14, borderWidth: 1, borderColor: '#EBEBEB', paddingHorizontal: 16, marginBottom: 16 },
  input: { flex: 1, height: '100%', fontSize: 15, fontFamily: Fonts.medium, color: '#17151C', backgroundColor: '#FFFFFF' },
  passwordWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', height: 50, borderRadius: 14, borderWidth: 1, borderColor: '#EBEBEB', paddingLeft: 16, paddingRight: 12, marginBottom: 12 },
  passwordInput: { flex: 1, height: '100%', fontSize: 15, fontFamily: Fonts.medium, color: '#17151C', backgroundColor: '#FFFFFF' },
  eyeIcon: { padding: 4 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotText: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.light.primary },
  primaryBtn: { backgroundColor: '#4C3B87', height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', shadowColor: '#4C3B87', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontFamily: Fonts.bold },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { marginHorizontal: 12, fontSize: 12, fontFamily: Fonts.medium, color: '#9CA3AF' },
  secondaryBtn: { backgroundColor: '#FFFFFF', height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#4C3B87' },
  secondaryBtnText: { color: '#4C3B87', fontSize: 15, fontFamily: Fonts.bold },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 12, padding: 12, marginTop: 16, gap: 8 },
  errorBoxText: { flex: 1, color: '#EF4444', fontFamily: Fonts.medium, fontSize: 13, lineHeight: 18 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  footerText: { fontSize: 13, fontFamily: Fonts.medium, color: '#79767D' },
  linkText: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.light.primary },
});