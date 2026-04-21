package com.abb.luciddreams;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.google.android.material.bottomsheet.BottomSheetDialogFragment;
import com.google.android.material.button.MaterialButton;

public class ThemeInsightBottomSheet extends BottomSheetDialogFragment {

    private static final String ARG_THEME = "arg_theme";
    private static final String ARG_MEANING = "arg_meaning";
    private static final String ARG_REFLECTION = "arg_reflection";

    public static ThemeInsightBottomSheet newInstance(String theme, String meaning, String reflection) {
        ThemeInsightBottomSheet sheet = new ThemeInsightBottomSheet();
        Bundle args = new Bundle();
        args.putString(ARG_THEME, theme);
        args.putString(ARG_MEANING, meaning);
        args.putString(ARG_REFLECTION, reflection);
        sheet.setArguments(args);
        return sheet;
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.sheet_theme_insight, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        Bundle args = getArguments();
        String theme = args != null ? args.getString(ARG_THEME, "Theme") : "Theme";
        String meaning = args != null ? args.getString(ARG_MEANING, "") : "";
        String reflection = args != null ? args.getString(ARG_REFLECTION, "") : "";

        TextView tvThemeTitle = view.findViewById(R.id.tvThemeTitle);
        TextView tvThemeMeaning = view.findViewById(R.id.tvThemeMeaning);
        TextView tvThemeReflection = view.findViewById(R.id.tvThemeReflection);
        MaterialButton btnClose = view.findViewById(R.id.btnClose);

        tvThemeTitle.setText(theme);
        tvThemeMeaning.setText(meaning);
        tvThemeReflection.setText(reflection);
        btnClose.setOnClickListener(v -> dismiss());
    }
}

