package com.abb.luciddreams;

import android.animation.ObjectAnimator;
import android.graphics.Color;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.animation.DecelerateInterpolator;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.github.mikephil.charting.charts.LineChart;
import com.github.mikephil.charting.components.XAxis;
import com.github.mikephil.charting.components.YAxis;
import com.github.mikephil.charting.data.Entry;
import com.github.mikephil.charting.data.LineData;
import com.github.mikephil.charting.data.LineDataSet;
import com.github.mikephil.charting.formatter.ValueFormatter;
import com.google.android.material.button.MaterialButtonToggleGroup;
import com.google.android.material.chip.Chip;
import com.google.android.material.chip.ChipGroup;
import com.google.android.material.progressindicator.CircularProgressIndicator;

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
    private LinearLayout llEmotionsContainer;
    private ChipGroup cgKeywords;
    private CircularProgressIndicator cpClarity, cpLucidity, cpNightmare, cpRecurring;
    private TextView tvClarityLabel, tvLucidityLabel, tvNightmareLabel, tvRecurringLabel;
    private LineChart moodChart;
    private TextView tvTotalDreams, tvPeriodDreams, tvUniqueTags, tvAvgTags, tvTotalWords, tvAvgWords, tvPeriodNightmares;
    private View llEmptyState;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_patterns);

        repository = new DreamRepository(this);
        initViews();
        setupListeners();
        
        // Default to Month
        loadData(getTimeFilter("Month"));
    }

    private void initViews() {
        toggleGroup = findViewById(R.id.toggleGroupFilter);
        llEmotionsContainer = findViewById(R.id.llEmotionsContainer);
        cgKeywords = findViewById(R.id.cgKeywords);
        cpClarity = findViewById(R.id.cpClarity);
        cpLucidity = findViewById(R.id.cpLucidity);
        cpNightmare = findViewById(R.id.cpNightmare);
        cpRecurring = findViewById(R.id.cpRecurring);
        tvClarityLabel = findViewById(R.id.tvClarityLabel);
        tvLucidityLabel = findViewById(R.id.tvLucidityLabel);
        tvNightmareLabel = findViewById(R.id.tvNightmareLabel);
        tvRecurringLabel = findViewById(R.id.tvRecurringLabel);
        moodChart = findViewById(R.id.moodChart);
        tvTotalDreams = findViewById(R.id.tvTotalDreams);
        tvPeriodDreams = findViewById(R.id.tvPeriodDreams);
        tvUniqueTags = findViewById(R.id.tvUniqueTags);
        tvAvgTags = findViewById(R.id.tvAvgTags);
        tvTotalWords = findViewById(R.id.tvTotalWords);
        tvAvgWords = findViewById(R.id.tvAvgWords);
        tvPeriodNightmares = findViewById(R.id.tvPeriodNightmares);
        llEmptyState = findViewById(R.id.llEmptyState);

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
        
        findViewById(R.id.toolbar).setOnClickListener(v -> finish());
    }

    private long getTimeFilter(String filter) {
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, 0);
        cal.set(Calendar.MINUTE, 0);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);

        switch (filter) {
            case "Day":
                return cal.getTimeInMillis();
            case "Month":
                cal.set(Calendar.DAY_OF_MONTH, 1);
                return cal.getTimeInMillis();
            case "Year":
                cal.set(Calendar.DAY_OF_YEAR, 1);
                return cal.getTimeInMillis();
            case "Lifetime":
                return 0;
            default:
                return 0;
        }
    }

    private void loadData(long startTime) {
        Map<String, Integer> emotions = repository.getEmotionsCount(startTime);
        if (emotions.isEmpty() && startTime != 0) {
            // Check if there is ANY data in lifetime
            if (repository.getEmotionsCount(0).isEmpty()) {
                llEmptyState.setVisibility(View.VISIBLE);
                return;
            }
        }
        llEmptyState.setVisibility(View.GONE);

        updateEmotions(emotions);
        updateTags(repository.getTopTags(startTime));
        updateFactors(repository.getDreamFactors(startTime));
        updateChart(repository.getMoodHistory(startTime));
        updateStats(repository.getStatsSummary(startTime));
        
        // Show some animated insight text based on data
        updateInsight(emotions);
    }

    private void updateEmotions(Map<String, Integer> emotions) {
        llEmotionsContainer.removeAllViews();
        int max = 0;
        for (int count : emotions.values()) if (count > max) max = count;

        LayoutInflater inflater = LayoutInflater.from(this);
        for (Map.Entry<String, Integer> entry : emotions.entrySet()) {
            View itemView = inflater.inflate(R.layout.item_emotion_bar, llEmotionsContainer, false);
            TextView tvLabel = itemView.findViewById(R.id.tvEmotionLabel);
            ProgressBar bar = itemView.findViewById(R.id.pbEmotion);
            TextView tvCount = itemView.findViewById(R.id.tvEmotionCount);

            // Map emoji to label
            String label = mapEmojiToLabel(entry.getKey());
            tvLabel.setText(entry.getKey() + " " + label);
            tvCount.setText(String.valueOf(entry.getValue()));
            
            bar.setMax(max);
            ObjectAnimator.ofInt(bar, "progress", 0, entry.getValue())
                    .setDuration(1000)
                    .start();

            llEmotionsContainer.addView(itemView);
        }
    }

    private String mapEmojiToLabel(String emoji) {
        switch (emoji) {
            case "🌙": return "Calm";
            case "⚡": return "Stressed";
            case "☁": return "Unclear";
            case "✨": return "Lucid";
            case "🔥": return "Intense";
            default: return "Unknown";
        }
    }

    private void updateTags(List<Map.Entry<String, Integer>> tags) {
        cgKeywords.removeAllViews();
        for (Map.Entry<String, Integer> entry : tags) {
            Chip chip = new Chip(this);
            chip.setText(entry.getKey());
            chip.setTextColor(Color.WHITE);
            chip.setChipBackgroundColorResource(entry.getValue() > 2 ? R.color.glow_primary : R.color.accent_purple);
            chip.setChipStrokeWidth(0);
            cgKeywords.addView(chip);
        }
    }

    private void updateFactors(Map<String, Double> factors) {
        int clarity = factors.getOrDefault("avgClarity", 0.0).intValue();
        int lucidity = factors.getOrDefault("avgLucidity", 0.0).intValue();
        int nightmare = factors.getOrDefault("nightmarePercent", 0.0).intValue();
        int recurring = factors.getOrDefault("recurringPercent", 0.0).intValue();

        animateCircularProgress(cpClarity, clarity);
        animateCircularProgress(cpLucidity, lucidity);
        animateCircularProgress(cpNightmare, nightmare);
        animateCircularProgress(cpRecurring, recurring);

        tvClarityLabel.setText(clarity + "% Clarity");
        tvLucidityLabel.setText(lucidity + "% Lucidity");
        tvNightmareLabel.setText(nightmare + "% Nightmare");
        tvRecurringLabel.setText(recurring + "% Recurring");
    }

    private void animateCircularProgress(CircularProgressIndicator cp, int progress) {
        ObjectAnimator animator = ObjectAnimator.ofInt(cp, "progress", 0, progress);
        animator.setDuration(1200);
        animator.setInterpolator(new DecelerateInterpolator());
        animator.start();
    }

    private void setupChart() {
        moodChart.getDescription().setEnabled(false);
        moodChart.getLegend().setEnabled(false);
        moodChart.setDrawGridBackground(false);
        moodChart.setTouchEnabled(true);
        moodChart.setPinchZoom(true);

        // X-Axis
        XAxis xAxis = moodChart.getXAxis();
        xAxis.setPosition(XAxis.XAxisPosition.BOTTOM);
        xAxis.setTextColor(Color.parseColor("#C5CAE9"));
        xAxis.setDrawGridLines(false);
        xAxis.setValueFormatter(new ValueFormatter() {
            private final SimpleDateFormat mFormat = new SimpleDateFormat("dd/MM", Locale.getDefault());
            @Override
            public String getFormattedValue(float value) {
                return mFormat.format(new Date((long) value));
            }
        });

        // Y-Axis
        YAxis leftAxis = moodChart.getAxisLeft();
        leftAxis.setTextColor(Color.parseColor("#C5CAE9"));
        leftAxis.setAxisMaximum(5.5f);
        leftAxis.setAxisMinimum(0.5f);
        leftAxis.setLabelCount(5, true);
        leftAxis.setValueFormatter(new ValueFormatter() {
            @Override
            public String getFormattedValue(float value) {
                int val = Math.round(value);
                switch (val) {
                    case 5: return "Very Happy";
                    case 4: return "Happy";
                    case 3: return "Neutral";
                    case 2: return "Sad";
                    case 1: return "Very Sad";
                    default: return "";
                }
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
            float val = 3f; // Neutral
            String m = d.getMood();
            if ("✨".equals(m)) val = 5f;
            else if ("🌙".equals(m)) val = 4f;
            else if ("☁".equals(m)) val = 3f;
            else if ("⚡".equals(m)) val = 2f;
            else if ("🔥".equals(m)) val = 1f;
            entries.add(new Entry(d.getTimestamp(), val));
        }

        LineDataSet dataSet = new LineDataSet(entries, "Mood");
        dataSet.setColor(Color.parseColor("#39C6FF"));
        dataSet.setLineWidth(3f);
        dataSet.setCircleColor(Color.parseColor("#39C6FF"));
        dataSet.setCircleRadius(5f);
        dataSet.setDrawCircleHole(true);
        dataSet.setCircleHoleColor(Color.parseColor("#171F4B"));
        dataSet.setMode(LineDataSet.Mode.CUBIC_BEZIER);
        dataSet.setDrawFilled(true);
        dataSet.setFillDrawable(null); // Or use a gradient
        dataSet.setFillColor(Color.parseColor("#39C6FF"));
        dataSet.setFillAlpha(30);
        dataSet.setDrawValues(false);

        LineData lineData = new LineData(dataSet);
        moodChart.setData(lineData);
        moodChart.animateX(1000);
        moodChart.invalidate();
    }

    private void updateStats(Map<String, Object> stats) {
        tvTotalDreams.setText("Total: " + stats.getOrDefault("totalDreamsLifetime", 0));
        tvPeriodDreams.setText("In period: " + stats.getOrDefault("totalDreamsPeriod", 0));
        tvUniqueTags.setText("Unique: " + stats.getOrDefault("uniqueTagsCount", 0));
        
        double avgTags = (double) stats.getOrDefault("avgTags", 0.0);
        tvAvgTags.setText(String.format(Locale.getDefault(), "Avg: %.1f", avgTags));
        
        long totalWords = (long) stats.getOrDefault("totalWords", 0L);
        tvTotalWords.setText("Total: " + totalWords);
        
        double avgWords = (double) stats.getOrDefault("avgWords", 0.0);
        tvAvgWords.setText(String.format(Locale.getDefault(), "Avg: %.1f", avgWords));
        
        tvPeriodNightmares.setText("Total: " + stats.getOrDefault("totalNightmares", 0));
    }

    private void updateInsight(Map<String, Integer> emotions) {
        TextView tvInsight = findViewById(R.id.tvInsight);
        if (emotions.containsKey("✨")) {
            tvInsight.setText("You are experiencing high lucidity lately. Your dream control is evolving.");
        } else if (emotions.containsKey("⚡") || emotions.containsKey("🔥")) {
            tvInsight.setText("Your dreams reflect some high-intensity emotions. Take some time to ground yourself.");
        } else {
            tvInsight.setText("Your dream patterns show stability and calm reflection.");
        }
    }
}
