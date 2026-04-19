package com.abb.luciddreams;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Handler;
import android.os.Looper;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

public class DreamImageGenerator {

    private static final String API_URL = "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5";
    private static final String API_KEY = "Bearer " + BuildConfig.HUGGING_FACE_API_KEY;

    private final OkHttpClient client;

    public interface ImageGenerationListener {
        void onSuccess(Bitmap bitmap);
        void onError(String message);
    }

    public DreamImageGenerator() {
        client = new OkHttpClient.Builder()
                .connectTimeout(60, TimeUnit.SECONDS)
                .readTimeout(60, TimeUnit.SECONDS)
                .writeTimeout(60, TimeUnit.SECONDS)
                .build();
    }

    public void generateImage(String dreamDescription, ImageGenerationListener listener) {
        String apiKey = BuildConfig.HUGGING_FACE_API_KEY;
        if (apiKey == null || apiKey.isEmpty() || apiKey.equals("null")) {
            listener.onError("Missing API Key. Please add HUGGING_FACE_API_KEY to local.properties");
            return;
        }

        String enhancedPrompt = enhancePrompt(dreamDescription);
        
        new Thread(() -> {
            try {
                MediaType mediaType = MediaType.parse("application/json; charset=utf-8");
                String json = "{\"inputs\": \"" + enhancedPrompt + "\", \"options\": {\"wait_for_model\": true}}";
                RequestBody body = RequestBody.create(json, mediaType);
                
                Request request = new Request.Builder()
                        .url(API_URL)
                        .post(body)
                        .addHeader("Authorization", "Bearer " + apiKey)
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
                        String errorMsg = response.message();
                        int code = response.code();
                        if (code == 503) {
                            errorMsg = "Model is loading... This may take a minute.";
                        } else if (code == 401) {
                            errorMsg = "Invalid API Key. Check your Hugging Face token.";
                        } else if (code == 429) {
                            errorMsg = "Rate limit exceeded. Try again later.";
                        }
                        
                        String finalErrorMsg = errorMsg;
                        new Handler(Looper.getMainLooper()).post(() -> listener.onError("Error (" + code + "): " + finalErrorMsg));
                    }
                }
            } catch (IOException e) {
                new Handler(Looper.getMainLooper()).post(() -> listener.onError("Network error. Please check your connection."));
            } catch (Exception e) {
                new Handler(Looper.getMainLooper()).post(() -> listener.onError("Unexpected error: " + e.getMessage()));
            }
        }).start();
    }

    private String enhancePrompt(String description) {
        // Cleaning description
        String clean = description.replaceAll("[\"\\n\\r]", " ").trim();
        if (clean.length() > 300) clean = clean.substring(0, 300);

        // Visual Style Keywords from requirements
        String style = "fantasy dreamscape, soft glowing lights, cinematic composition, rich blue tones, moonlight atmosphere, magical realism, painterly digital art, highly aesthetic, premium app artwork, soft particles, sparkles, surrealism, high resolution, 8k";
        
        // Escape backslashes for JSON
        clean = clean.replace("\\", "\\\\").replace("\"", "\\\"");
        
        return "A dreamy visual representation of: " + clean + ". Style: " + style;
    }
}
