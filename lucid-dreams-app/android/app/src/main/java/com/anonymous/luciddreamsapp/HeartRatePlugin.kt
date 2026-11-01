package com.anonymous.luciddreamsapp

import android.media.Image
import com.mrousavy.camera.frameprocessors.Frame
import com.mrousavy.camera.frameprocessors.FrameProcessorPlugin
import com.mrousavy.camera.frameprocessors.VisionCameraProxy
import kotlin.math.roundToInt

class HeartRatePlugin(proxy: VisionCameraProxy? = null, options: Map<String, Any>? = null) : FrameProcessorPlugin() {
    
    // Rolling buffer of recent red channel averages (45 frames ~ 1.5s at 30 FPS)
    private val redBuffer = ArrayList<Double>()
    private val BUFFER_SIZE = 45
    
    // Detrending: 30-frame running DC baseline buffer (removes baseline wandering)
    private val dcBuffer = ArrayList<Double>()
    private val DC_WINDOW_SIZE = 30
    
    // Signal Quality Index: pulse amplitude threshold (digital noise = 1-3, real pulse = 10-30)
    private val AMPLITUDE_THRESHOLD = 8.0

    // Multi-frame AC history for local maxima peak detection
    private data class ACSample(val ac: Double, val timestampMs: Double)
    private val acHistory = ArrayList<ACSample>()

    // RR-Interval Tracking & Physiological Rejection (<400ms glitch, >1500ms signal lost)
    private var lastPeakTimeMs = 0.0
    private val validRRIntervals = ArrayList<Double>()

    override fun callback(frame: Frame, params: Map<String, Any>?): Any? {
        return try {
            val image: Image = frame.image ?: return null
            val planes = image.planes ?: return null
            if (planes.isEmpty()) return null

            val yPlane = planes[0] ?: return null
            val yBuffer = yPlane.buffer ?: return null
            val yLimit = yBuffer.limit()
            val yPixelStride = yPlane.pixelStride
            val yRowStride = yPlane.rowStride

            val uPlane = if (planes.size > 1) planes[1] else null
            val uBuffer = uPlane?.buffer
            val uLimit = uBuffer?.limit() ?: 0
            val uPixelStride = uPlane?.pixelStride ?: 1
            val uRowStride = uPlane?.rowStride ?: 1

            val vPlane = if (planes.size > 2) planes[2] else null
            val vBuffer = vPlane?.buffer
            val vLimit = vBuffer?.limit() ?: 0
            val vPixelStride = vPlane?.pixelStride ?: 1
            val vRowStride = vPlane?.rowStride ?: 1

            // ─────────────────────────────────────────────────────────────
            // STAGE 1: Spatial Averaging (The ROI Crop)
            // Define a 100x100 pixel box centered exactly in the image to
            // eliminate dark edge vignetting and optical lens distortion.
            // ─────────────────────────────────────────────────────────────
            val centerX = image.width / 2
            val centerY = image.height / 2
            val roiRadius = 50 // 100x100 pixel central Region of Interest

            var sumRed = 0.0
            var sumGreen = 0.0
            var sumBlue = 0.0
            var count = 0

            val startY = (centerY - roiRadius).coerceAtLeast(0)
            val endY = (centerY + roiRadius).coerceAtMost(image.height)
            val startX = (centerX - roiRadius).coerceAtLeast(0)
            val endX = (centerX + roiRadius).coerceAtMost(image.width)

            for (y in startY until endY) {
                val yRowOffset = y * yRowStride
                val uvY = y / 2
                val uRowOffset = uvY * uRowStride
                val vRowOffset = uvY * vRowStride

                for (x in startX until endX) {
                    val yIndex = yRowOffset + (x * yPixelStride)
                    if (yIndex in 0 until yLimit) {
                        val yVal = (yBuffer.get(yIndex).toInt() and 0xFF).toDouble()

                        val uvX = x / 2
                        val uIndex = uRowOffset + (uvX * uPixelStride)
                        val vIndex = vRowOffset + (uvX * vPixelStride)

                        val uVal = if (uBuffer != null && uIndex in 0 until uLimit) {
                            (uBuffer.get(uIndex).toInt() and 0xFF).toDouble() - 128.0
                        } else 0.0

                        val vVal = if (vBuffer != null && vIndex in 0 until vLimit) {
                            (vBuffer.get(vIndex).toInt() and 0xFF).toDouble() - 128.0
                        } else 0.0

                        // Rec.601 YUV to RGB color conversion
                        val r = (yVal + 1.402 * vVal).coerceIn(0.0, 255.0)
                        val g = (yVal - 0.344136 * uVal - 0.714136 * vVal).coerceIn(0.0, 255.0)
                        val b = (yVal + 1.772 * uVal).coerceIn(0.0, 255.0)

                        sumRed += r
                        sumGreen += g
                        sumBlue += b
                        count++
                    }
                }
            }

            if (count > 0) {
                val currentRed = sumRed / count
                val currentGreen = sumGreen / count
                val currentBlue = sumBlue / count

                val rawTimestampNs = image.timestamp
                val timestampMs = if (rawTimestampNs > 0) {
                    rawTimestampNs.toDouble() / 1_000_000.0
                } else {
                    System.currentTimeMillis().toDouble()
                }

                // ─────────────────────────────────────────────────────────────
                // STAGE 2: Detrending (DC Removal)
                // Keep a running average of the last 30 frames (the DC baseline).
                // Subtract this baseline from current frame's red value to create
                // a clean AC pulse wave centered exactly around 0.
                // ─────────────────────────────────────────────────────────────
                dcBuffer.add(currentRed)
                if (dcBuffer.size > DC_WINDOW_SIZE) {
                    dcBuffer.removeAt(0)
                }
                val dcBaseline = if (dcBuffer.isNotEmpty()) dcBuffer.average() else currentRed
                val detrendedRed = currentRed - dcBaseline

                // ─────────────────────────────────────────────────────────────
                // STAGE 3: Signal Quality Index (Amplitude Threshold)
                // Check variance between max and min red in recent buffer.
                // Real capillary pulse: 10 to 30 points gap.
                // Digital static / 50Hz flicker: 1 to 3 points gap.
                // If amplitude < 8.0, clear buffers and return 0 (Flatline/Calibrating).
                // ─────────────────────────────────────────────────────────────
                redBuffer.add(currentRed)
                if (redBuffer.size > BUFFER_SIZE) {
                    redBuffer.removeAt(0)
                }

                val maxRed = redBuffer.maxOrNull() ?: 0.0
                val minRed = redBuffer.minOrNull() ?: 0.0
                val amplitude = maxRed - minRed

                val result = HashMap<String, Any>()
                result["timestampMs"] = timestampMs
                result["amplitude"] = amplitude
                result["r"] = currentRed
                result["g"] = currentGreen
                result["b"] = currentBlue
                result["ac"] = detrendedRed

                val isFlatline = redBuffer.size >= 15 && amplitude < AMPLITUDE_THRESHOLD

                if (isFlatline) {
                    // Flatline / Calibrating detected: discard peaks and return 0 BPM
                    acHistory.clear()
                    validRRIntervals.clear()
                    lastPeakTimeMs = 0.0
                    result["bpm"] = 0
                    result["isFlatline"] = true
                    return result
                }

                // ─────────────────────────────────────────────────────────────
                // STAGE 4: RR-Interval Validation (Peak Rejection)
                // Measure exact time between peaks in ms with physiological limits:
                // - < 400ms (> 150 BPM): Glitch/50Hz noise harmonic -> Discard
                // - > 1500ms (< 40 BPM): Signal lost -> Reset tracking
                // - 400ms - 1500ms (40 - 150 BPM): Valid human pulse -> Average
                // ─────────────────────────────────────────────────────────────
                acHistory.add(ACSample(detrendedRed, timestampMs))
                if (acHistory.size > 12) {
                    acHistory.removeAt(0)
                }

                // 5-point local maxima search
                if (acHistory.size >= 5) {
                    val mid = acHistory.size - 2
                    val sample = acHistory[mid]
                    val prev1 = acHistory[mid - 1]
                    val prev2 = acHistory[mid - 2]
                    val next1 = acHistory[mid + 1]

                    // Adaptive peak threshold: must be above 15% of amplitude and at least 0.6
                    val peakThreshold = (amplitude * 0.15).coerceAtLeast(0.6)
                    val isPeak = sample.ac > peakThreshold &&
                                 sample.ac > prev1.ac &&
                                 sample.ac >= next1.ac &&
                                 sample.ac > prev2.ac

                    if (isPeak) {
                        val peakTime = sample.timestampMs
                        if (lastPeakTimeMs > 0.0) {
                            val rrInterval = peakTime - lastPeakTimeMs
                            if (rrInterval < 400.0) {
                                // Glitch: < 400ms corresponds to > 150 BPM. Discard!
                            } else if (rrInterval > 1500.0) {
                                // Signal lost: > 1500ms corresponds to < 40 BPM. Reset window.
                                validRRIntervals.clear()
                                lastPeakTimeMs = peakTime
                            } else {
                                // Valid physiological RR interval
                                validRRIntervals.add(rrInterval)
                                if (validRRIntervals.size > 8) {
                                    validRRIntervals.removeAt(0)
                                }
                                lastPeakTimeMs = peakTime
                            }
                        } else {
                            lastPeakTimeMs = peakTime
                        }
                    }
                }

                // Only average valid RR intervals to output the final BPM
                val calculatedBpm = if (validRRIntervals.size >= 2) {
                    val avgRR = validRRIntervals.average()
                    if (avgRR > 0.0) {
                        val rawBpm = (60000.0 / avgRR).roundToInt()
                        if (rawBpm in 40..150) rawBpm else 0
                    } else 0
                } else {
                    0
                }

                result["bpm"] = calculatedBpm
                result["isFlatline"] = false
                result
            } else {
                null
            }
        } catch (e: Throwable) {
            null
        }
    }
}