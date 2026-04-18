package com.abb.luciddreams;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import java.util.List;

public class DreamAdapter extends RecyclerView.Adapter<DreamAdapter.DreamViewHolder> {

    private List<Dream> dreamList;

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

        if (dream.isShowMonthHeader()) {
            holder.tvMonthHeader.setVisibility(View.VISIBLE);
            holder.tvMonthHeader.setText(dream.getMonth());
        } else {
            holder.tvMonthHeader.setVisibility(View.GONE);
        }

        holder.tvDayOfWeek.setText(dream.getDayOfWeek());
        holder.tvDayNumber.setText(dream.getDayNumber());
        holder.tvCardDate.setText(dream.getFullDate());
        holder.tvDescription.setText(dream.getDescription());

        // Update tags dynamically if needed, or leave static for UI demo
        holder.llTags.removeAllViews();
        for (String tag : dream.getTags()) {
            TextView tagView = new TextView(holder.itemView.getContext());
            tagView.setText(tag);
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

    @Override
    public int getItemCount() {
        return dreamList.size();
    }

    static class DreamViewHolder extends RecyclerView.ViewHolder {
        TextView tvMonthHeader, tvDayOfWeek, tvDayNumber, tvCardDate, tvDescription;
        LinearLayout llTags;

        public DreamViewHolder(@NonNull View itemView) {
            super(itemView);
            tvMonthHeader = itemView.findViewById(R.id.tvMonthHeader);
            tvDayOfWeek = itemView.findViewById(R.id.tvDayOfWeek);
            tvDayNumber = itemView.findViewById(R.id.tvDayNumber);
            tvCardDate = itemView.findViewById(R.id.tvCardDate);
            tvDescription = itemView.findViewById(R.id.tvDescription);
            llTags = itemView.findViewById(R.id.llTags);
        }
    }
}
