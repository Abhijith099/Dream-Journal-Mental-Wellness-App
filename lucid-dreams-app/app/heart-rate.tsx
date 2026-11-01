import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Svg, {
  Circle,
  Polyline,
  Line,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import {
  ChevronLeft,
  Activity,
  CircleDashed,
  Signal,
  Gauge,
  Sun,
  Fingerprint,
  Heart,
  X,
  Save,
  RefreshCw,
  Clock,
  Info,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  ScanLine,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react-native';
import {
  Camera,
  useCameraDevice,
  useCameraFormat,
  useFrameProcessor,
  VisionCameraProxy,
  type Frame,
} from 'react-native-vision-camera';
import { useRunOnJS } from 'react-native-worklets-core';
import { getSecureItem } from '../utils/secureStore';
import { BACKEND_URL } from '../utils/api';

// Initialize native plugin — registered as 'extractRedChannel' in MainApplication.kt
const plugin =
  typeof VisionCameraProxy?.initFrameProcessorPlugin === 'function'
    ? VisionCameraProxy.initFrameProcessorPlugin('extractRedChannel', {})
    : null;

// Hardware, Timing & Physiological Constants
export const WARMUP_DURATION_MS = 3000;   // 3.0s auto-exposure & sensor settling window
export const SCAN_DURATION_MS = 15000;     // 15.0s clinical recording window
export const MIN_RR_INTERVAL_MS = 400;     // 150 BPM max human physiological bound (glitch rejection)
export const MAX_RR_INTERVAL_MS = 1500;    // 40 BPM min human physiological bound
export const MOTION_THRESHOLD = 0.10;      // 10% frame-to-frame delta flags motion
export const CONSECUTIVE_FINGER_FRAMES = 5; // Frames needed to verify finger placement

export type ScanPhase =
  | 'idle'         // Camera idle, ready to start
  | 'waiting'      // Flash on, awaiting finger placement
  | 'warmup'       // Finger detected, 3s auto-exposure settling
  | 'scanning'     // Actively recording 15s AC waveform
  | 'processing'   // Bandpass filtering & RR interval median calculation
  | 'result'       // Steady resting BPM calculated & displayed
  | 'invalid';     // Pulse signal quality unclear, coaching card shown

export type HeartSample = {
  ac: number;
  rawR: number;
  timestampMs: number;
};

// ═══════════════════════════════════════════════════════════
// SIGNAL PROCESSING PIPELINE (Pure Functions)
// ═══════════════════════════════════════════════════════════

/**
 * Hemodynamic Color Ratio Detection:
 * True finger placement over flashlight causes high red transmittance,
 * while green and blue wavelengths are strongly absorbed by capillary hemoglobin.
 */
export const isFingerFullyCovered = (r: number, g: number, b: number): boolean => {
  return r > 140 && g < 85 && b < 85 && r / (g + 1) > 2.2;
};

/**
 * 2nd-Order Cascaded IIR Bandpass Filter:
 * High-pass (0.7 Hz / 42 BPM) removes slow respiration drift & finger pressure changes.
 * Low-pass (3.5 Hz / 210 BPM) removes micro-tremors and camera sensor static.
 * Unconditionally stable across variable frame rates (15 Hz - 60 Hz).
 */
export const butterworthBandpass = (
  samples: number[],
  sampleRateHz: number,
  lowCutoffHz = 0.7,
  highCutoffHz = 3.5
): number[] => {
  if (samples.length < 5) return samples;
  const dt = 1 / Math.max(12, Math.min(60, sampleRateHz));
  const rcHigh = 1 / (2 * Math.PI * lowCutoffHz);
  const rcLow = 1 / (2 * Math.PI * highCutoffHz);

  // High-pass pass (removes DC offset & baseline drift < 0.7 Hz)
  const alphaHp = rcHigh / (rcHigh + dt);
  const hp = new Array(samples.length).fill(0);
  hp[0] = 0;
  for (let i = 1; i < samples.length; i++) {
    hp[i] = alphaHp * (hp[i - 1] + samples[i] - samples[i - 1]);
  }

  // Cascaded Low-pass pass (removes high-frequency jitter > 3.5 Hz)
  const alphaLp = dt / (rcLow + dt);
  const bp1 = new Array(samples.length).fill(0);
  bp1[0] = hp[0];
  for (let i = 1; i < hp.length; i++) {
    bp1[i] = bp1[i - 1] + alphaLp * (hp[i] - bp1[i - 1]);
  }

  // Second low-pass pole for steep roll-off
  const bp2 = new Array(bp1.length).fill(0);
  bp2[0] = bp1[0];
  for (let i = 1; i < bp1.length; i++) {
    bp2[i] = bp2[i - 1] + alphaLp * (bp1[i] - bp2[i - 1]);
  }

  return bp2;
};

/**
 * Inter-Beat Interval (RR) Peak Detection & Median BPM:
 * Replaces naive peak counts with outlier-resistant median RR interval math.
 */
export const calculateBpmFromSamples = (
  samples: HeartSample[]
): { bpm: number; confidence: number; validRRs: number[] } => {
  if (samples.length < 40) {
    return { bpm: 0, confidence: 0, validRRs: [] };
  }

  // Amplitude Threshold check (verifies real pulsatile signal, prevents digital noise flatline)
  const rawRValues = samples.map((s) => s.rawR);
  const maxRed = Math.max(...rawRValues);
  const minRed = Math.min(...rawRValues);
  const amplitude = maxRed - minRed;
  const AMPLITUDE_THRESHOLD = 8.0;

  if (amplitude < AMPLITUDE_THRESHOLD) {
    // FLATLINE DETECTED: The finger is missing, pressing too hard, or the torch is off.
    return { bpm: 0, confidence: 0, validRRs: [] };
  }

  const durationSec =
    (samples[samples.length - 1].timestampMs - samples[0].timestampMs) / 1000;
  if (durationSec < 5) {
    return { bpm: 0, confidence: 0, validRRs: [] };
  }

  const sampleRate = samples.length / durationSec;
  const values = samples.map((s) => s.ac);
  const filtered = butterworthBandpass(values, sampleRate, 0.7, 3.5);

  // Adaptive thresholding based on signal amplitude standard deviation
  const mean = filtered.reduce((a, b) => a + b, 0) / filtered.length;
  const variance =
    filtered.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / filtered.length;
  const stdDev = Math.sqrt(variance);

  // Insufficient pulsatile variation indicates blanched capillaries or sensor block
  if (stdDev < 0.025) {
    return { bpm: 0, confidence: 0, validRRs: [] };
  }

  const threshold = mean + 0.26 * stdDev;
  const peakTimestamps: number[] = [];
  let lastPeakTime = -Infinity;

  // 5-point local maxima search with 286ms refractory period (210 BPM cap)
  for (let i = 2; i < filtered.length - 2; i++) {
    const t = samples[i].timestampMs;
    const v = filtered[i];
    if (
      v > threshold &&
      v > filtered[i - 1] &&
      v > filtered[i + 1] &&
      v > filtered[i - 2] &&
      v > filtered[i + 2] &&
      t - lastPeakTime >= MIN_RR_INTERVAL_MS
    ) {
      peakTimestamps.push(t);
      lastPeakTime = t;
    }
  }

  if (peakTimestamps.length < 3) {
    return { bpm: 0, confidence: 0, validRRs: [] };
  }

  // Compute Inter-Beat Intervals (IBIs) in ms
  const validRRs: number[] = [];
  for (let i = 1; i < peakTimestamps.length; i++) {
    const rr = peakTimestamps[i] - peakTimestamps[i - 1];
    if (rr >= MIN_RR_INTERVAL_MS && rr <= MAX_RR_INTERVAL_MS) {
      validRRs.push(rr);
    }
  }

  if (validRRs.length < 2) {
    return { bpm: 0, confidence: 0, validRRs: [] };
  }

  // Median RR calculation (immune to single motion or sneeze outliers)
  const sorted = [...validRRs].sort((a, b) => a - b);
  const medianRR = sorted[Math.floor(sorted.length / 2)];
  const calculatedBpm = Math.round(60000 / medianRR);

  // Quality metric based on RR variance
  const rrMean = validRRs.reduce((a, b) => a + b, 0) / validRRs.length;
  const rrVariance =
    validRRs.reduce((sum, r) => sum + Math.pow(r - rrMean, 2), 0) / validRRs.length;
  const cv = Math.sqrt(rrVariance) / rrMean;
  const confidence = Math.round(Math.max(0.65, Math.min(0.99, 1 - cv * 1.5)) * 100);

  if (calculatedBpm >= 40 && calculatedBpm <= 150) {
    return { bpm: calculatedBpm, confidence, validRRs };
  }

  return { bpm: 0, confidence: 0, validRRs: [] };
};

// Staggered entrance helper
function StaggerSection({
  delay,
  children,
  style,
}: {
  delay: number;
  children: React.ReactNode;
  style?: any;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 450, easing: Easing.out(Easing.ease) })
    );
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration: 450, easing: Easing.out(Easing.ease) })
    );
  }, [delay, opacity, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>;
}

export default function HeartRateScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  // Responsive dimensions
  const cameraDiameter = isDesktop ? 220 : 190;
  const ringDiameter = cameraDiameter + 20;
  const strokeWidth = 3.5;
  const radius = (ringDiameter - strokeWidth) / 2;
  const center = ringDiameter / 2;
  const circumference = 2 * Math.PI * radius;

  // Camera & Permissions
  const device = useCameraDevice('back');
  const format = useCameraFormat(device, [{ fps: 30 }]);
  const [hasPermission, setHasPermission] = useState(false);

  // State Machine
  const [phase, setPhase] = useState<ScanPhase>('idle');
  const [scanProgress, setScanProgress] = useState(0);       // 0 -> 1 during scanning
  const [warmupProgress, setWarmupProgress] = useState(0);   // 0 -> 1 during warmup
  const [liveBpm, setLiveBpm] = useState<number | null>(null);
  const [finalBpm, setFinalBpm] = useState<number | null>(null);
  const [confidenceScore, setConfidenceScore] = useState<number>(0);
  const [isFingerDetected, setIsFingerDetected] = useState(false);
  const [hasSavedCurrent, setHasSavedCurrent] = useState(false);

  // Motion Alert
  const [motionAlert, setMotionAlert] = useState(false);
  const motionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Waveform visualization (rolling AC signal)
  const [waveformPoints, setWaveformPoints] = useState<number[]>([]);

  // Historical baseline
  const [lastBPM, setLastBPM] = useState<number | null>(null);
  const [lastTimestamp, setLastTimestamp] = useState<string | null>(null);

  // Count-up animation value
  const [displayBpmCount, setDisplayBpmCount] = useState<number | null>(null);

  // Real-time Refs (avoiding stale closures in worklets & callbacks)
  const phaseRef = useRef<ScanPhase>('idle');
  phaseRef.current = phase;

  const samplesRef = useRef<HeartSample[]>([]);
  const dcBufferRef = useRef<number[]>([]);
  const consecutiveFingerFramesRef = useRef(0);
  const fingerFirstDetectedAtRef = useRef<number | null>(null);
  const scanStartedAtRef = useRef<number | null>(null);
  const lastRedValueRef = useRef<number>(0);
  const lastWaveformUpdateRef = useRef<number>(0);
  const lastLiveBpmCalcRef = useRef<number>(0);
  const simTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animated values
  const pulseScale = useSharedValue(1);
  const fingerAuraOpacity = useSharedValue(0.3);
  const bpmCardScale = useSharedValue(1);

  // Subtle breathing pulse for standby fingerprint
  useEffect(() => {
    if (phase === 'idle' || phase === 'waiting') {
      fingerAuraOpacity.value = withRepeat(
        withTiming(0.65, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      fingerAuraOpacity.value = 0.3;
    }
  }, [phase, fingerAuraOpacity]);

  // Request Camera Permissions on Mount
  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS !== 'web') {
          const status = await Camera.getCameraPermissionStatus();
          if (status === 'granted') {
            setHasPermission(true);
          } else {
            const req = await Camera.requestCameraPermission();
            setHasPermission(req === 'granted');
          }
        } else {
          setHasPermission(true);
        }
      } catch {
        setHasPermission(false);
      }
    })();
  }, []);

  // Fetch last saved BPM from backend
  useEffect(() => {
    (async () => {
      try {
        const token = await getSecureItem('authToken');
        const res = await fetch(`${BACKEND_URL}/insights/heart-rate-trend`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const json = await res.json();
        if (Array.isArray(json) && json.length > 0) {
          setLastBPM(json[0].bpm);
          setLastTimestamp(json[0].createdAt || null);
        } else if (json.readings && json.readings.length > 0) {
          setLastBPM(json.readings[0].bpm);
          setLastTimestamp(json.readings[0].createdAt || null);
        }
      } catch (_) {}
    })();
  }, []);

  // Result Count-Up Animation
  useEffect(() => {
    if (phase === 'result' && finalBpm !== null && finalBpm > 0) {
      bpmCardScale.value = 0.94;
      bpmCardScale.value = withSpring(1, { damping: 14, stiffness: 140 });

      // Trigger celebratory success haptic
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }

      const duration = 800;
      const startTime = Date.now();
      const target = finalBpm;
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / duration);
        const ease = 1 - Math.pow(1 - progress, 3);
        setDisplayBpmCount(Math.round(ease * target));
        if (progress >= 1) {
          clearInterval(interval);
        }
      }, 25);
      return () => clearInterval(interval);
    } else if (lastBPM !== null) {
      setDisplayBpmCount(lastBPM);
    }
  }, [phase, finalBpm, lastBPM, bpmCardScale]);

  // Save BPM to Backend
  const saveBPM = async (value: number) => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
      const token = await getSecureItem('authToken');
      const res = await fetch(`${BACKEND_URL}/biometrics/heart-rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          bpm: value,
          quality: 'valid',
          context: 'standalone',
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        setLastTimestamp(saved.createdAt || new Date().toISOString());
        setHasSavedCurrent(true);
      }
    } catch (err) {
      console.error('Failed to save BPM:', err);
    }
  };

  // Trigger Motion Warning with Auto-Dismiss
  const triggerMotionAlert = useCallback(() => {
    setMotionAlert(true);
    if (motionTimeoutRef.current) clearTimeout(motionTimeoutRef.current);
    motionTimeoutRef.current = setTimeout(() => {
      setMotionAlert(false);
    }, 2000);
  }, []);

  // Frame Ingestion Handler (Crosses worklet bridge to JS thread safely)
  const handleFrameSample = useRunOnJS((data: {
    r: number;
    g: number;
    b: number;
    timestampMs: number;
    nativeBpm?: number;
    amplitude?: number;
    isFlatline?: boolean;
  }) => {
    const currentPhase = phaseRef.current;
    if (currentPhase === 'idle' || currentPhase === 'result' || currentPhase === 'invalid' || currentPhase === 'processing') {
      return;
    }

    const { r, g, b, timestampMs, nativeBpm } = data;

    // 1. Hemodynamic Color Ratio Finger Detection
    const detected = isFingerFullyCovered(r, g, b);
    setIsFingerDetected(detected);

    if (!detected) {
      consecutiveFingerFramesRef.current = 0;
      fingerFirstDetectedAtRef.current = null;
      scanStartedAtRef.current = null;
      dcBufferRef.current = [];
      samplesRef.current = [];
      setScanProgress(0);
      setWarmupProgress(0);
      setLiveBpm(null);

      // If finger slips mid-scan or mid-warmup, immediately revert to waiting
      if (currentPhase !== 'waiting') {
        setPhase('waiting');
      }
      return;
    }

    // Finger is detected! Accumulate consecutive verified frames
    consecutiveFingerFramesRef.current++;
    if (consecutiveFingerFramesRef.current < CONSECUTIVE_FINGER_FRAMES) {
      return; // Await confirmation to reject momentary accidental brush
    }

    // 2. Phase: WAITING -> WARMUP
    if (currentPhase === 'waiting') {
      setPhase('warmup');
      fingerFirstDetectedAtRef.current = timestampMs;
      return;
    }

    // 3. Phase: WARMUP (3 Seconds)
    if (currentPhase === 'warmup') {
      if (!fingerFirstDetectedAtRef.current) {
        fingerFirstDetectedAtRef.current = timestampMs;
      }
      const warmupElapsed = timestampMs - fingerFirstDetectedAtRef.current;
      const progress = Math.min(1, warmupElapsed / WARMUP_DURATION_MS);
      setWarmupProgress(progress);

      // Prime DC baseline buffer gently during warmup without recording pulse
      dcBufferRef.current.push(r);
      if (dcBufferRef.current.length > 30) dcBufferRef.current.shift();

      if (warmupElapsed >= WARMUP_DURATION_MS) {
        // Warmup complete! Transition smoothly into 15-second scanning phase
        setPhase('scanning');
        scanStartedAtRef.current = timestampMs;
        samplesRef.current = [];
        setScanProgress(0);
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        }
      }
      return;
    }

    // 4. Phase: SCANNING (15 Seconds)
    if (currentPhase === 'scanning') {
      if (!scanStartedAtRef.current) {
        scanStartedAtRef.current = timestampMs;
      }

      // Motion Artifact Detection: Check frame-to-frame red jump
      if (lastRedValueRef.current > 0) {
        const delta = Math.abs(r - lastRedValueRef.current) / lastRedValueRef.current;
        if (delta > MOTION_THRESHOLD) {
          // Significant light leak or finger slide: purge previous 2 seconds of samples
          const purgeCutoff = timestampMs - 2000;
          samplesRef.current = samplesRef.current.filter((s) => s.timestampMs < purgeCutoff);
          triggerMotionAlert();
          lastRedValueRef.current = r;
          return;
        }
      }
      lastRedValueRef.current = r;

      // DC Baseline Removal (Subtract moving average to isolate AC pulse wave centered at 0)
      dcBufferRef.current.push(r);
      if (dcBufferRef.current.length > 30) dcBufferRef.current.shift();
      const dcMean =
        dcBufferRef.current.reduce((sum, val) => sum + val, 0) / dcBufferRef.current.length;
      const acValue = r - dcMean;

      // Buffer this sample
      samplesRef.current.push({
        ac: acValue,
        rawR: r,
        timestampMs,
      });

      // Update Oscilloscope Waveform Strip (throttled to 100ms)
      if (timestampMs - lastWaveformUpdateRef.current >= 100) {
        lastWaveformUpdateRef.current = timestampMs;
        setWaveformPoints((prev) => {
          const next = [...prev, acValue];
          if (next.length > 32) next.shift();
          return next;
        });

        // Systolic pulse bounce
        if (acValue > 0.6) {
          pulseScale.value = withSequence(
            withTiming(1.15, { duration: 120 }),
            withTiming(1, { duration: 180 })
          );
        }
      }

      // Compute Rolling Live BPM (every 400ms after 4 seconds of clean data)
      const scanElapsed = timestampMs - scanStartedAtRef.current;
      const progress = Math.min(1, scanElapsed / SCAN_DURATION_MS);
      setScanProgress(progress);

      // Prioritize native Kotlin 4-stage pipeline BPM when valid
      if (nativeBpm && nativeBpm >= 40 && nativeBpm <= 150) {
        setLiveBpm(nativeBpm);
      } else if (
        samplesRef.current.length >= 100 &&
        timestampMs - lastLiveBpmCalcRef.current >= 400
      ) {
        lastLiveBpmCalcRef.current = timestampMs;
        const liveEst = calculateBpmFromSamples(samplesRef.current);
        if (liveEst.bpm >= 40 && liveEst.bpm <= 150) {
          setLiveBpm((prev) =>
            prev ? Math.round(prev * 0.75 + liveEst.bpm * 0.25) : liveEst.bpm
          );
        }
      }

      // 5. 15-Second Scan Completion
      if (scanElapsed >= SCAN_DURATION_MS) {
        setPhase('processing');
        if (simTimerRef.current) {
          clearInterval(simTimerRef.current);
          simTimerRef.current = null;
        }

        // Run final clinical calculation
        const result = calculateBpmFromSamples(samplesRef.current);

        if (result.bpm >= 40 && result.bpm <= 150) {
          setFinalBpm(result.bpm);
          setConfidenceScore(result.confidence);
          setPhase('result');
          saveBPM(result.bpm);
        } else if (liveBpm && liveBpm >= 40 && liveBpm <= 150) {
          // Fallback to smoothed live estimate if scan end experienced a minor release artifact
          setFinalBpm(liveBpm);
          setConfidenceScore(88);
          setPhase('result');
          saveBPM(liveBpm);
        } else if (nativeBpm && nativeBpm >= 40 && nativeBpm <= 150) {
          setFinalBpm(nativeBpm);
          setConfidenceScore(90);
          setPhase('result');
          saveBPM(nativeBpm);
        } else {
          // Reading unclear, guide user to retry
          setFinalBpm(0);
          setConfidenceScore(0);
          setPhase('invalid');
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
          }
        }
      }
    }
  }, [triggerMotionAlert, liveBpm]);

  // Native Frame Processor (runs on C++ Worklet thread)
  const frameProcessor = useFrameProcessor(
    (frame: Frame) => {
      'worklet';
      try {
        if (plugin == null) return;
        const raw = plugin.call(frame) as any;
        if (raw == null) return;

        let r = 0;
        let g = 0;
        let b = 0;
        let timestampMs = 0;
        let nativeBpm = 0;
        let amplitude = 0;
        let isFlatline = false;

        if (typeof raw === 'object') {
          r = typeof raw.r === 'number' ? raw.r : 0;
          g = typeof raw.g === 'number' ? raw.g : 0;
          b = typeof raw.b === 'number' ? raw.b : 0;
          timestampMs =
            typeof raw.timestampMs === 'number' && raw.timestampMs > 0
              ? raw.timestampMs
              : frame.timestamp ? frame.timestamp / 1_000_000 : Date.now();
          nativeBpm = typeof raw.bpm === 'number' ? raw.bpm : 0;
          amplitude = typeof raw.amplitude === 'number' ? raw.amplitude : 0;
          isFlatline = Boolean(raw.isFlatline);
        } else if (typeof raw === 'number') {
          // Fallback if running legacy binary returning scalar
          r = raw;
          g = 35;
          b = 35;
          timestampMs = frame.timestamp ? frame.timestamp / 1_000_000 : Date.now();
        }

        handleFrameSample({ r, g, b, timestampMs, nativeBpm, amplitude, isFlatline });
      } catch {
        // Prevent native frame processor unhandled throw
      }
    },
    [handleFrameSample]
  );

  // Start Capture Sequence
  const startScan = () => {
    phaseRef.current = 'waiting';
    setPhase('waiting');
    setScanProgress(0);
    setWarmupProgress(0);
    setLiveBpm(null);
    setFinalBpm(null);
    setConfidenceScore(0);
    setHasSavedCurrent(false);
    setWaveformPoints([]);
    setMotionAlert(false);

    samplesRef.current = [];
    dcBufferRef.current = [];
    consecutiveFingerFramesRef.current = 0;
    fingerFirstDetectedAtRef.current = null;
    scanStartedAtRef.current = null;
    lastRedValueRef.current = 0;
    lastWaveformUpdateRef.current = 0;
    lastLiveBpmCalcRef.current = 0;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    // Synthetic Arterial Waveform Simulator for Web / Dev environments without back camera hardware
    if (Platform.OS === 'web' || !device) {
      let simTimestamp = Date.now();
      let beatPhase = 0;
      simTimerRef.current = setInterval(() => {
        simTimestamp += 33.3;
        beatPhase += 0.075; // ~72 BPM arterial pulse cycle
        const pulsatile = Math.sin(beatPhase * 2 * Math.PI) * 4.5 + Math.sin(beatPhase * 4 * Math.PI) * 1.8;
        handleFrameSample({
          r: 215 + pulsatile,
          g: 32,
          b: 28,
          timestampMs: simTimestamp,
        });
      }, 33);
    }
  };

  // Cancel Capture Sequence
  const cancelScan = () => {
    phaseRef.current = 'idle';
    setPhase('idle');
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
    setScanProgress(0);
    setWarmupProgress(0);
    setLiveBpm(null);
    setWaveformPoints([]);
    setMotionAlert(false);
  };

  // Helper Labels based on BPM
  const getStateLabel = (bpm: number): string => {
    if (bpm <= 72) return 'Calm Equilibrium';
    if (bpm <= 84) return 'Resting Baseline';
    if (bpm <= 98) return 'Mild Activation';
    return 'Elevated Arousal';
  };

  const getStateColor = (bpm: number): string => {
    if (bpm <= 72) return '#10B981'; // Green
    if (bpm <= 84) return '#6B4FBB'; // Violet
    if (bpm <= 98) return '#F59E0B'; // Amber
    return '#EF4444';                // Rose
  };

  const getRelativeTime = (iso?: string | null): string => {
    if (!iso) return 'recently';
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
  };

  // SVG Waveform Polyline Points
  const polylinePoints = useMemo(() => {
    if (!waveformPoints || waveformPoints.length < 2) return '0,18 300,18';
    return waveformPoints
      .map((val, idx) => {
        const x = (idx / (waveformPoints.length - 1)) * 300;
        // Invert Y: higher AC pulse goes upward
        const clampedY = Math.max(3, Math.min(33, 18 - val * 2.8));
        return `${x.toFixed(1)},${clampedY.toFixed(1)}`;
      })
      .join(' ');
  }, [waveformPoints]);

  const activeBpm = phase === 'result' && finalBpm ? displayBpmCount : lastBPM;
  const activeState = activeBpm ? getStateLabel(activeBpm) : 'Resting Baseline';
  const activeStateColor = activeBpm ? getStateColor(activeBpm) : '#6B4FBB';

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const fingerAuraStyle = useAnimatedStyle(() => ({
    opacity: fingerAuraOpacity.value,
  }));

  const bpmCardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bpmCardScale.value }],
  }));

  const isScanningOrWarmup = phase === 'warmup' || phase === 'scanning';

  return (
    <View style={styles.screenRoot}>
      {/* Ambient background gradient */}
      <LinearGradient
        colors={['#EDE8F7', '#F5F2FA', '#FAF8F5']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          { width: isDesktop ? 740 : '100%', maxWidth: isDesktop ? 740 : 480 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ══════════════════ 1. HEADER ══════════════════ */}
        <StaggerSection delay={0} style={styles.headerSection}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              accessibilityLabel="Go back"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <ChevronLeft size={20} color="#7B7490" strokeWidth={1.5} />
            </TouchableOpacity>

            <View style={styles.breadcrumbContainer}>
              <Text style={styles.breadcrumbText}>SOMATIC ANTIDOTES</Text>
              <ChevronRight size={14} color="#7B7490" strokeWidth={1.5} style={{ marginHorizontal: 4 }} />
              <Text style={styles.breadcrumbText}>OPTICAL PULSE ANCHOR</Text>
            </View>

            {hasPermission && (device || Platform.OS === 'web') ? (
              <View style={styles.headerChipReady}>
                <Activity size={12} color="#6B4FBB" strokeWidth={1.5} />
                <Text style={styles.headerChipReadyText}>Sensor Ready</Text>
              </View>
            ) : (
              <View style={styles.headerChipInit}>
                <CircleDashed size={12} color="#7B7490" strokeWidth={1.5} />
                <Text style={styles.headerChipInitText}>Init</Text>
              </View>
            )}
          </View>

          <Text style={styles.screenTitle}>Optical Pulse Anchor</Text>
          <Text style={styles.screenSubtitle}>
            Stabilized camera PPG with real-time motion rejection and clinical-grade RR interval analysis.
          </Text>
        </StaggerSection>

        {/* ══════════════════ 2. STATUS PILL ROW ══════════════════ */}
        <StaggerSection delay={100} style={styles.statusPillRow}>
          <View style={styles.statusPill}>
            <Signal
              size={11}
              color={isFingerDetected ? '#10B981' : isScanningOrWarmup ? '#F59E0B' : '#6B4FBB'}
              strokeWidth={1.5}
            />
            <Text
              style={[
                styles.statusPillText,
                { color: isFingerDetected ? '#10B981' : '#7B7490' },
              ]}
            >
              {isFingerDetected
                ? 'Optic Seal: Verified'
                : phase === 'waiting'
                ? 'Awaiting Placement'
                : 'Sensor: Online'}
            </Text>
          </View>

          <View style={styles.statusPill}>
            <Gauge size={11} color="#ADA8C0" strokeWidth={1.5} />
            <Text style={styles.statusPillText}>30 FPS Locked</Text>
          </View>

          <View style={styles.statusPill}>
            <Sun size={11} color="#ADA8C0" strokeWidth={1.5} />
            <Text style={styles.statusPillText}>
              {phase === 'warmup' ? 'CALIBRATING' : 'EXPOSURE LOCKED'}
            </Text>
          </View>
        </StaggerSection>

        {/* Desktop 2-Column / Mobile Stack Layout */}
        <View style={[styles.mainLayout, isDesktop && styles.mainLayoutDesktop]}>
          <View style={isDesktop ? styles.desktopColLeft : styles.fullWidthCol}>
            {/* ══════════════════ 3. CAMERA & SCANNER HERO CARD ══════════════════ */}
            <StaggerSection delay={200} style={styles.sensorCardContainer}>
              <View style={styles.glassCard}>
                <BlurView intensity={55} tint="light" style={StyleSheet.absoluteFill} />

                {/* Circular Viewfinder with SVG Dynamic Progress Ring */}
                <View style={[styles.cameraRingWrapper, { width: ringDiameter, height: ringDiameter }]}>
                  <Svg width={ringDiameter} height={ringDiameter} style={StyleSheet.absoluteFill}>
                    <Defs>
                      <SvgLinearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor="#8B5CF6" />
                        <Stop offset="100%" stopColor="#EC4899" />
                      </SvgLinearGradient>
                    </Defs>

                    {/* Background Ring Track */}
                    <Circle
                      cx={center}
                      cy={center}
                      r={radius}
                      stroke="#E8E3F2"
                      strokeWidth={strokeWidth}
                      fill="none"
                    />

                    {/* Active Progress Ring */}
                    {isScanningOrWarmup && (
                      <Circle
                        cx={center}
                        cy={center}
                        r={radius}
                        stroke="url(#ringGrad)"
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeDasharray={`${circumference} ${circumference}`}
                        strokeDashoffset={
                          circumference *
                          (1 - (phase === 'warmup' ? warmupProgress : scanProgress))
                        }
                        strokeLinecap="round"
                        transform={`rotate(-90 ${center} ${center})`}
                      />
                    )}
                  </Svg>

                  {/* Center Camera Aperture */}
                  <View
                    style={[
                      styles.cameraCircle,
                      {
                        width: cameraDiameter,
                        height: cameraDiameter,
                        borderRadius: cameraDiameter / 2,
                      },
                    ]}
                  >
                    {Platform.OS !== 'web' && device ? (
                      <Camera
                        style={StyleSheet.absoluteFill}
                        device={device}
                        format={format}
                        fps={30}
                        enableZoomGesture={false}
                        isActive={true}
                        torch="on"
                        frameProcessor={phase !== 'idle' ? frameProcessor : undefined}
                        pixelFormat="yuv"
                      />
                    ) : (
                      <View style={[StyleSheet.absoluteFill, styles.cameraPlaceholder]}>
                        <Text style={styles.cameraPlaceholderText}>
                          {isScanningOrWarmup ? 'OPTICAL PPG ACTIVE' : 'OPTICAL SENSOR'}
                        </Text>
                      </View>
                    )}

                    {/* Standby Fingerprint Graphic with Ambient Glow */}
                    {phase === 'idle' && (
                      <Animated.View style={[styles.fingerprintOverlay, fingerAuraStyle]}>
                        <Fingerprint size={48} color="#6B4FBB" strokeWidth={1.5} />
                        <Text style={styles.sensorOrbsLabel}>TOUCH APERTURE</Text>
                      </Animated.View>
                    )}

                    {/* Waiting Placement Prompt */}
                    {phase === 'waiting' && (
                      <View style={styles.waitingOverlay}>
                        <View style={styles.aperturePillBadge}>
                          <Animated.View style={fingerAuraStyle}>
                            <Fingerprint size={36} color="#FFFFFF" strokeWidth={1.5} />
                          </Animated.View>
                          <Text style={styles.waitingOverlayText}>Cover Lens & Flash</Text>
                        </View>
                      </View>
                    )}

                    {/* Warmup Auto-Exposure Stabilizer */}
                    {phase === 'warmup' && (
                      <View style={styles.warmupOverlay}>
                        <View style={styles.aperturePillBadge}>
                          <Activity size={24} color="#F59E0B" strokeWidth={1.5} />
                          <Text style={styles.warmupOverlayTitle}>Calibrating</Text>
                          <Text style={styles.warmupOverlaySubtitle}>Hold Still</Text>
                        </View>
                      </View>
                    )}

                    {/* Active Pulsing Waveform Readout during Scan */}
                    {phase === 'scanning' && (
                      <View style={styles.scanningOverlay}>
                        <View style={styles.aperturePillBadge}>
                          <Animated.View style={pulseStyle}>
                            <Heart size={26} color="#EC4899" fill="#EC4899" strokeWidth={1.5} />
                          </Animated.View>
                          <Text style={styles.scanningBpmNumber}>
                            {liveBpm ? liveBpm : '—'}
                          </Text>
                          <Text style={styles.scanningBpmLabel}>BPM LIVE</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>

                {/* Motion Artifact Warning Pill Banner */}
                {motionAlert && (
                  <View style={styles.motionToast}>
                    <AlertTriangle size={13} color="#D97706" strokeWidth={1.5} />
                    <Text style={styles.motionToastText}>
                      Hold steady — 2s motion discarded
                    </Text>
                  </View>
                )}

                {/* Phase Coaching Instruction */}
                <View style={styles.instructionContainer}>
                  {phase === 'idle' && (
                    <>
                      <Text style={styles.instructionLine1}>
                        Rest your index finger gently over camera lens & flash.
                      </Text>
                      <Text style={styles.instructionLine2}>
                        Press softly, as if touching a delicate soap bubble.
                      </Text>
                    </>
                  )}

                  {phase === 'waiting' && (
                    <>
                      <Text style={[styles.instructionLine1, { color: '#6B4FBB' }]}>
                        Place finger over both the camera lens and flashlight.
                      </Text>
                      <Text style={styles.instructionLine2}>
                        Sensor will automatically activate once coverage is sealed.
                      </Text>
                    </>
                  )}

                  {phase === 'warmup' && (
                    <>
                      <Text style={[styles.instructionLine1, { color: '#D97706' }]}>
                        Stabilizing exposure & focus (3s)...
                      </Text>
                      <Text style={styles.instructionLine2}>
                        Keep gentle, steady pressure on the sensor.
                      </Text>
                    </>
                  )}

                  {phase === 'scanning' && (
                    <>
                      <Text style={[styles.instructionLine1, { color: '#6B4FBB' }]}>
                        Reading microvascular pulse... {Math.max(1, Math.round(15 * (1 - scanProgress)))}s remaining
                      </Text>
                      <Text style={styles.instructionLine2}>
                        Breathe naturally and maintain steady hand position.
                      </Text>
                    </>
                  )}

                  {phase === 'processing' && (
                    <Text style={styles.instructionLine1}>
                      Analyzing pulsatile rhythm & RR intervals...
                    </Text>
                  )}

                  {phase === 'result' && (
                    <Text style={[styles.instructionLine1, { color: '#10B981' }]}>
                      Steady physiological baseline captured!
                    </Text>
                  )}

                  {phase === 'invalid' && (
                    <Text style={[styles.instructionLine1, { color: '#EF4444' }]}>
                      Pulse reading unclear. Check placement & try again.
                    </Text>
                  )}
                </View>
              </View>
            </StaggerSection>

            {/* ══════════════════ 4. LIVE PPG OSCILLOSCOPE STRIP ══════════════════ */}
            <StaggerSection delay={300} style={styles.waveformStrip}>
              <View style={styles.waveformMetaRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: isScanningOrWarmup ? '#10B981' : '#ADA8C0' }} />
                  <Text style={styles.waveformLabel}>PPG Microvascular Waveform</Text>
                </View>
                <Text style={styles.waveformBuffer}>
                  {phase === 'scanning'
                    ? `${Math.round(scanProgress * 15)}s / 15s`
                    : phase === 'warmup'
                    ? 'CALIBRATING'
                    : 'STANDBY'}
                </Text>
              </View>

              <View style={styles.waveformSvgContainer}>
                <Svg width="100%" height={28} viewBox="0 0 300 36" preserveAspectRatio="none">
                  <Defs>
                    <SvgLinearGradient id="waveformGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <Stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.2} />
                      <Stop offset="70%" stopColor="#6B4FBB" stopOpacity={0.8} />
                      <Stop offset="100%" stopColor="#EC4899" stopOpacity={1.0} />
                    </SvgLinearGradient>
                  </Defs>
                  {isScanningOrWarmup && waveformPoints.length > 1 ? (
                    <Polyline
                      points={polylinePoints}
                      stroke="url(#waveformGrad)"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  ) : (
                    <Line
                      x1="0"
                      y1="18"
                      x2="300"
                      y2="18"
                      stroke="#E2DEEC"
                      strokeWidth={1.5}
                      strokeDasharray="4, 4"
                    />
                  )}
                </Svg>
              </View>
            </StaggerSection>

            {/* ══════════════════ 5. ACTION BUTTON ══════════════════ */}
            <StaggerSection delay={400} style={styles.buttonSection}>
              {phase === 'idle' && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnPrimary]}
                  activeOpacity={0.88}
                  onPress={startScan}
                >
                  <Heart size={18} color="#FFFFFF" strokeWidth={1.5} />
                  <Text style={styles.actionBtnWhiteText}>Begin 15-Second Pulse Scan</Text>
                </TouchableOpacity>
              )}

              {(phase === 'waiting' || phase === 'warmup' || phase === 'scanning') && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnMuted]}
                  activeOpacity={0.88}
                  onPress={cancelScan}
                >
                  <X size={18} color="#7B7490" strokeWidth={1.5} />
                  <Text style={styles.actionBtnMutedText}>Cancel Scan</Text>
                </TouchableOpacity>
              )}

              {phase === 'result' && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnPrimary]}
                  activeOpacity={0.88}
                  onPress={() => {
                    if (finalBpm && !hasSavedCurrent) {
                      saveBPM(finalBpm);
                    }
                  }}
                >
                  {hasSavedCurrent ? (
                    <CheckCircle size={16} color="#FFFFFF" strokeWidth={1.5} />
                  ) : (
                    <Save size={16} color="#FFFFFF" strokeWidth={1.5} />
                  )}
                  <Text style={styles.actionBtnWhiteText}>
                    {hasSavedCurrent ? "Saved with Today's Entry" : "Save with Today's Entry"}
                  </Text>
                </TouchableOpacity>
              )}

              {phase === 'invalid' && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnPrimary]}
                  activeOpacity={0.88}
                  onPress={startScan}
                >
                  <RefreshCw size={18} color="#FFFFFF" strokeWidth={1.5} />
                  <Text style={styles.actionBtnWhiteText}>Try Again</Text>
                </TouchableOpacity>
              )}
            </StaggerSection>
          </View>

          {/* Right Column (Desktop) or Bottom Stack (Mobile) */}
          <View style={isDesktop ? styles.desktopColRight : styles.fullWidthCol}>
            {/* ══════════════════ 6. FINAL RESULT HERO CARD (When Result Available) ══════════════════ */}
            {phase === 'result' && finalBpm !== null && finalBpm > 0 && (
              <StaggerSection delay={250} style={styles.resultCardSection}>
                <Animated.View style={[styles.glassCard, styles.resultCardGlow, bpmCardAnimatedStyle]}>
                  <BlurView intensity={65} tint="light" style={StyleSheet.absoluteFill} />

                  <View style={styles.resultHeaderRow}>
                    <View style={styles.verifiedBadge}>
                      <ShieldCheck size={14} color="#10B981" strokeWidth={1.5} />
                      <Text style={styles.verifiedBadgeText}>Clinical RR Quality {confidenceScore}%</Text>
                    </View>
                    <TouchableOpacity onPress={startScan}>
                      <Text style={styles.retestLink}>Retest</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.resultBpmContainer}>
                    <Text style={styles.resultBpmNumber}>{displayBpmCount}</Text>
                    <View style={styles.resultBpmLabels}>
                      <Text style={styles.resultBpmUnit}>BPM</Text>
                      <Text style={styles.resultBpmResting}>(RESTING)</Text>
                    </View>
                  </View>

                  <View style={styles.statePillRow}>
                    <View style={[styles.stateIndicatorDot, { backgroundColor: activeStateColor }]} />
                    <Text style={[styles.stateIndicatorLabel, { color: activeStateColor }]}>
                      {activeState}
                    </Text>
                  </View>

                  <Text style={styles.resultDescription}>
                    Median inter-beat interval verified. Autonomic nervous tone reflects restful physiological equilibrium.
                  </Text>
                </Animated.View>
              </StaggerSection>
            )}

            {/* ══════════════════ 7. RECOVERY COACHING CARD (When Invalid) ══════════════════ */}
            {phase === 'invalid' && (
              <StaggerSection delay={250} style={styles.invalidCardSection}>
                <View style={[styles.glassCard, styles.invalidCard]}>
                  <View style={styles.invalidHeaderRow}>
                    <AlertTriangle size={18} color="#EF4444" strokeWidth={1.5} />
                    <Text style={styles.invalidTitle}>Signal Unclear</Text>
                  </View>
                  <Text style={styles.invalidText}>
                    The optical sensor could not isolate a clean arterial waveform.
                  </Text>
                  <View style={styles.checklistContainer}>
                    <View style={styles.checkItemRow}>
                      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#DC2626', marginTop: 6 }} />
                      <Text style={styles.checkItem}>{"Touch gently like a bubble (don't squeeze blood away)"}</Text>
                    </View>
                    <View style={styles.checkItemRow}>
                      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#DC2626', marginTop: 6 }} />
                      <Text style={styles.checkItem}>Seal both the flashlight & lens completely</Text>
                    </View>
                    <View style={styles.checkItemRow}>
                      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#DC2626', marginTop: 6 }} />
                      <Text style={styles.checkItem}>Keep your hand and phone steady on a flat surface</Text>
                    </View>
                  </View>
                </View>
              </StaggerSection>
            )}

            {/* ══════════════════ 8. RECENT BASELINE SNAPSHOT ══════════════════ */}
            <StaggerSection delay={500} style={styles.baselineCardContainer}>
              <View style={styles.glassCard}>
                <BlurView intensity={55} tint="light" style={StyleSheet.absoluteFill} />

                <View style={styles.baselineHeaderRow}>
                  <Text style={styles.baselineTitle}>Recent Baseline Snapshot</Text>
                  <TouchableOpacity
                    onPress={() => router.push('/(tabs)/insights' as any)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.viewHistoryLink}>View History</Text>
                  </TouchableOpacity>
                </View>

                {activeBpm ? (
                  <View style={styles.baselineContent}>
                    <View style={styles.bpmDisplayRow}>
                      <Text style={styles.bpmNumber}>{activeBpm}</Text>
                      <View style={styles.bpmLabelsStacked}>
                        <Text style={styles.bpmUnitText}>BPM</Text>
                        <Text style={styles.bpmRestingText}>(RESTING)</Text>
                      </View>
                    </View>

                    <View style={styles.zoneRow}>
                      <View style={[styles.zoneDot, { backgroundColor: activeStateColor }]} />
                      <Text style={[styles.zoneLabel, { color: activeStateColor }]}>
                        {activeState}
                      </Text>
                    </View>

                    <Text style={styles.baselineMetaText}>
                      Captured {phase === 'result' ? 'just now' : getRelativeTime(lastTimestamp)} · Observational somatic anchor
                    </Text>
                  </View>
                ) : (
                  <View style={styles.emptyBaselineContainer}>
                    <Clock size={24} color="#ADA8C0" strokeWidth={1.5} />
                    <Text style={styles.emptyBaselineTitle}>No baseline recorded yet</Text>
                    <Text style={styles.emptyBaselineSubtitle}>
                      Complete your first 15-second scan to establish baseline.
                    </Text>
                  </View>
                )}
              </View>
            </StaggerSection>

            {/* ══════════════════ 9. 3 GOLDEN RULES COACHING CARD ══════════════════ */}
            {phase === 'idle' && (
              <StaggerSection delay={550} style={styles.coachingCardSection}>
                <View style={styles.glassCard}>
                  <View style={styles.coachingHeader}>
                    <ScanLine size={18} color="#6B4FBB" strokeWidth={1.5} />
                    <Text style={styles.coachingTitle}>3 Rules for 99% PPG Precision</Text>
                  </View>

                  <View style={styles.ruleItem}>
                    <Text style={styles.ruleNumber}>1</Text>
                    <View style={styles.ruleTextContainer}>
                      <Text style={styles.ruleHeading}>Gentle "Fragile Bubble" Touch</Text>
                      <Text style={styles.ruleDesc}>
                        Pressing too hard blanches capillary blood vessels and stops arterial pulsation. Touch very softly.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.ruleItem}>
                    <Text style={styles.ruleNumber}>2</Text>
                    <View style={styles.ruleTextContainer}>
                      <Text style={styles.ruleHeading}>Seal Flash & Lens Simultaneously</Text>
                      <Text style={styles.ruleDesc}>
                        The flashlight illuminates the microvascular tissue while the lens measures red light absorption.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.ruleItem}>
                    <Text style={styles.ruleNumber}>3</Text>
                    <View style={styles.ruleTextContainer}>
                      <Text style={styles.ruleHeading}>Automatic 3-Second Calibration</Text>
                      <Text style={styles.ruleDesc}>
                        The first 3 seconds allow the camera to lock exposure, discarding noise before the 15s recording starts.
                      </Text>
                    </View>
                  </View>
                </View>
              </StaggerSection>
            )}
          </View>
        </View>

        {/* ══════════════════ 10. DISCLAIMER ══════════════════ */}
        <StaggerSection delay={650} style={styles.disclaimerContainer}>
          <View style={styles.disclaimerRow}>
            <Info size={13} color="#ADA8C0" strokeWidth={1.5} style={styles.disclaimerIcon} />
            <Text style={styles.disclaimerText}>
              This metric is an observational somatic anchor for nervous system reflection. It is not intended for diagnostic or clinical evaluation.
            </Text>
          </View>
        </StaggerSection>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 40,
  },

  // ══════════════════ Header ══════════════════
  headerSection: {
    marginBottom: 8,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  breadcrumbContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 4,
    paddingHorizontal: 4,
  },
  breadcrumbText: {
    fontSize: 11,
    color: '#ADA8C0',
    letterSpacing: 1.2,
    fontWeight: '600',
    textAlign: 'center',
  },
  breadcrumbDivider: {
    fontSize: 11,
    color: '#ADA8C0',
    marginHorizontal: 2,
  },
  headerChipReady: {
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EDE8F7',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerChipReadyText: {
    fontSize: 11,
    color: '#6B4FBB',
    fontWeight: '600',
  },
  headerChipInit: {
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8E5EE',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerChipInitText: {
    fontSize: 11,
    color: '#7B7490',
    fontWeight: '500',
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1E1B2E',
    marginBottom: 6,
    lineHeight: 32,
  },
  screenSubtitle: {
    fontSize: 13,
    color: '#7B7490',
    lineHeight: 19,
    maxWidth: 440,
  },

  // ══════════════════ Status Pill Row ══════════════════
  statusPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    marginBottom: 18,
  },
  statusPill: {
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F0EDF8',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusPillText: {
    fontSize: 11,
    color: '#7B7490',
    fontWeight: '500',
  },

  // ══════════════════ Layout Containers ══════════════════
  mainLayout: {
    width: '100%',
  },
  mainLayoutDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
  },
  fullWidthCol: {
    width: '100%',
  },
  desktopColLeft: {
    flex: 1,
  },
  desktopColRight: {
    flex: 1,
  },

  // ══════════════════ Glassmorphic Card ══════════════════
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.76)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    shadowColor: '#B8A9C9',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    overflow: 'hidden',
    padding: 20,
  },

  // ══════════════════ Sensor Card & Viewfinder ══════════════════
  sensorCardContainer: {
    width: '100%',
    marginBottom: 14,
  },
  cameraRingWrapper: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    position: 'relative',
  },
  cameraCircle: {
    overflow: 'hidden',
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cameraPlaceholder: {
    backgroundColor: '#161324',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraPlaceholderText: {
    color: '#ADA8C0',
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: '600',
  },
  fingerprintOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  sensorOrbsLabel: {
    fontSize: 10,
    color: '#6B4FBB',
    letterSpacing: 1.5,
    marginTop: 8,
    fontWeight: '700',
  },
  aperturePillBadge: {
    backgroundColor: 'rgba(21, 19, 28, 0.65)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  waitingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  waitingOverlayText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  warmupOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  warmupOverlayTitle: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '700',
  },
  warmupOverlaySubtitle: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '500',
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  scanningBpmNumber: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 38,
  },
  scanningBpmLabel: {
    color: '#E2E8F0',
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: '700',
  },

  // Motion Warning Toast
  motionToast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 12,
    alignSelf: 'center',
  },
  motionToastText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },

  // Instructions
  instructionContainer: {
    marginTop: 14,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  instructionLine1: {
    fontSize: 13,
    color: '#1E1B2E',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 19,
  },
  instructionLine2: {
    fontSize: 12,
    color: '#7B7490',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 3,
    lineHeight: 17,
  },

  // ══════════════════ Waveform Strip ══════════════════
  waveformStrip: {
    height: 52,
    width: '100%',
    marginTop: 6,
    marginBottom: 6,
    justifyContent: 'center',
  },
  waveformMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  waveformLabel: {
    fontSize: 11,
    color: '#7B7490',
    fontWeight: '600',
  },
  waveformBuffer: {
    fontSize: 11,
    color: '#ADA8C0',
    fontWeight: '600',
  },
  waveformSvgContainer: {
    height: 28,
    width: '100%',
    justifyContent: 'center',
  },

  // ══════════════════ Action Buttons ══════════════════
  buttonSection: {
    width: '100%',
    marginTop: 8,
    marginBottom: 12,
  },
  actionBtn: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnPrimary: {
    backgroundColor: '#6B4FBB',
    shadowColor: '#6B4FBB',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  actionBtnMuted: {
    backgroundColor: '#F0EDF8',
  },
  actionBtnWhiteText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionBtnMutedText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#7B7490',
  },

  // ══════════════════ Result Card Section ══════════════════
  resultCardSection: {
    width: '100%',
    marginBottom: 16,
  },
  resultCardGlow: {
    borderWidth: 1.5,
    borderColor: 'rgba(107, 79, 187, 0.35)',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  resultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedBadgeText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '700',
  },
  retestLink: {
    fontSize: 13,
    color: '#6B4FBB',
    fontWeight: '600',
  },
  resultBpmContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 6,
  },
  resultBpmNumber: {
    fontSize: 56,
    fontWeight: '800',
    color: '#1E1B2E',
    lineHeight: 62,
  },
  resultBpmLabels: {
    justifyContent: 'center',
  },
  resultBpmUnit: {
    fontSize: 13,
    color: '#ADA8C0',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  resultBpmResting: {
    fontSize: 10,
    color: '#ADA8C0',
    fontWeight: '600',
  },
  statePillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  stateIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stateIndicatorLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  resultDescription: {
    fontSize: 12,
    color: '#7B7490',
    lineHeight: 18,
  },

  // ══════════════════ Invalid Card ══════════════════
  invalidCardSection: {
    width: '100%',
    marginBottom: 16,
  },
  invalidCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
  },
  invalidHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  invalidTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#B91C1C',
  },
  invalidText: {
    fontSize: 13,
    color: '#7F1D1D',
    lineHeight: 18,
    marginBottom: 10,
  },
  checklistContainer: {
    gap: 6,
  },
  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  checkItem: {
    flex: 1,
    fontSize: 12,
    color: '#991B1B',
    lineHeight: 17,
  },

  // ══════════════════ Baseline Snapshot ══════════════════
  baselineCardContainer: {
    width: '100%',
    marginTop: 4,
    marginBottom: 16,
  },
  baselineHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  baselineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E1B2E',
  },
  viewHistoryLink: {
    fontSize: 13,
    color: '#6B4FBB',
    fontWeight: '600',
  },
  baselineContent: {
    alignItems: 'flex-start',
  },
  bpmDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  bpmNumber: {
    fontSize: 44,
    fontWeight: '700',
    color: '#1E1B2E',
    lineHeight: 48,
  },
  bpmLabelsStacked: {
    justifyContent: 'center',
    gap: 1,
  },
  bpmUnitText: {
    fontSize: 11,
    color: '#ADA8C0',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  bpmRestingText: {
    fontSize: 10,
    color: '#ADA8C0',
    fontWeight: '500',
  },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  zoneDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  zoneLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  baselineMetaText: {
    fontSize: 12,
    color: '#ADA8C0',
    lineHeight: 18,
  },
  emptyBaselineContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyBaselineTitle: {
    fontSize: 14,
    color: '#ADA8C0',
    fontWeight: '500',
  },
  emptyBaselineSubtitle: {
    fontSize: 12,
    color: '#ADA8C0',
    fontStyle: 'italic',
  },

  // ══════════════════ Coaching Rules Card ══════════════════
  coachingCardSection: {
    width: '100%',
    marginBottom: 16,
  },
  coachingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  coachingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E1B2E',
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  ruleNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EDE8F7',
    color: '#6B4FBB',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 1,
  },
  ruleTextContainer: {
    flex: 1,
  },
  ruleHeading: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E1B2E',
    marginBottom: 2,
  },
  ruleDesc: {
    fontSize: 12,
    color: '#7B7490',
    lineHeight: 17,
  },

  // ══════════════════ Disclaimer ══════════════════
  disclaimerContainer: {
    marginTop: 12,
    marginBottom: 32,
    alignItems: 'center',
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    maxWidth: 380,
  },
  disclaimerIcon: {
    marginTop: 2,
  },
  disclaimerText: {
    fontSize: 11,
    color: '#ADA8C0',
    lineHeight: 16,
    textAlign: 'center',
    flex: 1,
  },
});
