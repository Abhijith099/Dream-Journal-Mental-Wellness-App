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

import java.io.IOException;
import java.util.concurrent.TimeUnit;

public class DreamImageGenerator {

    private static final String TAG = "DreamImageGenerator";
    private static final String[] MODELS = {
            "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
            "https://api-inference.huggingface.co/models/stabilityai/sdxl-turbo",
            "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
            "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5",
            "https://api-inference.huggingface.co/models/Lykon/DreamShaper"
    };
    // API key is read from local.properties via BuildConfig (HUGGING_FACE_API_KEY)
    private static final String API_KEY = "Bearer " + BuildConfig.HUGGING_FACE_API_KEY;

    private final OkHttpClient client;

    public interface ImageGenerationListener {
        void onSuccess(Bitmap bitmap);
        void onError(String message);
    }

    public DreamImageGenerator() {
        client = new OkHttpClient.Builder()
                .connectTimeout(100, TimeUnit.SECONDS)
                .readTimeout(100, TimeUnit.SECONDS)
                .writeTimeout(100, TimeUnit.SECONDS)
                .build();
    }

    public void generateImage(String dreamDescription, ImageGenerationListener listener) {
        if (BuildConfig.HUGGING_FACE_API_KEY.isEmpty()) {
            listener.onError("Missing API Key. Please add it to local.properties");
            return;
        }

        String enhancedPrompt = enhancePrompt(dreamDescription);
        Log.d(TAG, "Starting image generation sequence...");
        tryModel(0, enhancedPrompt, listener);
    }

    private void tryModel(int index, String prompt, ImageGenerationListener listener) {
        if (index >= MODELS.length) {
            listener.onError("All models failed to generate image.");
            return;
        }

        String url = MODELS[index];
        Log.d(TAG, "Trying model [" + index + "]: " + url);

        executeRequest(url, prompt, new ImageGenerationListener() {
            @Override
            public void onSuccess(Bitmap bitmap) {
                listener.onSuccess(bitmap);
            }

            @Override
            public void onError(String message) {
                Log.w(TAG, "Model [" + index + "] failed: " + message);
                // Try next model if it's a 404 or other potentially model-specific error
                tryModel(index + 1, prompt, listener);
            }
        });
    }

    private void executeRequest(String url, String prompt, ImageGenerationListener listener) {
        new Thread(() -> {
            MediaType mediaType = MediaType.parse("application/json; charset=utf-8");
            // Basic JSON manual construction for simplicity, but escaped
            String escapedPrompt = prompt.replace("\\", "\\\\").replace("\"", "\\\"");
            String json = "{\"inputs\": \"" + escapedPrompt + "\"}";
            RequestBody body = RequestBody.create(json, mediaType);
            
            Request request = new Request.Builder()
                    .url(url)
                    .post(body)
                    .addHeader("Authorization", API_KEY)
                    .addHeader("X-Wait-For-Model", "true")
                    .addHeader("X-Use-Cache", "false")
                    .build();

            try (Response response = client.newCall(request).execute()) {
                if (response.isSuccessful() && response.body() != null) {
                    byte[] bytes = response.body().bytes();
                    Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
                    
                    new Handler(Looper.getMainLooper()).post(() -> {
                        if (bitmap != null) {
                            listener.onSuccess(bitmap);
                        } else {
                            listener.onError("Failed to decode image");
                        }
                    });
                } else {
                    int code = response.code();
                    String errorBody = "";
                    try {
                        if (response.body() != null) errorBody = response.body().string();
                    } catch (IOException e2) {
                        Log.w(TAG, "Could not read error body", e2);
                    }
                    Log.e(TAG, "API Error " + code + " for " + url + ": " + errorBody);
                    
                    String errorMsg;
                    if (code == 503) {
                        errorMsg = "Model is loading, please try again.";
                    } else if (code == 404) {
                        errorMsg = "Error 404: Model not found at " + url;
                    } else if (code == 401) {
                        errorMsg = "Error 401: Invalid API Key.";
                    } else {
                        errorMsg = "HTTP " + code + ": " + response.message();
                    }
                    
                    new Handler(Looper.getMainLooper()).post(() -> listener.onError(errorMsg));
                }
            } catch (IOException e) {
                Log.e(TAG, "Network Error", e);
                new Handler(Looper.getMainLooper()).post(() -> listener.onError("Network Error: " + e.getMessage()));
            }
        }).start();
    }

    private String enhancePrompt(String description) {
        // Cleaning description - remove newlines and quotes
        String clean = description.replaceAll("[\"\\n\\r]", " ").trim();
        if (clean.length() > 300) clean = clean.substring(0, 300);

        // Visual Style Keywords
        String style = "fantasy dreamscape, soft glowing lights, cinematic composition, rich blue tones, moonlight atmosphere, magical realism, painterly digital art, highly aesthetic, premium app artwork, soft particles, sparkles, surrealism, high resolution, 8k";
        
        return "A dreamy visual representation of: " + clean + ". Style: " + style;
    }
}
