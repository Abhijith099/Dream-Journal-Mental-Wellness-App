package com.abb.luciddreams;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
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
import androidx.viewpager2.widget.ViewPager2;

import com.bumptech.glide.Glide;
import com.github.chrisbanes.photoview.PhotoView;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

public class FullImageActivity extends AppCompatActivity {

    private ViewPager2 viewPager;
    private TextView tvPageIndicator;
    private ArrayList<String> imagePaths;
    private ImagePagerAdapter adapter;
    private DreamRepository repository;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_full_image);

        View root = findViewById(android.R.id.content);
        ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return insets;
        });

        repository = new DreamRepository(this);
        imagePaths = getIntent().getStringArrayListExtra("image_paths");
        int startPosition = getIntent().getIntExtra("position", 0);

        if (imagePaths == null || imagePaths.isEmpty()) {
            finish();
            return;
        }

        viewPager = findViewById(R.id.viewPagerImages);
        tvPageIndicator = findViewById(R.id.tvPageIndicator);
        ImageView ivClose = findViewById(R.id.ivClose);

        adapter = new ImagePagerAdapter(imagePaths);
        viewPager.setAdapter(adapter);
        viewPager.setCurrentItem(startPosition, false);

        updateIndicator(startPosition);

        viewPager.registerOnPageChangeCallback(new ViewPager2.OnPageChangeCallback() {
            @Override
            public void onPageSelected(int position) {
                updateIndicator(position);
            }
        });

        ivClose.setOnClickListener(v -> finish());
    }

    private void updateIndicator(int position) {
        tvPageIndicator.setText((position + 1) + " / " + imagePaths.size());
    }

    private void showContextMenu(String path, int adapterPosition) {
        Dream dream = repository.getDreamByImagePath(path);
        if (dream == null) {
            // Fallback for just Share if dream not found (unlikely)
            String[] options = { "⬆  Share Image" };
            new AlertDialog.Builder(this)
                    .setItems(options, (dialog, which) -> shareImage(path))
                    .show();
            return;
        }

        boolean isFav = repository.isFavorite(dream.getId());
        String favLabel = isFav ? "★ Remove Favorite" : "☆ Mark as Favorite";
        String[] options = { "🗑  Delete from Gallery", "⬆  Share Image", favLabel };

        new AlertDialog.Builder(this)
                .setTitle("Image Options")
                .setItems(options, (dialog, which) -> {
                    switch (which) {
                        case 0: // Delete
                            confirmDeletion(dream, adapterPosition);
                            break;
                        case 1: // Share
                            shareImage(path);
                            break;
                        case 2: // Favorite
                            toggleFavorite(dream);
                            break;
                    }
                })
                .show();
    }

    private void toggleFavorite(Dream dream) {
        boolean isFav = repository.isFavorite(dream.getId());
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
    }

    private void confirmDeletion(Dream dream, int position) {
        new AlertDialog.Builder(this)
                .setTitle("Remove Image?")
                .setMessage("This will remove the image from the gallery.")
                .setPositiveButton("Remove", (d, w) -> {
                    repository.clearDreamImage(dream.getId());
                    imagePaths.remove(position);
                    if (imagePaths.isEmpty()) {
                        finish();
                    } else {
                        adapter.notifyItemRemoved(position);
                        updateIndicator(viewPager.getCurrentItem());
                    }
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void shareImage(String path) {
        try {
            File imageFile = new File(path);
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
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Pager Adapter
    // ──────────────────────────────────────────────────────────────────────────

    class ImagePagerAdapter extends androidx.recyclerview.widget.RecyclerView.Adapter<ImagePagerAdapter.ViewHolder> {
        private final List<String> paths;

        ImagePagerAdapter(List<String> paths) {
            this.paths = paths;
        }

        @NonNull
        @Override
        public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            return new ViewHolder(LayoutInflater.from(parent.getContext())
                    .inflate(R.layout.item_fullscreen_image, parent, false));
        }

        @Override
        public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
            String path = paths.get(position);
            Glide.with(holder.itemView.getContext())
                    .load(new File(path))
                    .into(holder.photoView);

            holder.photoView.setOnLongClickListener(v -> {
                showContextMenu(path, holder.getAdapterPosition());
                return true;
            });
        }

        @Override
        public int getItemCount() {
            return paths.size();
        }

        class ViewHolder extends androidx.recyclerview.widget.RecyclerView.ViewHolder {
            PhotoView photoView;
            ViewHolder(View v) {
                super(v);
                photoView = v.findViewById(R.id.photoView);
            }
        }
    }
}