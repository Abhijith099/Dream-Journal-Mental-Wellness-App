package com.abb.luciddreams;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.Switch;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.google.android.material.chip.Chip;
import com.google.android.material.chip.ChipGroup;
import com.google.android.material.textfield.TextInputEditText;

public class EditDreamActivity extends AppCompatActivity {

    private DreamRepository repository;
    private Dream dream;

    private TextInputEditText etTitle;
    private TextInputEditText etDescription;
    private TextInputEditText etTagInput;
    private ChipGroup chipGroupTags;
    private Switch switchNightmare;
    private LinearLayout moodCalm, moodStressed, moodUnclear, moodLucid, moodIntense;

    private String selectedMood = "Unclear";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);

        setContentView(R.layout.activity_edit_dream);

        View bottomButtons = findViewById(R.id.bottomButtons);
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.edit_dream_root), (v, insets) -> {
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

        long dreamId = getIntent().getLongExtra("dream_id", -1);
        if (dreamId < 0) {
            PremiumToast.show(this, "Dream not found");
            finish();
            return;
        }

        repository = new DreamRepository(this);
        dream = repository.getDreamById(dreamId);
        if (dream == null) {
            PremiumToast.show(this, "Dream not found");
            finish();
            return;
        }

        initViews();
        populateFields();
    }

    private void initViews() {
        ImageView ivBack = findViewById(R.id.ivBack);
        ivBack.setOnClickListener(v -> finish());

        etTitle       = findViewById(R.id.etEditTitle);
        etDescription = findViewById(R.id.etEditDescription);
        etTagInput    = findViewById(R.id.etEditTagInput);
        chipGroupTags = findViewById(R.id.chipGroupEditTags);
        switchNightmare = findViewById(R.id.switchEditNightmare);

        moodCalm     = findViewById(R.id.editMoodCalm);
        moodStressed = findViewById(R.id.editMoodStressed);
        moodUnclear  = findViewById(R.id.editMoodUnclear);
        moodLucid    = findViewById(R.id.editMoodLucid);
        moodIntense  = findViewById(R.id.editMoodIntense);

        moodCalm.setOnClickListener(v     -> updateMoodSelection("Calm", moodCalm));
        moodStressed.setOnClickListener(v -> updateMoodSelection("Stressed", moodStressed));
        moodUnclear.setOnClickListener(v  -> updateMoodSelection("Unclear", moodUnclear));
        moodLucid.setOnClickListener(v    -> updateMoodSelection("Happy", moodLucid));
        moodIntense.setOnClickListener(v  -> updateMoodSelection("Fearful", moodIntense));

        etTagInput.setOnEditorActionListener((v, actionId, event) -> {
            String tag = etTagInput.getText() != null ? etTagInput.getText().toString().trim() : "";
            if (!tag.isEmpty()) {
                addTagChip(tag);
                etTagInput.setText("");
            }
            return true;
        });

        Button btnSave   = findViewById(R.id.btnSaveChanges);
        Button btnCancel = findViewById(R.id.btnCancelEdit);

        btnCancel.setOnClickListener(v -> finish());

        btnSave.setOnClickListener(v -> saveChanges());
    }

    private void populateFields() {
        String description = dream.getDescription() != null ? dream.getDescription() : "";
        // Title field is optional/hidden; use description truncated as preview
        if (etTitle != null) {
            etTitle.setText(description.length() > 60 ? description.substring(0, 60) : description);
        }
        etDescription.setText(description);

        switchNightmare.setChecked(dream.isNightmare());

        selectedMood = dream.getMood() != null ? dream.getMood() : "Unclear";
        updateMoodHighlight(selectedMood);

        // Populate tags
        if (dream.getTags() != null && !dream.getTags().isEmpty()) {
            for (String tag : dream.getTags().split(",")) {
                String t = tag.trim();
                if (!t.isEmpty()) addTagChip(t);
            }
        }
    }

    private void updateMoodSelection(String moodValue, LinearLayout selected) {
        selectedMood = moodValue;
        moodCalm.setBackgroundResource(R.drawable.bg_mood_unselected);
        moodStressed.setBackgroundResource(R.drawable.bg_mood_unselected);
        moodUnclear.setBackgroundResource(R.drawable.bg_mood_unselected);
        moodLucid.setBackgroundResource(R.drawable.bg_mood_unselected);
        moodIntense.setBackgroundResource(R.drawable.bg_mood_unselected);
        selected.setBackgroundResource(R.drawable.bg_mood_selected);
    }

    private void updateMoodHighlight(String mood) {
        switch (mood) {
            case "Calm":
            case "🌙":
                updateMoodSelection("Calm", moodCalm);
                break;
            case "Stressed":
            case "⚡":
                updateMoodSelection("Stressed", moodStressed);
                break;
            case "Happy":
            case "✨":
                updateMoodSelection("Happy", moodLucid);
                break;
            case "Fearful":
            case "🔥":
                updateMoodSelection("Fearful", moodIntense);
                break;
            default:
                updateMoodSelection("Unclear", moodUnclear);
                break;
        }
    }

    private void addTagChip(String text) {
        Chip chip = new Chip(this);
        chip.setText(text);
        chip.setCloseIconVisible(true);
        chip.setCloseIconTintResource(android.R.color.white);
        chip.setTextColor(Color.WHITE);
        chip.setChipBackgroundColorResource(R.color.glow_primary);
        chip.setOnCloseIconClickListener(v -> chipGroupTags.removeView(chip));
        chipGroupTags.addView(chip);
    }

    private void saveChanges() {
        String description = etDescription.getText() != null ? etDescription.getText().toString().trim() : "";
        if (description.isEmpty()) {
            PremiumToast.show(this, "Description cannot be empty");
            return;
        }

        // Collect tags
        StringBuilder tagsBuilder = new StringBuilder();
        for (int i = 0; i < chipGroupTags.getChildCount(); i++) {
            Chip chip = (Chip) chipGroupTags.getChildAt(i);
            if (i > 0) tagsBuilder.append(", ");
            tagsBuilder.append(chip.getText().toString());
        }

        dream.setDescription(description);
        dream.setMood(selectedMood);
        dream.setNightmare(switchNightmare.isChecked());
        dream.setTags(tagsBuilder.toString());

        int rows = repository.updateDream(dream);
        if (rows > 0) {
            PremiumToast.show(this, "Dream updated");
            setResult(RESULT_OK);
            finish();
        } else {
            PremiumToast.show(this, "Failed to update dream");
        }
    }
}
