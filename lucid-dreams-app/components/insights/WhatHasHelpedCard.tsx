import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Send, ArrowRight } from 'lucide-react-native';

interface Props {
  text?: string;
  onViewWhatHelps: () => void;
}

export const WhatHasHelpedCard: React.FC<Props> = ({ text, onViewWhatHelps }) => {
  const highlight =
    text || 'Log your evening check-ins and sanctuary sessions to discover interventions that help you rest.';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>What has helped recently</Text>
        <Send size={16} color="#4F46E5" strokeWidth={2} style={styles.rotatedIcon} />
      </View>

      <Text style={styles.body}>{highlight}</Text>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={onViewWhatHelps}
        activeOpacity={0.8}
      >
        <Text style={styles.actionButtonText}>View what helps</Text>
        <ArrowRight size={14} color="#4338CA" strokeWidth={2} style={styles.iconMargin} />
      </TouchableOpacity>
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
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.2,
  },
  rotatedIcon: {
    transform: [{ rotate: '-20deg' }],
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4B5563',
    marginBottom: 14,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4338CA',
  },
  iconMargin: {
    marginLeft: 4,
  },
});

export default WhatHasHelpedCard;
