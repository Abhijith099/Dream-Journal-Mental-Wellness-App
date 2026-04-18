package com.abb.luciddreams;

import java.util.List;

public class Dream {
    private String month;
    private String dayOfWeek;
    private String dayNumber;
    private String fullDate;
    private String description;
    private List<String> tags;
    private boolean showMonthHeader;

    public Dream(String month, String dayOfWeek, String dayNumber, String fullDate, String description, List<String> tags, boolean showMonthHeader) {
        this.month = month;
        this.dayOfWeek = dayOfWeek;
        this.dayNumber = dayNumber;
        this.fullDate = fullDate;
        this.description = description;
        this.tags = tags;
        this.showMonthHeader = showMonthHeader;
    }

    public String getMonth() { return month; }
    public String getDayOfWeek() { return dayOfWeek; }
    public String getDayNumber() { return dayNumber; }
    public String getFullDate() { return fullDate; }
    public String getDescription() { return description; }
    public List<String> getTags() { return tags; }
    public boolean isShowMonthHeader() { return showMonthHeader; }
}
