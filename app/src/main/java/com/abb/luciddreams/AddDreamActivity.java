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
import android.view.MotionEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.google.android.material.materialswitch.MaterialSwitch;

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
    private Button btnSaveDraft;
    private SpeechRecognizer speechRecognizer;

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
        btnSaveDraft = findViewById(R.id.btnSaveDraft);

        setupNavigation();
        
        TextView tvDescription = findViewById(R.id.tvDescription);
        String userName = "Nicolas"; 
        tvDescription.setText(userName + ", describe your dream as precisely as possible. Lumina will then offer a symbolic and emotional analysis.");

        // Text Watcher for Character Counter & Analysis Button Reveal
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
                Toast.makeText(this, "Please describe your dream first.", Toast.LENGTH_SHORT).show();
                return;
            }
            saveDraft(); // Auto save state if user jumps navigation

            // STEP 2: Proceed to Analysis & Details
            Intent intent = new Intent(this, DreamDetailsActivity.class);
            intent.putExtra("journal_text", journal);
            intent.putExtra("is_nightmare", cbNightmare.isChecked());
            startActivity(intent);
        });

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
