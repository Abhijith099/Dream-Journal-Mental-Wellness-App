package com.abb.luciddreams;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.Window;
import android.view.WindowManager;
import android.view.inputmethod.EditorInfo;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.SeekBar;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.chip.Chip;
import com.google.android.material.chip.ChipGroup;
import com.google.android.material.textfield.TextInputEditText;

public class DreamDetailsActivity extends AppCompatActivity {

    private String journalText;
    private boolean initialNightmareState;
    private String selectedMood = "Unclear"; // Default
 
    private LinearLayout moodIntense, moodStressed, moodUnclear, moodCalm, moodLucid;
    private SeekBar sbClarity, sbLucidity;
    private TextInputEditText etTagInput;
    private ChipGroup chipGroupTags;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Transparent status bar setup
        Window window = getWindow();
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(Color.parseColor("#1C2552"));

        setContentView(R.layout.activity_dream_details);

        journalText = getIntent().getStringExtra("journal_text");
        initialNightmareState = getIntent().getBooleanExtra("is_nightmare", false);

        ImageView ivBack = findViewById(R.id.ivBack);
        ivBack.setOnClickListener(v -> finish());

        // Mood Selectors
        moodIntense = findViewById(R.id.moodIntense);
        moodStressed = findViewById(R.id.moodStressed);
        moodUnclear = findViewById(R.id.moodUnclear);
        moodCalm = findViewById(R.id.moodCalm);
        moodLucid = findViewById(R.id.moodLucid);

        setupMoodClickListeners();

        sbClarity = findViewById(R.id.sbClarity);
        sbLucidity = findViewById(R.id.sbLucidity);
        
        etTagInput = findViewById(R.id.etTagInput);
        chipGroupTags = findViewById(R.id.chipGroupTags);

        setupTagInput();

        Button btnSaveData = findViewById(R.id.btnSaveData);
        Button btnSaveDataDraft = findViewById(R.id.btnSaveDataDraft);

        btnSaveDataDraft.setOnClickListener(v -> {
            // Save Journal from intent to SharedPreferences
            SharedPreferences.Editor editor = getSharedPreferences("DreamPrefs", Context.MODE_PRIVATE).edit();
            editor.putString("DraftJournal", journalText);
            editor.apply();
            
            Toast.makeText(this, "Draft saved!", Toast.LENGTH_SHORT).show();
            // Return to main
            Intent intent = new Intent(this, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(intent);
            finish();
        });

        btnSaveData.setOnClickListener(v -> {
            // Collect Tags
            StringBuilder tagsBuilder = new StringBuilder();
            for (int i = 0; i < chipGroupTags.getChildCount(); i++) {
                Chip chip = (Chip) chipGroupTags.getChildAt(i);
                tagsBuilder.append(chip.getText().toString());
                if (i < chipGroupTags.getChildCount() - 1) tagsBuilder.append(", ");
            }

            Dream dream = new Dream();
            dream.setTimestamp(System.currentTimeMillis());
            dream.setDescription(journalText);
            dream.setMood(selectedMood);
            dream.setClarity(sbClarity.getProgress());
            dream.setLucidity(sbLucidity.getProgress());
            dream.setNightmare(initialNightmareState);
            dream.setTags(tagsBuilder.toString());

            DreamRepository repo = new DreamRepository(this);
            repo.insertDream(dream);

            // Clear draft
            getSharedPreferences("DreamPrefs", Context.MODE_PRIVATE).edit().remove("DraftJournal").apply();

            Toast.makeText(this, "Dream saved successfully! ✨", Toast.LENGTH_SHORT).show();

            // Return to MainActivity
            Intent intent = new Intent(this, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(intent);
            finish();
        });
    }

    private void setupMoodClickListeners() {
        moodIntense.setOnClickListener(v -> updateMoodSelection("Intense", moodIntense));
        moodStressed.setOnClickListener(v -> updateMoodSelection("Stressed", moodStressed));
        moodUnclear.setOnClickListener(v -> updateMoodSelection("Unclear", moodUnclear));
        moodCalm.setOnClickListener(v -> updateMoodSelection("Calm", moodCalm));
        moodLucid.setOnClickListener(v -> updateMoodSelection("Lucid", moodLucid));
        updateMoodSelection("Unclear", moodUnclear); // Default
    }

    private void updateMoodSelection(String moodText, LinearLayout selectedCard) {
        this.selectedMood = moodText;
        
        moodIntense.setBackgroundResource(R.drawable.bg_mood_unselected);
        moodStressed.setBackgroundResource(R.drawable.bg_mood_unselected);
        moodUnclear.setBackgroundResource(R.drawable.bg_mood_unselected);
        moodCalm.setBackgroundResource(R.drawable.bg_mood_unselected);
        moodLucid.setBackgroundResource(R.drawable.bg_mood_unselected);

        selectedCard.setBackgroundResource(R.drawable.bg_mood_selected);
    }

    private void setupTagInput() {
        etTagInput.setOnEditorActionListener((v, actionId, event) -> {
            if (actionId == EditorInfo.IME_ACTION_DONE || 
                (event != null && event.getAction() == KeyEvent.ACTION_DOWN && event.getKeyCode() == KeyEvent.KEYCODE_ENTER)) {
                
                String tagText = etTagInput.getText().toString().trim();
                if (!tagText.isEmpty()) {
                    addChipToGroup(tagText);
                    etTagInput.setText("");
                }
                return true;
            }
            return false;
        });
    }

    private void addChipToGroup(String text) {
        Chip chip = new Chip(this);
        chip.setText(text);
        chip.setCloseIconVisible(true);
        chip.setCloseIconTintResource(android.R.color.white);
        chip.setTextColor(Color.WHITE);
        chip.setChipBackgroundColorResource(R.color.glow_primary); 
        chip.setOnCloseIconClickListener(v -> chipGroupTags.removeView(chip));
        chipGroupTags.addView(chip);
    }
}
