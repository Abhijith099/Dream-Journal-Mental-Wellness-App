package com.abb.luciddreams;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.animation.ObjectAnimator;
import android.animation.PropertyValuesHolder;
import android.animation.ValueAnimator;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.CountDownTimer;
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

public class GuidedMeditationActivity extends AppCompatActivity {

    // ── States ────────────────────────────────────────────────────────────────
    private enum State { IDLE, RUNNING, PAUSED, COMPLETE }
    private State state = State.IDLE;

    // ── Duration options ─────────────────────────────────────────────────────
    private static final long DUR_5  = 5  * 60 * 1000L;
    private static final long DUR_10 = 10 * 60 * 1000L;
    private static final long DUR_SLEEP = 20 * 60 * 1000L;
    private long selectedDuration = DUR_5;

    // ── Views ─────────────────────────────────────────────────────────────────
    private View          animParticle, animIcon;
    private TextView      tvTimer, tvStatus;
    private MaterialButton btnStart, btn5, btn10, btnSleep;
    private View          controlPanel;
    private MaterialButton btnPause, btnEnd;

    // ── Timer + Animator ─────────────────────────────────────────────────────
    private CountDownTimer countDown;
    private long           remainingMs;
    private ObjectAnimator pulseAnim;

    // ── Prefs ─────────────────────────────────────────────────────────────────
    private SharedPreferences prefs;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_guided_meditation);

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.simple_root), (v, insets) -> {
            Insets sys = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(sys.left, sys.top, sys.right, sys.bottom);
            return insets;
        });

        prefs = getSharedPreferences("meditation_prefs", MODE_PRIVATE);
        selectedDuration = prefs.getLong("duration", DUR_5);

        bindViews();
        wireListeners();
        applyDurationSelection(selectedDuration);
        setState(State.IDLE);
    }

    @Override
    protected void onStop() {
        super.onStop();
        // Pause timer when screen leaves foreground
        if (state == State.RUNNING) pauseSession();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        cancelTimer();
        stopPulse();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  View binding
    // ─────────────────────────────────────────────────────────────────────────

    private void bindViews() {
        animParticle = findViewById(R.id.medAnimParticle);
        animIcon     = findViewById(R.id.medAnimIcon);
        tvTimer      = findViewById(R.id.tvMedTimer);
        tvStatus     = findViewById(R.id.tvMedStatus);
        btnStart     = findViewById(R.id.btnStart);
        btn5         = findViewById(R.id.btn5min);
        btn10        = findViewById(R.id.btn10min);
        btnSleep     = findViewById(R.id.btnSleep);
        controlPanel = findViewById(R.id.medControlPanel);
        btnPause     = findViewById(R.id.btnMedPause);
        btnEnd       = findViewById(R.id.btnMedEnd);

        View back = findViewById(R.id.simple_back);
        if (back != null) back.setOnClickListener(v -> finish());
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Listeners
    // ─────────────────────────────────────────────────────────────────────────

    private void wireListeners() {
        btnStart.setOnClickListener(v -> {
            if (state == State.IDLE || state == State.COMPLETE) startSession();
        });

        btn5.setOnClickListener(v -> {
            applyDurationSelection(DUR_5);
            prefs.edit().putLong("duration", DUR_5).apply();
        });
        btn10.setOnClickListener(v -> {
            applyDurationSelection(DUR_10);
            prefs.edit().putLong("duration", DUR_10).apply();
        });
        btnSleep.setOnClickListener(v -> {
            applyDurationSelection(DUR_SLEEP);
            prefs.edit().putLong("duration", DUR_SLEEP).apply();
        });

        if (btnPause != null) btnPause.setOnClickListener(v -> {
            if (state == State.RUNNING) pauseSession();
            else if (state == State.PAUSED) resumeSession();
        });
        if (btnEnd != null) btnEnd.setOnClickListener(v -> endSession(false));
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Duration selection
    // ─────────────────────────────────────────────────────────────────────────

    private void applyDurationSelection(long dur) {
        selectedDuration = dur;
        remainingMs = dur;
        updateTimerText(dur);

        // Highlight selected button
        int activeColor  = 0xFF39C6FF;
        int inactiveColor = 0x2FFFFFFF;

        safeStroke(btn5,    dur == DUR_5);
        safeStroke(btn10,   dur == DUR_10);
        safeStroke(btnSleep,dur == DUR_SLEEP);
    }

    private void safeStroke(MaterialButton b, boolean selected) {
        if (b == null) return;
        b.setStrokeColor(android.content.res.ColorStateList.valueOf(
                selected ? 0xFF39C6FF : 0x2FFFFFFF));
        b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(
                selected ? 0xFF2A3580 : 0xFF2A3567));
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Session control
    // ─────────────────────────────────────────────────────────────────────────

    private void startSession() {
        remainingMs = selectedDuration;
        setState(State.RUNNING);
        startTimer(remainingMs);
        startPulse(selectedDuration == DUR_SLEEP);
    }

    private void pauseSession() {
        cancelTimer();
        stopPulse();
        setState(State.PAUSED);
    }

    private void resumeSession() {
        setState(State.RUNNING);
        startTimer(remainingMs);
        startPulse(selectedDuration == DUR_SLEEP);
    }

    private void endSession(boolean natural) {
        cancelTimer();
        stopPulse();
        setState(natural ? State.COMPLETE : State.IDLE);
        if (!natural) remainingMs = selectedDuration;
        updateTimerText(natural ? 0 : selectedDuration);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  State machine → UI
    // ─────────────────────────────────────────────────────────────────────────

    private void setState(State s) {
        state = s;
        switch (s) {
            case IDLE:
                btnStart.setText("Start Session");
                btnStart.setEnabled(true);
                setVisible(controlPanel, false);
                setDurationRowEnabled(true);
                if (tvStatus != null) tvStatus.setText("Choose your duration and begin.");
                break;

            case RUNNING:
                btnStart.setEnabled(false);
                setVisible(controlPanel, true);
                if (btnPause != null) btnPause.setText("Pause");
                setDurationRowEnabled(false);
                if (tvStatus != null) tvStatus.setText("Breathe slowly. You're doing great.");
                break;

            case PAUSED:
                if (btnPause != null) btnPause.setText("Resume");
                if (tvStatus != null) tvStatus.setText("Paused — take your time.");
                break;

            case COMPLETE:
                btnStart.setText("Start Again");
                btnStart.setEnabled(true);
                setVisible(controlPanel, false);
                setDurationRowEnabled(true);
                if (tvStatus != null) {
                    tvStatus.setText("✨  Session Complete\nYou took time for yourself today.");
                }
                if (tvTimer != null) tvTimer.setText("00:00");
                showCompletionGlow();
                break;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  CountDownTimer
    // ─────────────────────────────────────────────────────────────────────────

    private void startTimer(long millis) {
        cancelTimer();
        countDown = new CountDownTimer(millis, 500) {
            @Override public void onTick(long left) {
                remainingMs = left;
                updateTimerText(left);
            }
            @Override public void onFinish() {
                remainingMs = 0;
                endSession(true);
            }
        }.start();
    }

    private void cancelTimer() {
        if (countDown != null) { countDown.cancel(); countDown = null; }
    }

    private void updateTimerText(long ms) {
        if (tvTimer == null) return;
        long total = ms / 1000;
        long m = total / 60, s = total % 60;
        tvTimer.setText(String.format(java.util.Locale.US, "%02d:%02d", m, s));
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Pulse animation
    // ─────────────────────────────────────────────────────────────────────────

    private void startPulse(boolean sleepMode) {
        stopPulse();
        if (animParticle == null) return;

        float maxScale = sleepMode ? 0.7f : 1.0f;
        float minScale = sleepMode ? 0.45f : 0.6f;
        long  dur      = sleepMode ? 4000L : 2200L;

        pulseAnim = ObjectAnimator.ofPropertyValuesHolder(
                animParticle,
                PropertyValuesHolder.ofFloat(View.SCALE_X, minScale, maxScale),
                PropertyValuesHolder.ofFloat(View.SCALE_Y, minScale, maxScale),
                PropertyValuesHolder.ofFloat(View.ALPHA, 0.25f, sleepMode ? 0.18f : 0.45f)
        );
        pulseAnim.setDuration(dur);
        pulseAnim.setRepeatCount(ValueAnimator.INFINITE);
        pulseAnim.setRepeatMode(ValueAnimator.REVERSE);
        pulseAnim.setInterpolator(new AccelerateDecelerateInterpolator());
        pulseAnim.start();

        // Icon breathe
        if (animIcon != null) {
            animIcon.animate()
                    .scaleX(1.12f).scaleY(1.12f)
                    .setDuration(dur).setRepeatCount(-1) // no API, workaround below
                    .setInterpolator(new AccelerateDecelerateInterpolator()).start();
            startIconLoop(dur, sleepMode);
        }
    }

    private void startIconLoop(long dur, boolean slow) {
        if (animIcon == null) return;
        animIcon.animate()
                .scaleX(slow ? 1.06f : 1.14f)
                .scaleY(slow ? 1.06f : 1.14f)
                .setDuration(dur)
                .setInterpolator(new AccelerateDecelerateInterpolator())
                .withEndAction(() -> {
                    if (state == State.RUNNING && animIcon != null) {
                        animIcon.animate()
                                .scaleX(1f).scaleY(1f)
                                .setDuration(dur)
                                .setInterpolator(new AccelerateDecelerateInterpolator())
                                .withEndAction(() -> { if (state == State.RUNNING) startIconLoop(dur, slow); })
                                .start();
                    }
                }).start();
    }

    private void stopPulse() {
        if (pulseAnim != null) { pulseAnim.cancel(); pulseAnim = null; }
        if (animIcon  != null) { animIcon.clearAnimation(); animIcon.animate().cancel(); }
        if (animParticle != null) { animParticle.clearAnimation(); animParticle.animate().cancel(); }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private void showCompletionGlow() {
        if (animParticle == null) return;
        animParticle.animate().scaleX(1.4f).scaleY(1.4f).alpha(0.6f)
                .setDuration(600).setInterpolator(new DecelerateInterpolator())
                .withEndAction(() -> animParticle.animate()
                        .scaleX(1f).scaleY(1f).alpha(0.35f)
                        .setDuration(800).start())
                .start();
    }

    private void setVisible(View v, boolean visible) {
        if (v == null) return;
        if (visible) {
            v.setVisibility(View.VISIBLE);
            v.setAlpha(0f);
            v.animate().alpha(1f).setDuration(220).start();
        } else {
            v.animate().alpha(0f).setDuration(180)
                    .withEndAction(() -> v.setVisibility(View.GONE)).start();
        }
    }

    private void setDurationRowEnabled(boolean enabled) {
        if (btn5  != null) btn5.setEnabled(enabled);
        if (btn10 != null) btn10.setEnabled(enabled);
        if (btnSleep != null) btnSleep.setEnabled(enabled);
        float alpha = enabled ? 1f : 0.45f;
        if (btn5    != null) btn5.setAlpha(alpha);
        if (btn10   != null) btn10.setAlpha(alpha);
        if (btnSleep!= null) btnSleep.setAlpha(alpha);
    }
}
