package com.abb.luciddreams;

import android.content.Context;
import android.graphics.drawable.Drawable;
import android.os.Parcel;
import android.os.Parcelable;
import android.view.View;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;

import com.google.android.material.datepicker.DayViewDecorator;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;

public class DreamDayViewDecorator extends DayViewDecorator {

    private final List<Long> dreamDates;

    public DreamDayViewDecorator(List<Long> dreamDates) {
        this.dreamDates = new ArrayList<>(dreamDates);
    }

    protected DreamDayViewDecorator(Parcel in) {
        dreamDates = new ArrayList<>();
        in.readList(dreamDates, Long.class.getClassLoader());
    }

    public static final Creator<DreamDayViewDecorator> CREATOR = new Creator<DreamDayViewDecorator>() {
        @Override
        public DreamDayViewDecorator createFromParcel(Parcel in) {
            return new DreamDayViewDecorator(in);
        }

        @Override
        public DreamDayViewDecorator[] newArray(int size) {
            return new DreamDayViewDecorator[size];
        }
    };

    @Override
    public int describeContents() {
        return 0;
    }

    @Override
    public void writeToParcel(Parcel dest, int flags) {
        dest.writeList(dreamDates);
    }

    @Override
    public Drawable getCompoundDrawableBottom(@NonNull Context context, int year, int month, int day, boolean valid, boolean selected) {
        Calendar cal = Calendar.getInstance();
        cal.set(year, month, day, 0, 0, 0);
        cal.set(Calendar.MILLISECOND, 0);
        long dateMillis = cal.getTimeInMillis();

        if (dreamDates.contains(dateMillis)) {
            return ContextCompat.getDrawable(context, R.drawable.bg_day_with_dream);
        }
        return null;
    }
}
