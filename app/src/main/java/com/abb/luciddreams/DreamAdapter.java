package com.abb.luciddreams;

import android.content.Intent;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class DreamAdapter extends RecyclerView.Adapter<DreamAdapter.DreamViewHolder> {

    private List<Dream> dreamList;

    public void updateList(List<Dream> newList) {
        this.dreamList = newList;
        notifyDataSetChanged();
    }

    public DreamAdapter(List<Dream> dreamList) {
        this.dreamList = dreamList;
    }

    @NonNull
    @Override
    public DreamViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_dream_card, parent, false);
        return new DreamViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull DreamViewHolder holder, int position) {
        Dream dream = dreamList.get(position);

        // Date format - Show full date if it's not today? 
        // Or just show time since the header handles the date.
        SimpleDateFormat sdf = new SimpleDateFormat("dd MMM, h:mm a", Locale.getDefault());
        holder.tvCardDate.setText(sdf.format(new Date(dream.getTimestamp())));

        holder.tvDescription.setText(dream.getDescription());
        holder.tvLucidityValue.setText(String.valueOf(dream.getLucidity()));
        holder.tvClarityValue.setText(String.valueOf(dream.getClarity()));
        
        // Color coding for lucidity
        if (dream.getLucidity() >= 7) {
            holder.tvLucidityValue.setTextColor(holder.itemView.getContext().getResources().getColor(R.color.glow_primary, null));
        } else if (dream.getLucidity() >= 4) {
            holder.tvLucidityValue.setTextColor(holder.itemView.getContext().getResources().getColor(R.color.text_tag, null));
        } else {
            holder.tvLucidityValue.setTextColor(holder.itemView.getContext().getResources().getColor(R.color.text_secondary, null));
        }

        setMoodIcon(holder.ivMoodIcon, dream.getMood());

        if (dream.isNightmare()) {
            holder.tvNightmareBadge.setVisibility(View.VISIBLE);
        } else {
            holder.tvNightmareBadge.setVisibility(View.GONE);
        }

        // Make card tappable → open Dream Analysis
        holder.cardContainer.setOnClickListener(v -> {
            Intent intent = new Intent(v.getContext(), DreamAnalysisActivity.class);
            intent.putExtra("dream_text", dream.getDescription());
            intent.putExtra("dream_id", dream.getId());
            v.getContext().startActivity(intent);
        });

        // Tags
        holder.llTags.removeAllViews();
        List<String> tags = dream.getTagsList();
        for (String tag : tags) {
            if(tag.trim().isEmpty()) continue;

            TextView tagView = new TextView(holder.itemView.getContext());
            tagView.setText(tag.trim());
            tagView.setBackgroundResource(R.drawable.bg_tag);
            tagView.setTextColor(holder.itemView.getContext().getResources().getColor(R.color.text_tag, null));
            tagView.setTextSize(12);

            int dp10 = (int) (10 * holder.itemView.getContext().getResources().getDisplayMetrics().density);
            int dp4 = (int) (4 * holder.itemView.getContext().getResources().getDisplayMetrics().density);
            tagView.setPadding(dp10, dp4, dp10, dp4);

            LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
            );
            params.setMarginEnd((int) (6 * holder.itemView.getContext().getResources().getDisplayMetrics().density));
            tagView.setLayoutParams(params);

            holder.llTags.addView(tagView);
        }
    }

    private void setMoodIcon(android.widget.ImageView imageView, String mood) {
        if (mood == null) {
            imageView.setImageResource(R.drawable.ic_neutral);
            return;
        }
        switch (mood) {
            case "Happy":
            case "✨":
                imageView.setImageResource(R.drawable.ic_lucid_happy);
                break;
            case "Calm":
            case "🌙":
                imageView.setImageResource(R.drawable.ic_calm);
                break;
            case "Unclear":
            case "Neutral":
            case "☁":
                imageView.setImageResource(R.drawable.ic_neutral);
                break;
            case "Stressed":
            case "⚡":
                imageView.setImageResource(R.drawable.ic_stressed);
                break;
            case "Fearful":
            case "🔥":
                imageView.setImageResource(R.drawable.ic_fearful);
                break;
            default:
                imageView.setImageResource(R.drawable.ic_neutral);
                break;
        }
    }

    @Override
    public int getItemCount() {
        return dreamList == null ? 0 : dreamList.size();
    }

    static class DreamViewHolder extends RecyclerView.ViewHolder {
        TextView tvCardDate, tvDescription, tvNightmareBadge, tvLucidityValue, tvClarityValue;
        android.widget.ImageView ivMoodIcon;
        LinearLayout llTags;
        LinearLayout cardContainer;

        public DreamViewHolder(@NonNull View itemView) {
            super(itemView);
            tvCardDate = itemView.findViewById(R.id.tvCardDate);
            tvDescription = itemView.findViewById(R.id.tvDescription);
            tvLucidityValue = itemView.findViewById(R.id.tvLucidityValue);
            tvClarityValue = itemView.findViewById(R.id.tvClarityValue);
            ivMoodIcon = itemView.findViewById(R.id.ivMoodIcon);
            tvNightmareBadge = itemView.findViewById(R.id.tvNightmareBadge);
            llTags = itemView.findViewById(R.id.llTags);
            cardContainer = itemView.findViewById(R.id.cardContainer);
        }
    }
}
