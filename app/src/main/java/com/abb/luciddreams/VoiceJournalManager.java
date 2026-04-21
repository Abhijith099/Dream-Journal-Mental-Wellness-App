package com.abb.luciddreams;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioManager;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;

import androidx.core.content.ContextCompat;

import java.util.ArrayList;

public class VoiceJournalManager implements RecognitionListener {
    
    private Context context;
    private SpeechRecognizer speechRecognizer;
    private Intent recognizerIntent;
    private VoiceCallback callback;
    private boolean isListening = false;
    
    public interface VoiceCallback {
        void onListeningStart();
        void onListeningEnd();
        void onSpeechResult(String result);
        void onError(String errorMessage);
    }
    
    public VoiceJournalManager(Context context, VoiceCallback callback) {
        this.context = context;
        this.callback = callback;
        initializeSpeechRecognizer();
    }
    
    private void initializeSpeechRecognizer() {
        if (SpeechRecognizer.isRecognitionAvailable(context)) {
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context);
            speechRecognizer.setRecognitionListener(this);
            
            recognizerIntent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            recognizerIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            recognizerIntent.putExtra(RecognizerIntent.EXTRA_PROMPT, "Speak your dream...");
            recognizerIntent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
        }
    }
    
    public void startListening() {
        if (!checkPermission()) return;
        if (speechRecognizer != null && !isListening) {
            isListening = true;
            speechRecognizer.startListening(recognizerIntent);
        }
    }
    
    public void stopListening() {
        if (speechRecognizer != null && isListening) {
            isListening = false;
            speechRecognizer.stopListening();
        }
    }
    
    private boolean checkPermission() {
        return ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
    }
    
    @Override
    public void onReadyForSpeech(Bundle params) {
        if (callback != null) callback.onListeningStart();
    }
    
    @Override
    public void onBeginningOfSpeech() {}
    @Override
    public void onRmsChanged(float rmsdB) {}
    @Override
    public void onBufferReceived(byte[] buffer) {}
    
    @Override
    public void onEndOfSpeech() {
        if (callback != null) callback.onListeningEnd();
    }
    
    @Override
    public void onError(int error) {
        String msg = getErrorMessage(error);
        if (callback != null) callback.onError(msg);
    }
    
    @Override
    public void onResults(Bundle results) {
        ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (matches != null && !matches.isEmpty()) {
            if (callback != null) callback.onSpeechResult(matches.get(0));
        }
    }
    
    @Override
    public void onPartialResults(Bundle partialResults) {}
    @Override
    public void onEvent(int eventType, Bundle params) {}
    
    private String getErrorMessage(int error) {
        switch(error) {
            case SpeechRecognizer.ERROR_NO_MATCH: return "No speech detected";
            case SpeechRecognizer.ERROR_NETWORK: return "Network error";
            case SpeechRecognizer.ERROR_AUDIO: return "Audio error";
            default: return "Recognition error";
        }
    }
    
    public void destroy() {
        if (speechRecognizer != null) {
            speechRecognizer.destroy();
        }
    }
}