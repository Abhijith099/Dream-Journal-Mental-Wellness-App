package com.abb.luciddreams;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.view.inputmethod.EditorInfo;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.SeekBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.google.android.material.chip.Chip;
import com.google.android.material.chip.ChipGroup;
import com.google.android.material.materialswitch.MaterialSwitch;
import com.google.android.material.textfield.TextInputEditText;

import java.util.ArrayList;

public class AddDreamActivity extends AppCompatActivity {

    private static final int RECORD_AUDIO_PERMISSION_CODE = 100;
    private static final String PREFS_NAME = "DreamPrefs";
    private static final String DRAFT_KEY = "DraftJournal";

    private EditText etDreamJournal;
    private TextView tvCharCount;
    private LinearLayout btnHoldToTalk;
    private TextView tvMicStatus;
    private MaterialSwitch cbNightmare;
    private Button btnAnalyze;
    private Button btnSaveDream;
    private Button btnSaveDraft;
    private SpeechRecognizer speechRecognizer;

    // Premium Details Additions
    private LinearLayout moodCalm, moodStressed, moodUnclear, moodLucid, moodIntense;
    private String selectedMood = "☁"; // Unclear by default
    private SeekBar sbClarity, sbLucidity;
    private TextInputEditText etTagInput;
    private ChipGroup chipGroupTags;

    @SuppressLint("ClickableViewAccessibility")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Transparent status bar setup
        Window window = getWindow();
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(Color.parseColor("#1C2552"));

        setContentView(R.layout.activity_add_dream);

        // Initialize UI Elements
        etDreamJournal = findViewById(R.id.etDreamJournal);
        tvCharCount = findViewById(R.id.tvCharCount);
        btnHoldToTalk = findViewById(R.id.btnHoldToTalk);
        tvMicStatus = findViewById(R.id.tvMicStatus);
        cbNightmare = findViewById(R.id.cbNightmare);
        btnAnalyze = findViewById(R.id.btnAnalyze);
        btnSaveDream = findViewById(R.id.btnSaveDream);
        btnSaveDraft = findViewById(R.id.btnSaveDraft);

        // Details Elements
        moodCalm = findViewById(R.id.moodCalm);
        moodStressed = findViewById(R.id.moodStressed);
        moodUnclear = findViewById(R.id.moodUnclear);
        moodLucid = findViewById(R.id.moodLucid);
        moodIntense = findViewById(R.id.moodIntense);
        
        sbClarity = findViewById(R.id.sbClarity);
        sbLucidity = findViewById(R.id.sbLucidity);
        
        etTagInput = findViewById(R.id.etTagInput);
        chipGroupTags = findViewById(R.id.chipGroupTags);

        setupNavigation();
        setupMoodClickListeners();
        setupTagInput();
        
        TextView tvDescription = findViewById(R.id.tvDescription);
        String userName = "Nicolas"; 
        tvDescription.setText(userName + ", describe your dream as precisely as possible. Lumina will then offer a symbolic and emotional analysis.");

        // Text Watcher for Character Counter
        etDreamJournal.addTextChangedListener(new android.text.TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                if (tvCharCount != null) {
                    tvCharCount.setText(s.length() + "/5000");
                }
                if (s.length() > 0) {
                    btnHoldToTalk.setVisibility(View.GONE);
                    btnAnalyze.setVisibility(View.VISIBLE);
                } else {
                    btnHoldToTalk.setVisibility(View.VISIBLE);
                    btnAnalyze.setVisibility(View.GONE);
                }
            }
            @Override
            public void afterTextChanged(android.text.Editable s) {}
        });

        // Load Draft
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String draft = prefs.getString(DRAFT_KEY, "");
        if (!draft.isEmpty()) {
            etDreamJournal.setText(draft);
        }

        btnSaveDraft.setOnClickListener(v -> {
            saveDraft();
            Toast.makeText(this, "Draft saved!", Toast.LENGTH_SHORT).show();
            finish();
        });

        btnAnalyze.setOnClickListener(v -> {
            String journal = etDreamJournal.getText().toString().trim();
            if (journal.isEmpty()) {
                Toast.makeText(this, "Please write something about your dream first.", Toast.LENGTH_SHORT).show();
                return;
            }
            saveDraft();
            Toast.makeText(this, "Analyzing Dream... ✨", Toast.LENGTH_SHORT).show();
            // Implement analysis feature navigation here...
        });

        btnSaveDream.setOnClickListener(v -> saveCompleteDream());

        setupSpeechRecognizer();
    }

    private void setupNavigation() {
        BottomNavigationView bottomNav = findViewById(R.id.bottomNav);
        if (bottomNav != null) {
            bottomNav.setOnItemSelectedListener(item -> {
                finish();
                return true;
            });
        }
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
        
        // Reset all
        moodCalm.setBackgroundResource(R.drawable.bg_mood_unselected);
        moodStressed.setBackgroundResource(R.drawable.bg_mood_unselected);
        moodUnclear.setBackgroundResource(R.drawable.bg_mood_unselected);
        moodLucid.setBackgroundResource(R.drawable.bg_mood_unselected);
        moodIntense.setBackgroundResource(R.drawable.bg_mood_unselected);

        // Set Selected
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
        chip.setChipBackgroundColorResource(R.color.glow_primary); // Needs to exist or fallback
        chip.setOnCloseIconClickListener(v -> chipGroupTags.removeView(chip));
        chipGroupTags.addView(chip);
    }

    private void saveCompleteDream() {
        String journal = etDreamJournal.getText().toString().trim();
        if (journal.isEmpty()) {
            Toast.makeText(this, "Please describe your dream before saving.", Toast.LENGTH_SHORT).show();
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
        dream.setDescription(journal);
        dream.setMood(selectedMood);
        dream.setClarity(sbClarity.getProgress());
        dream.setLucidity(sbLucidity.getProgress());
        dream.setNightmare(cbNightmare.isChecked());
        dream.setTags(tagsBuilder.toString());
        // dream.setRecurring(false); // We dropped recurring switch for UI brevity if not specified

        DreamRepository repo = new DreamRepository(this);
        repo.insertDream(dream);

        // Clear draft since it is formally saved
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().remove(DRAFT_KEY).apply();

        Toast.makeText(this, "Dream saved successfully! ✨", Toast.LENGTH_SHORT).show();

        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        startActivity(intent);
        finish();
    }

    private void setupSpeechRecognizer() {
        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this);
        Intent speechIntent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        speechIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);

        speechRecognizer.setRecognitionListener(new RecognitionListener() {
            @Override
            public void onReadyForSpeech(Bundle params) {
                tvMicStatus.setText("Listening...");
            }

            @Override
            public void onBeginningOfSpeech() {}

            @Override
            public void onRmsChanged(float rmsdB) {}

            @Override
            public void onBufferReceived(byte[] buffer) {}

            @Override
            public void onEndOfSpeech() {
                tvMicStatus.setText("Processing...");
                btnHoldToTalk.setVisibility(View.GONE);
                btnAnalyze.setVisibility(View.VISIBLE);
            }

            @Override
            public void onError(int error) {
                tvMicStatus.setText("Hold to Talk");
                Toast.makeText(AddDreamActivity.this, "Speech recognition error", Toast.LENGTH_SHORT).show();
            }

            @Override
            public void onResults(Bundle results) {
                tvMicStatus.setText("Hold to Talk");
                ArrayList<String> data = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                if (data != null && !data.isEmpty()) {
                    String recognizedText = data.get(0);
                    String currentText = etDreamJournal.getText().toString();
                    if (!currentText.isEmpty() && !currentText.endsWith(" ")) {
                        currentText += " ";
                    }
                    etDreamJournal.setText(currentText + recognizedText);
                    etDreamJournal.setSelection(etDreamJournal.getText().length());
                }
            }

            @Override
            public void onPartialResults(Bundle partialResults) {}

            @Override
            public void onEvent(int eventType, Bundle params) {}
        });

        btnHoldToTalk.setOnTouchListener((v, event) -> {
            if (event.getAction() == MotionEvent.ACTION_DOWN) {
                if (checkAudioPermission()) {
                    speechRecognizer.startListening(speechIntent);
                }
            } else if (event.getAction() == MotionEvent.ACTION_UP) {
                speechRecognizer.stopListening();
            }
            return true;
        });
    }

    private void saveDraft() {
        SharedPreferences.Editor editor = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit();
        editor.putString(DRAFT_KEY, etDreamJournal.getText().toString());
        editor.apply();
    }

    private boolean checkAudioPermission() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.RECORD_AUDIO}, RECORD_AUDIO_PERMISSION_CODE);
            return false;
        }
        return true;
    }

    @Override
    protected void onPause() {
        super.onPause();
        // Only auto-save draft if text isn't empty and they didn't just save formally
        saveDraft(); 
    }

    @Override
    protected void onDestroy() {
        if (speechRecognizer != null) {
            speechRecognizer.destroy();
        }
        super.onDestroy();
    }
}
