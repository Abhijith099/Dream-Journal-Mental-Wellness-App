package com.abb.luciddreams;

import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.view.inputmethod.InputMethodManager;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.datepicker.MaterialDatePicker;
import com.google.android.material.floatingactionbutton.FloatingActionButton;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class MainActivity extends AppCompatActivity {

    private List<Dream> dreamList = new ArrayList<>();
    private DreamAdapter adapter;
    private DreamRepository repository;
    private RecyclerView recyclerView;

    private EditText etSearchTags;
    private ImageView ivClearSearch, ivCalendar, ivProfile;
    private TextView tvTitle;
    private TextView tvTodayReset;

    private Long selectedDateMillis = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
        
        setContentView(R.layout.activity_main);

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main_root), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, 0);
            return insets;
        });
        
        recyclerView = findViewById(R.id.rvDreams);
        FloatingActionButton fabAdd = findViewById(R.id.fabAdd);

        etSearchTags = findViewById(R.id.etSearchTags);
        ivClearSearch = findViewById(R.id.ivClearSearch);
        ivCalendar = findViewById(R.id.ivCalendar);
        ivProfile = findViewById(R.id.ivProfile);
        tvTitle = findViewById(R.id.tvTitle);
        tvTodayReset = findViewById(R.id.tvTodayReset);

        recyclerView.setLayoutManager(new LinearLayoutManager(this));
        
        repository = new DreamRepository(this);

        adapter = new DreamAdapter(dreamList);
        recyclerView.setAdapter(adapter);

        fabAdd.setOnClickListener(v -> {
            Intent intent = new Intent(MainActivity.this, AddDreamActivity.class);
            startActivity(intent);
        });

        ivProfile.setOnClickListener(v -> {
            Intent intent = new Intent(this, ProfileActivity.class);
            startActivity(intent);
        });

        setupSearch();
        setupCalendar();
        setupBottomNav();
    }

    private void setupBottomNav() {
        com.google.android.material.bottomnavigation.BottomNavigationView nav = findViewById(R.id.bottomNav);
        nav.setOnItemSelectedListener(item -> {
            int id = item.getItemId();
            if (id == R.id.nav_analysis) {
                Intent intent = new Intent(this, AnalysisDashboardActivity.class);
                intent.setFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
                startActivity(intent);
                overridePendingTransition(0, 0);
                return true;
            } else if (id == R.id.nav_patterns) {
                Intent intent = new Intent(this, PatternsActivity.class);
                startActivity(intent);
                overridePendingTransition(0, 0);
                return true;
            } else if (id == R.id.nav_profile) {
                Intent intent = new Intent(this, ProfileActivity.class);
                startActivity(intent);
                overridePendingTransition(0, 0);
                return true;
            }
            return id == R.id.nav_dreams;
        });
        nav.setSelectedItemId(R.id.nav_dreams);
    }

    private void setupCalendar() {
        ivCalendar.setOnClickListener(v -> {
            List<Long> datesWithDreams = repository.getDatesWithDreams();
            DreamDayViewDecorator decorator = new DreamDayViewDecorator(datesWithDreams);

            MaterialDatePicker<Long> datePicker = MaterialDatePicker.Builder.datePicker()
                    .setTitleText("Select Date")
                    .setTheme(R.style.CustomDatePickerTheme)
                    .setSelection(selectedDateMillis != null ? selectedDateMillis : MaterialDatePicker.todayInUtcMilliseconds())
                    .setDayViewDecorator(decorator)
                    .build();

            datePicker.addOnPositiveButtonClickListener(selection -> {
                selectedDateMillis = selection;
                updateHeader();
                reloadDreams();
            });

            datePicker.show(getSupportFragmentManager(), "DREAM_CALENDAR");
        });

        tvTodayReset.setOnClickListener(v -> {
            selectedDateMillis = null;
            updateHeader();
            reloadDreams();
        });
    }

    private void updateHeader() {
        if (selectedDateMillis != null) {
            SimpleDateFormat sdf = new SimpleDateFormat("dd MMM", Locale.getDefault());
            tvTitle.setText("Dreams • " + sdf.format(new Date(selectedDateMillis)));
            tvTodayReset.setVisibility(View.VISIBLE);
        } else {
            tvTitle.setText("Dreams");
            tvTodayReset.setVisibility(View.GONE);
        }
    }

    private void setupSearch() {
        etSearchTags.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                String query = s.toString().trim();
                ivClearSearch.setVisibility(query.isEmpty() ? View.GONE : View.VISIBLE);
                reloadDreams();
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });

        ivClearSearch.setOnClickListener(v -> {
            etSearchTags.setText("");
            etSearchTags.clearFocus();
            InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
            if (imm != null) {
                imm.hideSoftInputFromWindow(etSearchTags.getWindowToken(), 0);
            }
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        reloadDreams();
    }

    private void reloadDreams() {
        String query = etSearchTags.getText().toString().trim();
        
        // Show all dreams filtered by tag, or all dreams if no tag and no date selected
        dreamList = repository.getDreamsFiltered(selectedDateMillis, query);
        
        adapter.updateList(dreamList);
        
        View llEmptyState = findViewById(R.id.llEmptyState);
        TextView tvEmptyStatus = findViewById(R.id.tvEmptyStatus);

        if (dreamList == null || dreamList.isEmpty()) {
            recyclerView.setVisibility(View.GONE);
            llEmptyState.setVisibility(View.VISIBLE);
            
            if (selectedDateMillis != null) {
                if (!query.isEmpty()) {
                    tvEmptyStatus.setText("No dreams found for this tag on this date");
                } else {
                    tvEmptyStatus.setText("No dreams recorded on this day");
                }
            } else {
                if (!query.isEmpty()) {
                    tvEmptyStatus.setText("No dreams found for this tag");
                } else {
                    tvEmptyStatus.setText("No dreams recorded yet");
                }
            }
        } else {
            llEmptyState.setVisibility(View.GONE);
            recyclerView.setVisibility(View.VISIBLE);
        }
    }
}
