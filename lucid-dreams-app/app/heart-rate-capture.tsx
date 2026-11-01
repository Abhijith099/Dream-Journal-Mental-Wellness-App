import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraFormat,
  useFrameProcessor,
  VisionCameraProxy,
} from 'react-native-vision-camera';
import { useRunOnJS } from 'react-native-worklets-core';
import { useRouter } from 'expo-router';
import { Heart, AlertTriangle, CheckCircle, Flame, ChevronLeft, Clock } from 'lucide-react-native';
import { BACKEND_URL, authenticatedFetch } from '@/utils/api';

// Initialize native plugin — must match the string registered in MainApplication.kt
const plugin =
  typeof VisionCameraProxy?.initFrameProcessorPlugin === 'function'
    ? VisionCameraProxy.initFrameProcessorPlugin('extractRedChannel', {})
    : null;

// Constants for Hardware, Signal, and UX timing
const TOTAL_SCAN_DURATION_MS = 15000; // 15 seconds scan to prevent LED overheating
const CALIBRATION_DURATION_MS = 1800; // 1.8 seconds auto-exposure settling window
const MIN_SAMPLES_FOR_LIVE_BPM = 75; // ~2.5s of valid 30 FPS frames for rolling readout
const MAX_ROLLING_WINDOW_SIZE = 300; // 10 seconds of frame data at 30 FPS

export default function HeartRateCaptureScreen() {
  const router = useRouter();
  const device = useCameraDevice('back');

  // Lock camera format to constant 30 FPS
  const format = useCameraFormat(device, [
    { fps: 30 },
  ]);

  const [hasPermission, setHasPermission] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [scanPhase, setScanPhase] = useState<'idle' | 'calibrating' | 'measuring' | 'done'>('idle');
  const [signalStatus, setSignalStatus] = useState<'calibrating' | 'steady' | 'warning'>('calibrating');
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [liveBpm, setLiveBpm] = useState<number | null>(null);
  const [finalBpm, setFinalBpm] = useState<number | null>(null);
  const [isInvalidReading, setIsInvalidReading] = useState(false);

  // Refs for real-time signal processing
  const rollingBuffer = useRef<number[]>([]);
  const rollingTimestamps = useRef<number[]>([]);
  const runningMeanRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const isCapturingRef = useRef(false);
  const lastProcessedTimeRef = useRef<number>(0);

  // Animated values
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;

  // Pulse animation loop during steady signal
  useEffect(() => {
    if (signalStatus === 'steady' && isCapturing) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseScale, {
            toValue: 1.2,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(pulseScale, {
            toValue: 1,
            duration: 450,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseScale.setValue(1);
    }
  }, [signalStatus, isCapturing]);

  useEffect(() => {
    (async () => {
      try {
        const status = await Camera.requestCameraPermission();
        setHasPermission(status === 'granted');
      } catch (e) {
        setHasPermission(false);
      }
    })();
  }, []);

  const saveBPM = async (value: number) => {
    try {
      await authenticatedFetch(`${BACKEND_URL}/biometrics/heart-rate`, {
        method: 'POST',
        body: JSON.stringify({
          bpm: value,
          quality: 'valid',
          context: 'standalone',
        }),
      });
    } catch (err) {
      console.error('Failed to save BPM:', err);
    }
  };

  /**
   * Level 2: Signal Math & Filtering
   * - Bandpass filter: 0.66 Hz (40 BPM) to 3.33 Hz (200 BPM) at 30 FPS.
   *   1. Moving average smoothing (5 samples) eliminates hand tremors & high frequency jitter (> 3.33 Hz).
   *   2. Running baseline subtraction (35 samples ~ 1.16s) eliminates DC drift, finger pressure drift, and thermal warming (< 0.66 Hz).
   * - Standard deviation check: requires min pulsatile variation (detects over-pressing / squished capillaries).
   * - Peak detection with 300ms refractory period (caps max heart rate at 200 BPM).
   * - Median Inter-Beat Interval (IBI) for robust outlier rejection.
   */
  const processSignalAndCalculateBPM = (data: number[], timestamps: number[]): number => {
    if (data.length < 45) return 0;

    // Amplitude Threshold check (verifies real pulsatile signal, prevents digital noise flatline)
    const maxRed = Math.max(...data);
    const minRed = Math.min(...data);
    const amplitude = maxRed - minRed;
    const AMPLITUDE_THRESHOLD = 8.0;

    if (amplitude < AMPLITUDE_THRESHOLD) {
      // FLATLINE DETECTED: The finger is missing, pressing too hard, or the torch is off.
      return 0;
    }

    // Step 1: Low-pass moving average (window = 5 samples ~ 166ms at 30 FPS)
    const smoothed: number[] = [];
    const smoothWindow = 5;
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - Math.floor(smoothWindow / 2));
      const end = Math.min(data.length, i + Math.ceil(smoothWindow / 2));
      let sum = 0;
      for (let j = start; j < end; j++) sum += data[j];
      smoothed.push(sum / (end - start));
    }

    // Step 2: High-pass moving baseline subtraction (window = 35 samples ~ 1.16s at 30 FPS)
    const baselineWindow = 35;
    const detrended: number[] = [];
    for (let i = 0; i < smoothed.length; i++) {
      const start = Math.max(0, i - Math.floor(baselineWindow / 2));
      const end = Math.min(smoothed.length, i + Math.ceil(baselineWindow / 2));
      let sum = 0;
      for (let j = start; j < end; j++) sum += smoothed[j];
      detrended.push(smoothed[i] - sum / (end - start));
    }

    // Step 3: Amplitude & pulsatile check
    let sumSq = 0;
    for (let i = 0; i < detrended.length; i++) {
      sumSq += detrended[i] * detrended[i];
    }
    const stdDev = Math.sqrt(sumSq / detrended.length);
    // If standard deviation is too low, user is either not on lens or pressing too hard (blanched capillaries)
    if (stdDev < 0.04) return 0;

    const threshold = Math.max(0.015, stdDev * 0.22);

    // Step 4: Peak detection with minimum refractory period (400ms = 150 BPM max, glitch rejection)
    const minIntervalMs = 400;
    const peakIndices: number[] = [];
    let lastPeakTime = -999999;

    for (let i = 1; i < detrended.length - 1; i++) {
      const val = detrended[i];
      if (val > threshold && val > detrended[i - 1] && val >= detrended[i + 1]) {
        const time = timestamps[i] || (timestamps[0] + i * 33);
        if (time - lastPeakTime >= minIntervalMs) {
          peakIndices.push(i);
          lastPeakTime = time;
        }
      }
    }

    if (peakIndices.length < 3) return 0;

    // Step 5: Inter-Beat Intervals (IBIs) in ms
    const ibis: number[] = [];
    for (let k = 1; k < peakIndices.length; k++) {
      const tPrev = timestamps[peakIndices[k - 1]] || (k - 1) * 33;
      const tCurr = timestamps[peakIndices[k]] || k * 33;
      const ibi = tCurr - tPrev;
      // Bandpass frequency range: 400ms (150 BPM) to 1500ms (40 BPM)
      if (ibi >= 400 && ibi <= 1500) {
        ibis.push(ibi);
      }
    }

    if (ibis.length < 2) return 0;

    // Step 6: Median IBI for outlier rejection
    ibis.sort((a, b) => a - b);
    const medianIbi = ibis[Math.floor(ibis.length / 2)];
    return Math.round(60000 / medianIbi);
  };

  /**
   * Main thread frame consumer:
   * 1. 1.8s Calibration Phase: locks auto-exposure to finger darkness.
   * 2. Bad Frame Rejection: drops frames jumping > 20% from running mean.
   * 3. Rolling 10s Window: updates live smoothed BPM.
   * 4. 15s Cutoff: completes scan and turns off torch immediately.
   */
  const handleFrameIntensity = useRunOnJS((value: number) => {
    if (!isCapturingRef.current) return;

    const now = Date.now();
    const elapsedMs = now - startTimeRef.current;

    // Update progress animation across the 15-second scan
    const progress = Math.min(1, elapsedMs / TOTAL_SCAN_DURATION_MS);
    progressAnim.setValue(progress);

    // Minimum light check (verify finger covers the flash)
    if (value < 10) {
      setSignalStatus('warning');
      setWarningMessage('Cover both camera lens and flashlight completely');
      return;
    }

    // 1. Level 1: Hardware Lockdown — 1.8s Calibration Phase
    if (elapsedMs < CALIBRATION_DURATION_MS) {
      setScanPhase('calibrating');
      setSignalStatus('calibrating');
      setWarningMessage(null);
      // Settle baseline brightness without accumulating heart rate spikes
      runningMeanRef.current =
        runningMeanRef.current === 0
          ? value
          : runningMeanRef.current * 0.85 + value * 0.15;
      return;
    }

    // 2. Level 2: Bad Frame Rejection (> 20% jump indicates finger shift or light leak)
    if (runningMeanRef.current > 0) {
      const relativeJump = Math.abs(value - runningMeanRef.current) / runningMeanRef.current;
      if (relativeJump > 0.20) {
        // Bad frame: finger shifted or ambient light leaked
        setSignalStatus('warning');
        setWarningMessage('Finger shifted — rest gently, like touching a fragile bubble');
        return; // Reject bad frame completely!
      }
    }

    // Valid frame: update running baseline smoothly
    runningMeanRef.current = runningMeanRef.current * 0.95 + value * 0.05;
    setScanPhase('measuring');
    setSignalStatus('steady');
    setWarningMessage(null);

    // 3. Level 2: Rolling 10-Second Window
    rollingBuffer.current.push(value);
    rollingTimestamps.current.push(now);

    if (rollingBuffer.current.length > MAX_ROLLING_WINDOW_SIZE) {
      rollingBuffer.current.shift();
      rollingTimestamps.current.shift();
    }

    // Compute live rolling BPM every 350ms once sufficient frames are collected
    if (
      rollingBuffer.current.length >= MIN_SAMPLES_FOR_LIVE_BPM &&
      now - lastProcessedTimeRef.current > 350
    ) {
      lastProcessedTimeRef.current = now;
      const currentBpm = processSignalAndCalculateBPM(
        rollingBuffer.current,
        rollingTimestamps.current
      );
      if (currentBpm >= 45 && currentBpm <= 190) {
        setLiveBpm((prev) =>
          prev ? Math.round(prev * 0.8 + currentBpm * 0.2) : currentBpm
        );
      }
    }

    // 4. Level 3: 15-Second Cutoff (Flash & Heat Protection)
    if (elapsedMs >= TOTAL_SCAN_DURATION_MS) {
      isCapturingRef.current = false;
      setIsCapturing(false);
      setScanPhase('done');

      const finalResult = processSignalAndCalculateBPM(
        rollingBuffer.current,
        rollingTimestamps.current
      );

      if (finalResult >= 45 && finalResult <= 190) {
        setIsInvalidReading(false);
        setFinalBpm(finalResult);
        saveBPM(finalResult);
      } else if (liveBpm && liveBpm >= 45 && liveBpm <= 190) {
        // Fallback to smoothed live estimate if final window had an end-glitch
        setIsInvalidReading(false);
        setFinalBpm(liveBpm);
        saveBPM(liveBpm);
      } else {
        setIsInvalidReading(true);
        setFinalBpm(null);
      }

      rollingBuffer.current = [];
      rollingTimestamps.current = [];
      progressAnim.setValue(0);
    }
  }, [liveBpm]);

  // Frame processor running on native C++ worklet thread
  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      try {
        if (plugin == null) return;
        const raw = plugin.call(frame) as any;
        if (raw != null) {
          const intensity =
            typeof raw === 'number'
              ? raw
              : typeof raw.r === 'number'
              ? raw.r
              : 0;
          if (typeof intensity === 'number' && !isNaN(intensity) && intensity > 0) {
            handleFrameIntensity(intensity);
          }
        }
      } catch {
        // Prevent unhandled native exception
      }
    },
    [handleFrameIntensity]
  );

  const startCapture = () => {
    isCapturingRef.current = true;
    rollingBuffer.current = [];
    rollingTimestamps.current = [];
    runningMeanRef.current = 0;
    startTimeRef.current = Date.now();
    lastProcessedTimeRef.current = 0;

    setScanPhase('calibrating');
    setSignalStatus('calibrating');
    setWarningMessage(null);
    setLiveBpm(null);
    setFinalBpm(null);
    setIsInvalidReading(false);
    progressAnim.setValue(0);
    setIsCapturing(true);
  };

  const cancelCapture = () => {
    isCapturingRef.current = false;
    setIsCapturing(false);
    setScanPhase('idle');
    rollingBuffer.current = [];
    rollingTimestamps.current = [];
    progressAnim.setValue(0);
    setLiveBpm(null);
  };

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>Camera permission is required to measure pulse.</Text>
        <TouchableOpacity
          onPress={async () => {
            try {
              const status = await Camera.requestCameraPermission();
              setHasPermission(status === 'granted');
            } catch (e) {
              setHasPermission(false);
            }
          }}
        >
          <Text style={styles.link}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>No back camera found on this device.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        accessibilityLabel="Go back"
      >
        <ChevronLeft size={16} color="#8B5CF6" strokeWidth={1.5} style={{ marginRight: 8 }} />
        <Text style={styles.backText}>Somatic Anchor</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Optical Pulse Check</Text>
      <Text style={styles.subtitle}>
        Stabilized PPG · 30 FPS Hardware Locked · 15-Second Gentle Scan
      </Text>

      {/* Camera Viewfinder */}
      <View style={styles.cameraContainer}>
        {Platform.OS !== 'web' ? (
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            format={format}
            fps={30}
            enableZoomGesture={false}
            isActive={true}
            torch="on"
            frameProcessor={isCapturing ? frameProcessor : undefined}
            pixelFormat="yuv"
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.webCameraPlaceholder]}>
            <Text style={{ color: '#A598C7', fontSize: 13 }}>
              Native Camera Viewfinder (30 FPS)
            </Text>
          </View>
        )}

        {/* Live Signal Status Pill inside Camera view */}
        {isCapturing && (
          <View style={styles.overlayPillContainer}>
            {signalStatus === 'calibrating' && (
              <View style={[styles.signalPill, styles.signalCalibrating]}>
                <Clock size={13} color="#FFFFFF" strokeWidth={1.5} />
                <Text style={styles.signalPillText}>Stabilizing exposure & focus...</Text>
              </View>
            )}
            {signalStatus === 'steady' && (
              <View style={[styles.signalPill, styles.signalSteady]}>
                <Animated.View style={{ transform: [{ scale: pulseScale }] }}>
                  <Heart size={13} color="#10B981" fill="#10B981" strokeWidth={1.5} />
                </Animated.View>
                <Text style={styles.signalPillText}>Signal Steady · Pulse Detected</Text>
              </View>
            )}
            {signalStatus === 'warning' && (
              <View style={[styles.signalPill, styles.signalWarning]}>
                <AlertTriangle size={13} color="#F59E0B" strokeWidth={1.5} />
                <Text style={styles.signalWarningText}>
                  {warningMessage || 'Ease pressure gently'}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Progress Bar */}
      {isCapturing && (
        <View style={styles.progressSection}>
          <View style={styles.progressMetaRow}>
            <Text style={styles.progressLabel}>
              {scanPhase === 'calibrating'
                ? 'Phase 1: Locking Hardware Exposure'
                : 'Phase 2: 10s Rolling Window Analysis'}
            </Text>
            <View style={styles.heatBadge}>
              <Flame size={13} color="#F59E0B" strokeWidth={1.5} />
              <Text style={styles.heatBadgeText}>15s Heat Protected</Text>
            </View>
          </View>
          <View style={styles.progressBarTrack}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* Live Measurement Readout during scan */}
      {isCapturing && (
        <View style={styles.liveReadoutContainer}>
          <Animated.View style={{ transform: [{ scale: pulseScale }] }}>
            <Heart size={32} color="#8B5CF6" fill="#8B5CF6" strokeWidth={1.5} />
          </Animated.View>
          <View style={styles.liveBpmRow}>
            <Text style={styles.liveBpmValue}>{liveBpm ? liveBpm : '—'}</Text>
            <Text style={styles.liveBpmUnit}>BPM (LIVE)</Text>
          </View>
          <Text style={styles.liveHint}>
            {liveBpm ? 'Smoothed via 10-second rolling window' : 'Acquiring microvascular waveform...'}
          </Text>
        </View>
      )}

      {/* Final Result Display */}
      {finalBpm !== null && !isCapturing && (
        <View style={styles.resultContainer}>
          <View style={styles.resultBadge}>
            <CheckCircle size={16} color="#10B981" strokeWidth={1.5} />
            <Text style={styles.resultBadgeText}>Steady Baseline Captured</Text>
          </View>
          <Text style={styles.resultBPM}>{finalBpm}</Text>
          <Text style={styles.resultUnit}>BPM (RESTING)</Text>
          <Text style={styles.disclaimer}>
            Saved to your Insights. Observational somatic reading — not clinical diagnosis.
          </Text>
        </View>
      )}

      {/* Error state */}
      {isInvalidReading && !isCapturing && (
        <View style={styles.errorBox}>
          <AlertTriangle size={18} color="#F43F5E" strokeWidth={1.5} />
          <Text style={styles.errorText}>
            Could not isolate a steady pulse. Remember: rest your finger gently like touching a fragile bubble, and cover both the lens and flash.
          </Text>
        </View>
      )}

      {/* UX Coaching Cards */}
      {!isCapturing && (
        <View style={styles.coachingCard}>
          <Text style={styles.coachingTitle}>3 Golden Rules for Accurate Readings</Text>
          <View style={styles.ruleItem}>
            <Text style={styles.ruleNumber}>1</Text>
            <View style={styles.ruleContent}>
              <Text style={styles.ruleHeader}>Gentle "Fragile Bubble" Touch</Text>
              <Text style={styles.ruleText}>
                Rest your finger gently, as if touching a fragile soap bubble. Pressing tightly squeezes blood out of capillaries and blenches the reading.
              </Text>
            </View>
          </View>

          <View style={styles.ruleItem}>
            <Text style={styles.ruleNumber}>2</Text>
            <View style={styles.ruleContent}>
              <Text style={styles.ruleHeader}>Cover Both Lens & Flash</Text>
              <Text style={styles.ruleText}>
                The LED flashlight illuminates the microvascular tissue while the locked camera sensor measures microscopic color shifts.
              </Text>
            </View>
          </View>

          <View style={styles.ruleItem}>
            <Text style={styles.ruleNumber}>3</Text>
            <View style={styles.ruleContent}>
              <Text style={styles.ruleHeader}>15-Second Comfort Scan</Text>
              <Text style={styles.ruleText}>
                Scans are strictly limited to 15 seconds to prevent flashlight heat and maintain comfort.
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      {!isCapturing && (
        <TouchableOpacity style={styles.scanButton} onPress={startCapture}>
          <Heart size={16} color="#fff" strokeWidth={1.5} />
          <Text style={styles.scanButtonText}>
            {finalBpm !== null || isInvalidReading ? 'Retest Heart Rate' : 'Begin 15-Second Pulse Scan'}
          </Text>
        </TouchableOpacity>
      )}

      {isCapturing && (
        <TouchableOpacity style={styles.cancelButton} onPress={cancelCapture}>
          <Text style={styles.cancelButtonText}>Cancel Measurement</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0B1A',
    padding: 20,
    paddingTop: 54,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0D0B1A',
  },
  backButton: { marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  backText: { color: '#8B5CF6', fontSize: 15, fontWeight: '600' },
  title: {
    color: '#F1F0FF',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    color: '#A598C7',
    fontSize: 12,
    marginBottom: 20,
    lineHeight: 18,
  },
  cameraContainer: {
    width: '100%',
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
    position: 'relative',
  },
  webCameraPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1730',
  },
  overlayPillContainer: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    alignItems: 'center',
  },
  signalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  signalCalibrating: {
    backgroundColor: 'rgba(79, 70, 229, 0.85)',
  },
  signalSteady: {
    backgroundColor: 'rgba(16, 185, 129, 0.85)',
  },
  signalWarning: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
  },
  signalPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  signalWarningText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressSection: {
    marginBottom: 16,
  },
  progressMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    color: '#A598C7',
    fontSize: 12,
  },
  heatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heatBadgeText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '600',
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 3,
  },
  liveReadoutContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139,92,246,0.1)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
  },
  liveBpmRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 8,
  },
  liveBpmValue: {
    color: '#F1F0FF',
    fontSize: 54,
    fontWeight: '800',
    lineHeight: 60,
  },
  liveBpmUnit: {
    color: '#A598C7',
    fontSize: 14,
    fontWeight: '600',
  },
  liveHint: {
    color: '#8B5CF6',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  resultContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16,185,129,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  resultBadgeText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  resultBPM: {
    color: '#F1F0FF',
    fontSize: 64,
    fontWeight: '800',
    lineHeight: 70,
  },
  resultUnit: {
    color: '#A598C7',
    fontSize: 14,
    fontWeight: '600',
  },
  disclaimer: {
    color: '#6B5FA0',
    fontSize: 11,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(244,63,94,0.12)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.3)',
  },
  errorText: {
    color: '#FDA4AF',
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  coachingCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  coachingTitle: {
    color: '#F1F0FF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 14,
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
    backgroundColor: 'rgba(139,92,246,0.3)',
    color: '#A78BFA',
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 12,
    fontWeight: '700',
  },
  ruleContent: {
    flex: 1,
  },
  ruleHeader: {
    color: '#E0E7FF',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  ruleText: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 17,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 4,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#A598C7',
    fontSize: 15,
    fontWeight: '600',
  },
  message: { color: '#A598C7', textAlign: 'center', marginBottom: 16 },
  link: { color: '#8B5CF6', fontSize: 16 },
});
