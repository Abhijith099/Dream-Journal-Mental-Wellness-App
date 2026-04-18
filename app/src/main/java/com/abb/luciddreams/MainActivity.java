package com.abb.luciddreams;

import android.animation.ObjectAnimator;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.floatingactionbutton.FloatingActionButton;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends AppCompatActivity {

    private List<Dream> dreamList = new ArrayList<>();
    private DreamAdapter adapter;
    private DreamRepository repository;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Setup transparent status bar to blend with gradient
        Window window = getWindow();
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(Color.parseColor("#1C2552")); // theme_background
        
        setContentView(R.layout.activity_main);
        
        RecyclerView rvDreams = findViewById(R.id.rvDreams);
        View llEmptyState = findViewById(R.id.llEmptyState);
        FloatingActionButton fabAdd = findViewById(R.id.fabAdd);

        rvDreams.setLayoutManager(new LinearLayoutManager(this));
        
        repository = new DreamRepository(this);

        adapter = new DreamAdapter(dreamList);
        rvDreams.setAdapter(adapter);

        fabAdd.setOnClickListener(v -> {
            Intent intent = new Intent(MainActivity.this, AddDreamActivity.class);
            startActivity(intent);
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        loadDreams();
    }

    private void loadDreams() {
        dreamList = repository.getTodayDreams();
        adapter.updateList(dreamList);

        RecyclerView rvDreams = findViewById(R.id.rvDreams);
        View llEmptyState = findViewById(R.id.llEmptyState);
        TextView tvEmptyStatus = findViewById(R.id.tvEmptyStatus); // Need to add an ID to the textview in layout if not present

        if (dreamList.isEmpty()) {
            rvDreams.setVisibility(View.GONE);
            llEmptyState.setVisibility(View.VISIBLE);
        } else {
            llEmptyState.setVisibility(View.GONE);
            rvDreams.setVisibility(View.VISIBLE);
        }
    }
}