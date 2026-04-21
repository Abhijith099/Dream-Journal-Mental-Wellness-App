package com.abb.luciddreams;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.animation.ObjectAnimator;
import android.animation.ValueAnimator;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.view.animation.DecelerateInterpolator;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.VideoView;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.google.android.material.button.MaterialButton;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

public class GuidedMeditationActivity extends AppCompatActivity {

    private VideoView videoView;
    private View videoPlaceholder, placeholderPulse, medInner;
    private FrameLayout particleCanvas;
    private ProgressBar progressBar;
    private TextView tvDurationLabel, tvCurrentTime, tvLoopStatus, tvLiveIndicator;
    private ImageView iconPlayPause, iconMute;
    private View btnPlayPause, btnMute, btnFullscreen, btnStopMeditation;
    private View optBreathing, optAnxiety, optThoughts, optSleep;

    private MediaPlayer mediaPlayer;
    private boolean isMuted = false;
    private Handler progressHandler = new Handler(Looper.getMainLooper());
    private ParticleView particleView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_guided_meditation);

        View root = findViewById(R.id.med_root);
        ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> {
            Insets sys = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(sys.left, sys.top, sys.right, sys.bottom);
            return insets;
        });

        bindViews();
        setupVideoPlayer();
        setupAnimations();
        setupListeners();
        
        // Start screen fade-in
        medInner.animate().alpha(1f).setDuration(1000).setInterpolator(new DecelerateInterpolator()).start();
    }

    private void bindViews() {
        videoView = findViewById(R.id.videoView);
        videoPlaceholder = findViewById(R.id.videoPlaceholder);
        placeholderPulse = findViewById(R.id.placeholderPulse);
        medInner = findViewById(R.id.med_inner);
        particleCanvas = findViewById(R.id.particleCanvas);
        progressBar = findViewById(R.id.videoProgressBar);
        tvDurationLabel = findViewById(R.id.tvDurationLabel);
        tvCurrentTime = findViewById(R.id.tvCurrentTime);
        tvLoopStatus = findViewById(R.id.tvLoopStatus);
        tvLiveIndicator = findViewById(R.id.tvLiveIndicator);
        iconPlayPause = findViewById(R.id.iconPlayPause);
        iconMute = findViewById(R.id.iconMute);
        
        btnPlayPause = findViewById(R.id.btnPlayPause);
        btnMute = findViewById(R.id.btnMute);
        btnFullscreen = findViewById(R.id.btnFullscreen);
        btnStopMeditation = findViewById(R.id.btnStopMeditation);
        
        optBreathing = findViewById(R.id.optDeepBreathing);
        optAnxiety = findViewById(R.id.optReduceAnxiety);
        optThoughts = findViewById(R.id.optClearThoughts);
        optSleep = findViewById(R.id.optPrepareSleep);

        findViewById(R.id.med_back).setOnClickListener(v -> finish());
    }

    private void setupVideoPlayer() {
        try {
            Uri videoUri = Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.meditation_video);
            videoView.setVideoURI(videoUri);

            videoView.setOnPreparedListener(mp -> {
                mediaPlayer = mp;
                mp.setLooping(true);
                videoView.start();
                
                // Hide placeholder with animation
                videoPlaceholder.animate().alpha(0f).setDuration(500).withEndAction(() -> {
                    videoPlaceholder.setVisibility(View.GONE);
                    videoView.setVisibility(View.VISIBLE);
                    videoView.setAlpha(0f);
                    videoView.animate().alpha(1f).setDuration(500).start();
                }).start();

                updateUIForPlaying();
                startProgressUpdate();
                
                // Set duration label
                int duration = mp.getDuration() / 1000;
                int min = duration / 60;
                int sec = duration % 60;
                tvDurationLabel.setText(String.format("Duration: %02d:%02d", min, sec));
                progressBar.setMax(mp.getDuration());
                
                tvLiveIndicator.setVisibility(View.VISIBLE);
                tvLiveIndicator.setAlpha(0f);
                tvLiveIndicator.animate().alpha(1f).start();
            });

            videoView.setOnErrorListener((mp, what, extra) -> {
                // Fallback if video missing
                tvDurationLabel.setText("Video resource not found");
                return true;
            });

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void setupAnimations() {
        // Placeholder pulse
        ObjectAnimator pulse = ObjectAnimator.ofPropertyValuesHolder(
                placeholderPulse,
                android.animation.PropertyValuesHolder.ofFloat(View.SCALE_X, 1f, 1.2f),
                android.animation.PropertyValuesHolder.ofFloat(View.SCALE_Y, 1f, 1.2f),
                android.animation.PropertyValuesHolder.ofFloat(View.ALPHA, 0.35f, 0.15f)
        );
        pulse.setDuration(2000);
        pulse.setRepeatCount(ValueAnimator.INFINITE);
        pulse.setRepeatMode(ValueAnimator.REVERSE);
        pulse.setInterpolator(new AccelerateDecelerateInterpolator());
        pulse.start();

        // Background particles
        particleView = new ParticleView(this);
        particleCanvas.addView(particleView);
    }

    private void setupListeners() {
        btnPlayPause.setOnClickListener(v -> togglePlayPause());
        btnMute.setOnClickListener(v -> toggleMute());
        btnStopMeditation.setOnClickListener(v -> stopMeditation());
        btnFullscreen.setOnClickListener(v -> {
            // Logic for fullscreen could go here (e.g. rotate and resize)
            PremiumToast.show(this, "Fullscreen mode enabled (demo)");
        });

        // Quick options
        setupOptionClick(optBreathing);
        setupOptionClick(optAnxiety);
        setupOptionClick(optThoughts);
        setupOptionClick(optSleep);
    }

    private void setupOptionClick(View view) {
        view.setOnClickListener(v -> {
            v.animate().scaleX(0.95f).scaleY(0.95f).setDuration(100)
                    .withEndAction(() -> v.animate().scaleX(1f).scaleY(1f).setDuration(100).start())
                    .start();
            PremiumToast.show(this, "Optimizing for your needs...");
        });
    }

    private void togglePlayPause() {
        if (videoView.isPlaying()) {
            videoView.pause();
            updateUIForPaused();
        } else {
            videoView.start();
            updateUIForPlaying();
        }
    }

    private void toggleMute() {
        if (mediaPlayer == null) return;
        isMuted = !isMuted;
        if (isMuted) {
            mediaPlayer.setVolume(0, 0);
            iconMute.setImageResource(R.drawable.ic_support_shield); // Placeholder for mute icon
            iconMute.setAlpha(0.5f);
        } else {
            mediaPlayer.setVolume(1, 1);
            iconMute.setImageResource(R.drawable.ic_calm);
            iconMute.setAlpha(1.0f);
        }
    }

    private void stopMeditation() {
        if (mediaPlayer != null) {
            mediaPlayer.setLooping(false);
            videoView.stopPlayback();
        }
        tvLoopStatus.setText("Meditation stopped.");
        tvLiveIndicator.setVisibility(View.GONE);
        videoView.animate().alpha(0f).setDuration(300).start();
        videoPlaceholder.setVisibility(View.VISIBLE);
        videoPlaceholder.setAlpha(0f);
        videoPlaceholder.animate().alpha(1f).setDuration(300).start();
    }

    private void updateUIForPlaying() {
        iconPlayPause.setImageResource(R.drawable.ic_meditation); // Assuming this is a pause-like icon or we can use another
        // If we don't have a pause icon, we just keep it as is or tint it
        iconPlayPause.animate().scaleX(1.1f).scaleY(1.1f).setDuration(200).start();
    }

    private void updateUIForPaused() {
        iconPlayPause.animate().scaleX(1.0f).scaleY(1.0f).setDuration(200).start();
    }

    private void startProgressUpdate() {
        progressHandler.postDelayed(new Runnable() {
            @Override
            public void run() {
                if (videoView != null && videoView.isPlaying()) {
                    int current = videoView.getCurrentPosition();
                    progressBar.setProgress(current);
                    
                    int sec = (current / 1000) % 60;
                    int min = (current / 1000) / 60;
                    tvCurrentTime.setText(String.format("%d:%02d", min, sec));
                }
                progressHandler.postDelayed(this, 1000);
            }
        }, 0);
    }

    @Override
    protected void onStop() {
        super.onStop();
        if (videoView != null) videoView.stopPlayback();
        progressHandler.removeCallbacksAndMessages(null);
    }

    // ── Custom Particle View ──
    private class ParticleView extends View {
        private List<Particle> particles = new ArrayList<>();
        private Paint paint = new Paint();
        private Random random = new Random();

        public ParticleView(android.content.Context context) {
            super(context);
            paint.setColor(Color.WHITE);
            paint.setAntiAlias(true);
            
            for (int i = 0; i < 40; i++) {
                particles.add(new Particle());
            }
        }

        @Override
        protected void onDraw(Canvas canvas) {
            super.onDraw(canvas);
            for (Particle p : particles) {
                p.update(getWidth(), getHeight());
                paint.setAlpha((int) (p.alpha * 255));
                canvas.drawCircle(p.x, p.y, p.size, paint);
            }
            invalidate();
        }

        private class Particle {
            float x, y, size, speed, alpha;
            
            Particle() {
                reset(true);
            }

            void reset(boolean startRandom) {
                x = random.nextFloat() * 1000; // Will be corrected on first update
                y = startRandom ? random.nextFloat() * 2000 : 2100;
                size = 2 + random.nextFloat() * 4;
                speed = 0.5f + random.nextFloat() * 1.5f;
                alpha = 0.1f + random.nextFloat() * 0.4f;
            }

            void update(int w, int h) {
                if (x > w) x = random.nextFloat() * w;
                y -= speed;
                if (y < -50) reset(false);
                if (x < 0 || x > w) x = random.nextFloat() * w;
            }
        }
    }
}
