import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Clock,
  Play,
  Heart,
  Shield,
  User as UserIcon,
  Volume2,
  Diamond,
} from 'lucide-react-native';
import { useSanctuary, SanctuaryContactItem } from '../../context/SanctuaryContext';
import { Fonts } from '@/constants/theme';

export default function FamiliarVoicesScreen() {
  const router = useRouter();
  const { voiceContacts, setSelectedContact, logEvent } = useSanctuary();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  useEffect(() => {
    logEvent('sanctuary_voices_directory_view');
  }, [logEvent]);

  const handleSelectContact = (contact: SanctuaryContactItem) => {
    setSelectedContact(contact);
    router.push('/memory-support/presence' as any);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header Bar */}
      <View style={styles.topHeaderBar}>
        {/* Left: Back */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityLabel="Back"
          accessibilityRole="button"
        >
          <ChevronLeft size={20} color="#111827" strokeWidth={2} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        {/* Center: Sanctuary Grounding Arrival */}
        <Text style={styles.headerCenterTitle}>Sanctuary Grounding Arrival</Text>

        {/* Right: Safe Haven badge */}
        <View style={styles.safeHavenBadge}>
          <Shield size={13} color="#6B21A8" strokeWidth={2} style={{ marginRight: 4 }} />
          <Text style={styles.safeHavenText}>Safe Haven</Text>
          <View style={styles.safeHavenAvatar}>
            <UserIcon size={10} color="#6B21A8" strokeWidth={2} />
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.mainCardContainer, !isMobile && styles.desktopContainer]}>
          {/* Section Heading */}
          <View style={styles.headingBlock}>
            <Text style={styles.screenTitle}>Familiar voices</Text>
            <Text style={styles.screenSubtitle}>Warm, soothing messages recorded just for you.</Text>
          </View>

          {/* Contact Cards List */}
          {voiceContacts.length === 0 ? (
            <View style={{ padding: 28, alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 16, marginVertical: 12 }}>
              <Volume2 size={32} color="#9CA3AF" strokeWidth={1.5} style={{ marginBottom: 8 }} />
              <Text style={{ fontSize: 16, fontFamily: Fonts.semiBold, color: '#374151', textAlign: 'center', marginBottom: 4 }}>
                No voice messages yet
              </Text>
              <Text style={{ fontSize: 14, fontFamily: Fonts.regular, color: '#6B7280', textAlign: 'center' }}>
                Your loved ones and care team can upload comforting voice notes to help you ground whenever needed.
              </Text>
            </View>
          ) : (
            <View style={styles.contactsList}>
              {voiceContacts.map((contact) => (
                <TouchableOpacity
                  key={contact.contactId || contact.name}
                  style={styles.contactCard}
                  onPress={() => handleSelectContact(contact)}
                  activeOpacity={0.8}
                  accessibilityLabel={`Play message from ${contact.name}`}
                  accessibilityRole="button"
                >
                  {/* Contact Photo */}
                  <View style={styles.avatarWrapper}>
                    {contact.photoUrl ? (
                      <Image
                        source={{ uri: contact.photoUrl }}
                        style={styles.avatarImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <UserIcon size={22} color="#7C3AED" strokeWidth={1.8} />
                      </View>
                    )}
                  </View>

                  {/* Center Info */}
                  <View style={styles.contactDetails}>
                    <View style={styles.nameRow}>
                      <Text style={styles.contactName}>{contact.name}</Text>
                      {contact.relationshipTag ? (
                        <View style={styles.tagBadge}>
                          <Text style={styles.tagBadgeText}>{contact.relationshipTag}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.relationshipText}>{contact.relationship}</Text>
                    <View style={styles.durationRow}>
                      <Clock size={12} color="#6B7280" strokeWidth={1.8} style={{ marginRight: 4 }} />
                      <Text style={styles.durationText}>
                        {contact.recordingLabel || `${Math.floor((contact.recordingDuration || 90) / 60)}m ${(contact.recordingDuration || 90) % 60}s soothing message`}
                      </Text>
                    </View>
                  </View>

                  {/* Right Play Action Button */}
                  <View style={styles.playButtonCircle}>
                    <Play size={14} color="#111827" fill="#111827" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Grounding Anchor Quotation Card */}
          <View style={styles.quoteCard}>
            <View style={styles.quoteHeaderRow}>
              <Heart size={16} color="#7C3AED" strokeWidth={2} style={{ marginRight: 6 }} />
              <Text style={styles.quoteGuideTag}>Grounding guide</Text>
            </View>
            <Text style={styles.quoteBodyText}>
              “You are safe, right where you are. Place one hand on your chest and listen as long as you need.”
            </Text>
          </View>

          {/* Urgent Care / Emergency Action Button */}
          <View style={styles.emergencyBlockWrapper}>
            <TouchableOpacity
              style={styles.emergencyDarkButton}
              onPress={() => router.push('/memory-support/emergency' as any)}
              activeOpacity={0.85}
              accessibilityLabel="I need someone"
              accessibilityRole="button"
            >
              <Diamond size={18} color="#FFFFFF" strokeWidth={2} style={{ marginRight: 10 }} />
              <Text style={styles.emergencyDarkButtonText}>I need someone</Text>
            </TouchableOpacity>

            <Text style={styles.emergencyFooterCaption}>
              Instant direct connection to your designated emergency contact or care team.
            </Text>
          </View>
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
  headerCenterTitle: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: '#111827',
  },
  safeHavenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 14,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  safeHavenText: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    color: '#6B21A8',
    marginRight: 4,
  },
  safeHavenAvatar: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#E9D5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  mainCardContainer: {
    width: '100%',
    maxWidth: 420,
  },
  desktopContainer: {
    paddingHorizontal: 12,
  },
  headingBlock: {
    marginBottom: 20,
  },
  screenTitle: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: '#111827',
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: '#6B7280',
    lineHeight: 20,
  },
  contactsList: {
    gap: 12,
    marginBottom: 20,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
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
  avatarWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#F3E8FF',
    marginRight: 14,
  },
  avatarImage: {
    width: 48,
    height: 48,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 8,
  },
  contactName: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: '#111827',
  },
  tagBadge: {
    backgroundColor: '#F3E8FF',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  tagBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.semiBold,
    color: '#6B21A8',
  },
  relationshipText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: '#4B5563',
    marginBottom: 4,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: '#6B7280',
  },
  playButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  quoteCard: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  quoteHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  quoteGuideTag: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  quoteBodyText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    fontStyle: 'italic',
    color: '#374151',
    lineHeight: 22,
  },
  emergencyBlockWrapper: {
    marginTop: 4,
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
    marginTop: 10,
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});
