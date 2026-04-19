package com.abb.luciddreams;

import android.animation.ValueAnimator;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.view.animation.DecelerateInterpolator;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.res.ResourcesCompat;

import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.google.android.material.chip.Chip;
import com.google.android.material.chip.ChipGroup;
import com.google.android.material.floatingactionbutton.FloatingActionButton;

import java.text.SimpleDateFormat;
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

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(Color.parseColor("#171F4B"));

        setContentView(R.layout.activity_analysis_dashboard);

        poppins = ResourcesCompat.getFont(this, R.font.poppins);
        repository = new DreamRepository(this);
        displayedMonth = Calendar.getInstance();

        initViews();
        setupBottomNav();
        setupFab();
        setupCalendarNav();
        loadData();
    }

    private void initViews() {
        tvTotalDreamsCount = findViewById(R.id.tvTotalDreamsCount);
        tvOverallEmotion = findViewById(R.id.tvOverallEmotion);
        tvDominantThemes = findViewById(R.id.tvDominantThemes);
        cgThemeChips = findViewById(R.id.cgThemeChips);
        llCalendarGrid = findViewById(R.id.llCalendarGrid);
        tvCalendarMonth = findViewById(R.id.tvCalendarMonth);
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
                Toast.makeText(this, "Profile coming soon", Toast.LENGTH_SHORT).show();
                return true;
            }
            return id == R.id.nav_analysis;
        });
    }

    private void loadData() {
        // Total dreams
        Map<String, Object> stats = repository.getStatsSummary(0);
        Object lifetimeObj = stats.getOrDefault("totalDreamsLifetime", 0);
        int totalDreams = (lifetimeObj instanceof Integer) ? (int) lifetimeObj : 0;
        animateCounter(tvTotalDreamsCount, totalDreams);

        // Most common mood
        List<Map.Entry<String, Integer>> moods = repository.getMoodSummary(0);
        if (!moods.isEmpty()) {
            tvOverallEmotion.setText(getMoodName(moods.get(0).getKey()));
        } else {
            tvOverallEmotion.setText("—");
        }

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
                chip.setChipStrokeWidth(0);
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

        // Build set of "yyyy-MM-dd" strings for quick lookup
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
                        TextView tvDot = new TextView(this);
                        tvDot.setText("●");
                        tvDot.setTextSize(8f);
                        tvDot.setGravity(Gravity.CENTER);
                        tvDot.setTextColor(Color.parseColor("#39C6FF"));
                        cellLayout.addView(tvDot);
                    }

                    // Tap to show dream count
                    if (hasDream) {
                        final String fDateKey = dateKey;
                        cellLayout.setOnClickListener(v -> {
                            int count = countDreamsOnDate(fDateKey, dayFmt);
                            Toast.makeText(this,
                                    count + (count == 1 ? " dream" : " dreams") + " on this day",
                                    Toast.LENGTH_SHORT).show();
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
        int count = 0;
        for (Long ts : datesWithDreams) {
            if (fmt.format(new Date(ts)).equals(dateKey)) count++;
        }
        // getDatesWithDreams dedups by day, so count would be 1 max per date from that list.
        // Use getDreamsFiltered for accurate count
        try {
            SimpleDateFormat parser = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
            Date d = parser.parse(dateKey);
            if (d != null) {
                List<Dream> dreams = repository.getDreamsFiltered(d.getTime(), "");
                return dreams.size();
            }
        } catch (Exception ignored) {}
        return count;
    }

    private android.graphics.drawable.GradientDrawable createCircleBackground(int color) {
        android.graphics.drawable.GradientDrawable circle = new android.graphics.drawable.GradientDrawable();
        circle.setShape(android.graphics.drawable.GradientDrawable.OVAL);
        circle.setColor(color);
        return circle;
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
        switch (mood) {
            case "✨": return "Happy";
            case "🌙": return "Calm";
            case "☁": return "Neutral";
            case "⚡": return "Sad";
            case "🔥": return "Fearful";
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
    }
}
