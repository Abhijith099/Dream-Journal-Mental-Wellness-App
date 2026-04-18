package com.abb.luciddreams;

import android.graphics.Color;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;

import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class MainActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Setup transparent status bar to blend with gradient
        Window window = getWindow();
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(Color.parseColor("#0F1C3F")); // Matches gradient_top
        
        setContentView(R.layout.activity_main);
        RecyclerView rvDreams = findViewById(R.id.rvDreams);
        rvDreams.setLayoutManager(new LinearLayoutManager(this));

        List<Dream> dreamList = new ArrayList<>();
        dreamList.add(new Dream(
                "April", "Sat", "18", "17/04/2026",
                "I felt scared and sweaty, it is the second time I’m seeing this dream.",
                Arrays.asList("frightened", "sweaty", "scared"),
                true
        ));
        
        dreamList.add(new Dream(
                "April", "Sun", "19", "18/04/2026",
                "I was flying over a vast glowing ocean, feeling completely lucid and at peace.",
                Arrays.asList("lucid", "peaceful", "flying"),
                false
        ));

        DreamAdapter adapter = new DreamAdapter(dreamList);
        rvDreams.setAdapter(adapter);
    }
}