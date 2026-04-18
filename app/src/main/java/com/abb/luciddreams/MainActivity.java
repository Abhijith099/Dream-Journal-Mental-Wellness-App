package com.abb.luciddreams;

import android.animation.ObjectAnimator;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;

import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.floatingactionbutton.FloatingActionButton;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class MainActivity extends AppCompatActivity {

    private List<Dream> dreamList = new ArrayList<>();
    private DreamAdapter adapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Setup transparent status bar to blend with gradient
        Window window = getWindow();
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(Color.parseColor("#0F1C3F")); // Matches gradient_top
        
        setContentView(R.layout.activity_main);
        
        RecyclerView rvDreams = findViewById(R.id.rvDreams);
        View llEmptyState = findViewById(R.id.llEmptyState);
        FloatingActionButton fabAdd = findViewById(R.id.fabAdd);

        rvDreams.setLayoutManager(new LinearLayoutManager(this));
        
        adapter = new DreamAdapter(dreamList);
        rvDreams.setAdapter(adapter);

        fabAdd.setOnClickListener(v -> {
            // Mocking "Add Dream" screen return behavior
            if (dreamList.isEmpty()) {
                dreamList.add(new Dream(
                        "April", "Sat", "18", "17/04/2026",
                        "I felt scared and sweaty, it is the second time I’m seeing this dream.",
                        Arrays.asList("frightened", "sweaty", "scared"),
                        true
                ));
                adapter.notifyItemInserted(0);

                // Crossfade animation
                llEmptyState.animate().alpha(0f).setDuration(300).withEndAction(() -> llEmptyState.setVisibility(View.GONE));
                rvDreams.setAlpha(0f);
                rvDreams.setVisibility(View.VISIBLE);
                rvDreams.animate().alpha(1f).setDuration(400).start();
            } else {
                dreamList.add(new Dream(
                        "April", "Sun", "19", "18/04/2026",
                        "I was flying over a vast glowing ocean, feeling completely lucid and at peace.",
                        Arrays.asList("lucid", "peaceful", "flying"),
                        false
                ));
                adapter.notifyItemInserted(dreamList.size() - 1);
            }
        });
    }
}