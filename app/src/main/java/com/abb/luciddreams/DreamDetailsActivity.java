package com.abb.luciddreams;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.view.inputmethod.EditorInfo;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.SeekBar;
import android.widget.Toast;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.google.android.material.chip.Chip;
import com.google.android.material.chip.ChipGroup;
import com.google.android.material.textfield.TextInputEditText;

public class DreamDetailsActivity extends AppCompatActivity {

    private String journalText;
    private boolean initialNightmareState;
    private String selectedMood = "Unclear"; // Default
 
    private LinearLayout moodCalm, moodStressed, moodUnclear, moodLucid, moodIntense;
    private SeekBar sbClarity, sbLucidity;
    private TextInputEditText etTagInput;
    private ChipGroup chipGroupTags;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);

        setContentView(R.layout.activity_dream_details);

        View bottomButtons = findViewById(R.id.bottomButtonsContainer);
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.dream_details_root), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, 0);
            
            if (bottomButtons != null) {
                bottomButtons.setPadding(
                    bottomButtons.getPaddingLeft(),
                    bottomButtons.getPaddingTop(),
                    bottomButtons.getPaddingRight(),
                    systemBars.bottom
                );
            }
            return insets;
        });

        journalText = getIntent().getStringExtra("journal_text");
        initialNightmareState = getIntent().getBooleanExtra("is_nightmare", false);

        ImageView ivBack = findViewById(R.id.ivBack);
        ivBack.setOnClickListener(v -> finish());

        // Mood Selectors
        moodCalm = findViewById(R.id.moodCalm);
        moodStressed = findViewById(R.id.moodStressed);
        moodUnclear = findViewById(R.id.moodUnclear);
        moodLucid = findViewById(R.id.moodLucid);
        moodIntense = findViewById(R.id.moodIntense);

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
            if (chipGroupTags.getChildCount() == 0) {
                Toast.makeText(this, "Please add at least one tag to continue", Toast.LENGTH_SHORT).show();
                return;
            }

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
            long dreamId = repo.insertDream(dream);

            // Clear draft
            getSharedPreferences("DreamPrefs", Context.MODE_PRIVATE).edit().remove("DraftJournal").apply();

            Toast.makeText(this, "Dream saved successfully! ✨", Toast.LENGTH_SHORT).show();

            // Proceed to Analysis immediately
            Intent intent = new Intent(this, DreamAnalysisActivity.class);
            intent.putExtra("dream_text", journalText);
            intent.putExtra("dream_id", dreamId);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
            finish();
        });
    }

    private void setupMoodClickListeners() {
        moodCalm.setOnClickListener(v -> updateMoodSelection("🌙", moodCalm));
        moodStressed.setOnClickListener(v -> updateMoodSelection("⚡", moodStressed));
        moodUnclear.setOnClickListener(v -> updateMoodSelection("☁", moodUnclear));
        moodLucid.setOnClickListener(v -> updateMoodSelection("✨", moodLucid));
        moodIntense.setOnClickListener(v -> updateMoodSelection("🔥", moodIntense));
        updateMoodSelection("☁", moodUnclear); // Default
    }

    private void updateMoodSelection(String moodText, LinearLayout selectedCard) {
        this.selectedMood = moodText;
        
        moodCalm.setBackgroundResource(R.drawable.bg_mood_unselected);
        moodStressed.setBackgroundResource(R.drawable.bg_mood_unselected);
        moodUnclear.setBackgroundResource(R.drawable.bg_mood_unselected);
        moodLucid.setBackgroundResource(R.drawable.bg_mood_unselected);
        moodIntense.setBackgroundResource(R.drawable.bg_mood_unselected);

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
