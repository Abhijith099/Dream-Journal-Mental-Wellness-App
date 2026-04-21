package com.abb.luciddreams;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.animation.ObjectAnimator;
import android.animation.PropertyValuesHolder;
import android.animation.TimeInterpolator;
import android.animation.ValueAnimator;
import android.app.Activity;
import android.content.Intent;
import android.os.Build;
import android.view.HapticFeedbackConstants;
import android.view.MotionEvent;
import android.view.View;
import android.view.animation.DecelerateInterpolator;
import android.view.animation.OvershootInterpolator;
import android.widget.TextView;

import java.util.ArrayList;
import java.util.List;

public final class CalmActionsUx {

    private final Activity activity;
    private final List<Animator> running = new ArrayList<>();
    private boolean started = false;

    public CalmActionsUx(Activity activity) {
        this.activity = activity;
    }

    public void bindAndStart() {
        if (started) return;
        started = true;

        View card = activity.findViewById(R.id.cardActions);
        if (card == null) return;

        View caTitle = activity.findViewById(R.id.caTitle);
        View caSubtitle = activity.findViewById(R.id.caSubtitle);
        View caWave = activity.findViewById(R.id.caWave);

        View tileMeditation = activity.findViewById(R.id.tileMeditation);
        View tileBreathing = activity.findViewById(R.id.tileBreathing);
        View tileSleep = activity.findViewById(R.id.tileSleepSounds);
        View tileJournal = activity.findViewById(R.id.tileJournalThoughts);
        View btnSupport = activity.findViewById(R.id.btnImmediateSupport);

        // Keep old ids working (they’re now TextViews), but use the whole tile for tap targets.
        View btnMeditation = activity.findViewById(R.id.btnMeditation);
        View btnBreathing = activity.findViewById(R.id.btnBreathing);
        View btnSleepSounds = activity.findViewById(R.id.btnSleepSounds);
        View btnJournalThoughts = activity.findViewById(R.id.btnJournalThoughts);

        wireNavigation(tileMeditation, btnMeditation, new Intent(activity, GuidedMeditationActivity.class));
        wireNavigation(tileBreathing, btnBreathing, new Intent(activity, BreathingTrainerActivity.class));
        wireNavigation(tileSleep, btnSleepSounds, new Intent(activity, SleepSoundsActivity.class));
        wireNavigation(tileJournal, btnJournalThoughts, new Intent(activity, QuickJournalActivity.class));
        wireNavigation(btnSupport, null, new Intent(activity, EmergencySupportActivity.class));

        applyPressUx(tileMeditation);
        applyPressUx(tileBreathing);
        applyPressUx(tileSleep);
        applyPressUx(tileJournal);
        applyPressUx(btnSupport);

        // Entrance motion (staggered, alternating directions)
        setInitial(caTitle, 0f, 14f, 0f);
        setInitial(caSubtitle, 0f, 14f, 0f);
        setInitial(tileMeditation, -22f, 16f, 0f);
        setInitial(tileBreathing, 22f, 16f, 0f);
        setInitial(tileSleep, -22f, 16f, 0f);
        setInitial(tileJournal, 22f, 16f, 0f);
        setInitial(btnSupport, 0f, 22f, 0f);

        animateIn(caTitle, 0, 240);
        animateIn(caSubtitle, 70, 260);
        animateIn(tileMeditation, 140, 320);
        animateIn(tileBreathing, 210, 320);
        animateIn(tileSleep, 280, 320);
        animateIn(tileJournal, 350, 320);
        animateIn(btnSupport, 440, 360);

        // Ambient / micro-animations
        if (caWave != null) startWaveDrift(caWave);
        startParticles();
        startMeditationPulse();
        startBreathingCycle();
        startEqualizer();
        startJournalShimmer();
        startEmergencyPulse();
    }

    public void stop() {
        for (Animator a : running) {
            try {
                a.cancel();
            } catch (Exception ignored) {
            }
        }
        running.clear();
        started = false;
    }

    private void wireNavigation(View primary, View secondary, Intent intent) {
        View.OnClickListener l = v -> activity.startActivity(intent);
        if (primary != null) primary.setOnClickListener(l);
        if (secondary != null) secondary.setOnClickListener(l);
    }

    private void setInitial(View v, float txDp, float tyDp, float alpha) {
        if (v == null) return;
        v.setAlpha(alpha);
        v.setTranslationX(dp(txDp));
        v.setTranslationY(dp(tyDp));
        v.setScaleX(0.98f);
        v.setScaleY(0.98f);
    }

    private void animateIn(View v, long delay, long duration) {
        if (v == null) return;
        v.animate()
                .alpha(1f)
                .translationX(0f)
                .translationY(0f)
                .scaleX(1f)
                .scaleY(1f)
                .setStartDelay(delay)
                .setDuration(duration)
                .setInterpolator(new DecelerateInterpolator())
                .start();
    }

    private void applyPressUx(View v) {
        if (v == null) return;
        v.setOnTouchListener((view, e) -> {
            if (e.getActionMasked() == MotionEvent.ACTION_DOWN) {
                if (Build.VERSION.SDK_INT >= 23) view.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP);
                view.animate()
                        .scaleX(0.985f)
                        .scaleY(0.985f)
                        .translationY(-dp(1.5f))
                        .setDuration(90)
                        .setInterpolator(new DecelerateInterpolator())
                        .start();
                if (Build.VERSION.SDK_INT >= 21) view.setElevation(dp(4));
            } else if (e.getActionMasked() == MotionEvent.ACTION_UP || e.getActionMasked() == MotionEvent.ACTION_CANCEL) {
                view.animate()
                        .scaleX(1f)
                        .scaleY(1f)
                        .translationY(0f)
                        .setDuration(240)
                        .setInterpolator(new OvershootInterpolator(0.85f))
                        .start();
                if (Build.VERSION.SDK_INT >= 21) view.setElevation(0f);
            }
            return false;
        });
    }

    private void startWaveDrift(View wave) {
        float dx = dp(14);
        ValueAnimator a = ValueAnimator.ofFloat(-dx, dx);
        a.setDuration(2600);
        a.setRepeatCount(ValueAnimator.INFINITE);
        a.setRepeatMode(ValueAnimator.REVERSE);
        a.setInterpolator(new DecelerateInterpolator());
        a.addUpdateListener(v -> wave.setTranslationX((float) v.getAnimatedValue()));
        a.start();
        running.add(a);
    }

    private void startParticles() {
        View a = activity.findViewById(R.id.caParticleA);
        View b = activity.findViewById(R.id.caParticleB);
        View c = activity.findViewById(R.id.caParticleC);

        if (a != null) running.add(floatLoop(a, dp(10), dp(8), 5200, new DecelerateInterpolator()));
        if (b != null) running.add(floatLoop(b, -dp(12), dp(10), 6100, new DecelerateInterpolator()));
        if (c != null) running.add(floatLoop(c, dp(8), -dp(10), 6800, new DecelerateInterpolator()));
    }

    private Animator floatLoop(View v, float dx, float dy, long duration, TimeInterpolator i) {
        PropertyValuesHolder tx = PropertyValuesHolder.ofFloat(View.TRANSLATION_X, 0f, dx);
        PropertyValuesHolder ty = PropertyValuesHolder.ofFloat(View.TRANSLATION_Y, 0f, dy);
        ObjectAnimator a = ObjectAnimator.ofPropertyValuesHolder(v, tx, ty);
        a.setDuration(duration);
        a.setRepeatCount(ValueAnimator.INFINITE);
        a.setRepeatMode(ValueAnimator.REVERSE);
        a.setInterpolator(i);
        a.start();
        return a;
    }

    private void startMeditationPulse() {
        View icon = activity.findViewById(R.id.iconMeditation);
        View halo = activity.findViewById(R.id.haloMeditation);
        if (icon == null || halo == null) return;

        ObjectAnimator iconPulse = ObjectAnimator.ofPropertyValuesHolder(
                icon,
                PropertyValuesHolder.ofFloat(View.SCALE_X, 1f, 1.06f),
                PropertyValuesHolder.ofFloat(View.SCALE_Y, 1f, 1.06f)
        );
        iconPulse.setDuration(1800);
        iconPulse.setRepeatCount(ValueAnimator.INFINITE);
        iconPulse.setRepeatMode(ValueAnimator.REVERSE);
        iconPulse.setInterpolator(new DecelerateInterpolator());
        iconPulse.start();
        running.add(iconPulse);

        ValueAnimator haloPulse = ValueAnimator.ofFloat(0f, 1f);
        haloPulse.setDuration(1800);
        haloPulse.setRepeatCount(ValueAnimator.INFINITE);
        haloPulse.setRepeatMode(ValueAnimator.RESTART);
        haloPulse.setInterpolator(new DecelerateInterpolator());
        haloPulse.addUpdateListener(a -> {
            float t = (float) a.getAnimatedValue();
            halo.setAlpha(0.55f * (1f - t));
            float s = 0.9f + (t * 1.25f);
            halo.setScaleX(s);
            halo.setScaleY(s);
        });
        haloPulse.start();
        running.add(haloPulse);
    }

    private void startBreathingCycle() {
        View icon = activity.findViewById(R.id.iconBreathing);
        View halo = activity.findViewById(R.id.haloBreathing);
        if (icon == null || halo == null) return;

        ObjectAnimator inhaleExhale = ObjectAnimator.ofPropertyValuesHolder(
                icon,
                PropertyValuesHolder.ofFloat(View.SCALE_X, 1f, 1.10f),
                PropertyValuesHolder.ofFloat(View.SCALE_Y, 1f, 1.10f)
        );
        inhaleExhale.setDuration(2400);
        inhaleExhale.setRepeatCount(ValueAnimator.INFINITE);
        inhaleExhale.setRepeatMode(ValueAnimator.REVERSE);
        inhaleExhale.setInterpolator(new DecelerateInterpolator());
        inhaleExhale.start();
        running.add(inhaleExhale);

        ValueAnimator haloCycle = ValueAnimator.ofFloat(0f, 1f);
        haloCycle.setDuration(2400);
        haloCycle.setRepeatCount(ValueAnimator.INFINITE);
        haloCycle.setRepeatMode(ValueAnimator.REVERSE);
        haloCycle.setInterpolator(new DecelerateInterpolator());
        haloCycle.addUpdateListener(a -> {
            float t = (float) a.getAnimatedValue();
            halo.setAlpha(0.25f + (0.35f * t));
            float s = 0.85f + (t * 0.55f);
            halo.setScaleX(s);
            halo.setScaleY(s);
        });
        haloCycle.start();
        running.add(haloCycle);
    }

    private void startEqualizer() {
        View eq1 = activity.findViewById(R.id.eq1);
        View eq2 = activity.findViewById(R.id.eq2);
        View eq3 = activity.findViewById(R.id.eq3);
        View eq4 = activity.findViewById(R.id.eq4);
        if (eq1 == null || eq2 == null || eq3 == null || eq4 == null) return;

        startEqBar(eq1, 0, 760);
        startEqBar(eq2, 120, 680);
        startEqBar(eq3, 240, 820);
        startEqBar(eq4, 360, 640);
    }

    private void startEqBar(View bar, long delay, long duration) {
        bar.setPivotY(bar.getHeight());
        ObjectAnimator a = ObjectAnimator.ofFloat(bar, View.SCALE_Y, 0.55f, 1.25f);
        a.setStartDelay(delay);
        a.setDuration(duration);
        a.setRepeatCount(ValueAnimator.INFINITE);
        a.setRepeatMode(ValueAnimator.REVERSE);
        a.setInterpolator(new OvershootInterpolator(0.7f));
        a.addListener(new AnimatorListenerAdapter() {
            @Override
            public void onAnimationStart(Animator animation) {
                bar.setPivotY(bar.getHeight());
            }
        });
        a.start();
        running.add(a);
    }

    private void startJournalShimmer() {
        View shimmer = activity.findViewById(R.id.shimmerJournal);
        if (shimmer == null) return;

        ValueAnimator a = ValueAnimator.ofFloat(-dp(26), dp(42));
        a.setDuration(2200);
        a.setStartDelay(500);
        a.setRepeatCount(ValueAnimator.INFINITE);
        a.setRepeatMode(ValueAnimator.RESTART);
        a.setInterpolator(new DecelerateInterpolator());
        a.addUpdateListener(v -> {
            float x = (float) v.getAnimatedValue();
            shimmer.setTranslationX(x);
            shimmer.setAlpha(0.35f);
        });
        a.start();
        running.add(a);
    }

    private void startEmergencyPulse() {
        View pulse = activity.findViewById(R.id.emergencyPulse);
        if (pulse == null) return;

        ValueAnimator a = ValueAnimator.ofFloat(0f, 1f);
        a.setDuration(1500);
        a.setRepeatCount(ValueAnimator.INFINITE);
        a.setRepeatMode(ValueAnimator.RESTART);
        a.setStartDelay(1100);
        a.setInterpolator(new DecelerateInterpolator());
        a.addUpdateListener(v -> {
            float t = (float) v.getAnimatedValue();
            // Pulse every loop: ramp up then fade away.
            float alpha = t < 0.4f ? (t / 0.4f) * 0.70f : (1f - ((t - 0.4f) / 0.6f)) * 0.70f;
            pulse.setAlpha(Math.max(0f, alpha));
            float s = 1f + (t * 0.03f);
            pulse.setScaleX(s);
            pulse.setScaleY(s);
        });
        a.start();
        running.add(a);
    }

    private float dp(float dp) {
        return dp * activity.getResources().getDisplayMetrics().density;
    }
}

