package com.abb.luciddreams;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class Dream {
    private long id;
    private long timestamp;
    private String description;
    private String mood;
    private int clarity;
    private int lucidity;
    private boolean isNightmare;
    private boolean isRecurring;
    private String tags; // Comma separated for SQLite
    private String imageUrl;

    // Empty constructor needed for instantiating in some cases
    public Dream() {
    }

    public Dream(long id, long timestamp, String description, String mood, int clarity, int lucidity, boolean isNightmare, boolean isRecurring, String tags, String imageUrl) {
        this.id = id;
        this.timestamp = timestamp;
        this.description = description;
        this.mood = mood;
        this.clarity = clarity;
        this.lucidity = lucidity;
        this.isNightmare = isNightmare;
        this.isRecurring = isRecurring;
        this.tags = tags;
        this.imageUrl = imageUrl;
    }

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }
    
    public long getTimestamp() { return timestamp; }
    public void setTimestamp(long timestamp) { this.timestamp = timestamp; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    
    public String getMood() { return mood; }
    public void setMood(String mood) { this.mood = mood; }
    
    public int getClarity() { return clarity; }
    public void setClarity(int clarity) { this.clarity = clarity; }
    
    public int getLucidity() { return lucidity; }
    public void setLucidity(int lucidity) { this.lucidity = lucidity; }
    
    public boolean isNightmare() { return isNightmare; }
    public void setNightmare(boolean nightmare) { isNightmare = nightmare; }
    
    public boolean isRecurring() { return isRecurring; }
    public void setRecurring(boolean recurring) { isRecurring = recurring; }
    
    public String getTags() { return tags; }
    public void setTags(String tags) { this.tags = tags; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public List<String> getTagsList() {
        if (tags == null || tags.trim().isEmpty()) {
            return new ArrayList<>();
        }
        return Arrays.asList(tags.split(","));
    }
}
