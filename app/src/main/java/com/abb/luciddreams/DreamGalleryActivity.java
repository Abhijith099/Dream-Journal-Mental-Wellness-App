package com.abb.luciddreams;

import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.bumptech.glide.load.resource.bitmap.RoundedCorners;

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

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(Color.parseColor("#171F4B"));

        setContentView(R.layout.activity_dream_gallery);

        repository = new DreamRepository(this);
        rvGallery = findViewById(R.id.rvGallery);
        llEmpty = findViewById(R.id.llEmptyGallery);
        findViewById(R.id.ivBack).setOnClickListener(v -> finish());

        rvGallery.setLayoutManager(new GridLayoutManager(this, 2));
        loadGallery();
    }

    private void loadGallery() {
        // We'll filter all dreams that have an image URL
        List<Dream> allDreams = repository.getDreamsFiltered(null, "");
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
        private final SimpleDateFormat dateFormat = new SimpleDateFormat("MMM dd, yyyy", Locale.getDefault());

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
            
            String desc = dream.getDescription();
            if (desc != null && desc.length() > 50) desc = desc.substring(0, 47) + "...";
            holder.tvDesc.setText(desc);

            Glide.with(holder.itemView.getContext())
                    .load(new File(dream.getImageUrl()))
                    .transform(new RoundedCorners(dp(16)))
                    .into(holder.ivImage);

            holder.itemView.setOnClickListener(v -> {
                Intent intent = new Intent(v.getContext(), DreamAnalysisActivity.class);
                intent.putExtra("dream_text", dream.getDescription());
                intent.putExtra("dream_id", dream.getId());
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
