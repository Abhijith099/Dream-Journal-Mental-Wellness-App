package com.abb.luciddreams;

import android.animation.ValueAnimator;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.util.Log;
import android.widget.ImageView;
import com.google.android.material.button.MaterialButtonToggleGroup;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import android.view.Window;
import android.view.WindowManager;
import android.view.animation.DecelerateInterpolator;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.res.ResourcesCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.google.android.material.chip.Chip;
import com.google.android.material.chip.ChipGroup;
import com.github.mikephil.charting.charts.LineChart;
import com.github.mikephil.charting.components.XAxis;
import com.github.mikephil.charting.data.Entry;
import com.github.mikephil.charting.data.LineData;
import com.github.mikephil.charting.data.LineDataSet;
import com.github.mikephil.charting.formatter.ValueFormatter;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

public class AnalysisDashboardActivity extends AppCompatActivity {

    private DreamRepository repository;
    private TextView tvTotalDreamsCount;
    private TextView tvOverallEmotion;
    private TextView tvDominantThemes;
    private ChipGroup cgThemeChips;
    private LinearLayout llCalendarGrid;
    private TextView tvCalendarMonth;
    private Typeface poppins;

    private Calendar displayedMonth;
    private List<Long> datesWithDreams;

    private GeminiService geminiService;
    private ProgressBar pbAiLoading;
    private View btnRefreshAi;
    private TextView tvAiStatus;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);

        setContentView(R.layout.activity_analysis_dashboard);

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.analysis_dashboard_root), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, 0);
            return insets;
        });

        poppins = ResourcesCompat.getFont(this, R.font.poppins);
        repository = new DreamRepository(this);
        geminiService = new GeminiService();
        displayedMonth = Calendar.getInstance();

        initViews();
        setupBottomNav();
        setupFab();
        setupCalendarNav();
        loadData();
        loadCachedAiAnalysis();
    }

    private void loadCachedAiAnalysis() {
        android.content.SharedPreferences prefs = getSharedPreferences("ai_insights", MODE_PRIVATE);
        String cachedJson = prefs.getString("last_analysis", null);
        if (cachedJson != null) {
            updateUiWithAiResponse(cachedJson);
            tvAiStatus.setText("Showing last analysis");
        }
    }

    private ProgressBar pbWellnessCircle, pbMoodStability, pbStressLevel, pbAnxietySigns;
    private TextView tvWellnessPercentage, tvMoodStabilityLabel, tvStressLevelLabel, tvAnxietySignsLabel, tvAiAlertMessage, tvEmotionalHealthSummary;
    private LinearLayout llSuggestions;
    private MaterialButtonToggleGroup toggleGroupTrends;
    private LineChart vTrendGraph;

    private void initViews() {
        tvTotalDreamsCount = findViewById(R.id.tvTotalDreamsCount);
        tvOverallEmotion = findViewById(R.id.tvOverallEmotion);
        tvDominantThemes = findViewById(R.id.tvDominantThemes);
        cgThemeChips = findViewById(R.id.cgThemeChips);
        llCalendarGrid = findViewById(R.id.llCalendarGrid);
        tvCalendarMonth = findViewById(R.id.tvCalendarMonth);

        pbWellnessCircle = findViewById(R.id.pbWellnessCircle);
        tvWellnessPercentage = findViewById(R.id.tvWellnessPercentage);
        pbMoodStability = findViewById(R.id.pbMoodStability);
        tvMoodStabilityLabel = findViewById(R.id.tvMoodStability);
        pbStressLevel = findViewById(R.id.pbStressLevel);
        tvStressLevelLabel = findViewById(R.id.tvStressLevel);
        pbAnxietySigns = findViewById(R.id.pbAnxietySigns);
        tvAnxietySignsLabel = findViewById(R.id.tvAnxietySigns);
        tvAiAlertMessage = findViewById(R.id.tvAiAlertMessage);
        llSuggestions = findViewById(R.id.llSuggestions);
        tvEmotionalHealthSummary = findViewById(R.id.tvEmotionalHealthSummary);
        toggleGroupTrends = findViewById(R.id.toggleGroupTrends);
        vTrendGraph = findViewById(R.id.vTrendGraph);

        pbAiLoading = findViewById(R.id.pbAiLoading);
        btnRefreshAi = findViewById(R.id.btnRefreshAi);
        tvAiStatus = findViewById(R.id.tvAiStatus);

        btnRefreshAi.setOnClickListener(v -> performAiAnalysis());

        toggleGroupTrends.addOnButtonCheckedListener((group, checkedId, isChecked) -> {
            if (isChecked) {
                loadTrends(checkedId == R.id.btn30Days ? 30 : 7);
            }
        });
    }

    private void performAiAnalysis() {
        List<Dream> recentDreams = repository.getDreamsFiltered(null, "");
        if (recentDreams.isEmpty()) {
            PremiumToast.show(this, "Add some dreams first for AI analysis!");
            return;
        }

        pbAiLoading.setVisibility(View.VISIBLE);
        tvAiStatus.setText("AI is analyzing your subconscious...");
        btnRefreshAi.setEnabled(false);

        StringBuilder dreamContent = new StringBuilder();
        for (int i = 0; i < Math.min(recentDreams.size(), 10); i++) {
            Dream d = recentDreams.get(i);
            dreamContent.append("Dream ").append(i + 1).append(": ").append(d.getDescription()).append("\n");
        }

        String prompt = "Analyze these recent dream journal entries and provide a JSON response with the following fields: " +
                "'wellness_score' (0-100), 'mood_stability' (0-100), 'stress_level' ('Low', 'Medium', 'High'), " +
                "'anxiety_signs' ('Low', 'Medium', 'High'), 'ai_alert' (a 1-sentence observation), " +
                "'dominant_themes' (array of strings), 'suggestions' (array of 3 strings), 'emotional_health_summary' (a paragraph). " +
                "Be insightful and empathetic. Dreams:\n" + dreamContent.toString();

        geminiService.analyzeDreams(prompt, new GeminiService.GeminiListener() {
            @Override
            public void onSuccess(String response) {
                pbAiLoading.setVisibility(View.GONE);
                tvAiStatus.setText("Personalized AI insights updated");
                btnRefreshAi.setEnabled(true);
                updateUiWithAiResponse(response);
            }

            @Override
            public void onError(String error) {
                pbAiLoading.setVisibility(View.GONE);
                tvAiStatus.setText("Analysis failed. Try again.");
                btnRefreshAi.setEnabled(true);
                PremiumToast.show(AnalysisDashboardActivity.this, "AI Analysis Error: " + error);
            }
        });
    }

    private void updateUiWithAiResponse(String response) {
        try {
            // Remove markdown code blocks if present
            String cleanedResponse = response.replaceAll("```json", "").replaceAll("```", "").trim();
            org.json.JSONObject json = new org.json.JSONObject(cleanedResponse);

            // Save to cache
            getSharedPreferences("ai_insights", MODE_PRIVATE)
                    .edit()
                    .putString("last_analysis", cleanedResponse)
                    .apply();

            int wellness = json.optInt("wellness_score", 70);
            int stability = json.optInt("mood_stability", 70);
            String stress = json.optString("stress_level", "Medium");
            String anxiety = json.optString("anxiety_signs", "Low");
            String alert = json.optString("ai_alert", "No major patterns detected.");
            String summary = json.optString("emotional_health_summary", "");

            pbWellnessCircle.setProgress(wellness);
            tvWellnessPercentage.setText(wellness + "%");
            pbMoodStability.setProgress(stability);
            tvMoodStabilityLabel.setText("Mood Stability: " + stability + "%");
            
            tvStressLevelLabel.setText("Stress Level: " + stress);
            pbStressLevel.setProgress(stress.equalsIgnoreCase("High") ? 85 : stress.equalsIgnoreCase("Medium") ? 50 : 20);
            
            tvAnxietySignsLabel.setText("Anxiety Signs: " + anxiety);
            pbAnxietySigns.setProgress(anxiety.equalsIgnoreCase("High") ? 85 : anxiety.equalsIgnoreCase("Medium") ? 50 : 20);

            tvAiAlertMessage.setText(alert);
            tvEmotionalHealthSummary.setText(summary);

            // Update Themes
            org.json.JSONArray themes = json.optJSONArray("dominant_themes");
            if (themes != null) {
                cgThemeChips.removeAllViews();
                tvDominantThemes.setText("Your dreams often revolve around:");
                for (int i = 0; i < themes.length(); i++) {
                    Chip chip = new Chip(this);
                    chip.setText(capitalize(themes.getString(i)));
                    chip.setTextColor(Color.WHITE);
                    chip.setTextSize(15f);
                    if (poppins != null) chip.setTypeface(poppins);
                    chip.setChipBackgroundColorResource(R.color.accent_purple);
                    chip.setClickable(false);
                    cgThemeChips.addView(chip);
                }
            }

            // Update Suggestions
            org.json.JSONArray suggestions = json.optJSONArray("suggestions");
            if (suggestions != null) {
                llSuggestions.removeAllViews();
                for (int i = 0; i < suggestions.length(); i++) {
                    addSuggestion(suggestions.getString(i), R.drawable.ic_insights);
                }
            }

        } catch (Exception e) {
            Log.e("AnalysisDashboard", "JSON Parse error", e);
        }
    }

    private void setupFab() {
        FloatingActionButton fabAdd = findViewById(R.id.fabAdd);
        fabAdd.setOnClickListener(v -> {
            Intent intent = new Intent(this, AddDreamActivity.class);
            startActivity(intent);
        });
    }

    private void setupCalendarNav() {
        findViewById(R.id.ivCalPrev).setOnClickListener(v -> {
            displayedMonth.add(Calendar.MONTH, -1);
            buildCalendar();
        });
        findViewById(R.id.ivCalNext).setOnClickListener(v -> {
            displayedMonth.add(Calendar.MONTH, 1);
            buildCalendar();
        });
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
                Intent intent = new Intent(this, ProfileActivity.class);
                startActivity(intent);
                overridePendingTransition(0, 0);
                return true;
            }
            return id == R.id.nav_analysis;
        });
    }

    private void loadData() {
        long thirtyDaysAgo = System.currentTimeMillis() - (30L * 24 * 60 * 60 * 1000);
        Map<String, Object> stats = repository.getStatsSummary(0);
        Map<String, Double> factors = repository.getDreamFactors(thirtyDaysAgo);
        List<Map.Entry<String, Integer>> moods = repository.getMoodSummary(thirtyDaysAgo);

        Object lifetimeObj = stats.getOrDefault("totalDreamsLifetime", 0);
        int totalDreams = (lifetimeObj instanceof Integer) ? (int) lifetimeObj : 0;
        animateCounter(tvTotalDreamsCount, totalDreams);

        if (!moods.isEmpty()) {
            tvOverallEmotion.setText(getMoodName(moods.get(0).getKey()));
        } else {
            tvOverallEmotion.setText("-");
        }

        updateWellnessScore(factors, moods);
        loadTrends(toggleGroupTrends.getCheckedButtonId() == R.id.btn30Days ? 30 : 7);
        updateSuggestions(factors, moods);

        // Dominant themes (keywords)
        List<Map.Entry<String, Integer>> keywords = repository.getKeywords(0);
        cgThemeChips.removeAllViews();
        if (!keywords.isEmpty()) {
            StringBuilder sb = new StringBuilder("Your dreams often revolve around:");
            tvDominantThemes.setText(sb.toString());
            int count = 0;
            for (Map.Entry<String, Integer> entry : keywords) {
                Chip chip = new Chip(this);
                chip.setText(capitalize(entry.getKey()));
                chip.setTextColor(Color.WHITE);
                chip.setTextSize(15f);
                if (poppins != null) chip.setTypeface(poppins);
                if (count == 0) {
                    chip.setChipBackgroundColorResource(R.color.glow_primary);
                } else if (count % 2 == 0) {
                    chip.setChipBackgroundColorResource(R.color.accent_purple);
                } else {
                    chip.setChipBackgroundColor(
                            android.content.res.ColorStateList.valueOf(Color.parseColor("#2A3567")));
                    chip.setChipStrokeColor(
                            android.content.res.ColorStateList.valueOf(Color.parseColor("#39C6FF")));
                    chip.setChipStrokeWidth(1.5f);
                }
                chip.setShapeAppearanceModel(chip.getShapeAppearanceModel().toBuilder()
                        .setAllCornerSizes(44f).build());
                if (count == 0 || count % 2 == 0) {
                    chip.setChipStrokeWidth(0);
                }
                chip.setClickable(false);
                chip.setCheckable(false);
                cgThemeChips.addView(chip);
                count++;
            }
        } else {
            tvDominantThemes.setText("Keep journaling to reveal your dominant dream themes.");
        }

        // Calendar
        datesWithDreams = repository.getDatesWithDreams();
        buildCalendar();
    }

    private void buildCalendar() {
        llCalendarGrid.removeAllViews();

        // Build set of \"yyyy-MM-dd\" strings for quick lookup
        SimpleDateFormat dayFmt = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
        Set<String> dreamDaySet = new HashSet<>();
        if (datesWithDreams != null) {
            for (Long ts : datesWithDreams) {
                dreamDaySet.add(dayFmt.format(new Date(ts)));
            }
        }

        // Update month header
        SimpleDateFormat monthFmt = new SimpleDateFormat("MMMM yyyy", Locale.getDefault());
        tvCalendarMonth.setText(monthFmt.format(displayedMonth.getTime()));

        Calendar cal = (Calendar) displayedMonth.clone();
        cal.set(Calendar.DAY_OF_MONTH, 1);
        int firstDayOfWeek = cal.get(Calendar.DAY_OF_WEEK) - 1; // 0=Sun
        int daysInMonth = cal.getActualMaximum(Calendar.DAY_OF_MONTH);

        Calendar todayCal = Calendar.getInstance();
        int todayYear = todayCal.get(Calendar.YEAR);
        int todayMonth = todayCal.get(Calendar.MONTH);
        int todayDay = todayCal.get(Calendar.DAY_OF_MONTH);

        int year = displayedMonth.get(Calendar.YEAR);
        int month = displayedMonth.get(Calendar.MONTH);

        int dayNumber = 1;
        int totalCells = firstDayOfWeek + daysInMonth;
        int rows = (int) Math.ceil(totalCells / 7.0);

        for (int row = 0; row < rows; row++) {
            LinearLayout rowLayout = new LinearLayout(this);
            rowLayout.setLayoutParams(new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT));
            rowLayout.setOrientation(LinearLayout.HORIZONTAL);

            for (int col = 0; col < 7; col++) {
                int cellIndex = row * 7 + col;
                LinearLayout cellLayout = new LinearLayout(this);
                LinearLayout.LayoutParams cellParams = new LinearLayout.LayoutParams(
                        0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
                cellLayout.setLayoutParams(cellParams);
                cellLayout.setOrientation(LinearLayout.VERTICAL);
                cellLayout.setGravity(Gravity.CENTER_HORIZONTAL);
                int cellPad = dpToPx(4);
                cellLayout.setPadding(cellPad, cellPad, cellPad, cellPad);

                if (cellIndex >= firstDayOfWeek && dayNumber <= daysInMonth) {
                    final int day = dayNumber;
                    // Format check date
                    cal.set(year, month, day);
                    String dateKey = dayFmt.format(cal.getTime());
                    boolean hasDream = dreamDaySet.contains(dateKey);
                    boolean isToday = (year == todayYear && month == todayMonth && day == todayDay);

                    // Day number text
                    TextView tvDay = new TextView(this);
                    tvDay.setText(String.valueOf(day));
                    tvDay.setTextSize(15f);
                    tvDay.setGravity(Gravity.CENTER);
                    if (poppins != null) tvDay.setTypeface(poppins);

                    if (isToday) {
                        tvDay.setTextColor(Color.parseColor("#171F4B"));
                        tvDay.setBackground(createCircleBackground(Color.parseColor("#39C6FF")));
                        int pad = dpToPx(6);
                        tvDay.setPadding(pad, pad, pad, pad);
                        tvDay.setTypeface(poppins, Typeface.BOLD);
                    } else if (hasDream) {
                        tvDay.setTextColor(Color.WHITE);
                    } else {
                        tvDay.setTextColor(Color.parseColor("#C5CAE9"));
                    }

                    cellLayout.addView(tvDay);

                    // Dream dot
                    if (hasDream) {
                        ImageView ivDot = new ImageView(this);
                        ivDot.setImageResource(R.drawable.ic_calendar_dot);
                        LinearLayout.LayoutParams dotParams = new LinearLayout.LayoutParams(
                                dpToPx(8), dpToPx(8));
                        dotParams.topMargin = dpToPx(2);
                        ivDot.setLayoutParams(dotParams);
                        cellLayout.addView(ivDot);
                    }

                    // Tap to show dream count
                    if (hasDream) {
                        final String fDateKey = dateKey;
                        cellLayout.setOnClickListener(v -> {
                            int count = countDreamsOnDate(fDateKey, dayFmt);
                            PremiumToast.show(this,
                                    count + (count == 1 ? " dream" : " dreams") + " on this day");
                        });
                    }

                    dayNumber++;
                }

                rowLayout.addView(cellLayout);
            }

            llCalendarGrid.addView(rowLayout);
        }
    }

    private int countDreamsOnDate(String dateKey, SimpleDateFormat fmt) {
        if (datesWithDreams == null) return 0;
        try {
            Date d = fmt.parse(dateKey);
            if (d != null) {
                List<Dream> dreams = repository.getDreamsFiltered(d.getTime(), "");
                return dreams.size();
            }
        } catch (Exception ignored) {}
        return 0;
    }

    private android.graphics.drawable.GradientDrawable createCircleBackground(int color) {
        android.graphics.drawable.GradientDrawable circle = new android.graphics.drawable.GradientDrawable();
        circle.setShape(android.graphics.drawable.GradientDrawable.OVAL);
        circle.setColor(color);
        return circle;
    }

    private void updateWellnessScore(Map<String, Double> factors, List<Map.Entry<String, Integer>> moods) {
        double nightmarePercent = factors.getOrDefault("nightmarePercent", 0.0);
        double avgClarity = factors.getOrDefault("avgClarity", 50.0);
        
        // Calculate Mood Stability (based on variety of moods)
        int totalMoods = 0;
        for (Map.Entry<String, Integer> entry : moods) totalMoods += entry.getValue();
        double stability = 100.0;
        if (totalMoods > 0) {
            double dominantPercent = (double) moods.get(0).getValue() / totalMoods;
            stability = (0.5 + (dominantPercent * 0.5)) * 100; // Simplified stability logic
        }

        // Stress level from nightmare percentage and specific moods
        double stress = nightmarePercent; 
        for (Map.Entry<String, Integer> entry : moods) {
            String key = entry.getKey();
            if ("Fearful".equals(key) || "Stressed".equals(key) || "🔥".equals(key) || "⚡".equals(key)) {
                stress += (entry.getValue() * 10.0);
            }
        }
        stress = Math.min(100, stress);

        // Anxiety from nightmare + recurring
        double anxiety = factors.getOrDefault("recurringPercent", 0.0) + (nightmarePercent / 2);
        anxiety = Math.min(100, anxiety);

        int wellnessScore = (int) ((stability + (100 - stress) + (100 - anxiety) + avgClarity) / 4);
        
        pbWellnessCircle.setProgress(wellnessScore);
        tvWellnessPercentage.setText(wellnessScore + "%");
        
        pbMoodStability.setProgress((int) stability);
        tvMoodStabilityLabel.setText("Mood Stability: " + (int) stability + "%");
        
        pbStressLevel.setProgress((int) stress);
        tvStressLevelLabel.setText("Stress Level: " + (stress > 60 ? "High" : stress > 30 ? "Medium" : "Low"));
        
        pbAnxietySigns.setProgress((int) anxiety);
        tvAnxietySignsLabel.setText("Anxiety Signs: " + (anxiety > 60 ? "High" : anxiety > 30 ? "Medium" : "Low"));

        // AI Alert logic
        if (stress > 50 || nightmarePercent > 30) {
            tvAiAlertMessage.setText("Your recent dream patterns indicate elevated stress. Consider a relaxing pre-sleep routine.");
            tvEmotionalHealthSummary.setText("Action required: Stress indicators are high this week.");
        } else {
            tvAiAlertMessage.setText("Your dream patterns look healthy and stable. Keep up the consistent journaling!");
            tvEmotionalHealthSummary.setText("Stable this week. No major concern detected.");
        }
    }

    private void loadTrends(int days) {
        long startTime = System.currentTimeMillis() - (days * 24L * 60 * 60 * 1000);
        List<Dream> history = repository.getMoodHistory(startTime);
        
        setupChart(days, history);
    }

    private void setupChart(int days, List<Dream> dreams) {
        vTrendGraph.getDescription().setEnabled(false);
        vTrendGraph.setDrawGridBackground(false);
        vTrendGraph.getLegend().setEnabled(false);
        vTrendGraph.setTouchEnabled(false);

        XAxis xAxis = vTrendGraph.getXAxis();
        xAxis.setPosition(XAxis.XAxisPosition.BOTTOM);
        xAxis.setTextColor(Color.parseColor("#C5CAE9"));
        xAxis.setDrawGridLines(false);
        xAxis.setGranularity(1f);
        xAxis.setLabelCount(days > 7 ? 6 : days);

        vTrendGraph.getAxisLeft().setTextColor(Color.parseColor("#C5CAE9"));
        vTrendGraph.getAxisLeft().setDrawGridLines(true);
        vTrendGraph.getAxisLeft().setGridColor(Color.parseColor("#2A3567"));
        vTrendGraph.getAxisRight().setEnabled(false);

        ArrayList<Entry> stressEntries = new ArrayList<>();
        ArrayList<Entry> anxietyEntries = new ArrayList<>();
        ArrayList<Entry> qualityEntries = new ArrayList<>();

        // Group data by day
        Calendar cal = Calendar.getInstance();
        for (int i = 0; i < days; i++) {
            cal.setTimeInMillis(System.currentTimeMillis());
            cal.add(Calendar.DAY_OF_YEAR, -(days - 1 - i));
            cal.set(Calendar.HOUR_OF_DAY, 0);
            cal.set(Calendar.MINUTE, 0);
            cal.set(Calendar.SECOND, 0);
            cal.set(Calendar.MILLISECOND, 0);
            long dayStart = cal.getTimeInMillis();
            long dayEnd = dayStart + (24 * 60 * 60 * 1000);

            float stressDay = 0, anxietyDay = 0, qualityDay = 0;
            int count = 0;

            for (Dream d : dreams) {
                if (d.getTimestamp() >= dayStart && d.getTimestamp() < dayEnd) {
                    stressDay += (d.isNightmare() ? 80 : 20);
                    anxietyDay += (d.isRecurring() ? 70 : 30);
                    qualityDay += (d.getClarity() * 10);
                    count++;
                }
            }

            if (count > 0) {
                stressEntries.add(new Entry(i, stressDay / count));
                anxietyEntries.add(new Entry(i, anxietyDay / count));
                qualityEntries.add(new Entry(i, qualityDay / count));
            } else {
                stressEntries.add(new Entry(i, 20f));
                anxietyEntries.add(new Entry(i, 30f));
                qualityEntries.add(new Entry(i, 50f));
            }
        }

        LineDataSet stressSet = createDataSet(stressEntries, "Stress", "#39C6FF");
        LineDataSet anxietySet = createDataSet(anxietyEntries, "Anxiety", "#8B5CFF");
        LineDataSet qualitySet = createDataSet(qualityEntries, "Quality", "#4CAF82");

        vTrendGraph.setData(new LineData(stressSet, anxietySet, qualitySet));
        vTrendGraph.animateX(1000);
    }

    private LineDataSet createDataSet(ArrayList<Entry> entries, String label, String color) {
        LineDataSet set = new LineDataSet(entries, label);
        set.setColor(Color.parseColor(color));
        set.setLineWidth(2.5f);
        set.setCircleColor(Color.parseColor(color));
        set.setCircleRadius(3f);
        set.setDrawCircleHole(false);
        set.setMode(LineDataSet.Mode.CUBIC_BEZIER);
        set.setDrawValues(false);
        return set;
    }

    private void updateSuggestions(Map<String, Double> factors, List<Map.Entry<String, Integer>> moods) {
        llSuggestions.removeAllViews();
        double stress = factors.getOrDefault("nightmarePercent", 0.0);
        
        if (stress > 40) {
            addSuggestion("Try a 10-minute meditation before bed", R.drawable.ic_meditation);
            addSuggestion("Avoid screens 1 hour before sleep", R.drawable.ic_no_screens);
            addSuggestion("Write down 3 things you're grateful for", R.drawable.ic_gratitude);
        } else {
            addSuggestion("Try chamomile tea for even deeper rest", R.drawable.ic_tea);
            addSuggestion("Read a fiction book to stimulate creativity", R.drawable.ic_journal);
            addSuggestion("Get 15 mins of morning sunlight tomorrow", R.drawable.ic_sunlight);
        }
    }

    private void addSuggestion(String text, int iconRes) {
        TextView tv = new TextView(this);
        tv.setText(text);
        tv.setTextColor(Color.parseColor("#C5CAE9"));
        tv.setTextSize(14f);
        tv.setPadding(0, dpToPx(8), 0, dpToPx(8));
        tv.setCompoundDrawablesWithIntrinsicBounds(iconRes, 0, 0, 0);
        tv.setCompoundDrawablePadding(dpToPx(12));
        tv.setGravity(Gravity.CENTER_VERTICAL);
        if (poppins != null) tv.setTypeface(poppins);
        llSuggestions.addView(tv);
    }

    private float spToPx(int sp) {
        return sp * getResources().getDisplayMetrics().scaledDensity / getResources().getDisplayMetrics().density;
    }

    private void animateCounter(TextView textView, int target) {
        if (target == 0) {
            textView.setText("0");
            return;
        }
        ValueAnimator animator = ValueAnimator.ofInt(0, target);
        animator.setDuration(1200);
        animator.setInterpolator(new DecelerateInterpolator());
        animator.addUpdateListener(animation ->
                textView.setText(String.valueOf((int) animation.getAnimatedValue())));
        animator.start();
    }

    private String getMoodName(String mood) {
        if (mood == null) return "Wonder";
        switch (mood) {
            case "Happy":
            case "✨":
                return "Happy";
            case "Calm":
            case "🌙":
                return "Calm";
            case "Neutral":
            case "Unclear":
            case "☁":
                return "Neutral";
            case "Stressed":
            case "⚡":
                return "Stressed";
            case "Fearful":
            case "🔥":
                return "Fearful";
            default: return "Wonder";
        }
    }

    private String capitalize(String word) {
        if (word == null || word.isEmpty()) return word;
        return Character.toUpperCase(word.charAt(0)) + word.substring(1);
    }

    private int dpToPx(int dp) {
        float density = getResources().getDisplayMetrics().density;
        return Math.round(dp * density);
    }

    @Override
    protected void onResume() {
        super.onResume();
        // Refresh data when returning from adding a dream
        datesWithDreams = repository.getDatesWithDreams();
        loadData();
        loadCachedAiAnalysis();
    }
}
