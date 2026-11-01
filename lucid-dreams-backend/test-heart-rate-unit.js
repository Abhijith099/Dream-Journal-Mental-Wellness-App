const assert = require('assert');

// 1. Test calculateBpm algorithm
const SAMPLE_RATE_HZ = 30;
const SAMPLE_DURATION_MS = 15000;
const MOVING_AVERAGE_WINDOW = 5;
const MAX_SAMPLES = Math.round((SAMPLE_DURATION_MS / 1000) * SAMPLE_RATE_HZ); // 450

function calculateBpm(samples) {
  if (samples.length < MOVING_AVERAGE_WINDOW + 2) return 0;

  // Step 1: Moving average smoothing
  const smoothed = [];
  for (let i = MOVING_AVERAGE_WINDOW; i < samples.length; i++) {
    const window = samples.slice(i - MOVING_AVERAGE_WINDOW, i);
    smoothed.push(
      window.reduce((a, b) => a + b, 0) / MOVING_AVERAGE_WINDOW
    );
  }

  // Step 2: Mean for threshold
  const mean = smoothed.reduce((a, b) => a + b, 0) / smoothed.length;

  // Step 3: Peak detection
  let peaks = 0;
  for (let i = 1; i < smoothed.length - 1; i++) {
    if (
      smoothed[i] > mean &&
      smoothed[i] > smoothed[i - 1] &&
      smoothed[i] > smoothed[i + 1]
    ) {
      peaks++;
      i++; // skip next to avoid double-counting
    }
  }

  // Step 4: Convert to BPM
  const durationMinutes = SAMPLE_DURATION_MS / 60000; // 0.25 min
  const rawBpm = Math.round(peaks / durationMinutes);

  // Physiological sanity check
  if (rawBpm < 40 || rawBpm > 200) return 0;
  return rawBpm;
}

console.log('--- Testing calculateBpm ---');

// Edge case 1: Too few samples
assert.strictEqual(calculateBpm([]), 0, 'Empty samples should return 0');
assert.strictEqual(calculateBpm([100, 102, 104]), 0, 'Fewer than 7 samples should return 0');
console.log('✔ Edge case: Empty / small sample handling passed');

// Test 2: Normal 72 BPM simulated signal
// 72 BPM = 1.2 Hz. In 15 seconds, that is 18 cycles.
// 18 peaks / 0.25 min = 72 BPM.
const normalSamples = [];
for (let i = 0; i < MAX_SAMPLES; i++) {
  const t = i / SAMPLE_RATE_HZ;
  // Sinusoidal PPG model with DC offset and amplitude
  const val = 150 + 20 * Math.sin(2 * Math.PI * 1.2 * t);
  normalSamples.push(val);
}
const normalBpm = calculateBpm(normalSamples);
console.log(`Normal signal (target 72 BPM): calculated ${normalBpm} BPM`);
assert.ok(normalBpm >= 68 && normalBpm <= 76, `Expected ~72 BPM, got ${normalBpm}`);
console.log('✔ Normal 72 BPM signal detection passed');

// Test 3: Extremely slow signal (e.g. 5 peaks in 15 seconds = 20 BPM -> < 40 clamp to 0)
const slowSamples = [];
for (let i = 0; i < MAX_SAMPLES; i++) {
  const t = i / SAMPLE_RATE_HZ;
  const val = 150 + 20 * Math.sin(2 * Math.PI * 0.33 * t);
  slowSamples.push(val);
}
const slowBpm = calculateBpm(slowSamples);
assert.strictEqual(slowBpm, 0, 'Signal below 40 BPM should return 0');
console.log('✔ Physiological sanity clamp (< 40 BPM -> 0) passed');

// Test 4: Extremely fast signal (e.g. 60 peaks in 15 seconds = 240 BPM -> > 200 clamp to 0)
const fastSamples = [];
for (let i = 0; i < MAX_SAMPLES; i++) {
  const t = i / SAMPLE_RATE_HZ;
  const val = 150 + 20 * Math.sin(2 * Math.PI * 4.0 * t);
  fastSamples.push(val);
}
const fastBpm = calculateBpm(fastSamples);
assert.strictEqual(fastBpm, 0, 'Signal above 200 BPM should return 0');
console.log('✔ Physiological sanity clamp (> 200 BPM -> 0) passed');

// 2. Test Trend Calculation Logic
console.log('\n--- Testing Trend Calculation Logic ---');

function computeTrend(readings) {
  if (readings.length < 10) return 'insufficient_data';
  const recent5 = readings.slice(0, 5);
  const prior5 = readings.slice(5, 10);
  const meanRecent5 = recent5.reduce((a, b) => a + b.bpm, 0) / 5;
  const meanPrior5 = prior5.reduce((a, b) => a + b.bpm, 0) / 5;
  const diff = meanRecent5 - meanPrior5;

  if (diff < -5) return 'improving';
  if (diff > 5) return 'declining';
  return 'stable';
}

// Case A: Fewer than 10 readings
const fewReadings = [{ bpm: 70 }, { bpm: 72 }, { bpm: 68 }];
assert.strictEqual(computeTrend(fewReadings), 'insufficient_data');
console.log('✔ Trend: < 10 readings returns insufficient_data');

// Case B: Improving (recent 5 mean is lower by > 5 BPM, e.g. 65 vs 75)
const improvingReadings = [
  { bpm: 65 }, { bpm: 64 }, { bpm: 66 }, { bpm: 65 }, { bpm: 65 }, // recent 5 = 65
  { bpm: 75 }, { bpm: 74 }, { bpm: 76 }, { bpm: 75 }, { bpm: 75 }, // prior 5 = 75
];
assert.strictEqual(computeTrend(improvingReadings), 'improving');
console.log('✔ Trend: > 5 BPM drop returns improving');

// Case C: Declining (recent 5 mean is higher by > 5 BPM, e.g. 80 vs 72)
const decliningReadings = [
  { bpm: 80 }, { bpm: 80 }, { bpm: 80 }, { bpm: 80 }, { bpm: 80 }, // recent 5 = 80
  { bpm: 72 }, { bpm: 72 }, { bpm: 72 }, { bpm: 72 }, { bpm: 72 }, // prior 5 = 72
];
assert.strictEqual(computeTrend(decliningReadings), 'declining');
console.log('✔ Trend: > 5 BPM rise returns declining');

// Case D: Stable (difference within 5 BPM)
const stableReadings = [
  { bpm: 72 }, { bpm: 73 }, { bpm: 71 }, { bpm: 72 }, { bpm: 72 }, // recent 5 = 72
  { bpm: 74 }, { bpm: 73 }, { bpm: 75 }, { bpm: 74 }, { bpm: 74 }, // prior 5 = 74
];
assert.strictEqual(computeTrend(stableReadings), 'stable');
console.log('✔ Trend: difference within 5 BPM returns stable');

console.log('\nAll unit test assertions passed successfully! 🎉');
