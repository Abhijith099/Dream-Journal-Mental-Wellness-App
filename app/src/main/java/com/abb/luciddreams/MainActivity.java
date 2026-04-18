package com.abb.luciddreams;

<<<<<<< HEAD
import android.content.Context;
=======
import android.animation.ObjectAnimator;
>>>>>>> 647b1196e6bfbdcc3288dcc6ae4981f262187f74
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
<<<<<<< HEAD
import android.view.inputmethod.InputMethodManager;
import android.widget.EditText;
import android.widget.ImageView;
=======
>>>>>>> 647b1196e6bfbdcc3288dcc6ae4981f262187f74
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

    private EditText etSearchTags;
    private ImageView ivClearSearch;

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
        FloatingActionButton fabAdd = findViewById(R.id.fabAdd);

        etSearchTags = findViewById(R.id.etSearchTags);
        ivClearSearch = findViewById(R.id.ivClearSearch);

        rvDreams.setLayoutManager(new LinearLayoutManager(this));
        
        repository = new DreamRepository(this);

        adapter = new DreamAdapter(dreamList);
        rvDreams.setAdapter(adapter);

        fabAdd.setOnClickListener(v -> {
            Intent intent = new Intent(MainActivity.this, AddDreamActivity.class);
            startActivity(intent);
        });

        setupSearch();
    }

    private void setupSearch() {
        etSearchTags.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                String query = s.toString().trim();
                if (query.isEmpty()) {
                    ivClearSearch.setVisibility(View.GONE);
                    loadDreams(); // Revert to today's dreams
                } else {
                    ivClearSearch.setVisibility(View.VISIBLE);
                    performSearch(query);
                }
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });

        ivClearSearch.setOnClickListener(v -> {
            etSearchTags.setText("");
            etSearchTags.clearFocus();
            // close keyboard
            InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
            if (imm != null) {
                imm.hideSoftInputFromWindow(etSearchTags.getWindowToken(), 0);
            }
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        // If there is an active search, perform it, otherwise load today's dreams
        if (etSearchTags != null && !etSearchTags.getText().toString().trim().isEmpty()) {
            performSearch(etSearchTags.getText().toString().trim());
        } else {
            loadDreams();
        }
    }

    private void loadDreams() {
        dreamList = repository.getTodayDreams();
        adapter.updateList(dreamList);

        RecyclerView rvDreams = findViewById(R.id.rvDreams);
        View llEmptyState = findViewById(R.id.llEmptyState);
        TextView tvEmptyStatus = findViewById(R.id.tvEmptyStatus);

        if (dreamList.isEmpty()) {
            rvDreams.setVisibility(View.GONE);
            llEmptyState.setVisibility(View.VISIBLE);
            tvEmptyStatus.setText("No dreams recorded today");
        } else {
            llEmptyState.setVisibility(View.GONE);
            rvDreams.setVisibility(View.VISIBLE);
        }
    }

    private void performSearch(String query) {
        dreamList = repository.searchDreamsByTag(query);
        adapter.updateList(dreamList);

        RecyclerView rvDreams = findViewById(R.id.rvDreams);
        View llEmptyState = findViewById(R.id.llEmptyState);
        TextView tvEmptyStatus = findViewById(R.id.tvEmptyStatus);

        if (dreamList.isEmpty()) {
            rvDreams.setVisibility(View.GONE);
            llEmptyState.setVisibility(View.VISIBLE);
            tvEmptyStatus.setText("No dreams found for this tag");
        } else {
            llEmptyState.setVisibility(View.GONE);
            rvDreams.setVisibility(View.VISIBLE);
        }
    }
}