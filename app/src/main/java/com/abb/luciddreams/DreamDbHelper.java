package com.abb.luciddreams;

import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

public class DreamDbHelper extends SQLiteOpenHelper {

    private static final String DATABASE_NAME = "lucid_dreams.db";
    private static final int DATABASE_VERSION = 1;

    public static final String TABLE_DREAMS = "dreams";
    public static final String COLUMN_ID = "_id";
    public static final String COLUMN_TIMESTAMP = "timestamp";
    public static final String COLUMN_DESCRIPTION = "description";
    public static final String COLUMN_MOOD = "mood";
    public static final String COLUMN_CLARITY = "clarity";
    public static final String COLUMN_LUCIDITY = "lucidity";
    public static final String COLUMN_IS_NIGHTMARE = "is_nightmare";
    public static final String COLUMN_IS_RECURRING = "is_recurring";
    public static final String COLUMN_TAGS = "tags";

    private static final String TABLE_CREATE =
            "CREATE TABLE " + TABLE_DREAMS + " (" +
            COLUMN_ID + " INTEGER PRIMARY KEY AUTOINCREMENT, " +
            COLUMN_TIMESTAMP + " INTEGER, " +
            COLUMN_DESCRIPTION + " TEXT, " +
            COLUMN_MOOD + " TEXT, " +
            COLUMN_CLARITY + " INTEGER, " +
            COLUMN_LUCIDITY + " INTEGER, " +
            COLUMN_IS_NIGHTMARE + " INTEGER, " +
            COLUMN_IS_RECURRING + " INTEGER, " +
            COLUMN_TAGS + " TEXT" +
            ");";

    public DreamDbHelper(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL(TABLE_CREATE);
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        db.execSQL("DROP TABLE IF EXISTS " + TABLE_DREAMS);
        onCreate(db);
    }
}
