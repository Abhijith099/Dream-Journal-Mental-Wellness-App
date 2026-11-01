import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { Mic, Square, X, PenLine, AlertCircle } from 'lucide-react-native';
import { Fonts } from '@/constants/theme';
import { authenticatedFetch, BACKEND_URL } from '@/utils/api';

interface VoiceRecorderProps {
  onTranscriptionComplete: (transcription: string, vocalCharacterization: string) => void;
  onCancel: () => void;
}

export default function VoiceRecorder({
  onTranscriptionComplete,
  onCancel,
}: VoiceRecorderProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Tap to start recording your dream');
  const timerRef = useRef<any>(null);

  const pulseOpacity = useSharedValue(1);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (isRecording) {
      pulseOpacity.value = withRepeat(
        withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      pulseScale.value = withRepeat(
        withTiming(1.15, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      cancelAnimation(pulseOpacity);
      cancelAnimation(pulseScale);
      pulseOpacity.value = 1;
      pulseScale.value = 1;
    }
  }, [isRecording]);

  const animatedPulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }));

  // Auto-stop at 2 minutes (120 seconds)
  useEffect(() => {
    if (isRecording && elapsedSeconds >= 120) {
      stopRecording();
    }
  }, [elapsedSeconds, isRecording]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, [recording]);

  const startRecording = async () => {
    try {
      // 1. Request microphone permissions
      const permissionResponse = await Audio.requestPermissionsAsync();
      if (permissionResponse.status !== 'granted') {
        Alert.alert(
          'Microphone Permission Needed',
          'Lucid Dreams needs microphone access to transcribe your spoken dreams into your journal.',
          [{ text: 'OK' }]
        );
        return;
      }

      // 2. Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // 3. Prepare and start recording
      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await newRecording.startAsync();

      setRecording(newRecording);
      setIsRecording(true);
      setElapsedSeconds(0);
      setStatusMessage('Listening... Speak clearly');

      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      Alert.alert('Recording Error', 'Could not access audio recorder. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsRecording(false);
    setIsProcessing(true);
    setStatusMessage('Transcribing & analyzing vocal delivery...');

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (!uri) {
        throw new Error('No audio recording URI available');
      }

      // Read audio file as Base64 string
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Determine MIME type
      const mimeType = Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4';

      // Send to backend for Gemini transcription + delivery analysis
      const res = await authenticatedFetch(`${BACKEND_URL}/dreams/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: base64Audio,
          mimeType,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to transcribe audio');
      }

      const data = await res.json();
      setIsProcessing(false);

      if (data.transcription) {
        onTranscriptionComplete(data.transcription, data.vocalCharacterization || '');
      } else {
        Alert.alert(
          'No Speech Detected',
          'We could not catch clear words from the audio. You can try recording again or type directly.'
        );
      }
    } catch (err: any) {
      console.error('Audio transcription error:', err);
      setIsProcessing(false);
      Alert.alert('Transcription Failed', err.message || 'Could not process audio.');
    }
  };

  const handleCancel = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
      } catch (e) {}
    }
    setRecording(null);
    setIsRecording(false);
    setIsProcessing(false);
    onCancel();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.tagBadge}>
          <PenLine size={13} color="#6B4FBB" strokeWidth={1.5} />
          <Text style={styles.tagBadgeText}>Voice Journaling</Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={handleCancel} activeOpacity={0.7}>
          <X size={18} strokeWidth={1.5} color="#8A9A9D" />
        </TouchableOpacity>
      </View>

      <Text style={styles.statusText}>{statusMessage}</Text>

      {/* Timer Display */}
      {isRecording && (
        <View style={styles.timerRow}>
          <Animated.View style={[styles.redDot, animatedPulseStyle]} />
          <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>
          <Text style={styles.maxTimeText}>/ 02:00 max</Text>
        </View>
      )}

      {/* Main Action Button */}
      <View style={styles.actionContainer}>
        {isProcessing ? (
          <View style={styles.processingWrapper}>
            <ActivityIndicator size="large" color="#6B4FBB" />
            <Text style={styles.processingText}>Gemini is transcribing your dream...</Text>
          </View>
        ) : isRecording ? (
          <TouchableOpacity
            style={styles.stopBtn}
            onPress={stopRecording}
            activeOpacity={0.8}
          >
            <Square size={16} strokeWidth={1.5} color="#FFFFFF" fill="#FFFFFF" />
            <Text style={styles.stopBtnText}>Done Recording</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.recordBtn}
            onPress={startRecording}
            activeOpacity={0.8}
          >
            <Mic size={16} strokeWidth={1.5} color="#FFFFFF" />
            <Text style={styles.recordBtnText}>Tap to Speak</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.disclaimerText}>
        Raw audio is transcribed and immediately discarded. Never stored in database.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 24,
    padding: 20,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(107, 79, 187, 0.2)',
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(107, 79, 187, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 8,
  },
  tagBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: '#6B4FBB',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 4,
  },
  statusText: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: '#2D2D2D',
    textAlign: 'center',
    marginBottom: 12,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E53935',
  },
  timerText: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    color: '#2D2D2D',
    letterSpacing: 1,
  },
  maxTimeText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: '#8A9A9D',
  },
  actionContainer: {
    marginVertical: 12,
    alignItems: 'center',
  },
  recordBtn: {
    backgroundColor: '#6B4FBB',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    gap: 8,
    shadowColor: '#6B4FBB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  recordBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  stopBtn: {
    backgroundColor: '#E53935',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    gap: 8,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  stopBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  processingWrapper: {
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  processingText: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: '#6B4FBB',
  },
  disclaimerText: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: '#8A9A9D',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 16,
  },
});
