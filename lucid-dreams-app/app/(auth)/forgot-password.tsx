import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInputKeyPressEventData,
  NativeSyntheticEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ArrowLeft, KeyRound, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Colors, Fonts } from '@/constants/theme';
import { BACKEND_URL, apiFetch } from '../../utils/api';
import PasswordCriteriaChecklist, { isPasswordValid } from '../../components/PasswordCriteriaChecklist';

type Step = 'request' | 'verify' | 'reset' | 'success';

function getReadableError(err: any): string {
  if (err?.name === 'AbortError') {
    return 'Request timed out (15s). Please check your internet connection.';
  }
  const msg = err?.message || '';
  if (msg.includes('Network request failed') || msg.includes('Failed to fetch')) {
    return 'Unable to reach the server. Please check your network connection.';
  }
  return msg || 'An error occurred. Please try again.';
}

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Step 2 OTP state
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '']);
  const [resendTimer, setResendTimer] = useState(60);
  const [resetToken, setResetToken] = useState('');
  const otpInputs = useRef<(TextInput | null)[]>([]);
  const shakeTranslateX = useSharedValue(0);

  // Step 3 Reset state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Timer countdown for Step 2
  useEffect(() => {
    let interval: any = null;
    if (step === 'verify' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, resendTimer]);

  const animatedShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeTranslateX.value }],
  }));

  const triggerShake = () => {
    shakeTranslateX.value = withSequence(
      withTiming(-12, { duration: 60 }),
      withTiming(12, { duration: 60 }),
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(0, { duration: 60 })
    );
  };

  // STEP 1: Request OTP
  const handleRequestOtp = async () => {
    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await apiFetch(`${BACKEND_URL}/auth/forgot-password`, {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Request failed with status ${res.status}`);
      }

      setStep('verify');
      setResendTimer(60);
      setOtpDigits(['', '', '', '']);
      setTimeout(() => otpInputs.current[0]?.focus(), 250);
    } catch (err: any) {
      setErrorMsg(getReadableError(err));
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP from Step 2
  const handleResendOtp = async () => {
    if (resendTimer > 0 || loading) return;
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await apiFetch(`${BACKEND_URL}/auth/forgot-password`, {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend code');
      }

      setResendTimer(60);
      setOtpDigits(['', '', '', '']);
      otpInputs.current[0]?.focus();
    } catch (err: any) {
      setErrorMsg(getReadableError(err));
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP digit changes
  const handleOtpChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);

    if (digit && index < 3) {
      otpInputs.current[index + 1]?.focus();
    }

    // Auto-verify when 4 digits are completed
    if (digit && index === 3) {
      const fullOtp = updated.join('');
      if (fullOtp.length === 4) {
        handleVerifyOtp(fullOtp);
      }
    }
  };

  const handleOtpKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  // STEP 2: Verify OTP
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const otp = codeToVerify || otpDigits.join('');
    if (otp.length !== 4) {
      setErrorMsg('Please enter all 4 digits.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const res = await apiFetch(`${BACKEND_URL}/auth/verify-otp`, {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), otp }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        triggerShake();
        if (data.maxAttemptsExceeded) {
          setErrorMsg('Too many failed attempts. Please request a new code.');
          setStep('request');
          return;
        }
        throw new Error(data.error || 'Invalid code');
      }

      setResetToken(data.resetToken);
      setStep('reset');
    } catch (err: any) {
      triggerShake();
      setErrorMsg(getReadableError(err));
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: Reset Password
  const passwordValid = isPasswordValid(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const canSubmitReset = passwordValid && passwordsMatch;

  const handleResetPassword = async () => {
    if (!canSubmitReset) return;

    setErrorMsg('');
    setLoading(true);

    try {
      const res = await apiFetch(`${BACKEND_URL}/auth/reset-password`, {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          resetToken,
          newPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setStep('success');
      setTimeout(() => {
        router.replace('/login');
      }, 2000);
    } catch (err: any) {
      setErrorMsg(getReadableError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setErrorMsg('');
    if (step === 'verify') {
      setStep('request');
    } else if (step === 'reset') {
      setStep('verify');
    } else {
      router.back();
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

            {/* BACK BUTTON */}
            {step !== 'success' && (
              <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <ArrowLeft size={22} strokeWidth={1.5} color="#4C3B87" />
              </TouchableOpacity>
            )}

            {/* HEADER ICON */}
            <View style={styles.header}>
              <View style={styles.iconCircle}>
                {step === 'success' ? (
                  <CheckCircle size={28} strokeWidth={1.5} color="#10B981" />
                ) : (
                  <KeyRound size={28} strokeWidth={1.5} color={Colors.light.primary} />
                )}
              </View>
              <Text style={styles.appTitle}>
                {step === 'request' && 'Reset Password'}
                {step === 'verify' && 'Enter Verification Code'}
                {step === 'reset' && 'Create New Password'}
                {step === 'success' && 'Password Updated!'}
              </Text>
              <Text style={styles.appSubtitle}>
                {step === 'request' && 'Enter your registered email to receive a 4-digit code'}
                {step === 'verify' && `We sent a 4-digit code to ${email}`}
                {step === 'reset' && 'Choose a strong password for your account'}
                {step === 'success' && 'Your password has been changed. Redirecting to login...'}
              </Text>
            </View>

            {/* CARD */}
            <BlurView intensity={60} tint="light" style={styles.card}>

              {/* STATE 1: REQUEST OTP */}
              {step === 'request' && (
                <View>
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

                  <TouchableOpacity
                    onPress={handleRequestOtp}
                    style={[styles.primaryBtn, (!email.trim() || loading) && styles.primaryBtnDisabled]}
                    disabled={!email.trim() || loading}
                  >
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryBtnText}>Send Code</Text>}
                  </TouchableOpacity>
                </View>
              )}

              {/* STATE 2: ENTER OTP */}
              {step === 'verify' && (
                <View>
                  <Animated.View style={[styles.otpRow, animatedShakeStyle]}>
                    {[0, 1, 2, 3].map((index) => (
                      <TextInput
                        key={index}
                        ref={(ref) => {
                          otpInputs.current[index] = ref;
                        }}
                        style={[
                          styles.otpBox,
                          otpDigits[index].length > 0 && styles.otpBoxFilled,
                        ]}
                        value={otpDigits[index]}
                        onChangeText={(text) => handleOtpChange(text, index)}
                        onKeyPress={(e) => handleOtpKeyPress(e, index)}
                        keyboardType="number-pad"
                        maxLength={1}
                        textAlign="center"
                        selectTextOnFocus
                      />
                    ))}
                  </Animated.View>

                  <TouchableOpacity
                    onPress={() => handleVerifyOtp()}
                    style={[styles.primaryBtn, (otpDigits.join('').length !== 4 || loading) && styles.primaryBtnDisabled]}
                    disabled={otpDigits.join('').length !== 4 || loading}
                  >
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryBtnText}>Verify Code</Text>}
                  </TouchableOpacity>

                  <View style={styles.resendWrapper}>
                    <Text style={styles.resendLabel}>Didn't receive the code? </Text>
                    <TouchableOpacity onPress={handleResendOtp} disabled={resendTimer > 0 || loading}>
                      <Text style={[styles.resendLink, resendTimer > 0 && styles.resendLinkDisabled]}>
                        {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* STATE 3: SET NEW PASSWORD */}
              {step === 'reset' && (
                <View>
                  <Text style={styles.label}>New Password</Text>
                  <View style={styles.passwordWrapper}>
                    <TextInput
                      style={styles.passwordInput}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="••••••••"
                      placeholderTextColor="#A0A0A0"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      {showPassword ? <EyeOff size={18} strokeWidth={1.5} color="#8A9A9D" /> : <Eye size={18} strokeWidth={1.5} color="#8A9A9D" />}
                    </TouchableOpacity>
                  </View>

                  {/* REAL-TIME PASSWORD CHECKLIST */}
                  {newPassword.length > 0 && (
                    <PasswordCriteriaChecklist password={newPassword} />
                  )}

                  <Text style={styles.label}>Confirm New Password</Text>
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
                    onPress={handleResetPassword}
                    style={[styles.primaryBtn, (!canSubmitReset || loading) && styles.primaryBtnDisabled]}
                    disabled={!canSubmitReset || loading}
                  >
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryBtnText}>Reset Password</Text>}
                  </TouchableOpacity>
                </View>
              )}

              {/* STATE 4: SUCCESS */}
              {step === 'success' && (
                <View style={styles.successWrapper}>
                  <Text style={styles.successMessage}>
                    Your password has been successfully reset! Redirecting to login...
                  </Text>
                  <ActivityIndicator color="#4C3B87" style={{ marginTop: 16 }} />
                </View>
              )}

              {/* ERROR BANNER BELOW SUBMIT (13sp #EF4444) */}
              {!!errorMsg && (
                <View style={styles.errorBox}>
                  <AlertCircle size={16} strokeWidth={1.5} color="#EF4444" style={{ marginTop: 2 }} />
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              )}

              {step !== 'success' && (
                <View style={styles.footer}>
                  <Text style={styles.footerText}>Remember your password? </Text>
                  <TouchableOpacity onPress={() => router.replace('/login')}>
                    <Text style={styles.linkText}>Log in</Text>
                  </TouchableOpacity>
                </View>
              )}

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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  header: { alignItems: 'center', marginBottom: 28 },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0EEF8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appTitle: { fontSize: 22, fontFamily: Fonts.bold, color: '#17151C', textAlign: 'center' },
  appSubtitle: { fontSize: 13, fontFamily: Fonts.medium, color: '#79767D', marginTop: 4, textAlign: 'center', paddingHorizontal: 16 },
  card: {
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
  },
  label: { fontSize: 13, fontFamily: Fonts.medium, color: '#79767D', marginBottom: 8, marginLeft: 4 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  input: { flex: 1, height: '100%', fontSize: 15, fontFamily: Fonts.medium, color: '#17151C', backgroundColor: '#FFFFFF' },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    paddingLeft: 16,
    paddingRight: 12,
    marginBottom: 12,
  },
  passwordInput: { flex: 1, height: '100%', fontSize: 15, fontFamily: Fonts.medium, color: '#17151C', backgroundColor: '#FFFFFF' },
  eyeIcon: { padding: 4 },
  mismatchText: { color: '#EF4444', fontSize: 12, fontFamily: Fonts.medium, marginBottom: 12, marginLeft: 4 },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
    paddingHorizontal: 8,
  },
  otpBox: {
    width: 60,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    fontSize: 26,
    fontFamily: Fonts.bold,
    color: '#17151C',
    textAlign: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  otpBoxFilled: {
    borderColor: '#4C3B87',
    backgroundColor: '#FDFCFF',
  },
  resendWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  resendLabel: { fontSize: 13, fontFamily: Fonts.medium, color: '#79767D' },
  resendLink: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.light.primary },
  resendLinkDisabled: { color: '#9CA3AF' },
  primaryBtn: {
    backgroundColor: '#4C3B87',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#4C3B87',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontFamily: Fonts.bold },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  errorText: { flex: 1, color: '#EF4444', fontFamily: Fonts.medium, fontSize: 13, lineHeight: 18 },
  successWrapper: { alignItems: 'center', paddingVertical: 16 },
  successMessage: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: '#059669',
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  footerText: { fontSize: 13, fontFamily: Fonts.medium, color: '#79767D' },
  linkText: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.light.primary },
});
