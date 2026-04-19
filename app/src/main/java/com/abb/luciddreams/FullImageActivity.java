package com.abb.luciddreams;

import android.os.Bundle;
import android.view.View;
import android.widget.ImageView;
import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.bumptech.glide.Glide;
import com.github.chrisbanes.photoview.PhotoView;
import java.io.File;

public class FullImageActivity extends AppCompatActivity {

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

        PhotoView photoView = findViewById(R.id.photoView);
        ImageView ivClose = findViewById(R.id.ivClose);

        String imagePath = getIntent().getStringExtra("image_path");
        if (imagePath != null) {
            Glide.with(this)
                    .load(new File(imagePath))
                    .into(photoView);
        }

        ivClose.setOnClickListener(v -> finish());
    }
}