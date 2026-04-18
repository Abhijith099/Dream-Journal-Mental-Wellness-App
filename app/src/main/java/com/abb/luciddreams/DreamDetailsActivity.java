package com.abb.luciddreams;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.SeekBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

public class DreamDetailsActivity extends AppCompatActivity {

    private String journalText;
    private boolean initialNightmareState;
    private String selectedMood = "😐"; // Default mood

    private TextView tvMood1, tvMood2, tvMood3, tvMood4, tvMood5;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Transparent status bar setup
        Window window = getWindow();
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(Color.parseColor("#1C2552")); // theme_background

        setContentView(R.layout.activity_dream_details);

        journalText = getIntent().getStringExtra("journal_text");
        initialNightmareState = getIntent().getBooleanExtra("is_nightmare", false);

        ImageView ivBack = findViewById(R.id.ivBack);
        ivBack.setOnClickListener(v -> finish());

        // Mood Selectors
        tvMood1 = findViewById(R.id.tvMood1);
        tvMood2 = findViewById(R.id.tvMood2);
        tvMood3 = findViewById(R.id.tvMood3);
        tvMood4 = findViewById(R.id.tvMood4);
        tvMood5 = findViewById(R.id.tvMood5);

        setupMoodClick(tvMood1, "😢");
        setupMoodClick(tvMood2, "😟");
        setupMoodClick(tvMood3, "😐");
        setupMoodClick(tvMood4, "🙂");
        setupMoodClick(tvMood5, "😄");
        setMoodSelection(tvMood3); // Set default

        SeekBar sbClarity = findViewById(R.id.sbClarity);
        SeekBar sbLucidity = findViewById(R.id.sbLucidity);
        EditText etTags = findViewById(R.id.etTags);
        CheckBox cbDetailsNightmare = findViewById(R.id.cbDetailsNightmare);
        CheckBox cbRecurring = findViewById(R.id.cbRecurring);
        Button btnSaveData = findViewById(R.id.btnSaveData);

        cbDetailsNightmare.setChecked(initialNightmareState);

        btnSaveData.setOnClickListener(v -> {
            Dream dream = new Dream();
            dream.setTimestamp(System.currentTimeMillis());
            dream.setDescription(journalText);
            dream.setMood(selectedMood);
            dream.setClarity(sbClarity.getProgress());
            dream.setLucidity(sbLucidity.getProgress());
            dream.setNightmare(cbDetailsNightmare.isChecked());
            dream.setRecurring(cbRecurring.isChecked());
            dream.setTags(etTags.getText().toString());

            DreamRepository repo = new DreamRepository(this);
            repo.insertDream(dream);

            // Clear draft
            SharedPreferences.Editor editor = getSharedPreferences("DreamPrefs", Context.MODE_PRIVATE).edit();
            editor.remove("DraftJournal");
            editor.apply();

            Toast.makeText(this, "Dream saved! ✨", Toast.LENGTH_SHORT).show();

            // Return to MainActivity
            Intent intent = new Intent(this, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(intent);
            finish();
        });
    }

    private void setupMoodClick(TextView tv, String moodEmoji) {
        tv.setOnClickListener(v -> {
            selectedMood = moodEmoji;
            setMoodSelection(tv);
        });
    }

    private void setMoodSelection(TextView selectedTv) {
        tvMood1.setAlpha(0.2f);
        tvMood2.setAlpha(0.2f);
        tvMood3.setAlpha(0.2f);
        tvMood4.setAlpha(0.2f);
        tvMood5.setAlpha(0.2f);
        selectedTv.setAlpha(1.0f);
    }
}
