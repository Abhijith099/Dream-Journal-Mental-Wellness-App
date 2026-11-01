import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { Fonts } from '@/constants/theme';
import { SE } from '@/constants/sereneEquilibrium';
import { useRouter } from 'expo-router';

export type MoodDayStatus = 'peaceful' | 'stressful' | 'empty';

export interface MoodDayItem {
  day: string; // e.g. "W"
  date: string; // e.g. "26"
  fullDate?: string; // e.g. "2026-08-26"
  status: MoodDayStatus;
  count?: number;
  isToday?: boolean;
}

interface MoodHeatmapCalendarProps {
  weekData: MoodDayItem[];
  onDayPress?: (item: MoodDayItem) => void;
}

export default function MoodHeatmapCalendar({
  weekData = [],
  onDayPress,
}: MoodHeatmapCalendarProps) {
  const router = useRouter();

  const handlePress = (item: MoodDayItem) => {
    if (onDayPress) {
      onDayPress(item);
    } else if (item.status !== 'empty') {
      router.push('/(tabs)/explore' as any);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <Calendar size={18} strokeWidth={1.5} color={SE.accentPurple} />
        </View>
        <Text style={styles.title}>Weekly Mood Heatmap</Text>
      </View>

      {/* 7-Day Bubbles Row */}
      <View style={styles.bubblesRow}>
        {weekData.map((item, index) => {
          const isPeaceful = item.status === 'peaceful';
          const isStressful = item.status === 'stressful';
          const isEmpty = item.status === 'empty';

          return (
            <TouchableOpacity
              key={`${item.date}-${index}`}
              style={[
                styles.bubble,
                isPeaceful && styles.bubblePeaceful,
                isStressful && styles.bubbleStressful,
                isEmpty && styles.bubbleEmpty,
                item.isToday && styles.todayOutline,
              ]}
              onPress={() => handlePress(item)}
              activeOpacity={isEmpty ? 1 : 0.7}
              disabled={isEmpty}
            >
              <Text
                style={[
                  styles.dayText,
                  isPeaceful && styles.textPeaceful,
                  isStressful && styles.textStressful,
                  isEmpty && styles.textEmpty,
                ]}
              >
                {item.day}
              </Text>
              <Text
                style={[
                  styles.dateText,
                  isPeaceful && styles.textPeaceful,
                  isStressful && styles.textStressful,
                  isEmpty && styles.textEmpty,
                ]}
              >
                {item.date}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Mini Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#4CD3C2' }]} />
          <Text style={styles.legendLabel}>Peaceful</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F6AD55' }]} />
          <Text style={styles.legendLabel}>Stressful</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#CBD5E0' }]} />
          <Text style={styles.legendLabel}>No Entry</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3EFF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: SE.textPrimary,
  },
  bubblesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bubble: {
    width: 38,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  bubblePeaceful: {
    backgroundColor: '#E6FFFA', // soft mint/teal fill
  },
  bubbleStressful: {
    backgroundColor: '#FEEBC8', // soft amber/peach fill
  },
  bubbleEmpty: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderStyle: 'dashed',
  },
  todayOutline: {
    borderWidth: 1.5,
    borderColor: SE.textPrimary,
  },
  dayText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  dateText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
  },
  textPeaceful: {
    color: '#234E52', // dark teal
  },
  textStressful: {
    color: '#9C4221', // dark amber
  },
  textEmpty: {
    color: '#A0AEC0', // muted grey
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0EBF7',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendLabel: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: SE.textSecondary,
  },
});
