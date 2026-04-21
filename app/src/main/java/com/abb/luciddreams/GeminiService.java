package com.abb.luciddreams;

import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.IOException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

public class GeminiService {
    private static final String TAG = "GeminiService";
    private static final String API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=";
    private final String apiKey;
    private final OkHttpClient client;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    public interface GeminiListener {
        void onSuccess(String response);
        void onError(String error);
    }

    public GeminiService() {
        this.apiKey = BuildConfig.GEMINI_API_KEY;
        this.client = new OkHttpClient();
    }

    public void analyzeDreams(String prompt, GeminiListener listener) {
        executor.execute(() -> {
            try {
                JSONObject jsonBody = new JSONObject();
                JSONArray contentsArray = new JSONArray();
                JSONObject contentObject = new JSONObject();
                JSONArray partsArray = new JSONArray();
                JSONObject partObject = new JSONObject();

                partObject.put("text", prompt);
                partsArray.put(partObject);
                contentObject.put("parts", partsArray);
                contentsArray.put(contentObject);
                jsonBody.put("contents", contentsArray);

                // Add generation config for JSON output if supported or just ask for it in prompt
                // For simplicity, we'll ask for JSON in the prompt.

                RequestBody body = RequestBody.create(
                        jsonBody.toString(),
                        MediaType.get("application/json; charset=utf-8")
                );

                int retryCount = 0;
                int maxRetries = 3;
                long backoffDelay = 2000; // 2 seconds

                while (retryCount <= maxRetries) {
                    Request request = new Request.Builder()
                            .url(API_URL + apiKey)
                            .post(body)
                            .build();

                    try (Response response = client.newCall(request).execute()) {
                        if (response.isSuccessful()) {
                            String responseData = response.body().string();
                            JSONObject jsonResponse = new JSONObject(responseData);
                            String text = jsonResponse.getJSONArray("candidates")
                                    .getJSONObject(0)
                                    .getJSONObject("content")
                                    .getJSONArray("parts")
                                    .getJSONObject(0)
                                    .getString("text");

                            mainHandler.post(() -> listener.onSuccess(text));
                            return;
                        }

                        if (response.code() == 503 && retryCount < maxRetries) {
                            retryCount++;
                            Log.w(TAG, "503 Service Unavailable, retrying " + retryCount + "/" + maxRetries + " after " + backoffDelay + "ms...");
                            Thread.sleep(backoffDelay);
                            backoffDelay *= 2; // Exponential backoff
                            continue;
                        }

                        String errorBody = response.body() != null ? response.body().string() : "No error body";
                        Log.e(TAG, "API Error: " + response.code() + " - " + errorBody);
                        String errorMsg = "API Error: " + response.code();
                        try {
                            JSONObject errJson = new JSONObject(errorBody);
                            if (errJson.has("error")) {
                                errorMsg = errJson.getJSONObject("error").getString("message");
                            }
                        } catch (Exception ignored) {}

                        final String finalError = errorMsg;
                        mainHandler.post(() -> listener.onError(finalError));
                        return;
                    } catch (IOException | InterruptedException e) {
                        if (retryCount < maxRetries) {
                            retryCount++;
                            Thread.sleep(backoffDelay);
                            backoffDelay *= 2;
                            continue;
                        }
                        throw e;
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "Error: ", e);
                mainHandler.post(() -> listener.onError(e.getMessage()));
            }
        });
    }
}
