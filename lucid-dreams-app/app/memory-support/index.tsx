import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Volume2,
  Clock,
  Music,
  HeartHandshake,
  User as UserIcon,
  Lock,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useSanctuary } from '../../context/SanctuaryContext';
import { Fonts } from '@/constants/theme';

export default function SanctuaryArrivalScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { refreshSanctuary, logEvent } = useSanctuary();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  useEffect(() => {
    refreshSanctuary();
    logEvent('sanctuary_arrival_view');
  }, [refreshSanctuary, logEvent]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header Bar */}
      <View style={styles.topHeaderBar}>
        {/* Left: Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/(tabs)')}
          activeOpacity={0.7}
          accessibilityLabel="Back"
          accessibilityRole="button"
        >
          <ChevronLeft size={20} color="#111827" strokeWidth={2} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        {/* Center: Sanctuary Grounding Arrival */}
        <Text style={styles.headerTitle}>Sanctuary Grounding Arrival</Text>

        {/* Right: Caregiver Mode Access & Avatar */}
        <View style={styles.topHeaderRight}>
          <TouchableOpacity
            style={styles.caregiverHeaderBtn}
            onPress={() => router.push('/memory-support/caregiver' as any)}
            activeOpacity={0.7}
            accessibilityLabel="Caregiver Dashboard"
            accessibilityRole="button"
          >
            <Lock size={15} color="#4B5563" strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.userAvatarRim}
            onPress={() => router.push('/memory-support/caregiver' as any)}
            activeOpacity={0.7}
            accessibilityLabel="Caregiver Profile"
            accessibilityRole="button"
          >
            <View style={styles.userAvatarInner}>
              <UserIcon size={16} color="#FFFFFF" strokeWidth={2} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.mainCardContainer, !isMobile && styles.desktopContainer]}>
          {/* Hero Grounding Typography */}
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>You are safe.</Text>
            <Text style={styles.heroSubtitle}>Take it slowly.</Text>
          </View>

          {/* Primary Navigation Cards */}
          <View style={styles.actionsStack}>
            {/* Card 1: Hear a familiar voice */}
            <TouchableOpacity
              style={styles.navCard}
              onPress={() => router.push('/memory-support/voices' as any)}
              activeOpacity={0.8}
              accessibilityLabel="Hear a familiar voice"
              accessibilityRole="button"
            >
              <View style={styles.iconCircle}>
                <Volume2 size={20} color="#7C3AED" strokeWidth={1.8} />
              </View>
              <Text style={styles.navCardText}>Hear a familiar voice</Text>
            </TouchableOpacity>

            {/* Card 2: See familiar faces */}
            <TouchableOpacity
              style={styles.navCard}
              onPress={() => router.push('/memory-support/faces' as any)}
              activeOpacity={0.8}
              accessibilityLabel="See familiar faces"
              accessibilityRole="button"
            >
              <View style={styles.iconCircle}>
                <Clock size={20} color="#7C3AED" strokeWidth={1.8} />
              </View>
              <Text style={styles.navCardText}>See familiar faces</Text>
            </TouchableOpacity>

            {/* Card 3: Listen to familiar music */}
            <TouchableOpacity
              style={styles.navCard}
              onPress={() => router.push('/memory-support/music' as any)}
              activeOpacity={0.8}
              accessibilityLabel="Listen to familiar music"
              accessibilityRole="button"
            >
              <View style={styles.iconCircle}>
                <Music size={20} color="#7C3AED" strokeWidth={1.8} />
              </View>
              <Text style={styles.navCardText}>Listen to familiar music</Text>
            </TouchableOpacity>
          </View>

          {/* Urgent Care / Emergency Action Block */}
          <View style={styles.emergencyBlockWrapper}>
            <TouchableOpacity
              style={styles.emergencyDarkButton}
              onPress={() => router.push('/memory-support/emergency' as any)}
              activeOpacity={0.85}
              accessibilityLabel="I need someone"
              accessibilityRole="button"
            >
              <HeartHandshake size={20} color="#FFFFFF" strokeWidth={2} style={{ marginRight: 10 }} />
              <Text style={styles.emergencyDarkButtonText}>I need someone</Text>
            </TouchableOpacity>

            <Text style={styles.emergencyFooterCaption}>
              Connecting with your designated caregiver or companion
            </Text>
          </View>

          {/* Caregiver Portal Link */}
          <TouchableOpacity
            style={styles.caregiverFooterLink}
            onPress={() => router.push('/memory-support/caregiver' as any)}
            activeOpacity={0.7}
            accessibilityLabel="Caregiver Mode"
            accessibilityRole="button"
          >
            <Lock size={13} color="#7C3AED" strokeWidth={2} style={{ marginRight: 6 }} />
            <Text style={styles.caregiverFooterLinkText}>Caregiver Portal • Patient History & Logs</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  topHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  caregiverHeaderBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 8,
  },
  backButtonText: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: '#111827',
    marginLeft: 2,
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: '#111827',
  },
  userAvatarRim: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#5B21B6',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF9FB',
  },
  userAvatarInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6D28D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 110,
    paddingHorizontal: 16,
  },
  mainCardContainer: {
    width: '100%',
    maxWidth: 420,
  },
  desktopContainer: {
    paddingHorizontal: 12,
  },
  heroSection: {
    marginBottom: 36,
    paddingHorizontal: 4,
  },
  heroTitle: {
    fontSize: 32,
    fontFamily: Fonts.bold,
    color: '#111827',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 18,
    fontFamily: Fonts.regular,
    color: '#4B5563',
    lineHeight: 26,
  },
  actionsStack: {
    gap: 16,
    marginBottom: 36,
  },
  navCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 18,
    paddingHorizontal: 18,
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
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  navCardText: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: '#111827',
  },
  emergencyBlockWrapper: {
    marginTop: 8,
  },
  emergencyDarkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
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
  emergencyDarkButtonText: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: '#FFFFFF',
  },
  emergencyFooterCaption: {
    marginTop: 12,
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  caregiverFooterLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignSelf: 'center',
  },
  caregiverFooterLinkText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: '#4B5563',
  },
});
