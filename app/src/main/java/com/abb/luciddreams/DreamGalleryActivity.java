package com.abb.luciddreams;

import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.activity.EdgeToEdge;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.bumptech.glide.load.resource.bitmap.CenterCrop;
import com.bumptech.glide.load.resource.bitmap.RoundedCorners;
import com.google.android.material.datepicker.MaterialDatePicker;

import java.io.File;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class DreamGalleryActivity extends AppCompatActivity {

    private RecyclerView rvGallery;
    private GalleryAdapter adapter;
    private DreamRepository repository;
    private View llEmpty;
    private TextView tvFilterDate, btnSeeAll;
    private View filterHeader;
    private Long selectedFilterDate = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_dream_gallery);

        rvGallery = findViewById(R.id.rvGallery);
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.gallery_root), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, 0);
            
            if (rvGallery != null) {
                // Add extra padding to the bottom of RecyclerView to clear the navigation bar
                rvGallery.setPadding(
                    rvGallery.getPaddingLeft(),
                    rvGallery.getPaddingTop(),
                    rvGallery.getPaddingRight(),
                    systemBars.bottom + dp(24) // Base padding + bottom inset
                );
            }
            return insets;
        });

        repository = new DreamRepository(this);
        rvGallery = findViewById(R.id.rvGallery);
        llEmpty = findViewById(R.id.llEmptyGallery);
        filterHeader = findViewById(R.id.filterHeader);
        tvFilterDate = findViewById(R.id.tvFilterDate);
        btnSeeAll = findViewById(R.id.btnSeeAll);

        findViewById(R.id.ivBack).setOnClickListener(v -> finish());
        findViewById(R.id.ivGalleryCalendar).setOnClickListener(v -> showCalendarPicker());
        btnSeeAll.setOnClickListener(v -> {
            selectedFilterDate = null;
            filterHeader.setVisibility(View.GONE);
            loadGallery();
        });

        rvGallery.setLayoutManager(new GridLayoutManager(this, 2));
        setupBottomNav();
        loadGallery();
    }

    private void setupBottomNav() {
        com.google.android.material.bottomnavigation.BottomNavigationView nav = findViewById(R.id.bottomNav);
        nav.setSelectedItemId(R.id.nav_profile); // If you'd rather highlight gallery, keep it. 
        // But requested: final order: Dreams, Analysis, Add, Patterns, Profile. 
        // We'll map Gallery to something else or just not highlight.
        
        nav.setOnItemSelectedListener(item -> {
            int id = item.getItemId();
            if (id == R.id.nav_dreams) {
                Intent intent = new Intent(this, MainActivity.class);
                intent.setFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
                startActivity(intent);
                finish();
                return true;
            } else if (id == R.id.nav_analysis) {
                Intent intent = new Intent(this, AnalysisDashboardActivity.class);
                intent.setFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
                startActivity(intent);
                finish();
                return true;
            } else if (id == R.id.nav_patterns) {
                Intent intent = new Intent(this, PatternsActivity.class);
                intent.setFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
                startActivity(intent);
                finish();
                return true;
            } else if (id == R.id.nav_profile) {
                Intent intent = new Intent(this, ProfileActivity.class);
                startActivity(intent);
                finish();
                return true;
            }
            return false;
        });
    }

    private void showCalendarPicker() {
        MaterialDatePicker<Long> datePicker = MaterialDatePicker.Builder.datePicker()
                .setTitleText("Filter by Date")
                .setTheme(R.style.CustomDatePickerTheme)
                .setSelection(selectedFilterDate != null ? selectedFilterDate : MaterialDatePicker.todayInUtcMilliseconds())
                .build();

        datePicker.addOnPositiveButtonClickListener(selection -> {
            selectedFilterDate = selection;
            filterHeader.setVisibility(View.VISIBLE);
            SimpleDateFormat sdf = new SimpleDateFormat("dd MMM yyyy", Locale.getDefault());
            tvFilterDate.setText("Showing: " + sdf.format(new Date(selection)));
            loadGallery();
        });

        datePicker.show(getSupportFragmentManager(), "GALLERY_CALENDAR");
    }

    private void loadGallery() {
        List<Dream> allDreams = repository.getDreamsFiltered(selectedFilterDate, "");
        List<Dream> galleryDreams = new ArrayList<>();
        for (Dream d : allDreams) {
            if (d.getImageUrl() != null && !d.getImageUrl().isEmpty()) {
                galleryDreams.add(d);
            }
        }

        if (galleryDreams.isEmpty()) {
            llEmpty.setVisibility(View.VISIBLE);
            rvGallery.setVisibility(View.GONE);
        } else {
            llEmpty.setVisibility(View.GONE);
            rvGallery.setVisibility(View.VISIBLE);
            adapter = new GalleryAdapter(galleryDreams);
            rvGallery.setAdapter(adapter);
        }
    }

    private class GalleryAdapter extends RecyclerView.Adapter<GalleryAdapter.ViewHolder> {
        private final List<Dream> dreams;
        private final SimpleDateFormat dateFormat = new SimpleDateFormat("dd MMM", Locale.getDefault());

        GalleryAdapter(List<Dream> dreams) {
            this.dreams = dreams;
        }

        @NonNull
        @Override
        public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_gallery_image, parent, false);
            return new ViewHolder(v);
        }

        @Override
        public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
            Dream dream = dreams.get(position);
            holder.tvDate.setText(dateFormat.format(new Date(dream.getTimestamp())));
            holder.tvDesc.setText(dream.getDescription());

            Glide.with(holder.itemView.getContext())
                    .load(new File(dream.getImageUrl()))
                    .transform(new CenterCrop(), new RoundedCorners(dp(20)))
                    .into(holder.ivImage);

            holder.itemView.setOnClickListener(v -> {
                Intent intent = new Intent(v.getContext(), FullImageActivity.class);
                intent.putExtra("image_path", dream.getImageUrl());
                v.getContext().startActivity(intent);
            });
        }

        @Override
        public int getItemCount() {
            return dreams.size();
        }

        class ViewHolder extends RecyclerView.ViewHolder {
            ImageView ivImage;
            TextView tvDate, tvDesc;

            ViewHolder(View v) {
                super(v);
                ivImage = v.findViewById(R.id.ivGalleryImage);
                tvDate = v.findViewById(R.id.tvGalleryDate);
                tvDesc = v.findViewById(R.id.tvGalleryDesc);
            }
        }
    }

    private int dp(int dp) {
        return Math.round(dp * getResources().getDisplayMetrics().density);
    }
}
