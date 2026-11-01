import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { RhythmDay } from '@/services/insightsAPI';

interface Props {
  days: RhythmDay[];
}

export const RecentRhythmCard: React.FC<Props> = ({ days }) => {
  // Generate real calendar days for the last 14 days if no user logs exist
  const generateEmpty14Days = (): RhythmDay[] => {
    const list: RhythmDay[] = [];
    const today = new Date();
    const dayLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      list.push({
        date: d.toISOString().split('T')[0],
        dayOfWeek: dayLetters[d.getDay()],
        dayOfMonth: d.getDate(),
        value: 'none'
      });
    }
    return list;
  };

  const displayDays = days && days.length > 0 ? days : generateEmpty14Days();

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Recent rhythm</Text>
        <Text style={styles.scrollHint}>Scroll to view</Text>
      </View>
      <Text style={styles.subtitle}>Last 14 days</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.daysContainer}
      >
        {displayDays.map((item, idx) => {
          const isFaint = item.value === 'none';
          const isHigh = item.value === 'high';
          const isLow = item.value === 'low' || item.value === 'moderate';

          return (
            <View key={item.date || idx} style={styles.dayColumn}>
              <Text style={styles.dayOfWeekText}>{item.dayOfWeek}</Text>
              <Text style={[styles.dayNumberText, isFaint && styles.dayNumberFaint]}>
                {item.dayOfMonth}
              </Text>
              <View style={styles.dotContainer}>
                {isHigh && <View style={styles.dotHigh} />}
                {isLow && <View style={styles.dotLow} />}
                {isFaint && <View style={styles.dotPlaceholder} />}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.2,
  },
  scrollHint: {
    fontSize: 12,
    color: '#6B7280',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 16,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    minWidth: '100%',
    paddingRight: 6,
  },
  dayColumn: {
    alignItems: 'center',
    flex: 1,
    minWidth: 42,
  },
  dayOfWeekText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  dayNumberText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  dayNumberFaint: {
    color: '#D1D5DB',
  },
  dotContainer: {
    height: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotHigh: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4F46E5',
  },
  dotLow: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C7D2FE',
  },
  dotPlaceholder: {
    width: 6,
    height: 6,
  },
});

export default RecentRhythmCard;
