package com.abb.luciddreams;

import android.animation.ObjectAnimator;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.animation.DecelerateInterpolator;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.github.mikephil.charting.charts.LineChart;
import com.github.mikephil.charting.components.XAxis;
import com.github.mikephil.charting.components.YAxis;
import com.github.mikephil.charting.data.Entry;
import com.github.mikephil.charting.data.LineData;
import com.github.mikephil.charting.data.LineDataSet;
import com.github.mikephil.charting.formatter.ValueFormatter;
import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.google.android.material.button.MaterialButtonToggleGroup;
import com.google.android.material.chip.Chip;
import com.google.android.material.chip.ChipGroup;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class PatternsActivity extends AppCompatActivity {

    private DreamRepository repository;
    private MaterialButtonToggleGroup toggleGroup;
    private LinearLayout llMoodSummaryContainer, llFactorsContainer;
    private ChipGroup cgKeywords;
    private LineChart moodChart;
    private TextView tvTotalDreams, tvPeriodDreams, tvInsight;
    private View llEmptyState;
    private BottomNavigationView bottomNav;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_patterns);

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.patterns_root), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, 0);
            return insets;
        });

        repository = new DreamRepository(this);
        initViews();
        setupListeners();
        setupBottomNav();
        
        // Default to Month view
        loadData(getTimeFilter("Month"));
    }

    private void initViews() {
        toggleGroup = findViewById(R.id.toggleGroupFilter);
        llMoodSummaryContainer = findViewById(R.id.llMoodSummaryContainer);
        llFactorsContainer = findViewById(R.id.llFactorsContainer);
        cgKeywords = findViewById(R.id.cgKeywords);
        moodChart = findViewById(R.id.moodChart);
        tvTotalDreams = findViewById(R.id.tvTotalDreams);
        tvPeriodDreams = findViewById(R.id.tvPeriodDreams);
        tvInsight = findViewById(R.id.tvInsight);
        llEmptyState = findViewById(R.id.llEmptyState);
        bottomNav = findViewById(R.id.bottomNav);

        setupChart();
    }

    private void setupListeners() {
        toggleGroup.addOnButtonCheckedListener((group, checkedId, isChecked) -> {
            if (isChecked) {
                String filter = "Month";
                if (checkedId == R.id.btnDay) filter = "Day";
                else if (checkedId == R.id.btnYear) filter = "Year";
                else if (checkedId == R.id.btnLifetime) filter = "Lifetime";
                loadData(getTimeFilter(filter));
            }
        });
    }

    private void setupBottomNav() {
        bottomNav.setSelectedItemId(R.id.nav_patterns);
        bottomNav.setOnItemSelectedListener(item -> {
            int id = item.getItemId();
            if (id == R.id.nav_dreams) {
                Intent intent = new Intent(this, MainActivity.class);
                intent.setFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
                startActivity(intent);
                overridePendingTransition(0, 0);
                return true;
            } else if (id == R.id.nav_analysis) {
                Intent intent = new Intent(this, AnalysisDashboardActivity.class);
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
            return id == R.id.nav_patterns;
        });
    }

    private long getTimeFilter(String filter) {
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, 0);
        cal.set(Calendar.MINUTE, 0);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);

        switch (filter) {
            case "Day": return cal.getTimeInMillis();
            case "Month": 
                cal.set(Calendar.DAY_OF_MONTH, 1);
                return cal.getTimeInMillis();
            case "Year": 
                cal.set(Calendar.DAY_OF_YEAR, 1);
                return cal.getTimeInMillis();
            default: return 0; // Covers "Lifetime" and any other cases
        }
    }

    private void loadData(long startTime) {
        Map<String, Object> stats = repository.getStatsSummary(startTime);
        Object periodObj = stats.getOrDefault("totalDreamsPeriod", 0);
        Object lifetimeObj = stats.getOrDefault("totalDreamsLifetime", 0);
        
        int periodCount = (periodObj instanceof Integer) ? (int) periodObj : 0;
        int lifetimeCount = (lifetimeObj instanceof Integer) ? (int) lifetimeObj : 0;
        
        if (lifetimeCount == 0) {
            llEmptyState.setVisibility(View.VISIBLE);
            tvPeriodDreams.setText("0 Dreams");
            tvTotalDreams.setText("0 Total");
            return;
        }
        llEmptyState.setVisibility(View.GONE);

        updateInsight(startTime);
        updateMoodSummary(repository.getMoodSummary(startTime));
        updateFactors(repository.getDreamFactors(startTime));
        updateChart(repository.getMoodHistory(startTime));
        updateKeywords(repository.getKeywords(startTime));
        
        tvPeriodDreams.setText(periodCount + (periodCount == 1 ? " Dream" : " Dreams"));
        tvTotalDreams.setText(lifetimeCount + " Total");
    }

    private void updateFactors(Map<String, Double> factors) {
        llFactorsContainer.removeAllViews();
        if (factors.isEmpty()) return;

        LayoutInflater inflater = LayoutInflater.from(this);
        
        addFactorRow(inflater, "Average Clarity", factors.getOrDefault("avgClarity", 0.0), 10.0, true);
        addFactorRow(inflater, "Average Lucidity", factors.getOrDefault("avgLucidity", 0.0), 10.0, true);
        addFactorRow(inflater, "Nightmare Frequency", factors.getOrDefault("nightmarePercent", 0.0), 100.0, false);
        addFactorRow(inflater, "Recurring Dreams", factors.getOrDefault("recurringPercent", 0.0), 100.0, false);
    }

    private void addFactorRow(LayoutInflater inflater, String label, Double value, double max, boolean isDecimal) {
        View itemView = inflater.inflate(R.layout.item_factor_row, llFactorsContainer, false);
        TextView tvLabel = itemView.findViewById(R.id.tvFactorLabel);
        TextView tvValue = itemView.findViewById(R.id.tvFactorValue);
        ProgressBar pb = itemView.findViewById(R.id.pbFactor);

        tvLabel.setText(label);
        
        if (isDecimal) {
            tvValue.setText(String.format(Locale.getDefault(), "%.1f", value));
        } else {
            tvValue.setText(Math.round(value) + "%");
        }
        
        pb.setMax((int) (max * 10));
        ObjectAnimator.ofInt(pb, "progress", 0, (int) (value * 10)).setDuration(1000).start();
        
        llFactorsContainer.addView(itemView);
    }

    private void updateInsight(long startTime) {
        // Simple logic to generate an insight sentence
        List<Map.Entry<String, Integer>> keywords = repository.getKeywords(startTime);
        if (keywords.isEmpty()) {
            tvInsight.setText("Keep journaling to unlock deep pattern insights.");
            return;
        }
        
        String topWord = keywords.get(0).getKey();
        String secondWord = keywords.size() > 1 ? keywords.get(1).getKey() : "transformation";
        
        tvInsight.setText("“Your dreams this period focused on " + topWord + " and " + secondWord + ".”");
    }

    private void updateMoodSummary(List<Map.Entry<String, Integer>> moods) {
        llMoodSummaryContainer.removeAllViews();
        if (moods.isEmpty()) return;

        int max = 0;
        for (Map.Entry<String, Integer> entry : moods) if (entry.getValue() > max) max = entry.getValue();

        LayoutInflater inflater = LayoutInflater.from(this);
        for (Map.Entry<String, Integer> entry : moods) {
            View itemView = inflater.inflate(R.layout.item_mood_summary_row, llMoodSummaryContainer, false);
            ImageView ivIcon = itemView.findViewById(R.id.ivMoodIcon);
            TextView tvLabel = itemView.findViewById(R.id.tvMoodLabel);
            TextView tvCount = itemView.findViewById(R.id.tvMoodCount);
            ProgressBar pb = itemView.findViewById(R.id.pbMood);

            String mood = entry.getKey();
            ivIcon.setImageResource(getMoodIcon(mood));
            tvLabel.setText(getMoodName(mood));
            tvCount.setText(entry.getValue() + (entry.getValue() == 1 ? " dream" : " dreams"));

            pb.setMax(max);
            ObjectAnimator.ofInt(pb, "progress", 0, entry.getValue()).setDuration(1200).start();

            llMoodSummaryContainer.addView(itemView);
        }
    }

    private void updateKeywords(List<Map.Entry<String, Integer>> keywords) {
        cgKeywords.removeAllViews();
        int count = 0;
        for (Map.Entry<String, Integer> entry : keywords) {
            Chip chip = new Chip(this);
            chip.setText(entry.getKey());
            chip.setTextColor(Color.WHITE);
            
            if (count == 0) {
                // Top keyword: Larger and accented
                chip.setChipBackgroundColorResource(R.color.glow_primary);
                chip.setTextSize(17f);
            } else {
                chip.setChipBackgroundColorResource(R.color.accent_purple);
                chip.setTextSize(15f);
            }
            chip.setShapeAppearanceModel(chip.getShapeAppearanceModel().toBuilder()
                    .setAllCornerSizes(44f)
                    .build());
            chip.setChipStrokeWidth(0);
            chip.setPadding(24, 12, 24, 12);
            cgKeywords.addView(chip);
            count++;
        }
    }

    private void setupChart() {
        moodChart.getDescription().setEnabled(false);
        moodChart.getLegend().setEnabled(false);
        moodChart.setDrawGridBackground(false);
        
        // Increase padding to prevent crowding
        moodChart.setExtraOffsets(16, 16, 16, 12);

        // Load Poppins font
        android.graphics.Typeface poppins = androidx.core.content.res.ResourcesCompat.getFont(this, R.font.poppins);

        XAxis xAxis = moodChart.getXAxis();
        xAxis.setPosition(XAxis.XAxisPosition.BOTTOM);
        xAxis.setTextColor(Color.parseColor("#C5CAE9"));
        xAxis.setTextSize(15f);
        if (poppins != null) xAxis.setTypeface(poppins);
        xAxis.setDrawGridLines(false);
        xAxis.setLabelCount(4);
        xAxis.setValueFormatter(new ValueFormatter() {
            private final SimpleDateFormat mFormat = new SimpleDateFormat("d MMM", Locale.getDefault());
            @Override
            public String getFormattedValue(float value) {
                return mFormat.format(new Date((long) value));
            }
        });

        YAxis leftAxis = moodChart.getAxisLeft();
        leftAxis.setTextColor(Color.parseColor("#C5CAE9"));
        leftAxis.setTextSize(16f);
        if (poppins != null) leftAxis.setTypeface(poppins);
        leftAxis.setAxisMaximum(10.5f);
        leftAxis.setAxisMinimum(-0.5f);
        leftAxis.setLabelCount(11, true);
        leftAxis.setDrawGridLines(true);
        leftAxis.setGridColor(Color.parseColor("#32407A")); // Subtle grid line color
        
        leftAxis.setValueFormatter(new ValueFormatter() {
            @Override
            public String getFormattedValue(float value) {
                return String.valueOf((int) value);
            }
        });

        moodChart.getAxisRight().setEnabled(false);
    }

    private void updateChart(List<Dream> history) {
        if (history.isEmpty()) {
            moodChart.clear();
            return;
        }

        List<Entry> entries = new ArrayList<>();
        for (Dream d : history) {
            entries.add(new Entry(d.getTimestamp(), (float) d.getLucidity()));
        }

        LineDataSet dataSet = new LineDataSet(entries, "Lucidity Trend");
        dataSet.setColor(Color.parseColor("#9A63FF"));
        dataSet.setLineWidth(3f); // Thicker line
        dataSet.setCircleColor(Color.parseColor("#9A63FF"));
        dataSet.setCircleRadius(8f); // Larger dots
        dataSet.setDrawCircleHole(true);
        dataSet.setCircleHoleColor(Color.parseColor("#171F4B"));
        dataSet.setMode(LineDataSet.Mode.CUBIC_BEZIER);
        
        // Premium Glow effect using duplicate set or fill
        dataSet.setDrawFilled(true);
        dataSet.setFillColor(Color.parseColor("#9A63FF"));
        dataSet.setFillAlpha(35);
        
        dataSet.setDrawValues(false);

        LineData lineData = new LineData(dataSet);
        moodChart.setData(lineData);
        moodChart.animateX(1500); // Smooth animation
        moodChart.invalidate();
    }

    private int getMoodIcon(String mood) {
        if (mood == null) return R.drawable.ic_mood_unclear;
        switch (mood) {
            case "Happy":
                return R.drawable.ic_mood_lucid;
            case "Calm":
                return R.drawable.ic_mood_calm;
            case "Neutral":
            case "Unclear":
                return R.drawable.ic_mood_neutral;
            case "Stressed":
                return R.drawable.ic_mood_stressed;
            case "Fearful":
                return R.drawable.ic_mood_intense;
            default:
                return R.drawable.ic_mood_unclear;
        }
    }

    private String getMoodFromValue(int val) {
        switch (val) {
            case 5: return "Happy";
            case 4: return "Calm";
            case 3: return "Neutral";
            case 2: return "Stressed";
            case 1: return "Fearful";
            default: return "Neutral";
        }
    }

    private String getMoodName(String mood) {
        if (mood == null) return "Neutral";
        switch (mood) {
            case "Happy":
                return "Happy";
            case "Calm":
                return "Calm";
            case "Neutral":
            case "Unclear":
                return "Neutral";
            case "Stressed":
                return "Stressed";
            case "Fearful":
                return "Fearful";
            default:
                return mood.isEmpty() ? "Neutral" : mood;
        }
    }
}
