import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  CheckCircle2,
  Wind,
  Music,
  Phone,
  X,
  User as UserIcon,
} from 'lucide-react-native';
import { useSanctuary } from '../../context/SanctuaryContext';
import { Fonts } from '@/constants/theme';

export default function FeelingsCheckInScreen() {
  const router = useRouter();
  const {
    lastActivity,
    selectedFeeling,
    submitFeelingCheckIn,
    logEvent,
  } = useSanctuary();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [activeFeeling, setActiveFeeling] = useState<string | null>(selectedFeeling || 'Same');
  const [showBreathModal, setShowBreathModal] = useState<boolean>(false);
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [breathCounter, setBreathCounter] = useState<number>(4);

  useEffect(() => {
    logEvent('sanctuary_feelings_checkin_view');
  }, [logEvent]);

  // Serene breathing guide cycle
  useEffect(() => {
    if (!showBreathModal) return;

    const timer = setInterval(() => {
      setBreathCounter((prev) => {
        if (prev <= 1) {
          setBreathPhase((currentPhase) => {
            if (currentPhase === 'Inhale') return 'Hold';
            if (currentPhase === 'Hold') return 'Exhale';
            return 'Inhale';
          });
          return 4;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showBreathModal]);

  const handleSelectFeeling = async (feeling: 'calmer' | 'same' | 'more_upset' | 'not_sure', label: string) => {
    setActiveFeeling(label);
    await submitFeelingCheckIn(feeling, 'voice_playback');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header Bar */}
      <View style={styles.topHeaderBar}>
        {/* Left: ← Sanctuary Return Escape Hatch */}
        <TouchableOpacity
          style={styles.sanctuaryReturnButton}
          onPress={() => router.replace('/memory-support' as any)}
          activeOpacity={0.7}
          accessibilityLabel="Back to Sanctuary"
          accessibilityRole="button"
        >
          <ArrowLeft size={18} color="#111827" strokeWidth={2} style={{ marginRight: 6 }} />
          <Text style={styles.sanctuaryReturnText}>Sanctuary</Text>
        </TouchableOpacity>

        {/* Right: Grounding Arrival */}
        <Text style={styles.groundingArrivalText}>Grounding Arrival</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.mainCardContainer, !isMobile && styles.desktopContainer]}>
          {/* Activity Completion Card */}
          <View style={styles.completionWrapper}>
            <Text style={styles.completionSubtitle}>Message finished playing</Text>
            <View style={styles.completionCard}>
              <View style={styles.completionAvatar}>
                {lastActivity.photoUrl ? (
                  <Image source={{ uri: lastActivity.photoUrl }} style={styles.avatarImg} />
                ) : (
                  <UserIcon size={18} color="#7C3AED" strokeWidth={2} />
                )}
              </View>
              <View style={styles.completionDetails}>
                <Text style={styles.completionTitle}>{lastActivity.noteTitle}</Text>
                <Text style={styles.completionDuration}>{lastActivity.summaryDuration}</Text>
              </View>
              <CheckCircle2 size={20} color="#10B981" strokeWidth={2.2} />
            </View>
          </View>

          {/* Clinical Question */}
          <View style={styles.questionBlock}>
            <Text style={styles.screenTitle}>How do you feel now?</Text>
            <Text style={styles.screenSubtitle}>
              Take a soft breath before deciding. There is no rush or right answer.
            </Text>
          </View>

          {/* 2x2 Rectangular Grid */}
          <View style={styles.feelingsGrid}>
            <View style={styles.gridRow}>
              {/* Option 1: Calmer */}
              <TouchableOpacity
                style={[
                  styles.gridButton,
                  activeFeeling === 'Calmer' && styles.gridButtonActive,
                ]}
                onPress={() => handleSelectFeeling('calmer', 'Calmer')}
                activeOpacity={0.8}
                accessibilityLabel="Calmer"
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.gridButtonText,
                    activeFeeling === 'Calmer' && styles.gridButtonTextActive,
                  ]}
                >
                  Calmer
                </Text>
              </TouchableOpacity>

              {/* Option 2: Same */}
              <TouchableOpacity
                style={[
                  styles.gridButton,
                  activeFeeling === 'Same' && styles.gridButtonActive,
                ]}
                onPress={() => handleSelectFeeling('same', 'Same')}
                activeOpacity={0.8}
                accessibilityLabel="Same"
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.gridButtonText,
                    activeFeeling === 'Same' && styles.gridButtonTextActive,
                  ]}
                >
                  Same
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.gridRow}>
              {/* Option 3: More upset */}
              <TouchableOpacity
                style={[
                  styles.gridButton,
                  activeFeeling === 'More upset' && styles.gridButtonActive,
                ]}
                onPress={() => handleSelectFeeling('more_upset', 'More upset')}
                activeOpacity={0.8}
                accessibilityLabel="More upset"
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.gridButtonText,
                    activeFeeling === 'More upset' && styles.gridButtonTextActive,
                  ]}
                >
                  More upset
                </Text>
              </TouchableOpacity>

              {/* Option 4: Not sure */}
              <TouchableOpacity
                style={[
                  styles.gridButton,
                  activeFeeling === 'Not sure' && styles.gridButtonActive,
                ]}
                onPress={() => handleSelectFeeling('not_sure', 'Not sure')}
                activeOpacity={0.8}
                accessibilityLabel="Not sure"
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.gridButtonText,
                    activeFeeling === 'Not sure' && styles.gridButtonTextActive,
                  ]}
                >
                  Not sure
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Supportive Section Below Grid */}
          <View style={styles.supportSection}>
            <Text style={styles.supportTitle}>Take all the time you need.</Text>
            <Text style={styles.supportSubtitle}>
              No shift is expected right away. Choose what feels most supportive right now.
            </Text>

            {/* Outlined Action 1: Take a quiet breath */}
            <TouchableOpacity
              style={styles.outlineActionBtn}
              onPress={() => setShowBreathModal(true)}
              activeOpacity={0.8}
              accessibilityLabel="Take a quiet breath"
              accessibilityRole="button"
            >
              <Wind size={18} color="#4B5563" strokeWidth={1.8} style={{ marginRight: 10 }} />
              <Text style={styles.outlineActionBtnText}>Take a quiet breath</Text>
            </TouchableOpacity>

            {/* Outlined Action 2: Listen to familiar music */}
            <TouchableOpacity
              style={styles.outlineActionBtn}
              onPress={() => router.push('/memory-support/music' as any)}
              activeOpacity={0.8}
              accessibilityLabel="Listen to familiar music"
              accessibilityRole="button"
            >
              <Music size={18} color="#4B5563" strokeWidth={1.8} style={{ marginRight: 10 }} />
              <Text style={styles.outlineActionBtnText}>Listen to familiar music</Text>
            </TouchableOpacity>
          </View>

          {/* Sticky Bottom Dark Action Bar */}
          <TouchableOpacity
            style={styles.stickyBottomBar}
            onPress={() => router.push('/memory-support/emergency' as any)}
            activeOpacity={0.85}
            accessibilityLabel="I need someone, Reach your trusted support circle"
            accessibilityRole="button"
          >
            <View style={styles.stickyBottomLeft}>
              <Phone size={16} color="#FFFFFF" strokeWidth={2} style={{ marginRight: 8 }} />
              <Text style={styles.stickyBottomTitle}>I need someone</Text>
            </View>
            <Text style={styles.stickyBottomSubtitle}>Reach your trusted support circle →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Gentle Breath Guide Modal */}
      <Modal
        visible={showBreathModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBreathModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.breathCard}>
            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setShowBreathModal(false)}
              activeOpacity={0.7}
            >
              <X size={20} color="#6B7280" />
            </TouchableOpacity>

            <View style={styles.breathCircle}>
              <Wind size={36} color="#7C3AED" strokeWidth={1.5} />
              <Text style={styles.breathPhaseText}>{breathPhase}</Text>
              <Text style={styles.breathCounterText}>{breathCounter}</Text>
            </View>

            <Text style={styles.breathGuidanceHeading}>Quiet Breath Pacing</Text>
            <Text style={styles.breathGuidanceBody}>
              Allow your shoulders to soften. Follow the gentle rhythm. You are safe.
            </Text>

            <TouchableOpacity
              style={styles.finishBreathBtn}
              onPress={() => setShowBreathModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.finishBreathBtnText}>I Feel Settled</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF9FB',
  },
  topHeaderBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FAF9FB',
    borderBottomWidth: 1,
    borderBottomColor: '#EBE7F0',
  },
  sanctuaryReturnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 8,
  },
  sanctuaryReturnText: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: '#111827',
  },
  groundingArrivalText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: '#6B7280',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  mainCardContainer: {
    width: '100%',
    maxWidth: 420,
  },
  desktopContainer: {
    paddingHorizontal: 12,
  },
  completionWrapper: {
    marginBottom: 24,
  },
  completionSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: '#6B7280',
    marginBottom: 6,
  },
  completionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
      },
      default: {
        elevation: 1,
        shadowColor: '#000000',
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 2,
      },
    }),
  },
  completionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarImg: {
    width: 36,
    height: 36,
  },
  completionDetails: {
    flex: 1,
  },
  completionTitle: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: '#111827',
  },
  completionDuration: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: '#6B7280',
  },
  questionBlock: {
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 20,
  },
  screenTitle: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
  },
  screenSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  feelingsGrid: {
    gap: 12,
    marginBottom: 28,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gridButton: {
    flex: 1,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#D1D5DB',
  },
  gridButtonActive: {
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#C4B5FD',
    borderLeftWidth: 4,
    borderLeftColor: '#5B21B6',
  },
  gridButtonText: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: '#374151',
  },
  gridButtonTextActive: {
    fontFamily: Fonts.bold,
    color: '#111827',
  },
  supportSection: {
    marginBottom: 20,
  },
  supportTitle: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: '#111827',
    marginBottom: 4,
  },
  supportSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: '#4B5563',
    lineHeight: 19,
    marginBottom: 16,
  },
  outlineActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  outlineActionBtnText: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: '#374151',
  },
  stickyBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginTop: 12,
    marginBottom: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      },
      default: {
        elevation: 2,
        shadowColor: '#000000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
      },
    }),
  },
  stickyBottomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stickyBottomTitle: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: '#FFFFFF',
  },
  stickyBottomSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: '#D1D5DB',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  breathCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
  },
  closeModalBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  breathCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FAF5FF',
    borderWidth: 2,
    borderColor: '#E9D5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  breathPhaseText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: '#7C3AED',
    marginTop: 4,
  },
  breathCounterText: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: '#111827',
  },
  breathGuidanceHeading: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: '#111827',
    marginBottom: 6,
  },
  breathGuidanceBody: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  finishBreathBtn: {
    width: '100%',
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  finishBreathBtnText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: '#FFFFFF',
  },
});
