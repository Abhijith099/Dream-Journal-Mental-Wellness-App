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
        dbHelper = DreamDbHelper.getInstance(context);
    }

    public Dream getDreamById(long id) {
        SQLiteDatabase db = dbHelper.getReadableDatabase();
        Cursor cursor = db.query(
                DreamDbHelper.TABLE_DREAMS,
                null,
                DreamDbHelper.COLUMN_ID + " = ?",
                new String[]{String.valueOf(id)},
                null, null, null
        );
        try {
            if (cursor.moveToFirst()) {
                return cursorToDream(cursor);
            }
            return null;
        } finally {
            cursor.close();
        }
    }

    public int updateDream(Dream dream) {
        SQLiteDatabase db = dbHelper.getWritableDatabase();
        ContentValues values = new ContentValues();
        values.put(DreamDbHelper.COLUMN_DESCRIPTION, dream.getDescription());
        values.put(DreamDbHelper.COLUMN_MOOD, dream.getMood());
        values.put(DreamDbHelper.COLUMN_CLARITY, dream.getClarity());
        values.put(DreamDbHelper.COLUMN_LUCIDITY, dream.getLucidity());
        values.put(DreamDbHelper.COLUMN_IS_NIGHTMARE, dream.isNightmare() ? 1 : 0);
        values.put(DreamDbHelper.COLUMN_IS_RECURRING, dream.isRecurring() ? 1 : 0);
        values.put(DreamDbHelper.COLUMN_TAGS, dream.getTags());
        return db.update(
                DreamDbHelper.TABLE_DREAMS,
                values,
                DreamDbHelper.COLUMN_ID + " = ?",
                new String[]{String.valueOf(dream.getId())}
        );
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

    public List<Dream> getDreamsFiltered(Long specificDateMillis, String tagQuery) {
        SQLiteDatabase db = dbHelper.getReadableDatabase();
        List<Dream> dreams = new ArrayList<>();

        StringBuilder selection = new StringBuilder("1=1");
        List<String> selectionArgs = new ArrayList<>();

        if (specificDateMillis != null) {
            Calendar cal = Calendar.getInstance();
            cal.setTimeInMillis(specificDateMillis);
            cal.set(Calendar.HOUR_OF_DAY, 0);
            cal.set(Calendar.MINUTE, 0);
            cal.set(Calendar.SECOND, 0);
            cal.set(Calendar.MILLISECOND, 0);
            long startOfDay = cal.getTimeInMillis();
            
            cal.add(Calendar.DAY_OF_YEAR, 1);
            long endOfDay = cal.getTimeInMillis();

            selection.append(" AND ").append(DreamDbHelper.COLUMN_TIMESTAMP).append(" >= ? AND ").append(DreamDbHelper.COLUMN_TIMESTAMP).append(" < ?");
            selectionArgs.add(String.valueOf(startOfDay));
            selectionArgs.add(String.valueOf(endOfDay));
        }

        if (tagQuery != null && !tagQuery.trim().isEmpty()) {
            selection.append(" AND ").append(DreamDbHelper.COLUMN_TAGS).append(" LIKE ?");
            selectionArgs.add("%" + tagQuery.trim() + "%");
        }

        String sortOrder = DreamDbHelper.COLUMN_TIMESTAMP + " DESC";

        Cursor cursor = db.query(
                DreamDbHelper.TABLE_DREAMS,
                null,
                selection.toString(),
                selectionArgs.toArray(new String[0]),
                null,
                null,
                sortOrder
        );

        while (cursor.moveToNext()) {
            dreams.add(cursorToDream(cursor));
        }
        cursor.close();
        return dreams;
    }

    public List<Long> getDatesWithDreams() {
        SQLiteDatabase db = dbHelper.getReadableDatabase();
        List<Long> dates = new ArrayList<>();
        
        Cursor cursor = db.query(
                true,
                DreamDbHelper.TABLE_DREAMS,
                new String[]{DreamDbHelper.COLUMN_TIMESTAMP},
                null,
                null,
                null,
                null,
                null,
                null
        );

        Calendar cal = Calendar.getInstance();
        while (cursor.moveToNext()) {
            long timestamp = cursor.getLong(cursor.getColumnIndexOrThrow(DreamDbHelper.COLUMN_TIMESTAMP));
            cal.setTimeInMillis(timestamp);
            cal.set(Calendar.HOUR_OF_DAY, 0);
            cal.set(Calendar.MINUTE, 0);
            cal.set(Calendar.SECOND, 0);
            cal.set(Calendar.MILLISECOND, 0);
            long startOfDay = cal.getTimeInMillis();
            if (!dates.contains(startOfDay)) {
                dates.add(startOfDay);
            }
        }
        cursor.close();
        return dates;
    }

    public java.util.Map<String, Integer> getEmotionsCount(long startTime) {
        java.util.Map<String, Integer> counts = new java.util.HashMap<>();
        SQLiteDatabase db = dbHelper.getReadableDatabase();
        String selection = startTime > 0 ? DreamDbHelper.COLUMN_TIMESTAMP + " >= ?" : null;
        String[] selectionArgs = startTime > 0 ? new String[]{String.valueOf(startTime)} : null;

        Cursor cursor = db.query(
                DreamDbHelper.TABLE_DREAMS,
                new String[]{DreamDbHelper.COLUMN_MOOD, "COUNT(*)"},
                selection,
                selectionArgs,
                DreamDbHelper.COLUMN_MOOD,
                null,
                null
        );

        while (cursor.moveToNext()) {
            String mood = cursor.getString(0);
            int count = cursor.getInt(1);
            if (mood != null) counts.put(mood, count);
        }
        cursor.close();
        return counts;
    }

    public List<java.util.Map.Entry<String, Integer>> getTopTags(long startTime) {
        java.util.Map<String, Integer> tagCounts = new java.util.HashMap<>();
        SQLiteDatabase db = dbHelper.getReadableDatabase();
        String selection = startTime > 0 ? DreamDbHelper.COLUMN_TIMESTAMP + " >= ?" : null;
        String[] selectionArgs = startTime > 0 ? new String[]{String.valueOf(startTime)} : null;

        Cursor cursor = db.query(
                DreamDbHelper.TABLE_DREAMS,
                new String[]{DreamDbHelper.COLUMN_TAGS},
                selection,
                selectionArgs,
                null,
                null,
                null
        );

        while (cursor.moveToNext()) {
            String tagsString = cursor.getString(0);
            if (tagsString != null && !tagsString.isEmpty()) {
                String[] tags = tagsString.split(",");
                for (String tag : tags) {
                    String cleanTag = tag.trim().toLowerCase();
                    if (!cleanTag.isEmpty()) {
                        tagCounts.put(cleanTag, tagCounts.getOrDefault(cleanTag, 0) + 1);
                    }
                }
            }
        }
        cursor.close();

        List<java.util.Map.Entry<String, Integer>> sortedTags = new ArrayList<>(tagCounts.entrySet());
        sortedTags.sort((a, b) -> b.getValue().compareTo(a.getValue()));
        return sortedTags.size() > 10 ? sortedTags.subList(0, 10) : sortedTags;
    }

    public java.util.Map<String, Double> getDreamFactors(long startTime) {
        java.util.Map<String, Double> factors = new java.util.HashMap<>();
        SQLiteDatabase db = dbHelper.getReadableDatabase();
        String selection = startTime > 0 ? DreamDbHelper.COLUMN_TIMESTAMP + " >= ?" : null;
        String[] selectionArgs = startTime > 0 ? new String[]{String.valueOf(startTime)} : null;

        Cursor cursor = db.query(
                DreamDbHelper.TABLE_DREAMS,
                new String[]{
                        "AVG(" + DreamDbHelper.COLUMN_CLARITY + ")",
                        "AVG(" + DreamDbHelper.COLUMN_LUCIDITY + ")",
                        "SUM(" + DreamDbHelper.COLUMN_IS_NIGHTMARE + ")",
                        "SUM(" + DreamDbHelper.COLUMN_IS_RECURRING + ")",
                        "COUNT(*)"
                },
                selection,
                selectionArgs,
                null,
                null,
                null
        );

        if (cursor.moveToFirst()) {
            int total = cursor.getInt(4);
            factors.put("avgClarity", cursor.getDouble(0));
            factors.put("avgLucidity", cursor.getDouble(1));
            if (total > 0) {
                factors.put("nightmarePercent", (cursor.getDouble(2) / total) * 100);
                factors.put("recurringPercent", (cursor.getDouble(3) / total) * 100);
            } else {
                factors.put("nightmarePercent", 0.0);
                factors.put("recurringPercent", 0.0);
            }
        }
        cursor.close();
        return factors;
    }

    public List<Dream> getMoodHistory(long startTime) {
        SQLiteDatabase db = dbHelper.getReadableDatabase();
        List<Dream> dreams = new ArrayList<>();
        String selection = startTime > 0 ? DreamDbHelper.COLUMN_TIMESTAMP + " >= ?" : null;
        String[] selectionArgs = startTime > 0 ? new String[]{String.valueOf(startTime)} : null;

        Cursor cursor = db.query(
                DreamDbHelper.TABLE_DREAMS,
                new String[]{DreamDbHelper.COLUMN_TIMESTAMP, DreamDbHelper.COLUMN_MOOD},
                selection,
                selectionArgs,
                null,
                null,
                DreamDbHelper.COLUMN_TIMESTAMP + " ASC"
        );

        while (cursor.moveToNext()) {
            Dream d = new Dream();
            d.setTimestamp(cursor.getLong(0));
            d.setMood(cursor.getString(1));
            dreams.add(d);
        }
        cursor.close();
        return dreams;
    }

    public List<java.util.Map.Entry<String, Integer>> getKeywords(long startTime) {
        java.util.Map<String, Integer> wordCounts = new java.util.HashMap<>();
        SQLiteDatabase db = dbHelper.getReadableDatabase();
        
        String selection = startTime > 0 ? DreamDbHelper.COLUMN_TIMESTAMP + " >= ?" : null;
        String[] selectionArgs = startTime > 0 ? new String[]{String.valueOf(startTime)} : null;

        Cursor cursor = db.query(
                DreamDbHelper.TABLE_DREAMS,
                new String[]{DreamDbHelper.COLUMN_DESCRIPTION},
                selection,
                selectionArgs,
                null,
                null,
                null
        );

        java.util.Set<String> stopWords = new java.util.HashSet<>(java.util.Arrays.asList(
            "the", "a", "an", "i", "was", "in", "to", "and", "of", "my", "me", "with", "it", "that", "at", "for", "on", 
            "he", "she", "they", "we", "had", "have", "be", "is", "his", "her", "but", "so", "this", "up", "out", 
            "about", "into", "by", "all", "were", "when", "there", "then", "very", "could", "would", "been", "from",
            "if", "or", "as", "what", "how", "who", "where", "one", "just", "like", "get", "got", "can", "their"
        ));

        while (cursor.moveToNext()) {
            String desc = cursor.getString(0);
            if (desc != null) {
                String[] words = desc.toLowerCase().replaceAll("[^a-zA-Z ]", "").split("\\s+");
                for (String word : words) {
                    if (word.length() > 3 && !stopWords.contains(word)) {
                        wordCounts.put(word, wordCounts.getOrDefault(word, 0) + 1);
                    }
                }
            }
        }
        cursor.close();

        List<java.util.Map.Entry<String, Integer>> sortedWords = new ArrayList<>(wordCounts.entrySet());
        sortedWords.sort((a, b) -> b.getValue().compareTo(a.getValue()));
        return sortedWords.size() > 5 ? sortedWords.subList(0, 5) : sortedWords;
    }

    public List<java.util.Map.Entry<String, Integer>> getMoodSummary(long startTime) {
        java.util.Map<String, Integer> counts = getEmotionsCount(startTime);
        List<java.util.Map.Entry<String, Integer>> sortedMoods = new ArrayList<>(counts.entrySet());
        sortedMoods.sort((a, b) -> b.getValue().compareTo(a.getValue()));
        return sortedMoods;
    }

    public java.util.Map<String, Object> getStatsSummary(long startTime) {
        java.util.Map<String, Object> stats = new java.util.HashMap<>();
        SQLiteDatabase db = dbHelper.getReadableDatabase();
        
        Cursor lifetimeCursor = db.rawQuery("SELECT COUNT(*) FROM " + DreamDbHelper.TABLE_DREAMS, null);
        if (lifetimeCursor.moveToFirst()) stats.put("totalDreamsLifetime", lifetimeCursor.getInt(0));
        lifetimeCursor.close();

        String selection = startTime > 0 ? DreamDbHelper.COLUMN_TIMESTAMP + " >= ?" : null;
        String[] selectionArgs = startTime > 0 ? new String[]{String.valueOf(startTime)} : null;

        int selectedCount = 0;
        long totalWords = 0;
        java.util.Set<String> uniqueTags = new java.util.HashSet<>();
        int nightmaresInPeriod = 0;

        Cursor detailedCursor = db.query(
                DreamDbHelper.TABLE_DREAMS,
                new String[]{DreamDbHelper.COLUMN_DESCRIPTION, DreamDbHelper.COLUMN_TAGS, DreamDbHelper.COLUMN_IS_NIGHTMARE},
                selection,
                selectionArgs,
                null,
                null,
                null
        );

        while (detailedCursor.moveToNext()) {
            selectedCount++;
            String desc = detailedCursor.getString(0);
            if (desc != null && !desc.trim().isEmpty()) {
                totalWords += desc.trim().split("\\s+").length;
            }
            String tags = detailedCursor.getString(1);
            if (tags != null && !tags.isEmpty()) {
                String[] tagArray = tags.split(",");
                for (String t : tagArray) uniqueTags.add(t.trim().toLowerCase());
            }
            if (detailedCursor.getInt(2) == 1) nightmaresInPeriod++;
        }
        detailedCursor.close();

        stats.put("totalDreamsPeriod", selectedCount);
        stats.put("totalWords", totalWords);
        stats.put("uniqueTagsCount", uniqueTags.size());
        stats.put("totalNightmares", nightmaresInPeriod);
        if (selectedCount > 0) {
            stats.put("avgWords", (double) totalWords / selectedCount);
            stats.put("avgTags", (double) uniqueTags.size() / selectedCount);
        } else {
            stats.put("avgWords", 0.0);
            stats.put("avgTags", 0.0);
        }

        return stats;
    }
}
