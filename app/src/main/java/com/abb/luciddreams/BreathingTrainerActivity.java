package com.abb.luciddreams;

import android.animation.ObjectAnimator;
import android.animation.PropertyValuesHolder;
import android.animation.ValueAnimator;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.CountDownTimer;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.view.animation.DecelerateInterpolator;
import android.widget.TextView;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.google.android.material.button.MaterialButton;

public class BreathingTrainerActivity extends AppCompatActivity {

    // ── Breathing phases ─────────────────────────────────────────────────────
    private static final String PHASE_INHALE = "Inhale";
    private static final String PHASE_HOLD   = "Hold";
    private static final String PHASE_EXHALE = "Exhale";

    private static final long INHALE_MS = 4000L;
    private static final long HOLD_MS   = 4000L;
    private static final long EXHALE_MS = 6000L;

    // ── Duration modes ────────────────────────────────────────────────────────
    private static final long DUR_1  =  1 * 60 * 1000L;
    private static final long DUR_3  =  3 * 60 * 1000L;
    private static final long DUR_5  =  5 * 60 * 1000L;
    private long selectedDuration = DUR_3;

    // ── State ─────────────────────────────────────────────────────────────────
    private enum State { IDLE, RUNNING, PAUSED }
    private State state = State.IDLE;

    // ── Views ─────────────────────────────────────────────────────────────────
    private View           breathCircle;  // the expanding/contracting particle
    private View           breathIcon;
    private TextView       tvBreathPhase, tvBreathCountdown, tvSessionTimer;
    private MaterialButton btnStartBreathing, btnPauseBreath, btnStopBreath;
    private View           phasePanel, controlPanel;
    private MaterialButton btnDur1, btnDur3, btnDur5;

    // ── Timer + breathing loop ─────────────────────────────────────────────────
    private CountDownTimer sessionTimer;
    private long           remainingSession;
    private Handler        breathHandler = new Handler(Looper.getMainLooper());
    private Runnable       breathRunnable;
    private int            currentPhase = 0;   // 0=inhale, 1=hold, 2=exhale
    private long           phaseRemainMs;
    private boolean        phaseRunning = false;

    private SharedPreferences prefs;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_breathing_trainer);

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.simple_root), (v, insets) -> {
            Insets sys = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(sys.left, sys.top, sys.right, sys.bottom);
            return insets;
        });

        prefs = getSharedPreferences("breathing_prefs", MODE_PRIVATE);
        selectedDuration = prefs.getLong("duration", DUR_3);

        bindViews();
        wireListeners();
        applyDurationSelection(selectedDuration);
        setState(State.IDLE);
    }

    @Override
    protected void onStop() {
        super.onStop();
        if (state == State.RUNNING) pauseBreathing();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        stopAll();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Binding
    // ─────────────────────────────────────────────────────────────────────────

    private void bindViews() {
        breathCircle     = findViewById(R.id.breathAnimParticle);
        breathIcon       = findViewById(R.id.breathAnimIcon);
        tvBreathPhase    = findViewById(R.id.tvBreathPhase);
        tvBreathCountdown= findViewById(R.id.tvBreathCountdown);
        tvSessionTimer   = findViewById(R.id.tvBreathSessionTimer);
        btnStartBreathing= findViewById(R.id.btnStartBreathing);
        btnPauseBreath   = findViewById(R.id.btnPauseBreath);
        btnStopBreath    = findViewById(R.id.btnStopBreath);
        controlPanel     = findViewById(R.id.breathControlPanel);
        phasePanel       = findViewById(R.id.breathPhasePanel);
        btnDur1          = findViewById(R.id.btnDur1);
        btnDur3          = findViewById(R.id.btnDur3);
        btnDur5          = findViewById(R.id.btnDur5);

        View back = findViewById(R.id.simple_back);
        if (back != null) back.setOnClickListener(v -> finish());
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Listeners
    // ─────────────────────────────────────────────────────────────────────────

    private void wireListeners() {
        if (btnStartBreathing != null) btnStartBreathing.setOnClickListener(v -> startBreathing());

        if (btnPauseBreath != null) btnPauseBreath.setOnClickListener(v -> {
            if (state == State.RUNNING) pauseBreathing();
            else if (state == State.PAUSED) resumeBreathing();
        });

        if (btnStopBreath != null) btnStopBreath.setOnClickListener(v -> stopAll());

        if (btnDur1 != null) btnDur1.setOnClickListener(v -> {
            applyDurationSelection(DUR_1); prefs.edit().putLong("duration", DUR_1).apply();
        });
        if (btnDur3 != null) btnDur3.setOnClickListener(v -> {
            applyDurationSelection(DUR_3); prefs.edit().putLong("duration", DUR_3).apply();
        });
        if (btnDur5 != null) btnDur5.setOnClickListener(v -> {
            applyDurationSelection(DUR_5); prefs.edit().putLong("duration", DUR_5).apply();
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Duration selection
    // ─────────────────────────────────────────────────────────────────────────

    private void applyDurationSelection(long dur) {
        selectedDuration = dur;
        remainingSession = dur;
        updateSessionTimer(dur);
        setDurHighlight(dur);
    }

    private void setDurHighlight(long dur) {
        safeStroke(btnDur1, dur == DUR_1);
        safeStroke(btnDur3, dur == DUR_3);
        safeStroke(btnDur5, dur == DUR_5);
    }

    private void safeStroke(MaterialButton b, boolean selected) {
        if (b == null) return;
        b.setStrokeColor(android.content.res.ColorStateList.valueOf(
                selected ? 0xFF39C6FF : 0x2FFFFFFF));
        b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(
                selected ? 0xFF1A3050 : android.graphics.Color.TRANSPARENT));
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Session control
    // ─────────────────────────────────────────────────────────────────────────

    private void startBreathing() {
        remainingSession = selectedDuration;
        currentPhase = 0;
        setState(State.RUNNING);
        startSessionTimer(remainingSession);
        runNextPhase();
    }

    private void pauseBreathing() {
        setState(State.PAUSED);
        // suspend handlers
        breathHandler.removeCallbacks(breathRunnable);
        cancelSessionTimer();
        stopCircleAnim();
    }

    private void resumeBreathing() {
        setState(State.RUNNING);
        startSessionTimer(remainingSession);
        // resume current phase with remaining time
        runPhaseWithDuration(currentPhase, phaseRemainMs > 0 ? phaseRemainMs : phaseDuration(currentPhase));
    }

    private void stopAll() {
        setState(State.IDLE);
        breathHandler.removeCallbacks(breathRunnable);
        cancelSessionTimer();
        stopCircleAnim();
        remainingSession = selectedDuration;
        updateSessionTimer(selectedDuration);
        currentPhase = 0;
        if (tvBreathPhase != null) tvBreathPhase.setText("Inhale");
        if (tvBreathCountdown != null) tvBreathCountdown.setText("");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Breathing loop
    // ─────────────────────────────────────────────────────────────────────────

    private void runNextPhase() {
        if (state != State.RUNNING) return;
        runPhaseWithDuration(currentPhase, phaseDuration(currentPhase));
    }

    private void runPhaseWithDuration(int phase, long durationMs) {
        if (state != State.RUNNING) return;
        currentPhase = phase;
        phaseRemainMs = durationMs;

        String phaseName = phaseName(phase);
        if (tvBreathPhase != null) tvBreathPhase.setText(phaseName);

        // Animate circle expand (inhale) or contract (exhale/hold)
        animateBreathCircle(phase, durationMs);

        // Countdown in card
        final long[] tick = {durationMs / 1000};
        if (tvBreathCountdown != null) tvBreathCountdown.setText(String.valueOf(tick[0]));

        breathRunnable = new Runnable() {
            long left = durationMs;
            @Override public void run() {
                if (state != State.RUNNING) return;
                left -= 1000;
                phaseRemainMs = left;
                tick[0] = left / 1000;
                if (tvBreathCountdown != null) {
                    tvBreathCountdown.setText(tick[0] > 0 ? String.valueOf(tick[0]) : "");
                }
                if (left > 0) {
                    breathHandler.postDelayed(this, 1000);
                } else {
                    // advance phase
                    currentPhase = (currentPhase + 1) % 3;
                    runNextPhase();
                }
            }
        };
        breathHandler.postDelayed(breathRunnable, 1000);
    }

    private long phaseDuration(int phase) {
        if (phase == 0) return INHALE_MS;
        if (phase == 1) return HOLD_MS;
        return EXHALE_MS;
    }

    private String phaseName(int phase) {
        if (phase == 0) return "Inhale";
        if (phase == 1) return "Hold";
        return "Exhale";
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Circle animation
    // ─────────────────────────────────────────────────────────────────────────

    private ObjectAnimator circleAnim;

    private void animateBreathCircle(int phase, long dur) {
        stopCircleAnim();
        if (breathCircle == null) return;

        float fromScale, toScale, fromAlpha, toAlpha;
        if (phase == 0) {          // inhale → expand
            fromScale = 0.55f; toScale = 1.0f;
            fromAlpha = 0.20f; toAlpha = 0.50f;
        } else if (phase == 1) {   // hold → stay
            fromScale = 1.0f; toScale = 1.0f;
            fromAlpha = 0.50f; toAlpha = 0.50f;
        } else {                   // exhale → contract
            fromScale = 1.0f; toScale = 0.55f;
            fromAlpha = 0.50f; toAlpha = 0.20f;
        }

        breathCircle.setScaleX(fromScale);
        breathCircle.setScaleY(fromScale);
        breathCircle.setAlpha(fromAlpha);

        circleAnim = ObjectAnimator.ofPropertyValuesHolder(
                breathCircle,
                PropertyValuesHolder.ofFloat(View.SCALE_X, fromScale, toScale),
                PropertyValuesHolder.ofFloat(View.SCALE_Y, fromScale, toScale),
                PropertyValuesHolder.ofFloat(View.ALPHA, fromAlpha, toAlpha)
        );
        circleAnim.setDuration(dur - 200);
        circleAnim.setInterpolator(new AccelerateDecelerateInterpolator());
        circleAnim.start();

        // Also animate icon
        if (breathIcon != null) {
            breathIcon.animate()
                    .scaleX(phase == 0 ? 1.18f : (phase == 1 ? 1.18f : 1.0f))
                    .scaleY(phase == 0 ? 1.18f : (phase == 1 ? 1.18f : 1.0f))
                    .setDuration(dur - 200)
                    .setInterpolator(new AccelerateDecelerateInterpolator())
                    .start();
        }
    }

    private void stopCircleAnim() {
        if (circleAnim != null) { circleAnim.cancel(); circleAnim = null; }
        if (breathCircle != null) breathCircle.clearAnimation();
        if (breathIcon   != null) breathIcon.clearAnimation();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Session countdown timer
    // ─────────────────────────────────────────────────────────────────────────

    private CountDownTimer sessionTimerObj;

    private void startSessionTimer(long ms) {
        cancelSessionTimer();
        sessionTimerObj = new CountDownTimer(ms, 1000) {
            @Override public void onTick(long left) {
                remainingSession = left;
                updateSessionTimer(left);
            }
            @Override public void onFinish() {
                remainingSession = 0;
                updateSessionTimer(0);
                stopAll();
                // Show subtle done cue
                if (tvBreathPhase != null) tvBreathPhase.setText("Complete ✨");
                if (tvBreathCountdown != null) tvBreathCountdown.setText("");
            }
        }.start();
    }

    private void cancelSessionTimer() {
        if (sessionTimerObj != null) { sessionTimerObj.cancel(); sessionTimerObj = null; }
    }

    private void updateSessionTimer(long ms) {
        if (tvSessionTimer == null) return;
        long s = ms / 1000, m = s / 60; s = s % 60;
        tvSessionTimer.setText(String.format(java.util.Locale.US, "%02d:%02d", m, s));
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  State machine → UI
    // ─────────────────────────────────────────────────────────────────────────

    private void setState(State s) {
        state = s;
        switch (s) {
            case IDLE:
                setVisible(btnStartBreathing, true);
                setVisible(controlPanel, false);
                setDurRowEnabled(true);
                break;
            case RUNNING:
                setVisible(btnStartBreathing, false);
                setVisible(controlPanel, true);
                if (btnPauseBreath != null) btnPauseBreath.setText("Pause");
                setDurRowEnabled(false);
                break;
            case PAUSED:
                if (btnPauseBreath != null) btnPauseBreath.setText("Resume");
                break;
        }
    }

    private void setVisible(View v, boolean show) {
        if (v == null) return;
        if (show) {
            v.setVisibility(View.VISIBLE);
            v.setAlpha(0f);
            v.animate().alpha(1f).setDuration(200).start();
        } else {
            v.animate().alpha(0f).setDuration(160)
                    .withEndAction(() -> v.setVisibility(View.GONE)).start();
        }
    }

    private void setDurRowEnabled(boolean enabled) {
        float a = enabled ? 1f : 0.4f;
        if (btnDur1 != null) { btnDur1.setEnabled(enabled); btnDur1.setAlpha(a); }
        if (btnDur3 != null) { btnDur3.setEnabled(enabled); btnDur3.setAlpha(a); }
        if (btnDur5 != null) { btnDur5.setEnabled(enabled); btnDur5.setAlpha(a); }
    }
}
