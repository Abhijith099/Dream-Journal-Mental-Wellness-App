package com.abb.luciddreams;

import android.graphics.Color;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.Switch;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

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

    private String selectedMood = "☁";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(Color.parseColor("#171F4B"));

        setContentView(R.layout.activity_edit_dream);

        long dreamId = getIntent().getLongExtra("dream_id", -1);
        if (dreamId < 0) {
            Toast.makeText(this, "Dream not found", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        repository = new DreamRepository(this);
        dream = repository.getDreamById(dreamId);
        if (dream == null) {
            Toast.makeText(this, "Dream not found", Toast.LENGTH_SHORT).show();
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

        moodCalm.setOnClickListener(v     -> updateMoodSelection("🌙", moodCalm));
        moodStressed.setOnClickListener(v -> updateMoodSelection("⚡", moodStressed));
        moodUnclear.setOnClickListener(v  -> updateMoodSelection("☁", moodUnclear));
        moodLucid.setOnClickListener(v    -> updateMoodSelection("✨", moodLucid));
        moodIntense.setOnClickListener(v  -> updateMoodSelection("🔥", moodIntense));

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

        selectedMood = dream.getMood() != null ? dream.getMood() : "☁";
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
            case "🌙": updateMoodSelection("🌙", moodCalm);    break;
            case "⚡": updateMoodSelection("⚡", moodStressed); break;
            case "✨": updateMoodSelection("✨", moodLucid);    break;
            case "🔥": updateMoodSelection("🔥", moodIntense);  break;
            default:   updateMoodSelection("☁",  moodUnclear);  break;
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
            Toast.makeText(this, "Description cannot be empty", Toast.LENGTH_SHORT).show();
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
            Toast.makeText(this, "Dream updated ✨", Toast.LENGTH_SHORT).show();
            setResult(RESULT_OK);
            finish();
        } else {
            Toast.makeText(this, "Failed to update dream", Toast.LENGTH_SHORT).show();
        }
    }
}
