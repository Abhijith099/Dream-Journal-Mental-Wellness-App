package com.abb.luciddreams;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
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

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

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
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);

        setContentView(R.layout.activity_add_dream);

        BottomNavigationView bottomNav = findViewById(R.id.bottomNav);
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.add_dream_root), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, 0);
            
            if (bottomNav != null) {
                // Remove padding if any, and let BottomNavigationView handle it or apply bottom inset
                bottomNav.setPadding(0, 0, 0, systemBars.bottom);
            }
            return insets;
        });

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
            PremiumToast.show(this, "Draft saved!");
            finish();
        });

        btnAnalyze.setOnClickListener(v -> {
            String journal = etDreamJournal.getText().toString().trim();
            if (journal.isEmpty()) {
                PremiumToast.show(this, "Please describe your dream first.");
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
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            tvMicStatus.setText("Speech STT Not Available");
            btnHoldToTalk.setEnabled(false);
            return;
        }

        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this);
        Intent speechIntent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        speechIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        speechIntent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);

        speechRecognizer.setRecognitionListener(new RecognitionListener() {
            @Override
            public void onReadyForSpeech(Bundle params) {
                tvMicStatus.setText("Listening...");
                btnHoldToTalk.setAlpha(1.0f);
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
            }

            @Override
            public void onError(int error) {
                String message;
                switch (error) {
                    case SpeechRecognizer.ERROR_AUDIO: message = "Audio error"; break;
                    case SpeechRecognizer.ERROR_CLIENT: message = "Client error"; break;
                    case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS: message = "Permission missing"; break;
                    case SpeechRecognizer.ERROR_NETWORK: message = "Network error"; break;
                    case SpeechRecognizer.ERROR_NETWORK_TIMEOUT: message = "Network timeout"; break;
                    case SpeechRecognizer.ERROR_NO_MATCH: message = "No speech detected"; break;
                    case SpeechRecognizer.ERROR_RECOGNIZER_BUSY: message = "Busy, try again"; break;
                    case SpeechRecognizer.ERROR_SERVER: message = "Server error"; break;
                    case SpeechRecognizer.ERROR_SPEECH_TIMEOUT: message = "No speech input"; break;
                    default: message = "STT Error: " + error; break;
                }
                tvMicStatus.setText("Hold to Talk");
                btnHoldToTalk.setAlpha(1.0f);
                PremiumToast.show(AddDreamActivity.this, message);
            }

            @Override
            public void onResults(Bundle results) {
                tvMicStatus.setText("Hold to Talk");
                btnHoldToTalk.setAlpha(1.0f);
                ArrayList<String> data = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                if (data != null && !data.isEmpty()) {
                    String recognizedText = data.get(0);
                    appendToJournal(recognizedText);
                }
            }

            @Override
            public void onPartialResults(Bundle partialResults) {
                ArrayList<String> data = partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                if (data != null && !data.isEmpty()) {
                    tvMicStatus.setText("..." + data.get(0));
                }
            }

            @Override
            public void onEvent(int eventType, Bundle params) {}
        });

        btnHoldToTalk.setOnTouchListener((v, event) -> {
            if (event.getAction() == MotionEvent.ACTION_DOWN) {
                if (checkAudioPermission()) {
                    v.setAlpha(0.6f);
                    v.performHapticFeedback(android.view.HapticFeedbackConstants.LONG_PRESS);
                    speechRecognizer.startListening(speechIntent);
                }
            } else if (event.getAction() == MotionEvent.ACTION_UP || event.getAction() == MotionEvent.ACTION_CANCEL) {
                v.setAlpha(1.0f);
                speechRecognizer.stopListening();
            }
            return true;
        });
    }

    private void appendToJournal(String text) {
        String current = etDreamJournal.getText().toString();
        if (!current.isEmpty() && !current.endsWith(" ")) {
            current += " ";
        }
        etDreamJournal.setText(current + text);
        etDreamJournal.setSelection(etDreamJournal.getText().length());
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
