package com.abb.luciddreams;

import android.animation.ObjectAnimator;
import android.animation.PropertyValuesHolder;
import android.animation.ValueAnimator;
import android.content.ContentValues;
import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.View;
import android.view.animation.DecelerateInterpolator;
import android.view.animation.OvershootInterpolator;
import android.view.inputmethod.InputMethodManager;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.google.android.material.button.MaterialButton;
import com.google.android.material.textfield.TextInputEditText;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class QuickJournalActivity extends AppCompatActivity {

    // ── Mood options ───────────────────────────────────────────────────────────
    private static final String[] MOODS = {"😌 Calm", "😊 Happy", "😔 Sad", "😤 Anxious", "😴 Tired", "✨ Grateful"};
    private String selectedMood = null;

    // ── Views ─────────────────────────────────────────────────────────────────
    private TextInputEditText  etReflection;
    private MaterialButton     btnSave;
    private LinearLayout       moodRow;
    private View               confirmBanner;
    private TextView           tvConfirm, tvDate;
    private View               journalAnimParticle;

    // ── DB helper (inner class) ────────────────────────────────────────────────
    private JournalDbHelper dbHelper;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_quick_journal);

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.simple_root), (v, insets) -> {
            Insets sys = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(sys.left, sys.top, sys.right, sys.bottom);
            return insets;
        });

        dbHelper = new JournalDbHelper(this);

        bindViews();
        buildMoodRow();
        wireListeners();
        showCurrentDate();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (dbHelper != null) dbHelper.close();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Binding
    // ─────────────────────────────────────────────────────────────────────────

    private void bindViews() {
        etReflection        = findViewById(R.id.etReflection);
        btnSave             = findViewById(R.id.btnSaveReflection);
        moodRow             = findViewById(R.id.moodSelectorRow);
        confirmBanner       = findViewById(R.id.journalConfirmBanner);
        tvConfirm           = findViewById(R.id.tvJournalConfirm);
        tvDate              = findViewById(R.id.tvJournalDate);
        journalAnimParticle = findViewById(R.id.journalAnimParticle);

        View back = findViewById(R.id.simple_back);
        if (back != null) back.setOnClickListener(v -> finish());

        if (confirmBanner != null) confirmBanner.setVisibility(View.GONE);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Mood selector (built dynamically)
    // ─────────────────────────────────────────────────────────────────────────

    private final MaterialButton[] moodButtons = new MaterialButton[MOODS.length];

    private void buildMoodRow() {
        if (moodRow == null) return;
        moodRow.removeAllViews();

        for (int i = 0; i < MOODS.length; i++) {
            final int idx = i;
            MaterialButton btn = new MaterialButton(this, null,
                    com.google.android.material.R.attr.materialButtonOutlinedStyle);
            btn.setText(MOODS[i]);
            btn.setTextSize(13f);
            btn.setTextColor(android.content.res.ColorStateList.valueOf(0xFFFFFFFF));
            btn.setStrokeColor(android.content.res.ColorStateList.valueOf(0x2FFFFFFF));
            btn.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0x00000000));
            btn.setCornerRadius(dpToPx(14));
            btn.setInsetTop(0); btn.setInsetBottom(0);
            btn.setPadding(dpToPx(4), dpToPx(6), dpToPx(4), dpToPx(6));
            btn.setSingleLine(true);

            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    dpToPx(40));
            lp.setMarginEnd(dpToPx(8));
            btn.setLayoutParams(lp);

            btn.setOnClickListener(v -> selectMood(idx));
            moodButtons[i] = btn;
            moodRow.addView(btn);
        }
    }

    private void selectMood(int idx) {
        selectedMood = MOODS[idx];
        for (int i = 0; i < moodButtons.length; i++) {
            if (moodButtons[i] == null) continue;
            boolean sel = (i == idx);
            moodButtons[i].setStrokeColor(android.content.res.ColorStateList.valueOf(
                    sel ? 0xFFFFE4A8 : 0x2FFFFFFF));
            moodButtons[i].setBackgroundTintList(android.content.res.ColorStateList.valueOf(
                    sel ? 0xFF2A2010 : 0x00000000));
            moodButtons[i].animate()
                    .scaleX(sel ? 1.05f : 1f)
                    .scaleY(sel ? 1.05f : 1f)
                    .setDuration(150)
                    .setInterpolator(new OvershootInterpolator())
                    .start();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Listeners
    // ─────────────────────────────────────────────────────────────────────────

    private void wireListeners() {
        if (btnSave == null) return;
        btnSave.setOnClickListener(v -> {
            String text = etReflection != null ? 
                          etReflection.getText() != null ? etReflection.getText().toString().trim() : "" 
                          : "";
            if (TextUtils.isEmpty(text)) {
                shakeView(etReflection);
                return;
            }
            saveReflection(text, selectedMood);
            hideKeyboard();
            showConfirmation();
            pulseGlowAnim();
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Database save
    // ─────────────────────────────────────────────────────────────────────────

    private void saveReflection(String text, String mood) {
        SQLiteDatabase db = dbHelper.getWritableDatabase();
        ContentValues cv = new ContentValues();
        cv.put(JournalDbHelper.COL_TEXT, text);
        cv.put(JournalDbHelper.COL_MOOD, mood != null ? mood : "");
        cv.put(JournalDbHelper.COL_DATE, new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date()));
        cv.put(JournalDbHelper.COL_TIME, new SimpleDateFormat("HH:mm:ss", Locale.US).format(new Date()));
        cv.put(JournalDbHelper.COL_TIMESTAMP, System.currentTimeMillis());
        db.insert(JournalDbHelper.TABLE, null, cv);
        db.close();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Confirmation UI
    // ─────────────────────────────────────────────────────────────────────────

    private void showConfirmation() {
        // Clear input for next entry
        if (etReflection != null) etReflection.setText("");
        selectedMood = null;
        for (MaterialButton b : moodButtons) {
            if (b != null) {
                b.setStrokeColor(android.content.res.ColorStateList.valueOf(0x2FFFFFFF));
                b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0x00000000));
                b.setScaleX(1f); b.setScaleY(1f);
            }
        }

        if (confirmBanner == null) return;
        if (tvConfirm != null) tvConfirm.setText("✨  Reflection Saved");
        confirmBanner.setVisibility(View.VISIBLE);
        confirmBanner.setAlpha(0f);
        confirmBanner.setTranslationY(-dpToPx(10));
        confirmBanner.animate()
                .alpha(1f).translationY(0f)
                .setDuration(300)
                .setInterpolator(new DecelerateInterpolator())
                .start();

        confirmBanner.postDelayed(() -> confirmBanner.animate()
                .alpha(0f).translationY(-dpToPx(8))
                .setDuration(250)
                .withEndAction(() -> confirmBanner.setVisibility(View.GONE))
                .start(), 2500);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private void showCurrentDate() {
        if (tvDate == null) return;
        String d = new SimpleDateFormat("EEEE, MMMM d", Locale.US).format(new Date());
        tvDate.setText(d);
    }

    private void shakeView(View v) {
        if (v == null) return;
        ObjectAnimator shake = ObjectAnimator.ofFloat(v, View.TRANSLATION_X,
                0f, -dpToPx(8), dpToPx(8), -dpToPx(6), dpToPx(6), -dpToPx(3), dpToPx(3), 0f);
        shake.setDuration(420);
        shake.start();
    }

    private void pulseGlowAnim() {
        if (journalAnimParticle == null) return;
        ObjectAnimator pulse = ObjectAnimator.ofPropertyValuesHolder(
                journalAnimParticle,
                PropertyValuesHolder.ofFloat(View.SCALE_X, 1f, 1.25f, 1f),
                PropertyValuesHolder.ofFloat(View.SCALE_Y, 1f, 1.25f, 1f),
                PropertyValuesHolder.ofFloat(View.ALPHA, 0.24f, 0.55f, 0.24f)
        );
        pulse.setDuration(700);
        pulse.setInterpolator(new DecelerateInterpolator());
        pulse.start();
    }

    private void hideKeyboard() {
        View focus = getCurrentFocus();
        if (focus == null) return;
        InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
        if (imm != null) imm.hideSoftInputFromWindow(focus.getWindowToken(), 0);
    }

    private int dpToPx(int dp) {
        return (int)(dp * getResources().getDisplayMetrics().density);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Inner DB helper
    // ─────────────────────────────────────────────────────────────────────────

    static class JournalDbHelper extends SQLiteOpenHelper {
        private static final String DB_NAME    = "journal_thoughts.db";
        private static final int    DB_VERSION = 1;
        static final String TABLE     = "journal_entries";
        static final String COL_ID    = "_id";
        static final String COL_TEXT  = "entry_text";
        static final String COL_MOOD  = "mood";
        static final String COL_DATE  = "date";
        static final String COL_TIME  = "time";
        static final String COL_TIMESTAMP = "timestamp";

        JournalDbHelper(Context ctx) {
            super(ctx, DB_NAME, null, DB_VERSION);
        }

        @Override public void onCreate(SQLiteDatabase db) {
            db.execSQL("CREATE TABLE " + TABLE + " (" +
                    COL_ID    + " INTEGER PRIMARY KEY AUTOINCREMENT, " +
                    COL_TEXT  + " TEXT, " +
                    COL_MOOD  + " TEXT, " +
                    COL_DATE  + " TEXT, " +
                    COL_TIME  + " TEXT, " +
                    COL_TIMESTAMP + " INTEGER)");
        }

        @Override public void onUpgrade(SQLiteDatabase db, int o, int n) {
            db.execSQL("DROP TABLE IF EXISTS " + TABLE);
            onCreate(db);
        }
    }
}
