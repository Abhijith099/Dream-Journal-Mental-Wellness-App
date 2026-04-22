package com.abb.luciddreams;

import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.AnimationUtils;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.EdgeToEdge;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.FileProvider;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.bumptech.glide.load.resource.bitmap.CenterCrop;
import com.bumptech.glide.load.resource.bitmap.RoundedCorners;
import com.google.android.material.bottomnavigation.BottomNavigationView;

import java.io.File;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class DreamGalleryActivity extends AppCompatActivity {

    // Item types for multi-type adapter
    static final int TYPE_FEATURED = 0;
    static final int TYPE_MONTH_HEADER = 1;
    static final int TYPE_IMAGE = 2;

    private RecyclerView rvGallery;
    private GalleryAdapter adapter;
    private DreamRepository repository;
    private View llEmpty;
    private TextView tvActiveFilter, tvImageCount;
    private String galleryFilter = "Month";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_dream_gallery);

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.gallery_root), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, 0);
            return insets;
        });

        galleryFilter = getIntent().getStringExtra("gallery_filter");
        if (galleryFilter == null) galleryFilter = "Month";

        repository = new DreamRepository(this);
        rvGallery   = findViewById(R.id.rvGallery);
        llEmpty      = findViewById(R.id.llEmptyGallery);
        tvActiveFilter = findViewById(R.id.tvActiveFilter);
        tvImageCount   = findViewById(R.id.tvImageCount);

        findViewById(R.id.ivBack).setOnClickListener(v -> finish());

        GridLayoutManager layoutManager = new GridLayoutManager(this, 2);
        layoutManager.setSpanSizeLookup(new GridLayoutManager.SpanSizeLookup() {
            @Override
            public int getSpanSize(int position) {
                if (adapter == null) return 1;
                int type = adapter.getItemViewType(position);
                return (type == TYPE_FEATURED || type == TYPE_MONTH_HEADER) ? 2 : 1;
            }
        });
        rvGallery.setLayoutManager(layoutManager);
        rvGallery.setLayoutAnimation(
                AnimationUtils.loadLayoutAnimation(this, R.anim.layout_anim_slide_up));

        setupBottomNav();
    }

    @Override
    protected void onResume() {
        super.onResume();
        loadGallery();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Data loading
    // ──────────────────────────────────────────────────────────────────────────

    private void loadGallery() {
        // Update filter label
        switch (galleryFilter) {
            case "Day":      tvActiveFilter.setText("Today"); break;
            case "Month":    tvActiveFilter.setText("This Month"); break;
            case "Year":     tvActiveFilter.setText("This Year"); break;
            default:         tvActiveFilter.setText("All Time"); break;
        }

        List<Dream> dreams = repository.getGalleryImages(galleryFilter, System.currentTimeMillis());

        if (dreams.isEmpty()) {
            llEmpty.setVisibility(View.VISIBLE);
            rvGallery.setVisibility(View.GONE);
            tvImageCount.setText("");
            return;
        }

        llEmpty.setVisibility(View.GONE);
        rvGallery.setVisibility(View.VISIBLE);

        int count = dreams.size();
        tvImageCount.setText(count + (count == 1 ? " image" : " images"));

        List<GalleryItem> items = buildItemList(dreams);

        // Collect ordered image paths for fullscreen swipe
        ArrayList<String> imagePaths = new ArrayList<>();
        for (Dream d : dreams) imagePaths.add(d.getImageUrl());

        adapter = new GalleryAdapter(items, imagePaths);
        rvGallery.setAdapter(adapter);
        rvGallery.scheduleLayoutAnimation();
    }

    /**
     * Builds the heterogeneous item list depending on the active filter:
     * - Day / Lifetime → flat TYPE_IMAGE list
     * - Month → TYPE_FEATURED (best dream) + TYPE_IMAGE for the rest
     * - Year → grouped by month with TYPE_MONTH_HEADER separators
     */
    private List<GalleryItem> buildItemList(List<Dream> dreams) {
        List<GalleryItem> items = new ArrayList<>();

        if ("Month".equals(galleryFilter)) {
            // Find the dream with highest lucidity as the featured image
            Dream featured = dreams.get(0);
            for (Dream d : dreams) {
                if (d.getLucidity() > featured.getLucidity()) featured = d;
            }
            items.add(new GalleryItem(TYPE_FEATURED, featured, null, 0));
            for (Dream d : dreams) {
                if (d.getId() != featured.getId()) {
                    items.add(new GalleryItem(TYPE_IMAGE, d, null, 0));
                }
            }

        } else if ("Year".equals(galleryFilter)) {
            // Group dreams by "MMMM yyyy"
            SimpleDateFormat monthFmt = new SimpleDateFormat("MMMM yyyy", Locale.getDefault());
            LinkedHashMap<String, List<Dream>> grouped = new LinkedHashMap<>();
            for (Dream d : dreams) {
                String key = monthFmt.format(new Date(d.getTimestamp()));
                if (!grouped.containsKey(key)) grouped.put(key, new ArrayList<>());
                grouped.get(key).add(d);
            }
            for (Map.Entry<String, List<Dream>> entry : grouped.entrySet()) {
                items.add(new GalleryItem(TYPE_MONTH_HEADER, null, entry.getKey(), entry.getValue().size()));
                for (Dream d : entry.getValue()) {
                    items.add(new GalleryItem(TYPE_IMAGE, d, null, 0));
                }
            }

        } else {
            // Day / Lifetime → flat list
            for (Dream d : dreams) {
                items.add(new GalleryItem(TYPE_IMAGE, d, null, 0));
            }
        }

        return items;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Long-press context menu
    // ──────────────────────────────────────────────────────────────────────────

    private void showContextMenu(Dream dream, int adapterPosition) {
        boolean isFav = repository.isFavorite(dream.getId());
        String favLabel = isFav ? "★ Remove Favorite" : "☆ Mark as Favorite";
        String[] options = { "🗑  Delete from Gallery", "⬆  Share Image", favLabel };

        new AlertDialog.Builder(this)
                .setTitle("Dream Image")
                .setItems(options, (dialog, which) -> {
                    switch (which) {
                        case 0: // Delete
                            new AlertDialog.Builder(this)
                                    .setTitle("Remove Image?")
                                    .setMessage("This will remove the image from the gallery but keep your dream entry.")
                                    .setPositiveButton("Remove", (d, w) -> {
                                        repository.clearDreamImage(dream.getId());
                                        adapter.removeItemAt(adapterPosition);
                                        int remaining = adapter.getImageCount();
                                        tvImageCount.setText(remaining + (remaining == 1 ? " image" : " images"));
                                        if (remaining == 0) {
                                            rvGallery.setVisibility(View.GONE);
                                            llEmpty.setVisibility(View.VISIBLE);
                                        }
                                    })
                                    .setNegativeButton("Cancel", null)
                                    .show();
                            break;

                        case 1: // Share
                            try {
                                File imageFile = new File(dream.getImageUrl());
                                Uri uri = FileProvider.getUriForFile(this,
                                        getPackageName() + ".provider", imageFile);
                                Intent shareIntent = new Intent(Intent.ACTION_SEND);
                                shareIntent.setType("image/*");
                                shareIntent.putExtra(Intent.EXTRA_STREAM, uri);
                                shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                                startActivity(Intent.createChooser(shareIntent, "Share Dream Image"));
                            } catch (Exception e) {
                                Toast.makeText(this, "Unable to share image", Toast.LENGTH_SHORT).show();
                            }
                            break;

                        case 2: // Favorite
                            if (isFav) {
                                // Remove favorite tag
                                Dream d2 = repository.getDreamById(dream.getId());
                                if (d2 != null && d2.getTags() != null) {
                                    String cleaned = d2.getTags()
                                            .replaceAll(",?favorite,?", "")
                                            .replaceAll("^,|,$", "");
                                    d2.setTags(cleaned);
                                    repository.updateDream(d2);
                                }
                                Toast.makeText(this, "Removed from favorites", Toast.LENGTH_SHORT).show();
                            } else {
                                repository.addTagToDream(dream.getId(), "favorite");
                                Toast.makeText(this, "Added to favorites ★", Toast.LENGTH_SHORT).show();
                            }
                            break;
                    }
                })
                .show();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Data model for heterogeneous list
    // ──────────────────────────────────────────────────────────────────────────

    static class GalleryItem {
        int type;
        Dream dream;        // used for TYPE_IMAGE and TYPE_FEATURED
        String monthLabel;  // used for TYPE_MONTH_HEADER
        int monthCount;     // used for TYPE_MONTH_HEADER

        GalleryItem(int type, Dream dream, String monthLabel, int monthCount) {
            this.type = type;
            this.dream = dream;
            this.monthLabel = monthLabel;
            this.monthCount = monthCount;
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Multi-type Adapter
    // ──────────────────────────────────────────────────────────────────────────

    class GalleryAdapter extends RecyclerView.Adapter<RecyclerView.ViewHolder> {

        private final List<GalleryItem> items;
        private final ArrayList<String> allImagePaths;
        private final SimpleDateFormat dateFormat = new SimpleDateFormat("dd MMM", Locale.getDefault());

        GalleryAdapter(List<GalleryItem> items, ArrayList<String> allImagePaths) {
            this.items = items;
            this.allImagePaths = allImagePaths;
        }

        @Override
        public int getItemViewType(int position) {
            return items.get(position).type;
        }

        @NonNull
        @Override
        public RecyclerView.ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            LayoutInflater inflater = LayoutInflater.from(parent.getContext());
            if (viewType == TYPE_FEATURED) {
                return new FeaturedViewHolder(inflater.inflate(R.layout.item_gallery_featured, parent, false));
            } else if (viewType == TYPE_MONTH_HEADER) {
                return new HeaderViewHolder(inflater.inflate(R.layout.item_gallery_month_header, parent, false));
            } else {
                return new ImageViewHolder(inflater.inflate(R.layout.item_gallery_image, parent, false));
            }
        }

        @Override
        public void onBindViewHolder(@NonNull RecyclerView.ViewHolder holder, int position) {
            GalleryItem item = items.get(position);

            if (holder instanceof FeaturedViewHolder) {
                bindFeatured((FeaturedViewHolder) holder, item.dream);
            } else if (holder instanceof HeaderViewHolder) {
                bindHeader((HeaderViewHolder) holder, item);
            } else {
                bindImage((ImageViewHolder) holder, item.dream, position);
            }
        }

        private void bindFeatured(FeaturedViewHolder h, Dream dream) {
            h.tvDate.setText(dateFormat.format(new Date(dream.getTimestamp())));
            h.tvDesc.setText(dream.getDescription() != null ? dream.getDescription() : "");
            h.tvMood.setText(dream.getMood() != null ? dream.getMood() : "—");
            h.tvLucidity.setText("Lucidity " + dream.getLucidity());

            Glide.with(h.itemView.getContext())
                    .load(new File(dream.getImageUrl()))
                    .transform(new CenterCrop())
                    .placeholder(R.drawable.bg_dream_visualization)
                    .into(h.ivImage);

            h.itemView.setOnClickListener(v -> openFullscreen(dream.getImageUrl()));
            h.itemView.setOnLongClickListener(v -> {
                showContextMenu(dream, h.getAdapterPosition());
                return true;
            });
        }

        private void bindHeader(HeaderViewHolder h, GalleryItem item) {
            h.tvMonth.setText(item.monthLabel);
            h.tvCount.setText(item.monthCount + (item.monthCount == 1 ? " image" : " images"));
        }

        private void bindImage(ImageViewHolder h, Dream dream, int position) {
            h.tvDate.setText(dateFormat.format(new Date(dream.getTimestamp())));
            String desc = dream.getDescription() != null ? dream.getDescription() : "";
            h.tvDesc.setText(desc);
            h.tvMood.setText(dream.getMood() != null ? dream.getMood() : "");

            Glide.with(h.itemView.getContext())
                    .load(new File(dream.getImageUrl()))
                    .transform(new CenterCrop(), new RoundedCorners(dp(20)))
                    .placeholder(R.drawable.bg_dream_visualization)
                    .into(h.ivImage);

            h.itemView.setOnClickListener(v -> openFullscreen(dream.getImageUrl()));
            h.itemView.setOnLongClickListener(v -> {
                showContextMenu(dream, h.getAdapterPosition());
                return true;
            });
        }

        /** Opens the fullscreen viewer, passing all image paths + the tapped index. */
        private void openFullscreen(String tappedPath) {
            int idx = allImagePaths.indexOf(tappedPath);
            Intent intent = new Intent(DreamGalleryActivity.this, FullImageActivity.class);
            intent.putStringArrayListExtra("image_paths", allImagePaths);
            intent.putExtra("position", Math.max(idx, 0));
            startActivity(intent);
        }

        /** Removes item at position and refreshes the list. */
        void removeItemAt(int position) {
            if (position < 0 || position >= items.size()) return;
            GalleryItem removed = items.remove(position);
            if (removed.dream != null) allImagePaths.remove(removed.dream.getImageUrl());
            notifyItemRemoved(position);
        }

        /** Returns the number of actual image items (not headers). */
        int getImageCount() {
            int count = 0;
            for (GalleryItem item : items) {
                if (item.type == TYPE_IMAGE || item.type == TYPE_FEATURED) count++;
            }
            return count;
        }

        @Override
        public int getItemCount() { return items.size(); }

        // ── ViewHolders ─────────────────────────────────────────────────────

        class FeaturedViewHolder extends RecyclerView.ViewHolder {
            ImageView ivImage;
            TextView tvDate, tvDesc, tvMood, tvLucidity;
            FeaturedViewHolder(View v) {
                super(v);
                ivImage     = v.findViewById(R.id.ivFeaturedImage);
                tvDate      = v.findViewById(R.id.tvFeaturedDate);
                tvDesc      = v.findViewById(R.id.tvFeaturedDesc);
                tvMood      = v.findViewById(R.id.tvFeaturedMood);
                tvLucidity  = v.findViewById(R.id.tvFeaturedLucidity);
            }
        }

        class HeaderViewHolder extends RecyclerView.ViewHolder {
            TextView tvMonth, tvCount;
            HeaderViewHolder(View v) {
                super(v);
                tvMonth = v.findViewById(R.id.tvMonthHeader);
                tvCount = v.findViewById(R.id.tvMonthCount);
            }
        }

        class ImageViewHolder extends RecyclerView.ViewHolder {
            ImageView ivImage;
            TextView tvDate, tvDesc, tvMood;
            ImageViewHolder(View v) {
                super(v);
                ivImage = v.findViewById(R.id.ivGalleryImage);
                tvDate  = v.findViewById(R.id.tvGalleryDate);
                tvDesc  = v.findViewById(R.id.tvGalleryDesc);
                tvMood  = v.findViewById(R.id.tvGalleryMood);
            }
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Bottom navigation
    // ──────────────────────────────────────────────────────────────────────────

    private void setupBottomNav() {
        BottomNavigationView nav = findViewById(R.id.bottomNav);
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
                startActivity(new Intent(this, ProfileActivity.class));
                finish();
                return true;
            }
            return false;
        });
    }

    private int dp(int dp) {
        return Math.round(dp * getResources().getDisplayMetrics().density);
    }
}
