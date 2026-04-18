package com.abb.luciddreams;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;

public class DreamRepository {

    private DreamDbHelper dbHelper;

    public DreamRepository(Context context) {
        dbHelper = new DreamDbHelper(context);
    }

    public long insertDream(Dream dream) {
        SQLiteDatabase db = dbHelper.getWritableDatabase();
        ContentValues values = new ContentValues();
        values.put(DreamDbHelper.COLUMN_TIMESTAMP, dream.getTimestamp());
        values.put(DreamDbHelper.COLUMN_DESCRIPTION, dream.getDescription());
        values.put(DreamDbHelper.COLUMN_MOOD, dream.getMood());
        values.put(DreamDbHelper.COLUMN_CLARITY, dream.getClarity());
        values.put(DreamDbHelper.COLUMN_LUCIDITY, dream.getLucidity());
        values.put(DreamDbHelper.COLUMN_IS_NIGHTMARE, dream.isNightmare() ? 1 : 0);
        values.put(DreamDbHelper.COLUMN_IS_RECURRING, dream.isRecurring() ? 1 : 0);
        values.put(DreamDbHelper.COLUMN_TAGS, dream.getTags());

        long newRowId = db.insert(DreamDbHelper.TABLE_DREAMS, null, values);
        db.close();
        return newRowId;
    }

    public List<Dream> getTodayDreams() {
        SQLiteDatabase db = dbHelper.getReadableDatabase();
        List<Dream> dreams = new ArrayList<>();

        // Calculate start of today
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, 0);
        cal.set(Calendar.MINUTE, 0);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        long startOfToday = cal.getTimeInMillis();
        
        // End of today
        cal.add(Calendar.DAY_OF_YEAR, 1);
        long endOfToday = cal.getTimeInMillis();

        String selection = DreamDbHelper.COLUMN_TIMESTAMP + " >= ? AND " + DreamDbHelper.COLUMN_TIMESTAMP + " < ?";
        String[] selectionArgs = { String.valueOf(startOfToday), String.valueOf(endOfToday) };
        String sortOrder = DreamDbHelper.COLUMN_TIMESTAMP + " DESC";

        Cursor cursor = db.query(
                DreamDbHelper.TABLE_DREAMS,
                null,
                selection,
                selectionArgs,
                null,
                null,
                sortOrder
        );

        while (cursor.moveToNext()) {
            dreams.add(cursorToDream(cursor));
        }
        cursor.close();
        db.close();
        return dreams;
    }

    private Dream cursorToDream(Cursor cursor) {
        Dream dream = new Dream();
        dream.setId(cursor.getLong(cursor.getColumnIndexOrThrow(DreamDbHelper.COLUMN_ID)));
        dream.setTimestamp(cursor.getLong(cursor.getColumnIndexOrThrow(DreamDbHelper.COLUMN_TIMESTAMP)));
        dream.setDescription(cursor.getString(cursor.getColumnIndexOrThrow(DreamDbHelper.COLUMN_DESCRIPTION)));
        dream.setMood(cursor.getString(cursor.getColumnIndexOrThrow(DreamDbHelper.COLUMN_MOOD)));
        dream.setClarity(cursor.getInt(cursor.getColumnIndexOrThrow(DreamDbHelper.COLUMN_CLARITY)));
        dream.setLucidity(cursor.getInt(cursor.getColumnIndexOrThrow(DreamDbHelper.COLUMN_LUCIDITY)));
        dream.setNightmare(cursor.getInt(cursor.getColumnIndexOrThrow(DreamDbHelper.COLUMN_IS_NIGHTMARE)) == 1);
        dream.setRecurring(cursor.getInt(cursor.getColumnIndexOrThrow(DreamDbHelper.COLUMN_IS_RECURRING)) == 1);
        dream.setTags(cursor.getString(cursor.getColumnIndexOrThrow(DreamDbHelper.COLUMN_TAGS)));
        return dream;
    }
}
