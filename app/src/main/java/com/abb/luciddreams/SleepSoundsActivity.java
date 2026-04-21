package com.abb.luciddreams;

import android.animation.ObjectAnimator;
import android.animation.PropertyValuesHolder;
import android.animation.ValueAnimator;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioTrack;
import android.os.Bundle;
import android.os.CountDownTimer;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.widget.SeekBar;
import android.widget.TextView;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.google.android.material.button.MaterialButton;
import com.google.android.material.card.MaterialCardView;

import java.util.Random;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

public class SleepSoundsActivity extends AppCompatActivity {

    // ── Sound types ────────────────────────────────────────────────────────────
    private static final int SOUND_RAIN       = 0;
    private static final int SOUND_OCEAN      = 1;
    private static final int SOUND_FOREST     = 2;
    private static final int SOUND_WHITE_NOISE = 3;

    // ── State ─────────────────────────────────────────────────────────────────
    private int  selectedSound = -1;   // -1 = none
    private boolean isPlaying  = false;
    private float   volume     = 0.7f;

    // ── AudioTrack synthesis ──────────────────────────────────────────────────
    private static final int SAMPLE_RATE = 22050;
    private AudioTrack audioTrack;
    private ExecutorService audioExecutor;
    private Future<?>  audioFuture;
    private volatile boolean audioRunning = false;

    // ── Sleep timer (15 min) ─────────────────────────────────────────────────
    private static final long SLEEP_TIMER_MS = 15 * 60 * 1000L;
    private CountDownTimer sleepTimer;
    private TextView tvSleepTimer;
    private boolean sleepTimerActive = false;

    // ── Views ─────────────────────────────────────────────────────────────────
    private View soundAnimParticle;
    private MaterialCardView cardRain, cardOcean, cardForest, cardWhiteNoise;
    private MaterialButton btnPlay, btnSleepTimer;
    private SeekBar seekVolume;
    private TextView tvNowPlaying;

    // ── Pulse animation ────────────────────────────────────────────────────────
    private ObjectAnimator pulseAnim;
    private Handler mainHandler = new Handler(Looper.getMainLooper());

    private SharedPreferences prefs;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_sleep_sounds);

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.simple_root), (v, insets) -> {
            Insets sys = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(sys.left, sys.top, sys.right, sys.bottom);
            return insets;
        });

        prefs = getSharedPreferences("sleep_sounds_prefs", MODE_PRIVATE);
        selectedSound = prefs.getInt("last_sound", -1);
        volume = prefs.getFloat("volume", 0.7f);

        audioExecutor = Executors.newSingleThreadExecutor();

        bindViews();
        wireListeners();
        applyVolumeUi(volume);
        if (selectedSound >= 0) highlightCard(selectedSound);
        updatePlayButton();
        updateNowPlaying();
    }

    @Override
    protected void onStop() {
        super.onStop();
        stopAudio();
        stopSleepTimer();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        stopAudio();
        stopSleepTimer();
        audioExecutor.shutdownNow();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  View binding
    // ─────────────────────────────────────────────────────────────────────────

    private void bindViews() {
        soundAnimParticle = findViewById(R.id.soundAnimParticle);
        cardRain          = findViewById(R.id.cardRain);
        cardOcean         = findViewById(R.id.cardOcean);
        cardForest        = findViewById(R.id.cardForest);
        cardWhiteNoise    = findViewById(R.id.cardWhiteNoise);
        btnPlay           = findViewById(R.id.btnPlay);
        btnSleepTimer     = findViewById(R.id.btnSleepTimer);
        seekVolume        = findViewById(R.id.seekVolume);
        tvNowPlaying      = findViewById(R.id.tvNowPlaying);
        tvSleepTimer      = findViewById(R.id.tvSleepTimer);

        View back = findViewById(R.id.simple_back);
        if (back != null) back.setOnClickListener(v -> finish());
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Listeners
    // ─────────────────────────────────────────────────────────────────────────

    private void wireListeners() {
        if (cardRain       != null) cardRain.setOnClickListener(v -> selectSound(SOUND_RAIN));
        if (cardOcean      != null) cardOcean.setOnClickListener(v -> selectSound(SOUND_OCEAN));
        if (cardForest     != null) cardForest.setOnClickListener(v -> selectSound(SOUND_FOREST));
        if (cardWhiteNoise != null) cardWhiteNoise.setOnClickListener(v -> selectSound(SOUND_WHITE_NOISE));

        if (btnPlay != null) btnPlay.setOnClickListener(v -> {
            if (selectedSound < 0) return;
            if (isPlaying) {
                stopAudio();
                stopSleepTimer();
            } else {
                startAudio(selectedSound);
            }
        });

        if (btnSleepTimer != null) btnSleepTimer.setOnClickListener(v -> {
            if (sleepTimerActive) stopSleepTimer();
            else startSleepTimer();
        });

        if (seekVolume != null) {
            seekVolume.setMax(100);
            seekVolume.setProgress((int)(volume * 100));
            seekVolume.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
                @Override public void onProgressChanged(SeekBar sb, int p, boolean user) {
                    volume = p / 100f;
                    applyVolumeToTrack();
                    prefs.edit().putFloat("volume", volume).apply();
                }
                @Override public void onStartTrackingTouch(SeekBar sb) {}
                @Override public void onStopTrackingTouch(SeekBar sb) {}
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Sound card selection
    // ─────────────────────────────────────────────────────────────────────────

    private void selectSound(int sound) {
        boolean wasPlaying = isPlaying;
        if (wasPlaying) stopAudio();

        selectedSound = sound;
        prefs.edit().putInt("last_sound", sound).apply();
        highlightCard(sound);
        updateNowPlaying();

        if (wasPlaying || !isPlaying) {
            startAudio(sound);
        }
        updatePlayButton();
    }

    private void highlightCard(int sound) {
        int activeStroke  = 0xFF39C6FF;
        int activeBg      = 0xFF1A2F55;
        int inactiveStroke= 0x1AFFFFFF;
        int inactiveBg    = 0x1AFFFFFF;

        setCardStyle(cardRain,       sound == SOUND_RAIN,         activeStroke, activeBg, inactiveStroke, inactiveBg);
        setCardStyle(cardOcean,      sound == SOUND_OCEAN,        activeStroke, activeBg, inactiveStroke, inactiveBg);
        setCardStyle(cardForest,     sound == SOUND_FOREST,       activeStroke, activeBg, inactiveStroke, inactiveBg);
        setCardStyle(cardWhiteNoise, sound == SOUND_WHITE_NOISE,  activeStroke, activeBg, inactiveStroke, inactiveBg);
    }

    private void setCardStyle(MaterialCardView card, boolean selected,
                               int activeStroke, int activeBg,
                               int inactiveStroke, int inactiveBg) {
        if (card == null) return;
        card.setStrokeColor(selected ? activeStroke : inactiveStroke);
        card.setCardBackgroundColor(selected ? activeBg : inactiveBg);
        card.animate()
                .scaleX(selected ? 1.03f : 1f)
                .scaleY(selected ? 1.03f : 1f)
                .setDuration(200)
                .start();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Audio playback via AudioTrack synthesis
    // ─────────────────────────────────────────────────────────────────────────

    private void startAudio(int sound) {
        stopAudio();
        isPlaying = true;
        audioRunning = true;
        updatePlayButton();
        startPulseAnim();

        audioFuture = audioExecutor.submit(() -> {
            try {
                int bufSize = AudioTrack.getMinBufferSize(SAMPLE_RATE,
                        AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT);
                bufSize = Math.max(bufSize, SAMPLE_RATE / 4); // at least 0.25s

                AudioAttributes attrs = new AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .build();
                AudioFormat fmt = new AudioFormat.Builder()
                        .setSampleRate(SAMPLE_RATE)
                        .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .build();

                audioTrack = new AudioTrack(attrs, fmt, bufSize,
                        AudioTrack.MODE_STREAM, AudioManager.AUDIO_SESSION_ID_GENERATE);
                audioTrack.play();

                short[] buffer = new short[bufSize];
                Random  rng    = new Random();

                while (audioRunning && !Thread.currentThread().isInterrupted()) {
                    generateSamples(sound, buffer, rng);
                    // apply volume
                    applyGain(buffer, volume);
                    if (audioRunning) audioTrack.write(buffer, 0, buffer.length);
                }
            } catch (Exception ignored) {
            } finally {
                if (audioTrack != null) {
                    try { audioTrack.stop(); } catch (Exception ignored) {}
                    try { audioTrack.release(); } catch (Exception ignored) {}
                    audioTrack = null;
                }
            }
        });
    }

    private void generateSamples(int sound, short[] buffer, Random rng) {
        switch (sound) {
            case SOUND_RAIN:       generateRain(buffer, rng);       break;
            case SOUND_OCEAN:      generateOcean(buffer, rng);      break;
            case SOUND_FOREST:     generateForest(buffer, rng);     break;
            case SOUND_WHITE_NOISE:generateWhiteNoise(buffer, rng); break;
        }
    }

    // ── White noise ───────────────────────────────────────────────────────────
    private void generateWhiteNoise(short[] buf, Random rng) {
        for (int i = 0; i < buf.length; i++) {
            buf[i] = (short)(rng.nextGaussian() * 8000);
        }
    }

    // ── Rain: pink-ish noise with soft amplitude modulation ──────────────────
    private double rainPrev = 0;
    private void generateRain(short[] buf, Random rng) {
        for (int i = 0; i < buf.length; i++) {
            double white = rng.nextGaussian();
            // one-pole low-pass (simple pink approximation)
            rainPrev = 0.97 * rainPrev + 0.03 * white;
            double sample = rainPrev * 0.5 + white * 0.5;
            buf[i] = (short) Math.max(-32767, Math.min(32767, sample * 9000));
        }
    }

    // ── Ocean: low-frequency sine sweep + noise ───────────────────────────────
    private double oceanPhase = 0;
    private void generateOcean(short[] buf, Random rng) {
        double waveFreq = 0.08; // ~0.08 Hz swell
        for (int i = 0; i < buf.length; i++) {
            oceanPhase += 2 * Math.PI * waveFreq / SAMPLE_RATE;
            double swell = 0.5 + 0.5 * Math.sin(oceanPhase);
            double noise = rng.nextGaussian();
            double sample = noise * swell;
            buf[i] = (short) Math.max(-32767, Math.min(32767, sample * 11000));
        }
    }

    // ── Forest: band-pass noise (mid frequencies like wind / leaves) ──────────
    private double forestPrev1 = 0, forestPrev2 = 0;
    private void generateForest(short[] buf, Random rng) {
        for (int i = 0; i < buf.length; i++) {
            double white = rng.nextGaussian();
            forestPrev1 = 0.94 * forestPrev1 + 0.06 * white;
            forestPrev2 = 0.90 * forestPrev2 + 0.10 * white;
            double sample = forestPrev2 - forestPrev1;
            buf[i] = (short) Math.max(-32767, Math.min(32767, sample * 18000));
        }
    }

    private void applyGain(short[] buf, float gain) {
        for (int i = 0; i < buf.length; i++) {
            buf[i] = (short) Math.max(-32767, Math.min(32767, buf[i] * gain));
        }
    }

    private void applyVolumeToTrack() {
        if (audioTrack != null) {
            try { audioTrack.setVolume(volume); } catch (Exception ignored) {}
        }
    }

    private void stopAudio() {
        audioRunning = false;
        if (audioFuture != null) { audioFuture.cancel(true); audioFuture = null; }
        isPlaying = false;
        stopPulseAnim();
        mainHandler.post(() -> {
            updatePlayButton();
            updateNowPlaying();
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Sleep timer (15 min auto-stop)
    // ─────────────────────────────────────────────────────────────────────────

    private void startSleepTimer() {
        stopSleepTimer();
        sleepTimerActive = true;
        if (btnSleepTimer != null) btnSleepTimer.setText("Cancel Timer");
        if (!isPlaying && selectedSound >= 0) startAudio(selectedSound);

        sleepTimer = new CountDownTimer(SLEEP_TIMER_MS, 1000) {
            @Override public void onTick(long left) {
                long m = left / 60000, s = (left % 60000) / 1000;
                if (tvSleepTimer != null)
                    tvSleepTimer.setText(String.format(java.util.Locale.US, "Sleep timer: %02d:%02d", m, s));
            }
            @Override public void onFinish() {
                if (tvSleepTimer != null) tvSleepTimer.setText("Sleep timer finished");
                stopAudio();
                sleepTimerActive = false;
                if (btnSleepTimer != null) btnSleepTimer.setText("15 min sleep timer");
            }
        }.start();
    }

    private void stopSleepTimer() {
        if (sleepTimer != null) { sleepTimer.cancel(); sleepTimer = null; }
        sleepTimerActive = false;
        if (tvSleepTimer != null) tvSleepTimer.setText("");
        if (btnSleepTimer != null) btnSleepTimer.setText("15 min sleep timer");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Pulse animation on the ambient hero panel
    // ─────────────────────────────────────────────────────────────────────────

    private void startPulseAnim() {
        if (soundAnimParticle == null || pulseAnim != null) return;
        pulseAnim = ObjectAnimator.ofPropertyValuesHolder(
                soundAnimParticle,
                PropertyValuesHolder.ofFloat(View.SCALE_X, 0.7f, 1.05f),
                PropertyValuesHolder.ofFloat(View.SCALE_Y, 0.7f, 1.05f),
                PropertyValuesHolder.ofFloat(View.ALPHA,   0.18f, 0.38f)
        );
        pulseAnim.setDuration(3200);
        pulseAnim.setRepeatCount(ValueAnimator.INFINITE);
        pulseAnim.setRepeatMode(ValueAnimator.REVERSE);
        pulseAnim.setInterpolator(new AccelerateDecelerateInterpolator());
        pulseAnim.start();
    }

    private void stopPulseAnim() {
        if (pulseAnim != null) { pulseAnim.cancel(); pulseAnim = null; }
        if (soundAnimParticle != null) {
            soundAnimParticle.setAlpha(0.26f);
            soundAnimParticle.setScaleX(1f);
            soundAnimParticle.setScaleY(1f);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  UI helpers
    // ─────────────────────────────────────────────────────────────────────────

    private void updatePlayButton() {
        if (btnPlay == null) return;
        btnPlay.setText(isPlaying ? "⏸  Pause" : "▶  Play Soundscape");
        btnPlay.setStrokeColor(android.content.res.ColorStateList.valueOf(
                isPlaying ? 0xFF39C6FF : 0xFF39C6FF));
    }

    private void updateNowPlaying() {
        if (tvNowPlaying == null) return;
        if (!isPlaying || selectedSound < 0) {
            tvNowPlaying.setText("Select a sound to begin");
            tvNowPlaying.setCompoundDrawablesWithIntrinsicBounds(0, 0, 0, 0);
        } else {
            String[] names = {"Rain", "Ocean", "Forest", "White Noise"};
            tvNowPlaying.setText("Now playing: " + names[selectedSound]);
            tvNowPlaying.setCompoundDrawablesWithIntrinsicBounds(R.drawable.ic_calm, 0, 0, 0);
            tvNowPlaying.setCompoundDrawablePadding(dpToPx(8));
        }
    }

    private void applyVolumeUi(float v) {
        if (seekVolume != null) seekVolume.setProgress((int)(v * 100));
    }

    private int dpToPx(int dp) {
        return (int)(dp * getResources().getDisplayMetrics().density);
    }
}