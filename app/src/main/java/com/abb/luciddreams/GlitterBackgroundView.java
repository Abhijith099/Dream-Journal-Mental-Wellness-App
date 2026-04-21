package com.abb.luciddreams;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.util.AttributeSet;
import android.view.View;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

public class GlitterBackgroundView extends View {
    private List<Particle> particles = new ArrayList<>();
    private Paint paint = new Paint();
    private Random random = new Random();
    private boolean initialized = false;

    public GlitterBackgroundView(Context context) {
        super(context);
        init();
    }

    public GlitterBackgroundView(Context context, AttributeSet attrs) {
        super(context, attrs);
        init();
    }

    private void init() {
        paint.setColor(Color.WHITE);
        paint.setAntiAlias(true);
    }

    private void initParticles() {
        int w = getWidth();
        int h = getHeight();
        if (w <= 0 || h <= 0) return;

        particles.clear();
        for (int i = 0; i < 50; i++) {
            particles.add(new Particle(w, h, true));
        }
        initialized = true;
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        int w = getWidth();
        int h = getHeight();

        if (!initialized && w > 0 && h > 0) {
            initParticles();
        }

        if (initialized) {
            for (Particle p : particles) {
                p.update(w, h);
                paint.setAlpha((int) (p.alpha * 255));
                canvas.drawCircle(p.x, p.y, p.size, paint);
            }
            invalidate();
        }
    }

    private class Particle {
        float x, y, size, speed, alpha;

        Particle(int w, int h, boolean startRandom) {
            reset(w, h, startRandom);
        }

        void reset(int w, int h, boolean startRandom) {
            x = random.nextFloat() * w;
            y = startRandom ? random.nextFloat() * h : h + 20;
            size = 1 + random.nextFloat() * 3;
            speed = 0.3f + random.nextFloat() * 1.2f;
            alpha = 0.05f + random.nextFloat() * 0.35f;
        }

        void update(int w, int h) {
            y -= speed;
            if (y < -20) {
                reset(w, h, false);
            }
            // Add a little horizontal drift
            x += (random.nextFloat() - 0.5f) * 0.2f;
            if (x < 0) x = w;
            if (x > w) x = 0;
        }
    }
}
