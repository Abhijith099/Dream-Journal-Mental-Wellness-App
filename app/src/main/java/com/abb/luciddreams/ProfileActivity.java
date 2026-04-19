package com.abb.luciddreams;

import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.google.android.material.bottomnavigation.BottomNavigationView;

public class ProfileActivity extends AppCompatActivity {

    private SharedPreferences prefs;
    private TextView tvCurrentName, tvCurrentGender, tvUserName;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_profile);

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.profile_root), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, 0);
            return insets;
        });

        prefs = getSharedPreferences("UserPrefs", Context.MODE_PRIVATE);

        tvCurrentName = findViewById(R.id.tvCurrentName);
        tvCurrentGender = findViewById(R.id.tvCurrentGender);
        tvUserName = findViewById(R.id.tvUserName);

        loadUserData();
        setupClickListeners();
        setupBottomNav();
    }

    private void loadUserData() {
        String name = prefs.getString("display_name", "Dreamer");
        String gender = prefs.getString("gender", "Not specified");
        
        tvCurrentName.setText(name);
        tvUserName.setText(name);
        tvCurrentGender.setText(gender);
    }

    private void setupClickListeners() {
        findViewById(R.id.itemDisplayName).setOnClickListener(v -> showEditNameDialog());
        findViewById(R.id.itemGender).setOnClickListener(v -> showEditGenderDialog());
        findViewById(R.id.itemSignOut).setOnClickListener(v -> showSignOutDialog());
        findViewById(R.id.itemDeleteAccount).setOnClickListener(v -> showDeleteAccountDialog());
        findViewById(R.id.itemAnalysisPrefs).setOnClickListener(v -> {
            Toast.makeText(this, "Analysis Preferences coming soon", Toast.LENGTH_SHORT).show();
        });
        findViewById(R.id.ivUserAvatar).setOnClickListener(v -> {
            Toast.makeText(this, "Avatar upload coming soon", Toast.LENGTH_SHORT).show();
        });
    }

    private void showEditNameDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this, R.style.CustomDatePickerTheme);
        builder.setTitle("Edit Display Name");

        View viewInflated = LayoutInflater.from(this).inflate(R.layout.dialog_edit_text, null);
        final EditText input = viewInflated.findViewById(R.id.input);
        input.setText(tvCurrentName.getText().toString());
        builder.setView(viewInflated);

        builder.setPositiveButton("Save", (dialog, which) -> {
            String newName = input.getText().toString().trim();
            if (!newName.isEmpty()) {
                prefs.edit().putString("display_name", newName).apply();
                loadUserData();
            }
        });
        builder.setNegativeButton("Cancel", (dialog, which) -> dialog.cancel());

        builder.show();
    }

    private void showEditGenderDialog() {
        String[] genders = {"Male", "Female", "Other", "Prefer not to say"};
        AlertDialog.Builder builder = new AlertDialog.Builder(this, R.style.CustomDatePickerTheme);
        builder.setTitle("Select Gender");
        builder.setItems(genders, (dialog, which) -> {
            prefs.edit().putString("gender", genders[which]).apply();
            loadUserData();
        });
        builder.show();
    }

    private void showSignOutDialog() {
        new AlertDialog.Builder(this, R.style.CustomDatePickerTheme)
                .setTitle("Sign Out")
                .setMessage("Are you sure you want to sign out?")
                .setPositiveButton("Sign Out", (dialog, which) -> {
                    // Logic to return to login if exists
                    finishAffinity();
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void showDeleteAccountDialog() {
        new AlertDialog.Builder(this, R.style.CustomDatePickerTheme)
                .setTitle("Delete Account")
                .setMessage("This will permanently delete your account and all dreams. This action cannot be undone.")
                .setPositiveButton("Delete", (dialog, which) -> {
                    // Logic to delete data
                    prefs.edit().clear().apply();
                    new DreamRepository(this).deleteAllDreams();
                    finishAffinity();
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void setupBottomNav() {
        BottomNavigationView nav = findViewById(R.id.bottomNav);
        nav.setSelectedItemId(R.id.nav_profile);

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
                // Already here
                return true;
            }
            return false;
        });
    }
}
