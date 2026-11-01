import { useState, useCallback } from 'react';
import { useFrameProcessor, type Frame } from 'react-native-vision-camera';
import { runOnJS } from 'react-native-reanimated';

// CONSTANTS (exported for testing)
export const SAMPLE_RATE_HZ = 30;        // assumed camera FPS
export const SAMPLE_DURATION_MS = 15000; // 15-second measurement window
export const MOVING_AVERAGE_WINDOW = 5;  // smoothing window size
export const MAX_SAMPLES = Math.round(
  (SAMPLE_DURATION_MS / 1000) * SAMPLE_RATE_HZ
); // = 450 samples

// BPM CALCULATION (pure function, no side effects)
export const calculateBpm = (samples: number[]): number => {
  if (samples.length < 45) return 0;

  // Signal Quality Index (Amplitude Threshold)
  const maxVal = Math.max(...samples);
  const minVal = Math.min(...samples);
  const amplitude = maxVal - minVal;
  const AMPLITUDE_THRESHOLD = 8.0;

  if (amplitude < AMPLITUDE_THRESHOLD) {
    // FLATLINE DETECTED: Missing finger or torch off (< 8.0 units variance)
    return 0;
  }

  // Step 1: Detrending (30-sample running DC baseline removal)
  const detrended: number[] = [];
  const dcWindow = 30;
  for (let i = 0; i < samples.length; i++) {
    const start = Math.max(0, i - dcWindow + 1);
    const window = samples.slice(start, i + 1);
    const mean = window.reduce((a, b) => a + b, 0) / window.length;
    detrended.push(samples[i] - mean);
  }

  // Step 2: Peak detection with minimum 400ms refractory period (at 30 FPS = ~12 frames)
  const minFramesBetweenPeaks = Math.round((400 / 1000) * SAMPLE_RATE_HZ); // 12 frames
  const peakIndices: number[] = [];
  let lastPeakIndex = -999;
  const peakThreshold = Math.max(0.5, amplitude * 0.15);

  for (let i = 2; i < detrended.length - 2; i++) {
    const v = detrended[i];
    if (
      v > peakThreshold &&
      v > detrended[i - 1] &&
      v >= detrended[i + 1] &&
      v > detrended[i - 2] &&
      i - lastPeakIndex >= minFramesBetweenPeaks
    ) {
      peakIndices.push(i);
      lastPeakIndex = i;
    }
  }

  if (peakIndices.length < 3) return 0;

  // Step 3: Compute Inter-Beat Intervals (IBIs) in ms
  const validRRs: number[] = [];
  for (let k = 1; k < peakIndices.length; k++) {
    const frameDelta = peakIndices[k] - peakIndices[k - 1];
    const rrMs = (frameDelta / SAMPLE_RATE_HZ) * 1000;
    // Strict physiological bounds: 400ms (150 BPM) to 1500ms (40 BPM)
    if (rrMs >= 400 && rrMs <= 1500) {
      validRRs.push(rrMs);
    }
  }

  if (validRRs.length < 2) return 0;

  // Step 4: Outlier-resistant median RR interval
  validRRs.sort((a, b) => a - b);
  const medianRR = validRRs[Math.floor(validRRs.length / 2)];
  const bpm = Math.round(60000 / medianRR);

  if (bpm >= 40 && bpm <= 150) return bpm;
  return 0;
};

// RED CHANNEL EXTRACTION (worklet function)
export const extractRedChannel = (frame: Frame): number => {
  'worklet';
  try {
    const buffer = frame.toArrayBuffer();
    const data = new Uint8Array(buffer);
    let redSum = 0;
    let count = 0;
    // Sample every 10th pixel for performance (not every pixel)
    for (let i = 0; i < data.length; i += 40) { // 4 bytes/pixel * 10
      redSum += data[i]; // Red channel (index 0 of RGBA)
      count++;
    }
    return count > 0 ? redSum / count : 0;
  } catch {
    return 0;
  }
};

export function useHeartRate() {
  const [rawSamples, setRawSamples] = useState<number[]>([]);
  const [bpm, setBpm] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // FRAME DATA INGESTION
  const addSample = useCallback((redValue: number) => {
    if (!isCapturing) return;
    setRawSamples(prev => {
      const updated = [...prev, redValue];
      if (updated.length >= MAX_SAMPLES) {
        setIsCapturing(false);
        setBpm(calculateBpm(updated));
        return [];
      }
      return updated;
    });
  }, [isCapturing]);

  // FRAME PROCESSOR
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    const red = extractRedChannel(frame);
    runOnJS(addSample)(red);
  }, [addSample]);

  // PROGRESS (0.0 -> 1.0)
  const progress = Math.min(1.0, rawSamples.length / MAX_SAMPLES);

  // RESET
  const reset = useCallback(() => {
    setRawSamples([]);
    setBpm(null);
    setIsCapturing(false);
  }, []);

  return {
    frameProcessor,
    bpm,              // number | null — null means no result yet
    isCapturing,
    setIsCapturing,
    progress,         // 0.0 → 1.0 — for the countdown ring
    reset,
  };
}

export default useHeartRate;
