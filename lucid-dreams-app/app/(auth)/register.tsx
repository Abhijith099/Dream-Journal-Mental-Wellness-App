import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { BACKEND_URL, apiFetch } from '../../utils/api';
import { Eye, EyeOff, Moon, AlertCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Colors, Fonts } from '@/constants/theme';
import PasswordCriteriaChecklist, { isPasswordValid } from '../../components/PasswordCriteriaChecklist';

function getReadableError(err: any): string {
  if (err?.name === 'AbortError') {
    return 'Request timed out (15s). Please check your internet connection.';
  }
  const msg = err?.message || '';
  if (msg.includes('Network request failed') || msg.includes('Failed to fetch')) {
    return 'Unable to reach the server. Please check your network connection.';
  }
  return msg || 'Registration failed. Please try again.';
}

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { register } = useAuth();
  const router = useRouter();

  const passwordValid = isPasswordValid(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSubmit = name.trim().length > 0 && email.trim().length > 0 && passwordValid && passwordsMatch;

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setErrorMsg('Please fill in all fields.');
      return;
    }
    if (!passwordValid) {
      setErrorMsg('Please satisfy all password strength requirements.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const res = await apiFetch(`${BACKEND_URL}/auth/register`, {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Registration failed with status ${res.status}`);
      }

      await register(data.token, data.user);
      router.replace('/(tabs)');
    } catch (err: any) {
      setErrorMsg(getReadableError(err));
    } finally {
      setLoading(false);
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
              <Text style={styles.label}>Name</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="John Doe"
                  placeholderTextColor="#A0A0A0"
                />
              </View>

              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="test@gmail.com"
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

              {/* REAL-TIME PASSWORD CRITERIA CHECKLIST */}
              {password.length > 0 && (
                <PasswordCriteriaChecklist password={password} />
              )}

              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#A0A0A0"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
              </View>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <Text style={styles.mismatchText}>Passwords do not match</Text>
              )}

              <TouchableOpacity
                onPress={handleRegister}
                style={[styles.primaryBtn, (!canSubmit || loading) && styles.primaryBtnDisabled]}
                disabled={!canSubmit || loading}
              >
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryBtnText}>Sign Up</Text>}
              </TouchableOpacity>

              {/* ACTIONABLE ERROR BELOW BUTTON IN RED 13sp */}
              {!!errorMsg && (
                <View style={styles.errorBox}>
                  <AlertCircle size={16} strokeWidth={1.5} color="#EF4444" style={{ marginTop: 2 }} />
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              )}

              <View style={styles.footer}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/login')}>
                  <Text style={styles.linkText}>Log in</Text>
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
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
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
  mismatchText: { color: '#EF4444', fontSize: 12, fontFamily: Fonts.medium, marginBottom: 12, marginLeft: 4 },
  primaryBtn: { backgroundColor: '#4C3B87', height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginTop: 8, shadowColor: '#4C3B87', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontFamily: Fonts.bold },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 12, padding: 12, marginTop: 16, gap: 8 },
  errorText: { flex: 1, color: '#EF4444', fontFamily: Fonts.medium, fontSize: 13, lineHeight: 18 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  footerText: { fontSize: 13, fontFamily: Fonts.medium, color: '#79767D' },
  linkText: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.light.primary },
});
