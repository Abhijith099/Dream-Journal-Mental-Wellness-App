import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  Activity,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Fonts } from '@/constants/theme';
import { authenticatedFetch as fetch, BACKEND_URL } from '@/utils/api';

export const BODY_HOLDING_REGIONS = [
  'Chest & Ribs',
  'Jaw & Temples',
  'Restless Limbs',
  'Heavy Torso',
  'Open & Receptive',
];

export const CONTEXT_TRIGGERS = [
  'Just woke up',
  'After a dream',
  'Difficult interaction',
  'Movement & walk',
  'Caffeine intake',
  'Before sleep',
  'No obvious trigger',
];

const SCALE_LABELS: Record<number, string> = {
  1: 'VERY UNSETTLED',
  2: 'UNSETTLED',
  3: 'NEUTRAL',
  4: 'SETTLED',
  5: 'DEEPLY GROUNDED',
};

interface SomaticCheckInCardProps {
  onCheckInComplete?: (savedEntry: any) => void;
}

export default function SomaticCheckInCard({ onCheckInComplete }: SomaticCheckInCardProps) {
  const [scale, setScale] = useState<number | null>(3);
  const [bodyRegions, setBodyRegions] = useState<string[]>(['Open & Receptive']);
  const [contextTrigger, setContextTrigger] = useState<string | null>('No obvious trigger');

  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [lastLoggedLabel, setLastLoggedLabel] = useState<string>('Neutral Baseline');

  // Toggle body region chips (Multi-select)
  const toggleBodyRegion = (region: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBodyRegions((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
    );
  };

  // Select scale (1 to 5)
  const handleSelectScale = (num: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setScale(num);
  };

  // Select context trigger (Single-select)
  const handleSelectContext = (trigger: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setContextTrigger(trigger);
  };

  // Submit Somatic Check-In
  const handleSubmitCheckIn = async () => {
    try {
      setSaving(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const payload = {
        somaticScale: scale,
        energyLevel: scale,
        somaticLabel: scale ? SCALE_LABELS[scale]?.toLowerCase() : 'neutral',
        bodyRegions,
        contextTag: contextTrigger,
      };

      const res = await fetch(`${BACKEND_URL}/wellness/mood-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setJustSaved(true);
        setLastLoggedLabel(scale ? (scale === 3 ? 'Neutral Baseline' : SCALE_LABELS[scale]) : 'Baseline');
        if (onCheckInComplete) {
          onCheckInComplete(data);
        }
      } else {
        setJustSaved(true);
        setLastLoggedLabel(scale ? (scale === 3 ? 'Neutral Baseline' : SCALE_LABELS[scale]) : 'Baseline');
        if (onCheckInComplete) {
          onCheckInComplete(payload);
        }
      }
    } catch (err) {
      console.error('Failed to log somatic check-in:', err);
      setJustSaved(true);
      if (onCheckInComplete) {
        onCheckInComplete({ somaticScale: scale, bodyRegions, contextTag: contextTrigger });
      }
    } finally {
      setSaving(false);
    }
  };

  if (justSaved) {
    return (
      <View style={styles.card}>
        <View style={styles.successContainer}>
          <View style={styles.successIconCircle}>
            <ShieldCheck size={24} color="#059669" strokeWidth={2} />
          </View>
          <Text style={styles.successTitle}>Somatic Check-In Anchored</Text>
          <Text style={styles.successSub}>
            Recorded as <Text style={styles.successHighlight}>{lastLoggedLabel}</Text>. Your regulation tools below are calibrated to your present state.
          </Text>

          <TouchableOpacity
            style={styles.logAgainBtn}
            onPress={() => setJustSaved(false)}
            activeOpacity={0.8}
          >
            <RotateCcw size={13} color="#8B5CF6" strokeWidth={1.8} style={{ marginRight: 6 }} />
            <Text style={styles.logAgainText}>Update Check-in</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const badgeText = scale ? (SCALE_LABELS[scale] || 'NEUTRAL') : 'NEUTRAL';

  return (
    <View style={styles.card}>
      {/* Card Header: Icon, Title, Subtitle, and small grey NEUTRAL pill */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={styles.iconCircle}>
            <Activity size={17} color="#8B5CF6" strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Somatic State Check-In</Text>
            <Text style={styles.subtitle}>Notice your present autonomic tone</Text>
          </View>
        </View>

        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>{badgeText}</Text>
        </View>
      </View>

      {/* State Scale (1 to 5) */}
      <View style={styles.scaleContainer}>
        {/* Eyebrow Header Row */}
        <View style={styles.scaleHeaderRow}>
          <Text style={styles.scaleHeaderLabel}>STATE SCALE</Text>
          <Text style={styles.scaleHeaderLevel}>
            LEVEL {scale ? `0${scale}` : '--'} / 05
          </Text>
        </View>

        {/* Row of 5 touchable squares */}
        <View style={styles.scaleRow}>
          {[1, 2, 3, 4, 5].map((num) => {
            const isSelected = scale === num;
            return (
              <TouchableOpacity
                key={num}
                style={[
                  styles.scaleSquare,
                  isSelected ? styles.scaleSquareActive : styles.scaleSquareInactive,
                ]}
                onPress={() => handleSelectScale(num)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`Scale level ${num}`}
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  style={[
                    styles.scaleSquareText,
                    isSelected ? styles.scaleSquareTextActive : styles.scaleSquareTextInactive,
                  ]}
                >
                  {num}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Labels below: Very Unsettled, Neutral Baseline, Deeply Grounded */}
        <View style={styles.scaleLabelsRow}>
          <Text style={styles.scaleLabelLeft}>Very Unsettled</Text>
          <Text
            style={[
              styles.scaleLabelCenter,
              scale === 3 && styles.scaleLabelCenterActive,
            ]}
          >
            Neutral Baseline
          </Text>
          <Text style={styles.scaleLabelRight}>Deeply Grounded</Text>
        </View>
      </View>

      {/* Body Holding (Multi-select Chips) */}
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionQuestion}>Where is your body holding this?</Text>
        <View style={styles.chipsWrap}>
          {BODY_HOLDING_REGIONS.map((region) => {
            const isSelected = bodyRegions.includes(region);
            return (
              <TouchableOpacity
                key={region}
                style={[
                  styles.chip,
                  isSelected ? styles.chipActive : styles.chipInactive,
                ]}
                onPress={() => toggleBodyRegion(region)}
                activeOpacity={0.75}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected ? styles.chipTextActive : styles.chipTextInactive,
                  ]}
                >
                  {region}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Context Trigger (Single-select Chips) */}
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionQuestion}>What influenced this state?</Text>
        <View style={styles.chipsWrap}>
          {CONTEXT_TRIGGERS.map((trigger) => {
            const isSelected = contextTrigger === trigger;
            return (
              <TouchableOpacity
                key={trigger}
                style={[
                  styles.triggerChip,
                  isSelected ? styles.triggerChipActive : styles.triggerChipInactive,
                ]}
                onPress={() => handleSelectContext(trigger)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  style={[
                    styles.triggerChipText,
                    isSelected ? styles.triggerChipTextActive : styles.triggerChipTextInactive,
                  ]}
                >
                  {trigger}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Full-width Submit Button */}
      <TouchableOpacity
        style={styles.submitBtn}
        onPress={handleSubmitCheckIn}
        disabled={saving}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel="Anchor Somatic Check-In"
      >
        {saving ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <View style={styles.submitBtnInner}>
            <Text style={styles.submitBtnText}>ANCHOR SOMATIC CHECK-IN</Text>
            <ArrowRight size={15} color="#FFFFFF" strokeWidth={2.4} style={{ marginLeft: 6 }} />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F0EDF6',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: Fonts.bold }),
    fontWeight: '700',
    fontSize: 16,
    color: '#1E1B4B',
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusPillText: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: Fonts.bold }),
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.8,
    color: '#6B7280',
  },

  // State scale
  scaleContainer: {
    marginBottom: 6,
  },
  scaleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  scaleHeaderLabel: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: Fonts.bold }),
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 1.2,
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  scaleHeaderLevel: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: Fonts.bold }),
    fontWeight: '600',
    fontSize: 10,
    letterSpacing: 0.8,
    color: '#6B7280',
  },
  scaleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  scaleSquare: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleSquareActive: {
    backgroundColor: '#1E1B4B',
  },
  scaleSquareInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  scaleSquareText: {
    fontSize: 15,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: Fonts.bold }),
    fontWeight: '700',
  },
  scaleSquareTextActive: {
    color: '#FFFFFF',
  },
  scaleSquareTextInactive: {
    color: '#1E1B4B',
  },
  scaleLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 2,
  },
  scaleLabelLeft: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: '#9CA3AF',
  },
  scaleLabelCenter: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: '#9CA3AF',
  },
  scaleLabelCenterActive: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: Fonts.bold }),
    fontWeight: '700',
    color: '#1E1B4B',
  },
  scaleLabelRight: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: '#9CA3AF',
  },

  // Sections
  sectionBlock: {
    marginTop: 18,
  },
  sectionQuestion: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: Fonts.bold }),
    fontWeight: '600',
    fontSize: 12.5,
    color: '#1E1B4B',
    marginBottom: 10,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  // Body chips (Multi-select)
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  chipActive: {
    borderWidth: 1.5,
    borderColor: '#8B5CF6',
  },
  chipInactive: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  chipTextActive: {
    color: '#1E1B4B',
    fontWeight: '600',
  },
  chipTextInactive: {
    color: '#6B7280',
  },

  // Trigger chips (Single-select)
  triggerChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  triggerChipActive: {
    backgroundColor: '#1E1B4B',
  },
  triggerChipInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  triggerChipText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  triggerChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  triggerChipTextInactive: {
    color: '#6B7280',
  },

  // Submit button
  submitBtn: {
    backgroundColor: '#1E1B4B',
    borderRadius: 12,
    marginTop: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: Fonts.bold }),
    fontWeight: '700',
    fontSize: 12.5,
    letterSpacing: 1.2,
    color: '#FFFFFF',
  },

  // Success state
  successContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  successIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  successTitle: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: Fonts.bold }),
    fontWeight: '700',
    fontSize: 16,
    color: '#1E1B4B',
    marginBottom: 4,
  },
  successSub: {
    fontFamily: Fonts.regular,
    fontSize: 12.5,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 290,
    marginBottom: 16,
  },
  successHighlight: {
    fontFamily: Fonts.bold,
    color: '#8B5CF6',
  },
  logAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#F5F3FF',
  },
  logAgainText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: '#8B5CF6',
  },
});
