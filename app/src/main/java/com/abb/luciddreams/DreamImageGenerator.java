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

import org.json.JSONObject;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.TimeUnit;

public class DreamImageGenerator {

    private static final String TAG = "DreamImageGenerator";
    
    // Standard Inference API base URL - ensure no trailing slash here for cleaner concatenation
    private static final String BASE_URL = "https://api-inference.huggingface.co/models";

    // Re-ordered fallback list to prioritize models that are more likely to be active on the free tier.
    private static final List<String> FALLBACK_MODELS = Arrays.asList(
            "stabilityai/stable-diffusion-xl-base-1.0",
            "runwayml/stable-diffusion-v1-5",
            "stabilityai/stable-diffusion-2-1",
            "prompthero/openjourney",
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
        if (apiKey == null || apiKey.trim().isEmpty()) {
            listener.onError("API Key missing. Please check local.properties");
            return;
        }

        String prompt = enhancePrompt(dreamDescription);
        Log.d(TAG, "Starting generation with prompt: " + prompt);

        new Thread(() -> {
            String lastError = "Image generation failed";

            for (int i = 0; i < FALLBACK_MODELS.size(); i++) {
                String modelId = FALLBACK_MODELS.get(i).trim();
                String url = BASE_URL + "/" + modelId;
                Log.d(TAG, ">>> Attempting Model [" + (i + 1) + "/" + FALLBACK_MODELS.size() + "]: " + url);

                // Try each model with up to 2 retries for 503 "Loading" errors
                for (int attempt = 1; attempt <= 2; attempt++) {
                    if (attempt > 1) {
                        Log.d(TAG, "Retrying " + modelId + " (Attempt " + attempt + "/2)...");
                        try { Thread.sleep(8000); } catch (InterruptedException e) { 
                            Thread.currentThread().interrupt();
                            break; 
                        }
                    }

                    try {
                        JSONObject json = new JSONObject();
                        json.put("inputs", prompt);
                        
                        // Use application/json explicitly
                        RequestBody body = RequestBody.create(json.toString(), MediaType.parse("application/json; charset=utf-8"));
                        
                        Request request = new Request.Builder()
                                .url(url)
                                .post(body)
                                .addHeader("Authorization", "Bearer " + apiKey.trim())
                                // Standard browser User-Agent to avoid CloudFront routing issues with generic ones
                                .addHeader("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
                                .addHeader("Accept", "image/*")
                                .addHeader("X-Wait-For-Model", "true")
                                .addHeader("X-Use-Cache", "false")
                                .build();

                        try (Response response = client.newCall(request).execute()) {
                            int code = response.code();
                            String contentType = response.header("Content-Type", "");
                            Log.d(TAG, "Response from " + modelId + " | Code: " + code + " | Content-Type: " + contentType);

                            if (response.isSuccessful() && response.body() != null) {
                                byte[] bytes = response.body().bytes();
                                // Real images are usually > 10KB, while error JSONs/HTML are small
                                if (contentType.startsWith("image/") || bytes.length > 1000) {
                                    Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
                                    if (bitmap != null) {
                                        Log.d(TAG, "SUCCESS! Image generated via " + modelId + " (" + bytes.length + " bytes)");
                                        new Handler(Looper.getMainLooper()).post(() -> listener.onSuccess(bitmap));
                                        return; 
                                    }
                                }
                                
                                String bodyStr = new String(bytes);
                                Log.w(TAG, "Unexpected response from " + modelId + ": " + bodyStr);
                                if (bodyStr.contains("error") || bodyStr.contains("Cannot POST")) {
                                    lastError = "Model error: " + modelId;
                                    if (code == 503 || bodyStr.contains("loading")) continue; 
                                }
                            } else {
                                String errorBody = response.body() != null ? response.body().string() : "No error body";
                                Log.e(TAG, "Failure (" + code + ") for " + modelId + ": " + errorBody);
                                
                                if (code == 503 || code == 429) {
                                    lastError = "Model busy (" + code + ")";
                                    continue; 
                                } else if (code == 401 || code == 403) {
                                    lastError = "Auth failed. Check API key.";
                                    final String authErr = lastError;
                                    new Handler(Looper.getMainLooper()).post(() -> listener.onError(authErr));
                                    return; 
                                } else {
                                    lastError = "Error " + code + ": " + modelId;
                                    // If it's a 404, the model endpoint might be wrong, but try others
                                    continue;
                                }
                            }
                        }
                    } catch (IOException e) {
                        Log.e(TAG, "Network error for " + modelId, e);
                        lastError = "Network: " + e.getMessage();
                        break; // Try next model
                    } catch (Exception e) {
                        Log.e(TAG, "Critical error for " + modelId, e);
                        lastError = "Error: " + e.getMessage();
                        break;
                    }
                }
            }

            final String finalErr = lastError;
            new Handler(Looper.getMainLooper()).post(() -> listener.onError("Generation failed: " + finalErr));
        }).start();
    }

    private String enhancePrompt(String description) {
        // Sanitize and enhance the prompt for a "dreamy" aesthetic
        String clean = description.replaceAll("[^a-zA-Z0-9\\s,.!]", "").trim();
        if (clean.length() > 300) clean = clean.substring(0, 300);
        return clean + ", dreamscape fantasy style, ethereal lighting, high detailed digital art, cinematic masterpiece, 4k resolution";
    }
}
