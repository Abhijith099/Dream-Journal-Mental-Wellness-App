package com.abb.luciddreams;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

import org.json.JSONObject;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.TimeUnit;

public class DreamImageGenerator {

    private static final String TAG = "DreamImageGenerator";
    
    // Standard Inference API base URL (no trailing slash)
    private static final String BASE_URL = "https://api-inference.huggingface.co/models";

    // Use models that are specifically known to work on the shared Inference API free tier
    private static final List<String> FALLBACK_MODELS = Arrays.asList(
            "runwayml/stable-diffusion-v1-5",
            "stabilityai/stable-diffusion-2-1",
            "prompthero/openjourney",
            "stabilityai/stable-diffusion-xl-base-1.0",
            "black-forest-labs/FLUX.1-schnell"
    );

    private final OkHttpClient client;

    public interface ImageGenerationListener {
        void onSuccess(Bitmap bitmap);
        void onError(String message);
    }

    public DreamImageGenerator() {
        // High timeouts to handle model "cold starts"
        client = new OkHttpClient.Builder()
                .connectTimeout(120, TimeUnit.SECONDS)
                .readTimeout(120, TimeUnit.SECONDS)
                .writeTimeout(120, TimeUnit.SECONDS)
                .followRedirects(true)
                .followSslRedirects(true)
                .build();
    }

    public void generateImage(String dreamDescription, ImageGenerationListener listener) {
        String apiKey = BuildConfig.HUGGING_FACE_API_KEY;
        if (apiKey == null || apiKey.trim().isEmpty() || apiKey.equals("YOUR_API_KEY_HERE")) {
            listener.onError("API Key missing or invalid.");
            return;
        }

        String prompt = enhancePrompt(dreamDescription);
        Log.d(TAG, "Starting generation with prompt: " + prompt);

        new Thread(() -> {
            String lastError = "Image generation failed";

            for (String modelId : FALLBACK_MODELS) {
                String url = BASE_URL + "/" + modelId.trim();
                Log.d(TAG, ">>> Attempting Model: " + url);

                for (int attempt = 1; attempt <= 2; attempt++) {
                    try {
                        JSONObject json = new JSONObject();
                        json.put("inputs", prompt);
                        
                        RequestBody body = RequestBody.create(json.toString(), MediaType.parse("application/json"));
                        
                        Request request = new Request.Builder()
                                .url(url)
                                .post(body)
                                .addHeader("Authorization", "Bearer " + apiKey.trim())
                                .addHeader("User-Agent", "LucidDreamsAndroidApp/1.0")
                                .addHeader("x-wait-for-model", "true")
                                .addHeader("x-use-cache", "false")
                                .build();

                        try (Response response = client.newCall(request).execute()) {
                            int code = response.code();
                            String contentType = response.header("Content-Type", "");
                            
                            if (response.isSuccessful() && response.body() != null) {
                                byte[] bytes = response.body().bytes();
                                if (contentType != null && contentType.startsWith("image/")) {
                                    Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
                                    if (bitmap != null) {
                                        Log.d(TAG, "SUCCESS! Image generated via " + modelId);
                                        new Handler(Looper.getMainLooper()).post(() -> listener.onSuccess(bitmap));
                                        return; 
                                    }
                                }
                                
                                String bodyStr = new String(bytes);
                                if (bodyStr.contains("loading")) {
                                    lastError = "Model is loading...";
                                    Thread.sleep(8000);
                                    continue; 
                                }
                            } else {
                                String errorBody = response.body() != null ? response.body().string() : "No error body";
                                Log.e(TAG, "Model " + modelId + " failed (" + code + "): " + errorBody);
                                
                                if (code == 503) {
                                    lastError = "Model is starting up...";
                                    Thread.sleep(8000);
                                    continue;
                                } else if (code == 404) {
                                    lastError = "Model not found (404)";
                                    break; 
                                } else if (code == 401 || code == 403) {
                                    new Handler(Looper.getMainLooper()).post(() -> listener.onError("API Key Authentication Failed"));
                                    return;
                                }
                            }
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "Error with " + modelId, e);
                        lastError = e.getMessage();
                    }
                }
            }

            // Ultimate Fallback: Pollinations.ai (No API key required)
            generateWithPollinations(prompt, listener);
        }).start();
    }

    private void generateWithPollinations(String prompt, ImageGenerationListener listener) {
        Log.d(TAG, "Attempting Pollinations.ai ultimate fallback...");
        try {
            String encodedPrompt = URLEncoder.encode(prompt, StandardCharsets.UTF_8.toString());
            String url = "https://image.pollinations.ai/prompt/" + encodedPrompt + "?width=1024&height=1024&nologo=true&seed=" + System.currentTimeMillis();

            Request request = new Request.Builder()
                    .url(url)
                    .addHeader("User-Agent", "LucidDreamsAndroidApp/1.0")
                    .get()
                    .build();

            try (Response response = client.newCall(request).execute()) {
                if (response.isSuccessful() && response.body() != null) {
                    byte[] bytes = response.body().bytes();
                    Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
                    if (bitmap != null) {
                        Log.d(TAG, "Pollinations.ai Success!");
                        new Handler(Looper.getMainLooper()).post(() -> listener.onSuccess(bitmap));
                        return;
                    }
                }
                Log.e(TAG, "Pollinations failed with code: " + response.code());
            }
        } catch (Exception e) {
            Log.e(TAG, "Pollinations error", e);
        }

        new Handler(Looper.getMainLooper()).post(() -> listener.onError("All image providers failed. Using placeholder."));
    }

    private String enhancePrompt(String description) {
        // Sanitize and enhance the prompt for a "dreamy" aesthetic
        String clean = description.replaceAll("[^a-zA-Z0-9\\s,.!]", "").trim();
        if (clean.length() > 300) clean = clean.substring(0, 300);
        return clean + ", dreamscape fantasy style, ethereal lighting, high detailed digital art, cinematic masterpiece, 4k resolution";
    }
}
