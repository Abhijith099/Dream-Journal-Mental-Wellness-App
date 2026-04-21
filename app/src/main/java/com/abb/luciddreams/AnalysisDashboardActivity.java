package com.abb.luciddreams;

import android.animation.ValueAnimator;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.Drawable;
import android.os.Bundle;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.github.mikephil.charting.charts.LineChart;
import com.github.mikephil.charting.data.Entry;
import com.github.mikephil.charting.data.LineData;
import com.github.mikephil.charting.data.LineDataSet;
import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.google.android.material.chip.Chip;
import com.google.android.material.chip.ChipGroup;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.google.android.material.progressindicator.LinearProgressIndicator;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class AnalysisDashboardActivity extends AppCompatActivity {

    private static final String TAG = "AIWellnessReport";

    private DreamRepository repository;
    private GeminiService geminiService;

    // Loading overlay
    private View loadingOverlay;
    private LinearProgressIndicator progressAnalyze;
    private TextView tvLoadingPercent;

    // Report UI
    private TextView tvMoodStatusTitle;
    private TextView tvMoodStatusDesc;
    private ProgressBar pbStressCircle;
    private TextView tvStressValue;
    private TextView tvStressLabel;
    private TextView tvSleepScore;
    private TextView tvSleepDesc;
    private LineChart chartMoodTrend;
    private ChipGroup cgThemes;
    private LinearLayout llAdvice;

    // Conditional sections
    private View cardMoodSupport;
    private LinearLayout llMoodSupport;
    private View cardEmergency;

    private ValueAnimator fakeProgressAnimator;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);

        setContentView(R.layout.activity_ai_wellness_report);

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.ai_wellness_root), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, 0);
            return insets;
        });

        repository = new DreamRepository(this);
        geminiService = new GeminiService();

        initViews();
        setupBottomNav();
        setupFab();

        setupMoodTrendChartDefaults();
        applyThemesDefaults();
        applyAdviceDefaults();

        cardMoodSupport.setVisibility(View.GONE);
        cardEmergency.setVisibility(View.GONE);

        loadCachedReport();
    }

    private void initViews() {
        findViewById(R.id.btnAnalyze).setOnClickListener(v -> performWellnessAnalysis());

        loadingOverlay = findViewById(R.id.loadingOverlay);
        progressAnalyze = findViewById(R.id.progressAnalyze);
        tvLoadingPercent = findViewById(R.id.tvLoadingPercent);

        tvMoodStatusTitle = findViewById(R.id.tvMoodStatusTitle);
        tvMoodStatusDesc = findViewById(R.id.tvMoodStatusDesc);

        pbStressCircle = findViewById(R.id.pbStressCircle);
        tvStressValue = findViewById(R.id.tvStressValue);
        tvStressLabel = findViewById(R.id.tvStressLabel);

        tvSleepScore = findViewById(R.id.tvSleepScore);
        tvSleepDesc = findViewById(R.id.tvSleepDesc);

        chartMoodTrend = findViewById(R.id.chartMoodTrend);
        cgThemes = findViewById(R.id.cgThemes);
        llAdvice = findViewById(R.id.llAdvice);

        cardMoodSupport = findViewById(R.id.cardMoodSupport);
        llMoodSupport = findViewById(R.id.llMoodSupport);
        cardEmergency = findViewById(R.id.cardEmergency);

        findViewById(R.id.btnMeditation).setOnClickListener(v -> PremiumToast.show(this, "Guided Meditation is coming soon."));
        findViewById(R.id.btnBreathing).setOnClickListener(v -> PremiumToast.show(this, "Breathing Exercise is coming soon."));
        findViewById(R.id.btnSleepSounds).setOnClickListener(v -> PremiumToast.show(this, "Sleep Sounds is coming soon."));
        findViewById(R.id.btnJournalThoughts).setOnClickListener(v -> PremiumToast.show(this, "Journal Thoughts is coming soon."));

        findViewById(R.id.btnCallHelpline).setOnClickListener(v -> PremiumToast.show(this, "Helpline calling is not configured yet."));
        findViewById(R.id.btnCallEmergencyContact).setOnClickListener(v -> PremiumToast.show(this, "Emergency contact is not configured yet."));
        findViewById(R.id.btnMessageTrusted).setOnClickListener(v -> PremiumToast.show(this, "Messaging is not configured yet."));
    }

    private void setupFab() {
        FloatingActionButton fabAdd = findViewById(R.id.fabAdd);
        fabAdd.setOnClickListener(v -> startActivity(new Intent(this, AddDreamActivity.class)));
    }

    private void setupBottomNav() {
        BottomNavigationView nav = findViewById(R.id.bottomNav);
        nav.setSelectedItemId(R.id.nav_analysis);
        nav.setOnItemSelectedListener(item -> {
            int id = item.getItemId();
            if (id == R.id.nav_dreams) {
                Intent intent = new Intent(this, MainActivity.class);
                intent.setFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
                startActivity(intent);
                overridePendingTransition(0, 0);
                return true;
            } else if (id == R.id.nav_patterns) {
                Intent intent = new Intent(this, PatternsActivity.class);
                intent.setFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
                startActivity(intent);
                overridePendingTransition(0, 0);
                return true;
            } else if (id == R.id.nav_profile) {
                startActivity(new Intent(this, ProfileActivity.class));
                overridePendingTransition(0, 0);
                return true;
            }
            return id == R.id.nav_analysis;
        });
    }

    private void performWellnessAnalysis() {
        List<Dream> allDreams = repository.getDreamsFiltered(null, "");
        if (allDreams == null || allDreams.size() < 3) {
            PremiumToast.show(this, "Add at least 3 dreams to generate a wellness report.");
            return;
        }

        List<Dream> last3 = allDreams.subList(0, 3);

        showLoading(true);
        String prompt = buildWellnessPrompt(last3);
        geminiService.analyzeDreams(prompt, new GeminiService.GeminiListener() {
            @Override
            public void onSuccess(String response) {
                showLoading(false);
                applyReportFromJson(response, last3);
            }

            @Override
            public void onError(String error) {
                showLoading(false);
                PremiumToast.show(AnalysisDashboardActivity.this, "Wellness analysis failed. Showing local insights.");
                applyFallbackReport(last3);
            }
        });
    }

    private void showLoading(boolean show) {
        loadingOverlay.setVisibility(show ? View.VISIBLE : View.GONE);
        if (show) startFakeProgress();
        else stopFakeProgress();

        // Start vector animation if possible
        if (show) {
            try {
                Drawable d = ((android.widget.ImageView) findViewById(R.id.ivLoadingAnim)).getDrawable();
                if (d instanceof android.graphics.drawable.Animatable) {
                    ((android.graphics.drawable.Animatable) d).start();
                }
            } catch (Exception ignored) {
            }
        }
    }

    private void startFakeProgress() {
        stopFakeProgress();
        progressAnalyze.setProgress(0);
        tvLoadingPercent.setText("0%");
        fakeProgressAnimator = ValueAnimator.ofInt(0, 92);
        fakeProgressAnimator.setDuration(2200);
        fakeProgressAnimator.addUpdateListener(a -> {
            int v = (int) a.getAnimatedValue();
            progressAnalyze.setProgress(v);
            tvLoadingPercent.setText(v + "%");
        });
        fakeProgressAnimator.start();
    }

    private void stopFakeProgress() {
        if (fakeProgressAnimator != null) {
            fakeProgressAnimator.cancel();
            fakeProgressAnimator = null;
        }
        progressAnalyze.setProgress(100);
        tvLoadingPercent.setText("100%");
    }

    private String buildWellnessPrompt(List<Dream> last3) {
        SimpleDateFormat sdf = new SimpleDateFormat("EEE, MMM d", Locale.getDefault());
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < last3.size(); i++) {
            Dream d = last3.get(i);
            sb.append("Entry ").append(i + 1).append(" (").append(sdf.format(new Date(d.getTimestamp()))).append(")\n");
            sb.append("Mood: ").append(safe(d.getMood())).append("\n");
            sb.append("Clarity Score: ").append(d.getClarity()).append("/10\n");
            sb.append("Lucidity Score: ").append(d.getLucidity()).append("/10\n");
            sb.append("Nightmare: ").append(d.isNightmare() ? "Yes" : "No").append("\n");
            sb.append("Recurring: ").append(d.isRecurring() ? "Yes" : "No").append("\n");
            sb.append("Text: ").append(safe(d.getDescription())).append("\n\n");
        }

        return "You are a mental wellness assistant for a dream journal app. " +
                "Analyze ONLY the last 3 dream entries below. " +
                "Return STRICT JSON ONLY (no markdown, no extra keys) with this schema:\n" +
                "{\n" +
                "  \"mood_status\": \"Mood Stable\" | \"Elevated Stress Signs\" | \"Low Mood Patterns Detected\" | \"Distress Signals Found\",\n" +
                "  \"mood_explanation\": string,\n" +
                "  \"stress_score\": integer (0-100),\n" +
                "  \"stress_label\": \"Low\" | \"Moderate\" | \"High\",\n" +
                "  \"sleep_quality_score\": integer (0-100),\n" +
                "  \"sleep_quality_explanation\": string,\n" +
                "  \"mood_trend\": [integer, integer, integer],\n" +
                "  \"mood_trend_labels\": [string, string, string],\n" +
                "  \"recurring_themes\": [string, ...],\n" +
                "  \"theme_insights\": { \"Theme\": { \"meaning\": string, \"reflection\": string } },\n" +
                "  \"today_advice\": [string, string, string, string],\n" +
                "  \"mood_support\": [string, ...],\n" +
                "  \"severe_risk\": boolean\n" +
                "}\n" +
                "Constraints: No emojis. Calm, clinical, supportive tone. Avoid diagnosis. " +
                "Mood trend values should map to -1 (low), 0 (neutral), 1 (improved).\n\n" +
                "Entries:\n" + sb;
    }

    private void loadCachedReport() {
        String cached = getSharedPreferences("ai_wellness_report", MODE_PRIVATE).getString("last_report_json", null);
        if (cached == null) return;

        List<Dream> allDreams = repository.getDreamsFiltered(null, "");
        if (allDreams == null || allDreams.size() < 3) return;

        applyReportFromJson(cached, allDreams.subList(0, 3));
    }

    private void applyReportFromJson(String response, List<Dream> last3) {
        try {
            String cleaned = response.replaceAll("```json", "").replaceAll("```", "").trim();
            JSONObject json = new JSONObject(cleaned);

            getSharedPreferences("ai_wellness_report", MODE_PRIVATE)
                    .edit()
                    .putString("last_report_json", cleaned)
                    .apply();

            String moodStatus = json.optString("mood_status", "Mood Stable");
            String moodExplanation = json.optString("mood_explanation",
                    "Your recent dreams suggest steady emotional tone with manageable stress.");
            int stressScore = clampInt(json.optInt("stress_score", 35), 0, 100);
            String stressLabel = json.optString("stress_label", scoreToStressLabel(stressScore));
            int sleepScore = clampInt(json.optInt("sleep_quality_score", 78), 0, 100);
            String sleepExplanation = json.optString("sleep_quality_explanation",
                    "Estimate based on dream disturbances and recurring fear patterns.");
            boolean severeRisk = json.optBoolean("severe_risk", false);

            tvMoodStatusTitle.setText(moodStatus);
            tvMoodStatusDesc.setText(moodExplanation);
            applyMoodStatusStyle(moodStatus);

            pbStressCircle.setProgress(stressScore);
            tvStressValue.setText(String.valueOf(stressScore));
            tvStressLabel.setText(stressLabel + " stress level");

            tvSleepScore.setText(String.valueOf(sleepScore));
            tvSleepDesc.setText(sleepExplanation);

            renderMoodTrend(json.optJSONArray("mood_trend"), json.optJSONArray("mood_trend_labels"), last3);

            // Themes
            cgThemes.removeAllViews();
            JSONArray themes = json.optJSONArray("recurring_themes");
            JSONObject themeInsights = json.optJSONObject("theme_insights");
            if (themes != null && themes.length() > 0) {
                for (int i = 0; i < themes.length(); i++) {
                    String raw = themes.optString(i, "Theme");
                    String t = capitalize(raw);
                    String meaning = "";
                    String reflection = "";
                    if (themeInsights != null) {
                        JSONObject insight = themeInsights.optJSONObject(t);
                        if (insight == null) insight = themeInsights.optJSONObject(raw);
                        if (insight != null) {
                            meaning = insight.optString("meaning", "");
                            reflection = insight.optString("reflection", "");
                        }
                    }
                    if (meaning.isEmpty()) meaning = "This theme can reflect how your mind processes stress, change, or unmet needs.";
                    if (reflection.isEmpty()) reflection = "What small, practical step would make today feel more supported?";
                    addThemeChip(t, meaning, reflection);
                }
            } else {
                applyThemesDefaults();
            }

            // Advice
            llAdvice.removeAllViews();
            JSONArray advice = json.optJSONArray("today_advice");
            if (advice != null && advice.length() > 0) {
                for (int i = 0; i < advice.length(); i++) addBulletRow(llAdvice, advice.optString(i));
            } else {
                applyAdviceDefaults();
            }

            // Mood support
            JSONArray support = json.optJSONArray("mood_support");
            boolean lowMoodState = "Low Mood Patterns Detected".equalsIgnoreCase(moodStatus) ||
                    "Distress Signals Found".equalsIgnoreCase(moodStatus);
            if (support != null && support.length() > 0 && lowMoodState) {
                cardMoodSupport.setVisibility(View.VISIBLE);
                llMoodSupport.removeAllViews();
                for (int i = 0; i < support.length(); i++) addBulletRow(llMoodSupport, support.optString(i));
            } else {
                cardMoodSupport.setVisibility(View.GONE);
            }

            cardEmergency.setVisibility(severeRisk ? View.VISIBLE : View.GONE);
        } catch (Exception e) {
            Log.e(TAG, "JSON parse error", e);
            applyFallbackReport(last3);
        }
    }

    private void applyFallbackReport(List<Dream> last3) {
        int nightmares = 0;
        int recurring = 0;
        int lowMood = 0;
        int totalLucidity = 0;
        int totalClarity = 0;
        int count = 0;

        for (Dream d : last3) {
            if (d == null) continue;
            count++;
            if (d.isNightmare()) nightmares++;
            if (d.isRecurring()) recurring++;
            
            totalLucidity += d.getLucidity();
            totalClarity += d.getClarity();

            String m = safe(d.getMood()).toLowerCase(Locale.ROOT);
            if (m.contains("fear") || m.contains("stress") || m.contains("bad") || m.contains("terrible")) lowMood++;
        }

        float avgLucidity = count > 0 ? (float) totalLucidity / count : 5f;
        float avgClarity = count > 0 ? (float) totalClarity / count : 5f;

        // Stress increases with nightmares, recurring patterns, low mood, AND low clarity/lucidity
        // If avgClarity is 0, add up to 20 points. If 10, add 0.
        int clarityImpact = Math.round((10 - avgClarity) * 2); 
        int stressScore = clampInt((nightmares * 30) + (recurring * 15) + (lowMood * 15) + clarityImpact, 0, 100);
        
        // Sleep quality is better with higher lucidity/clarity
        int scoreFromScores = Math.round((avgLucidity + avgClarity) * 2.5f); // Max 50 from these two
        int sleepScore = clampInt(scoreFromScores + 40 - (nightmares * 25) - (recurring * 10), 0, 100);

        String moodStatus = stressScore >= 75 ? "Distress Signals Found" :
                stressScore >= 55 ? "Elevated Stress Signs" :
                        lowMood >= 2 ? "Low Mood Patterns Detected" : "Mood Stable";

        tvMoodStatusTitle.setText(moodStatus);
        tvMoodStatusDesc.setText("This report was generated locally from your last 3 entries. For deeper insights, tap Analyze again.");
        applyMoodStatusStyle(moodStatus);

        pbStressCircle.setProgress(stressScore);
        tvStressValue.setText(String.valueOf(stressScore));
        tvStressLabel.setText(scoreToStressLabel(stressScore) + " stress level");

        tvSleepScore.setText(String.valueOf(sleepScore));
        tvSleepDesc.setText("Estimate based on nightmares, scores (Lucidity/Clarity), and emotional tone in your last 3 entries.");

        renderMoodTrend(null, null, last3);
        applyThemesDefaults();
        applyAdviceDefaults();

        boolean lowMoodState = "Low Mood Patterns Detected".equalsIgnoreCase(moodStatus) ||
                "Distress Signals Found".equalsIgnoreCase(moodStatus);
        if (lowMoodState) {
            cardMoodSupport.setVisibility(View.VISIBLE);
            llMoodSupport.removeAllViews();
            addBulletRow(llMoodSupport, "Call a trusted person");
            addBulletRow(llMoodSupport, "Get sunlight for 15 minutes");
            addBulletRow(llMoodSupport, "Eat and hydrate");
            addBulletRow(llMoodSupport, "Complete one small task");
            addBulletRow(llMoodSupport, "Write one positive memory");
        } else {
            cardMoodSupport.setVisibility(View.GONE);
        }

        cardEmergency.setVisibility(stressScore >= 90 ? View.VISIBLE : View.GONE);
    }

    private void renderMoodTrend(JSONArray trend, JSONArray labels, List<Dream> last3) {
        ArrayList<Entry> entries = new ArrayList<>();
        String[] xLabels = new String[]{"Day 1", "Day 2", "Day 3"};

        for (int i = 0; i < 3; i++) {
            float v;
            if (trend != null && i < trend.length()) {
                v = (float) trend.optInt(i, 0);
            } else if (last3 != null && i < last3.size()) {
                v = moodToTrendValue(last3.get(i).getMood());
            } else {
                v = 0f;
            }
            entries.add(new Entry(i, v));
            if (labels != null && i < labels.length()) xLabels[i] = labels.optString(i, xLabels[i]);
        }

        LineDataSet set = new LineDataSet(entries, "Mood");
        set.setColor(Color.parseColor("#39C6FF"));
        set.setLineWidth(2.6f);
        set.setCircleColor(Color.parseColor("#39C6FF"));
        set.setCircleRadius(4f);
        set.setDrawCircleHole(false);
        set.setMode(LineDataSet.Mode.CUBIC_BEZIER);
        set.setDrawValues(false);

        chartMoodTrend.getXAxis().setGranularity(1f);
        chartMoodTrend.getXAxis().setLabelCount(3, true);
        chartMoodTrend.getXAxis().setValueFormatter(new com.github.mikephil.charting.formatter.ValueFormatter() {
            @Override
            public String getFormattedValue(float value) {
                int idx = Math.round(value);
                if (idx < 0 || idx >= xLabels.length) return "";
                return xLabels[idx];
            }
        });

        chartMoodTrend.getAxisLeft().setAxisMinimum(-1.2f);
        chartMoodTrend.getAxisLeft().setAxisMaximum(1.2f);

        chartMoodTrend.setData(new LineData(set));
        chartMoodTrend.animateX(850);
        chartMoodTrend.invalidate();
    }

    private void setupMoodTrendChartDefaults() {
        chartMoodTrend.getDescription().setEnabled(false);
        chartMoodTrend.setDrawGridBackground(false);
        chartMoodTrend.getLegend().setEnabled(false);
        chartMoodTrend.setTouchEnabled(false);
        chartMoodTrend.getAxisRight().setEnabled(false);
        chartMoodTrend.getAxisLeft().setTextColor(Color.parseColor("#BFC8E8"));
        chartMoodTrend.getAxisLeft().setGridColor(Color.parseColor("#2A3567"));
        chartMoodTrend.getXAxis().setTextColor(Color.parseColor("#BFC8E8"));
        chartMoodTrend.getXAxis().setGridColor(Color.TRANSPARENT);
        chartMoodTrend.getXAxis().setAxisLineColor(Color.parseColor("#2A3567"));
        chartMoodTrend.getAxisLeft().setAxisLineColor(Color.parseColor("#2A3567"));
    }

    private void applyAdviceDefaults() {
        llAdvice.removeAllViews();
        addBulletRow(llAdvice, "Reduce caffeine later in the day");
        addBulletRow(llAdvice, "Sleep a little earlier tonight");
        addBulletRow(llAdvice, "Avoid screens before bed");
        addBulletRow(llAdvice, "Take a short walk today");
    }

    private void applyThemesDefaults() {
        cgThemes.removeAllViews();
        addThemeChip("Falling", "Often linked to pressure or feeling unprepared.",
                "What is one area where you could ask for support or simplify your plan today?");
        addThemeChip("Exams", "Common when you are self-evaluating or fearing judgment.",
                "Is there a recent goal where you can define “good enough” more kindly?");
        addThemeChip("Chased", "May reflect avoidance of an emotion or task that feels urgent.",
                "What would change if you faced the smallest part of what you’re avoiding for 10 minutes?");
        addThemeChip("Darkness", "Can signal uncertainty, transition, or a need for rest and safety.",
                "What helps you feel grounded before sleep when the day feels heavy?");
        addThemeChip("Water", "Often tied to emotional depth, change, or overwhelm.",
                "Which emotion has been most present lately, and what does it need from you?");
        addThemeChip("Family", "May reflect connection, old patterns, or unmet needs.",
                "What boundary or honest conversation would support you this week?");
    }

    private void addBulletRow(LinearLayout container, String text) {
        TextView tv = new TextView(this);
        tv.setText(text);
        tv.setTextColor(Color.parseColor("#BFC8E8"));
        tv.setTextSize(15f);
        tv.setPadding(0, dpToPx(10), 0, dpToPx(10));
        tv.setCompoundDrawablesWithIntrinsicBounds(R.drawable.ic_success, 0, 0, 0);
        tv.setCompoundDrawablePadding(dpToPx(12));
        tv.setGravity(Gravity.CENTER_VERTICAL);
        container.addView(tv);
    }

    private void addThemeChip(String label, String meaning, String reflection) {
        Chip chip = new Chip(this);
        chip.setText(label);
        chip.setTextColor(Color.WHITE);
        chip.setTextSize(15f);
        chip.setChipBackgroundColor(android.content.res.ColorStateList.valueOf(Color.parseColor("#2A3567")));
        chip.setChipStrokeColor(android.content.res.ColorStateList.valueOf(Color.parseColor("#39C6FF")));
        chip.setChipStrokeWidth(1f);
        chip.setShapeAppearanceModel(chip.getShapeAppearanceModel().toBuilder().setAllCornerSizes(44f).build());
        chip.setClickable(true);
        chip.setCheckable(false);
        chip.setOnClickListener(v -> ThemeInsightBottomSheet
                .newInstance(label, meaning, reflection)
                .show(getSupportFragmentManager(), "THEME_INSIGHT"));
        cgThemes.addView(chip);
    }

    private void applyMoodStatusStyle(String moodStatus) {
        View card = findViewById(R.id.cardMoodStatus);
        if (!(card instanceof com.google.android.material.card.MaterialCardView)) return;
        com.google.android.material.card.MaterialCardView mcv = (com.google.android.material.card.MaterialCardView) card;

        int bg;
        int stroke;
        if ("Distress Signals Found".equalsIgnoreCase(moodStatus)) {
            bg = Color.parseColor("#3A1B22");
            stroke = Color.parseColor("#B4232E");
        } else if ("Low Mood Patterns Detected".equalsIgnoreCase(moodStatus)) {
            bg = Color.parseColor("#2F2233");
            stroke = Color.parseColor("#8B5CFF");
        } else if ("Elevated Stress Signs".equalsIgnoreCase(moodStatus)) {
            bg = Color.parseColor("#2F2B1F");
            stroke = Color.parseColor("#F6C65B");
        } else {
            bg = Color.parseColor("#22366B");
            stroke = Color.parseColor("#39C6FF");
        }
        mcv.setCardBackgroundColor(bg);
        mcv.setStrokeColor(stroke);
        mcv.setStrokeWidth(dpToPx(1));
    }

    private float moodToTrendValue(String mood) {
        if (mood == null) return 0f;
        String m = mood.toLowerCase(Locale.ROOT);
        if (m.contains("happy") || m.contains("calm") || m.contains("good")) return 1f;
        if (m.contains("neutral") || m.contains("unclear")) return 0f;
        if (m.contains("stress") || m.contains("fear") || m.contains("bad") || m.contains("terrible")) return -1f;
        return 0f;
    }

    private int clampInt(int v, int min, int max) {
        return Math.max(min, Math.min(max, v));
    }

    private String scoreToStressLabel(int score) {
        if (score >= 67) return "High";
        if (score >= 34) return "Moderate";
        return "Low";
    }

    private int dpToPx(int dp) {
        float density = getResources().getDisplayMetrics().density;
        return Math.round(dp * density);
    }

    private String capitalize(String word) {
        if (word == null || word.isEmpty()) return word;
        return Character.toUpperCase(word.charAt(0)) + word.substring(1);
    }

    private String safe(String s) {
        return s == null ? "" : s.trim();
    }

    @Override
    protected void onResume() {
        super.onResume();
        loadCachedReport();
    }
}

