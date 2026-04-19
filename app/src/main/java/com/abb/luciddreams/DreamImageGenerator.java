package com.abb.luciddreams;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.TimeUnit;

public class DreamImageGenerator {

    private static final String TAG = "DreamImageGenerator";

    // Newer HuggingFace Inference Router endpoint (avoids "Cannot POST" errors from legacy endpoint)
    private static final String BASE_URL = "https://router.huggingface.co/hf-inference/models/";

    // API key is read from local.properties via BuildConfig (HUGGING_FACE_API_KEY)
    private static final String API_KEY = "Bearer " + BuildConfig.HUGGING_FACE_API_KEY;

    // Fallback models tried in priority order; first successfully responding model wins
    private static final List<String> FALLBACK_MODELS = Arrays.asList(
            "stabilityai/stable-diffusion-2-1",
            "CompVis/stable-diffusion-v1-4",
            "prompthero/openjourney",
            "dreamlike-art/dreamlike-diffusion-1.0",
            "Lykon/DreamShaper"
    );

    // Maximum number of retries when a model returns 503 (model still loading)
    private static final int MAX_RETRY_503 = 2;
    // Delay between 503 retries (milliseconds)
    private static final long RETRY_DELAY_MS = 5000;

    private final OkHttpClient client;

    public interface ImageGenerationListener {
        void onSuccess(Bitmap bitmap);
        void onError(String message);
    }

    public DreamImageGenerator() {
        client = new OkHttpClient.Builder()
                .connectTimeout(60, TimeUnit.SECONDS)
                .readTimeout(120, TimeUnit.SECONDS)
                .writeTimeout(60, TimeUnit.SECONDS)
                .build();
    }

    public void generateImage(String dreamDescription, ImageGenerationListener listener) {
        if (BuildConfig.HUGGING_FACE_API_KEY.isEmpty()) {
            listener.onError("Missing API Key. Please add it to local.properties");
            return;
        }

        String enhancedPrompt = enhancePrompt(dreamDescription);

        new Thread(() -> {
            String lastError = "All models failed";

            for (int modelIndex = 0; modelIndex < FALLBACK_MODELS.size(); modelIndex++) {
                String modelId = FALLBACK_MODELS.get(modelIndex);
                String url = BASE_URL + modelId;
                Log.d(TAG, "Trying model [" + (modelIndex + 1) + "]: " + url);

                byte[] imageBytes = null;
                String modelError = null;

                for (int attempt = 0; attempt <= MAX_RETRY_503; attempt++) {
                    if (attempt > 0) {
                        Log.d(TAG, "503 retry " + attempt + "/" + MAX_RETRY_503 + " for model: " + modelId);
                        try {
                            Thread.sleep(RETRY_DELAY_MS);
                        } catch (InterruptedException ie) {
                            Thread.currentThread().interrupt();
                            break;
                        }
                    }

                    String json = buildJsonPayload(enhancedPrompt);
                    RequestBody body = RequestBody.create(json, MediaType.parse("application/json"));
                    Request request = new Request.Builder()
                            .url(url)
                            .post(body)
                            .addHeader("Authorization", API_KEY)
                            .addHeader("Accept", "image/*")
                            .build();

                    try (Response response = client.newCall(request).execute()) {
                        if (response.isSuccessful() && response.body() != null) {
                            imageBytes = response.body().bytes();
                            modelError = null;
                            break; // success — stop retrying this model
                        }

                        int code = response.code();
                        String errorBody = "";
                        try {
                            if (response.body() != null) errorBody = response.body().string();
                        } catch (IOException e2) {
                            Log.w(TAG, "Could not read error body", e2);
                        }
                        Log.e(TAG, "API Error " + code + " for " + url + ": " + errorBody);

                        if (code == 503) {
                            modelError = "Model loading (503)";
                            // will retry up to MAX_RETRY_503 times
                        } else if (code == 404) {
                            modelError = "Model not found (404): " + modelId;
                            break; // 404 is definitive — skip to next model immediately
                        } else {
                            modelError = "HTTP " + code + " from " + modelId;
                            break; // other errors are not retryable
                        }
                    } catch (IOException e) {
                        modelError = "Network error: " + e.getMessage();
                        Log.e(TAG, "Network error for " + url, e);
                        break;
                    }
                }

                if (imageBytes != null) {
                    byte[] finalBytes = imageBytes;
                    Bitmap bitmap = BitmapFactory.decodeByteArray(finalBytes, 0, finalBytes.length);
                    new Handler(Looper.getMainLooper()).post(() -> {
                        if (bitmap != null) {
                            listener.onSuccess(bitmap);
                        } else {
                            listener.onError("Failed to decode image");
                        }
                    });
                    return; // done — exit thread
                }

                lastError = modelError;
                Log.w(TAG, "Model [" + (modelIndex + 1) + "] failed: " + lastError);
            }

            String finalError = lastError;
            new Handler(Looper.getMainLooper()).post(() ->
                    listener.onError("Image generation failed: " + finalError));
        }).start();
    }

    private String buildJsonPayload(String prompt) {
        try {
            JSONObject parameters = new JSONObject();
            parameters.put("negative_prompt", "blurry, ugly, distorted, low quality");
            parameters.put("num_inference_steps", 25);
            parameters.put("guidance_scale", 7.5);

            JSONObject payload = new JSONObject();
            payload.put("inputs", prompt);
            payload.put("parameters", parameters);
            return payload.toString();
        } catch (JSONException e) {
            // Fallback to minimal payload; prompt has already been sanitised in enhancePrompt
            return "{\"inputs\": \"\"}";
        }
    }

    private String enhancePrompt(String description) {
        // Clean and truncate description
        String clean = description.replaceAll("[\n\r]", " ").trim();
        if (clean.length() > 300) clean = clean.substring(0, 300);

        // Visual Style Keywords from requirements
        String style = "fantasy dreamscape, soft glowing lights, cinematic composition, rich blue tones, moonlight atmosphere, magical realism, painterly digital art, highly aesthetic, premium app artwork, soft particles, sparkles, surrealism, high resolution, 8k";

        return "A dreamy visual representation of: " + clean + ". Style: " + style;
    }
}
