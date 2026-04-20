package com.abb.luciddreams;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

public class PremiumToast {

    public static void show(Context context, String message) {
        show(context, message, R.drawable.ic_success);
    }

    public static void show(Context context, String message, int iconResId) {
        LayoutInflater inflater = LayoutInflater.from(context);
        View layout = inflater.inflate(R.layout.layout_premium_toast, null);

        ImageView icon = layout.findViewById(R.id.ivToastIcon);
        TextView text = layout.findViewById(R.id.tvToastMessage);

        icon.setImageResource(iconResId);
        text.setText(message);

        Toast toast = new Toast(context.getApplicationContext());
        toast.setDuration(Toast.LENGTH_SHORT);
        toast.setView(layout);
        toast.show();
    }
}
