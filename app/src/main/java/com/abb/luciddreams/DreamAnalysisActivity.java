package com.abb.luciddreams;

import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.chip.Chip;
import com.google.android.material.chip.ChipGroup;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class DreamAnalysisActivity extends AppCompatActivity {

    private TextToSpeech tts;
    private boolean ttsReady = false;
    private String fullReadText = "";

    // Symbol dictionary: keyword → { symbol name, meaning }
    private static final Map<String, String[]> SYMBOL_MAP = new LinkedHashMap<>();

    static {
        SYMBOL_MAP.put("mirror",     new String[]{"🪞 Mirror",     "Mirrors often symbolize self-image, reflection, identity, or how you perceive yourself."});
        SYMBOL_MAP.put("fall",       new String[]{"🌊 Falling",    "Falling in dreams often signals insecurity, a fear of losing control, or feeling overwhelmed in waking life."});
        SYMBOL_MAP.put("falling",    new String[]{"🌊 Falling",    "Falling in dreams often signals insecurity, a fear of losing control, or feeling overwhelmed in waking life."});
        SYMBOL_MAP.put("ocean",      new String[]{"🌊 Ocean",      "The ocean represents your emotions, subconscious depths, and the unknown aspects of your inner world."});
        SYMBOL_MAP.put("sea",        new String[]{"🌊 Ocean",      "The ocean represents your emotions, subconscious depths, and the unknown aspects of your inner world."});
        SYMBOL_MAP.put("water",      new String[]{"💧 Water",      "Water symbolizes emotions, the flow of life, and cleansing. Calm water suggests peace; turbulent water signals turmoil."});
        SYMBOL_MAP.put("dark",       new String[]{"🌑 Darkness",   "Darkness may reflect uncertainty, stress, or unacknowledged fears lurking beneath the surface."});
        SYMBOL_MAP.put("darkness",   new String[]{"🌑 Darkness",   "Darkness may reflect uncertainty, stress, or unacknowledged fears lurking beneath the surface."});
        SYMBOL_MAP.put("run",        new String[]{"🏃 Running",    "Running often represents avoidance, pressure, or the urge to escape a stressful situation in your life."});
        SYMBOL_MAP.put("running",    new String[]{"🏃 Running",    "Running often represents avoidance, pressure, or the urge to escape a stressful situation in your life."});
        SYMBOL_MAP.put("fly",        new String[]{"🕊️ Flying",     "Flying symbolizes freedom, liberation, ambition, and personal growth above everyday limitations."});
        SYMBOL_MAP.put("flying",     new String[]{"🕊️ Flying",     "Flying symbolizes freedom, liberation, ambition, and personal growth above everyday limitations."});
        SYMBOL_MAP.put("soar",       new String[]{"🕊️ Flying",     "Flying symbolizes freedom, liberation, ambition, and personal growth above everyday limitations."});
        SYMBOL_MAP.put("fire",       new String[]{"🔥 Fire",       "Fire often represents passion, transformation, anger, or a powerful change burning through your life."});
        SYMBOL_MAP.put("flame",      new String[]{"🔥 Fire",       "Fire often represents passion, transformation, anger, or a powerful change burning through your life."});
        SYMBOL_MAP.put("death",      new String[]{"⚰️ Death",      "Dreaming of death often signals transformation, the end of one chapter, and the beginning of another."});
        SYMBOL_MAP.put("dying",      new String[]{"⚰️ Death",      "Dreaming of death often signals transformation, the end of one chapter, and the beginning of another."});
        SYMBOL_MAP.put("dead",       new String[]{"⚰️ Death",      "Dreaming of death often signals transformation, the end of one chapter, and the beginning of another."});
        SYMBOL_MAP.put("house",      new String[]{"🏠 House",      "A house in dreams typically represents the self or psyche. Rooms symbolize different aspects of your mind."});
        SYMBOL_MAP.put("home",       new String[]{"🏠 House",      "A house in dreams typically represents the self or psyche. Rooms symbolize different aspects of your mind."});
        SYMBOL_MAP.put("snake",      new String[]{"🐍 Snake",      "Snakes represent both hidden fear and primal wisdom. They can signal a threat or a transformative healing."});
        SYMBOL_MAP.put("chase",      new String[]{"👣 Being Chased","Being chased suggests avoidance of a problem, fear of confrontation, or anxiety about something unresolved."});
        SYMBOL_MAP.put("chasing",    new String[]{"👣 Being Chased","Being chased suggests avoidance of a problem, fear of confrontation, or anxiety about something unresolved."});
        SYMBOL_MAP.put("chased",     new String[]{"👣 Being Chased","Being chased suggests avoidance of a problem, fear of confrontation, or anxiety about something unresolved."});
        SYMBOL_MAP.put("teeth",      new String[]{"🦷 Teeth",      "Teeth falling out is one of the most common dream symbols and relates to anxiety, insecurity, or fear of judgment."});
        SYMBOL_MAP.put("school",     new String[]{"📚 School",     "School settings often indicate performance anxiety, self-evaluation, or feelings about how others judge you."});
        SYMBOL_MAP.put("exam",       new String[]{"📝 Exam",       "Taking an exam suggests you feel tested or judged in waking life, or fear not meeting expectations."});
        SYMBOL_MAP.put("test",       new String[]{"📝 Exam",       "Taking an exam suggests you feel tested or judged in waking life, or fear not meeting expectations."});
        SYMBOL_MAP.put("baby",       new String[]{"👶 Baby",       "Babies in dreams often represent new beginnings, a new project, vulnerability, or a fresh emotional start."});
        SYMBOL_MAP.put("child",      new String[]{"👶 Baby",       "Babies in dreams often represent new beginnings, a new project, vulnerability, or a fresh emotional start."});
        SYMBOL_MAP.put("road",       new String[]{"🛤️ Road/Path",  "A road or path represents life's journey and the choices ahead. A clear road means confidence; a blocked road means hesitation."});
        SYMBOL_MAP.put("path",       new String[]{"🛤️ Road/Path",  "A road or path represents life's journey and the choices ahead. A clear road means confidence; a blocked road means hesitation."});
        SYMBOL_MAP.put("bridge",     new String[]{"🌉 Bridge",     "A bridge symbolizes transition, crossing from one life phase to another, or connecting two sides of yourself."});
        SYMBOL_MAP.put("mountain",   new String[]{"⛰️ Mountain",   "Mountains represent major challenges, ambition, and achievement. Climbing one shows determination to grow."});
        SYMBOL_MAP.put("light",      new String[]{"💡 Light",      "Light in dreams often signals hope, clarity, spiritual guidance, or a breakthrough moment approaching."});
        SYMBOL_MAP.put("blood",      new String[]{"🩸 Blood",      "Blood can indicate vitality, life force, sacrifice, or strong emotional intensity in a current situation."});
        SYMBOL_MAP.put("clock",      new String[]{"⏰ Clock/Time", "Clocks represent urgency, the pressure of deadlines, or anxiety about time passing too quickly."});
        SYMBOL_MAP.put("time",       new String[]{"⏰ Clock/Time", "Clocks represent urgency, the pressure of deadlines, or anxiety about time passing too quickly."});
        SYMBOL_MAP.put("car",        new String[]{"🚗 Car",        "A car represents your drive, direction, and sense of control in life. Who is driving reveals who feels in control."});
        SYMBOL_MAP.put("forest",     new String[]{"🌲 Forest",     "A forest symbolizes the unconscious mind, mystery, or feeling lost and searching for direction."});
        SYMBOL_MAP.put("tree",       new String[]{"🌳 Tree",       "Trees represent growth, stability, family roots, and your connection to the past and future."});
        SYMBOL_MAP.put("bird",       new String[]{"🐦 Bird",       "Birds symbolize freedom, perspective, spiritual transcendence, or messages from the subconscious."});
        SYMBOL_MAP.put("door",       new String[]{"🚪 Door",       "Doors represent opportunity, new possibilities, transitions, or secrets waiting to be revealed."});
        SYMBOL_MAP.put("money",      new String[]{"💰 Money",      "Money in dreams reflects your sense of self-worth, power, security, or anxiety about financial matters."});
        SYMBOL_MAP.put("rain",       new String[]{"🌧️ Rain",       "Rain symbolizes emotional release, cleansing, renewal, or the washing away of past burdens."});
        SYMBOL_MAP.put("star",       new String[]{"⭐ Stars",      "Stars represent hopes, aspirations, guidance, and your sense of destiny or higher purpose."});
        SYMBOL_MAP.put("stars",      new String[]{"⭐ Stars",      "Stars represent hopes, aspirations, guidance, and your sense of destiny or higher purpose."});
    }

    // Emotional tone keyword mappings: keyword → emotion label
    private static final Map<String, String> EMOTION_KEYWORDS = new LinkedHashMap<>();

    static {
        EMOTION_KEYWORDS.put("fear",       "Fearful");
        EMOTION_KEYWORDS.put("scared",     "Fearful");
        EMOTION_KEYWORDS.put("afraid",     "Fearful");
        EMOTION_KEYWORDS.put("terror",     "Fearful");
        EMOTION_KEYWORDS.put("nightmare",  "Fearful");
        EMOTION_KEYWORDS.put("dark",       "Fearful");
        EMOTION_KEYWORDS.put("darkness",   "Fearful");
        EMOTION_KEYWORDS.put("stress",     "Stressed");
        EMOTION_KEYWORDS.put("stressed",   "Stressed");
        EMOTION_KEYWORDS.put("pressure",   "Stressed");
        EMOTION_KEYWORDS.put("exam",       "Stressed");
        EMOTION_KEYWORDS.put("test",       "Stressed");
        EMOTION_KEYWORDS.put("late",       "Stressed");
        EMOTION_KEYWORDS.put("rush",       "Stressed");
        EMOTION_KEYWORDS.put("running",    "Stressed");
        EMOTION_KEYWORDS.put("chase",      "Stressed");
        EMOTION_KEYWORDS.put("chased",     "Stressed");
        EMOTION_KEYWORDS.put("wonder",     "Curious");
        EMOTION_KEYWORDS.put("explore",    "Curious");
        EMOTION_KEYWORDS.put("strange",    "Curious");
        EMOTION_KEYWORDS.put("unknown",    "Curious");
        EMOTION_KEYWORDS.put("discovery",  "Curious");
        EMOTION_KEYWORDS.put("discover",   "Curious");
        EMOTION_KEYWORDS.put("mysterious", "Curious");
        EMOTION_KEYWORDS.put("calm",       "Peaceful");
        EMOTION_KEYWORDS.put("serene",     "Peaceful");
        EMOTION_KEYWORDS.put("beautiful",  "Peaceful");
        EMOTION_KEYWORDS.put("peaceful",   "Peaceful");
        EMOTION_KEYWORDS.put("floating",   "Peaceful");
        EMOTION_KEYWORDS.put("flying",     "Peaceful");
        EMOTION_KEYWORDS.put("smiling",    "Peaceful");
        EMOTION_KEYWORDS.put("happy",      "Hopeful");
        EMOTION_KEYWORDS.put("hope",       "Hopeful");
        EMOTION_KEYWORDS.put("bright",     "Hopeful");
        EMOTION_KEYWORDS.put("light",      "Hopeful");
        EMOTION_KEYWORDS.put("new",        "Hopeful");
        EMOTION_KEYWORDS.put("begin",      "Hopeful");
        EMOTION_KEYWORDS.put("lost",       "Confused");
        EMOTION_KEYWORDS.put("confused",   "Confused");
        EMOTION_KEYWORDS.put("weird",      "Confused");
        EMOTION_KEYWORDS.put("unclear",    "Confused");
        EMOTION_KEYWORDS.put("fog",        "Confused");
        EMOTION_KEYWORDS.put("foggy",      "Confused");
    }

    // Reflection prompt templates keyed by emotion
    private static final Map<String, String> REFLECTION_MAP = new LinkedHashMap<>();

    static {
        REFLECTION_MAP.put("Fearful",  "Is there something in your waking life you have been avoiding or feel threatened by? What would it feel like to face it head-on?");
        REFLECTION_MAP.put("Stressed", "Are you placing too much pressure on yourself to perform or meet expectations? What one step could bring relief?");
        REFLECTION_MAP.put("Curious",  "Your subconscious is drawn to the unknown. What unexplored part of your life or self is calling for your attention?");
        REFLECTION_MAP.put("Peaceful", "What in your waking life gives you this same sense of peace? How can you invite more of it into your daily routine?");
        REFLECTION_MAP.put("Hopeful",  "Something within you is ready to grow or begin anew. What positive change are you hoping to bring into your life?");
        REFLECTION_MAP.put("Confused", "Are you currently navigating a crossroads or dealing with mixed signals? Taking time to journal or meditate may bring clarity.");
        REFLECTION_MAP.put("default",  "Are you currently navigating self-doubt or personal change? Reflect on what this dream may be trying to show you.");
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(Color.parseColor("#171F4B"));

        setContentView(R.layout.activity_dream_analysis);

        String dreamText = getIntent().getStringExtra("dream_text");
        if (dreamText == null || dreamText.trim().isEmpty()) {
            dreamText = "No dream text provided.";
        }

        ImageView ivBack = findViewById(R.id.ivBack);
        ivBack.setOnClickListener(v -> finish());

        Button btnKeep = findViewById(R.id.btnKeepDream);
        btnKeep.setOnClickListener(v -> {
            Intent intent = new Intent(this, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(intent);
            finish();
        });

        DreamAnalysis analysis = analyze(dreamText);

        populateSummary(analysis.summary);
        populateSymbols(analysis.symbols);
        populateEmotions(analysis.emotions, analysis.emotionDescription);
        populateReflection(analysis.reflection);
        populateInsights(analysis.lucidityScore, analysis.stressScore, analysis.patternScore);

        fullReadText = "Dream Summary. " + analysis.summary
                + " Emotional Tone: " + String.join(", ", analysis.emotions) + ". "
                + "Reflection: " + analysis.reflection;

        ImageView ivSpeaker = findViewById(R.id.ivSpeaker);
        ivSpeaker.setOnClickListener(v -> readAloud());

        initTts();
    }

    // ─── Analysis Engine ────────────────────────────────────────────────────────

    private DreamAnalysis analyze(String text) {
        String lower = text.toLowerCase(Locale.getDefault());
        String[] words = lower.replaceAll("[^a-z\\s]", " ").split("\\s+");
        List<String> wordList = Arrays.asList(words);

        DreamAnalysis result = new DreamAnalysis();

        // 1. Summary
        result.summary = buildSummary(text);

        // 2. Symbols — deduplicate by symbol name
        Map<String, String[]> detectedSymbols = new LinkedHashMap<>();
        for (String word : wordList) {
            String[] symbol = SYMBOL_MAP.get(word);
            if (symbol != null) {
                detectedSymbols.putIfAbsent(symbol[0], symbol);
            }
        }
        result.symbols = new ArrayList<>(detectedSymbols.values());

        // 3. Emotional Tone — count keyword hits per emotion
        Map<String, Integer> emotionCount = new LinkedHashMap<>();
        for (String word : wordList) {
            String emotion = EMOTION_KEYWORDS.get(word);
            if (emotion != null) {
                emotionCount.put(emotion, emotionCount.getOrDefault(emotion, 0) + 1);
            }
        }

        // Sort by frequency, take top 3
        List<String> sortedEmotions = new ArrayList<>(emotionCount.keySet());
        sortedEmotions.sort((a, b) -> emotionCount.getOrDefault(b, 0) - emotionCount.getOrDefault(a, 0));
        result.emotions = sortedEmotions.isEmpty()
                ? Arrays.asList("Curious", "Peaceful")
                : sortedEmotions.subList(0, Math.min(3, sortedEmotions.size()));

        // Emotion description
        result.emotionDescription = buildEmotionDescription(result.emotions);

        // 4. Reflection — based on dominant emotion
        String dominant = result.emotions.isEmpty() ? "default" : result.emotions.get(0);
        result.reflection = REFLECTION_MAP.getOrDefault(dominant, REFLECTION_MAP.get("default"));

        // 5. Insight scores
        result.lucidityScore = computeLucidityScore(lower);
        result.stressScore   = computeStressScore(lower, emotionCount);
        result.patternScore  = Math.min(100, result.symbols.size() * 15 + 20);

        return result;
    }

    private String buildSummary(String text) {
        String trimmed = text.trim();
        if (trimmed.length() <= 180) {
            // Short dream — rephrase as third-person narrative
            return "The dreamer experienced: " + trimmed;
        }
        // Extract first 1–2 sentences as summary
        String[] sentences = trimmed.split("(?<=[.!?])\\s+");
        if (sentences.length >= 2) {
            return sentences[0] + " " + sentences[1];
        }
        // Fallback: truncate at ~180 chars at word boundary
        String truncated = trimmed.substring(0, 180);
        int lastSpace = truncated.lastIndexOf(' ');
        return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + "…";
    }

    private String buildEmotionDescription(List<String> emotions) {
        if (emotions.isEmpty()) return "Your dream carries a neutral, contemplative energy.";
        String primary = emotions.get(0);
        switch (primary) {
            case "Fearful":  return "This dream carries a fearful undertone, suggesting your subconscious may be processing hidden anxieties or unresolved tensions.";
            case "Stressed": return "The dream reflects underlying stress or pressure. Your mind may be working through challenges it faces during waking hours.";
            case "Curious":  return "A spirit of wonder and exploration runs through this dream, hinting at a desire for discovery or new experiences.";
            case "Peaceful": return "This dream emanates calm and serenity, suggesting inner harmony or a longing for peaceful resolution.";
            case "Hopeful":  return "Hopeful energy fills this dream — your subconscious is looking forward, drawn to growth and new possibilities.";
            case "Confused": return "A sense of confusion or disorientation runs through this dream, reflecting uncertainty you may be navigating in waking life.";
            default:         return "Your dream carries a blend of emotions, reflecting the complex tapestry of your inner life.";
        }
    }

    private int computeLucidityScore(String lower) {
        int score = 10;
        String[] lucidKeywords = {"aware", "lucid", "control", "knew", "dreaming", "conscious", "realized"};
        for (String kw : lucidKeywords) {
            if (lower.contains(kw)) score += 20;
        }
        return Math.min(score, 95);
    }

    private int computeStressScore(String lower, Map<String, Integer> emotionCount) {
        int base = emotionCount.getOrDefault("Stressed", 0) * 20
                 + emotionCount.getOrDefault("Fearful", 0) * 15;
        return Math.min(base + 10, 95);
    }

    // ─── UI Population ──────────────────────────────────────────────────────────

    private void populateSummary(String summary) {
        TextView tvSummary = findViewById(R.id.tvSummary);
        tvSummary.setText(summary);
    }

    private void populateSymbols(List<String[]> symbols) {
        LinearLayout llSymbols = findViewById(R.id.llSymbols);
        TextView tvNoSymbols = findViewById(R.id.tvNoSymbols);

        if (symbols.isEmpty()) {
            tvNoSymbols.setVisibility(View.VISIBLE);
            return;
        }

        for (int i = 0; i < symbols.size(); i++) {
            String[] symbol = symbols.get(i);

            LinearLayout itemLayout = new LinearLayout(this);
            itemLayout.setOrientation(LinearLayout.VERTICAL);
            itemLayout.setBackgroundResource(R.drawable.bg_symbol_item);
            int dp12 = dp(12);
            int dp16 = dp(16);
            itemLayout.setPadding(dp16, dp12, dp16, dp12);
            LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT);
            params.setMargins(0, 0, 0, i < symbols.size() - 1 ? dp(10) : 0);
            itemLayout.setLayoutParams(params);

            TextView tvName = new TextView(this);
            tvName.setText(symbol[0]);
            tvName.setTextColor(Color.parseColor("#39C6FF"));
            tvName.setTextSize(16);
            tvName.setTypeface(tvName.getTypeface(), android.graphics.Typeface.BOLD);
            tvName.setPadding(0, 0, 0, dp(6));
            itemLayout.addView(tvName);

            TextView tvMeaning = new TextView(this);
            tvMeaning.setText(symbol[1]);
            tvMeaning.setTextColor(Color.parseColor("#C5CAE9"));
            tvMeaning.setTextSize(14);
            tvMeaning.setLineSpacing(0, 1.5f);
            itemLayout.addView(tvMeaning);

            llSymbols.addView(itemLayout);
        }
    }

    private void populateEmotions(List<String> emotions, String description) {
        ChipGroup chipGroup = findViewById(R.id.chipGroupEmotions);
        TextView tvDesc = findViewById(R.id.tvEmotionDesc);

        Map<String, String[]> emotionStyles = new LinkedHashMap<>();
        emotionStyles.put("Fearful",  new String[]{"#4A1942", "#FF6B9D"});
        emotionStyles.put("Stressed", new String[]{"#4A2A00", "#F6A84B"});
        emotionStyles.put("Curious",  new String[]{"#1A3A5C", "#39C6FF"});
        emotionStyles.put("Peaceful", new String[]{"#1A3D2B", "#4CAF82"});
        emotionStyles.put("Hopeful",  new String[]{"#3A3A00", "#F6C65B"});
        emotionStyles.put("Confused", new String[]{"#2A1A4A", "#9C7CFF"});

        for (String emotion : emotions) {
            Chip chip = new Chip(this);
            chip.setText(emotion);
            chip.setTextColor(Color.WHITE);
            chip.setTextSize(14);
            chip.setClickable(false);
            chip.setCheckable(false);

            String[] style = emotionStyles.get(emotion);
            if (style != null) {
                chip.setChipBackgroundColor(android.content.res.ColorStateList.valueOf(Color.parseColor(style[0])));
                chip.setChipStrokeColor(android.content.res.ColorStateList.valueOf(Color.parseColor(style[1])));
                chip.setChipStrokeWidth(dp(1));
            }
            chipGroup.addView(chip);
        }

        tvDesc.setText(description);
    }

    private void populateReflection(String reflection) {
        TextView tvReflection = findViewById(R.id.tvReflection);
        tvReflection.setText(reflection);
    }

    private void populateInsights(int lucidityScore, int stressScore, int patternScore) {
        LinearLayout llInsights = findViewById(R.id.llInsightScores);
        addInsightRow(llInsights, "💎  Lucidity Likelihood", lucidityScore, "#39C6FF");
        addInsightRow(llInsights, "⚡  Stress Signal",       stressScore,   "#F6A84B");
        addInsightRow(llInsights, "🔁  Pattern Confidence",  patternScore,  "#9C7CFF");
    }

    private void addInsightRow(LinearLayout parent, String label, int score, String color) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams rowParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        rowParams.setMargins(0, 0, 0, dp(14));
        row.setLayoutParams(rowParams);

        // Label row
        LinearLayout labelRow = new LinearLayout(this);
        labelRow.setOrientation(LinearLayout.HORIZONTAL);
        labelRow.setPadding(0, 0, 0, dp(6));

        TextView tvLabel = new TextView(this);
        tvLabel.setText(label);
        tvLabel.setTextColor(Color.parseColor("#C5CAE9"));
        tvLabel.setTextSize(14);
        tvLabel.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));
        labelRow.addView(tvLabel);

        TextView tvScore = new TextView(this);
        tvScore.setText(score + "%");
        tvScore.setTextColor(Color.parseColor(color));
        tvScore.setTextSize(14);
        tvScore.setTypeface(tvScore.getTypeface(), android.graphics.Typeface.BOLD);
        labelRow.addView(tvScore);

        row.addView(labelRow);

        // Progress bar
        android.widget.ProgressBar progressBar = new android.widget.ProgressBar(
                this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        progressBar.setProgress(score);
        progressBar.setProgressTintList(android.content.res.ColorStateList.valueOf(Color.parseColor(color)));
        progressBar.setProgressBackgroundTintList(
                android.content.res.ColorStateList.valueOf(Color.parseColor("#2B3470")));
        LinearLayout.LayoutParams pbParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(8));
        progressBar.setLayoutParams(pbParams);
        row.addView(progressBar);

        parent.addView(row);
    }

    // ─── Text-to-Speech ──────────────────────────────────────────────────────────

    private void initTts() {
        tts = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS) {
                tts.setLanguage(Locale.getDefault());
                ttsReady = true;
            }
        });
    }

    private void readAloud() {
        if (ttsReady && !fullReadText.isEmpty()) {
            if (tts.isSpeaking()) {
                tts.stop();
            } else {
                tts.speak(fullReadText, TextToSpeech.QUEUE_FLUSH, null, "dream_analysis");
            }
        }
    }

    @Override
    protected void onDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        super.onDestroy();
    }

    // ─── Helper ──────────────────────────────────────────────────────────────────

    private int dp(int dp) {
        return Math.round(dp * getResources().getDisplayMetrics().density);
    }

    // ─── Inner data class ─────────────────────────────────────────────────────────

    private static class DreamAnalysis {
        String summary = "";
        List<String[]> symbols = new ArrayList<>();
        List<String> emotions = new ArrayList<>();
        String emotionDescription = "";
        String reflection = "";
        int lucidityScore = 10;
        int stressScore   = 10;
        int patternScore  = 20;
    }
}
