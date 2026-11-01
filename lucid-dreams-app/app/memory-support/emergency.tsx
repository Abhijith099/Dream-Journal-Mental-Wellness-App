import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Platform,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Phone,
  Shield,
  Info,
  ChevronRight,
  User as UserIcon,
} from 'lucide-react-native';
import { useSanctuary, SanctuaryContactItem } from '../../context/SanctuaryContext';
import { Fonts } from '@/constants/theme';

export default function EmergencyContactsScreen() {
  const router = useRouter();
  const {
    emergencyContacts,
    selectedEmergencyContact,
    setSelectedEmergencyContact,
    logEvent,
    logCallInitiated,
  } = useSanctuary();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const defaultContact = emergencyContacts[0] || null;

  const [activeContact, setActiveContact] = useState<SanctuaryContactItem | null>(
    selectedEmergencyContact || defaultContact
  );
  const [showDialGuard, setShowDialGuard] = useState<boolean>(!!(selectedEmergencyContact || defaultContact));
  const [isCalling, setIsCalling] = useState<boolean>(false);

  useEffect(() => {
    if (!activeContact && emergencyContacts.length > 0) {
      const initial = selectedEmergencyContact || emergencyContacts[0];
      setActiveContact(initial);
      setShowDialGuard(true);
    }
  }, [emergencyContacts, selectedEmergencyContact, activeContact]);

  useEffect(() => {
    logEvent('sanctuary_emergency_directory_view');
  }, [logEvent]);

  const handleSelectContact = (contact: SanctuaryContactItem) => {
    setActiveContact(contact);
    setSelectedEmergencyContact(contact);
    setShowDialGuard(true);
  };

  const handleConfirmCall = async () => {
    if (isCalling || !activeContact) return;
    setIsCalling(true);

    const phoneToCall = activeContact.phoneNumber || '';
    logCallInitiated(activeContact.contactId, 'Screen4_DialGuard');

    try {
      const url = `tel:${phoneToCall.replace(/\s+/g, '')}`;
      const supported = await Linking.canOpenURL(url).catch(() => true);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Phone Call', `Directing call to ${activeContact.name} at ${activeContact.maskedPhone || phoneToCall}`);
      }
    } catch (err) {
      console.warn('Call intent error:', err);
      Alert.alert('Calling Contact', `Initiating voice call to ${activeContact.name} (${activeContact.maskedPhone || phoneToCall})`);
    }

    setTimeout(() => {
      setIsCalling(false);
    }, 5000);
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

        {/* Center: Quiet Release */}
        <Text style={styles.headerCenterTitle}>Quiet Release</Text>

        {/* Right: Purple Sanctuary Escape Button */}
        <TouchableOpacity
          style={styles.sanctuaryTopButton}
          onPress={() => router.replace('/memory-support' as any)}
          activeOpacity={0.8}
          accessibilityLabel="Sanctuary"
          accessibilityRole="button"
        >
          <Text style={styles.sanctuaryTopButtonText}>Sanctuary</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.mainCardContainer, !isMobile && styles.desktopContainer]}>
          {/* Section Tag */}
          <View style={styles.tagRow}>
            <View style={styles.purpleDot} />
            <Text style={styles.tagText}>COMPASSIONATE SUPPORT</Text>
          </View>

          {/* Heading */}
          <Text style={styles.screenTitle}>Who would you like to contact?</Text>
          <Text style={styles.screenSubtitle}>
            We will connect you with someone who can help right away.
          </Text>

          {/* Contacts Directory */}
          {emergencyContacts.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 16, marginVertical: 12 }}>
              <Shield size={32} color="#9CA3AF" strokeWidth={1.5} style={{ marginBottom: 8 }} />
              <Text style={{ fontSize: 16, fontFamily: Fonts.semiBold, color: '#374151', textAlign: 'center', marginBottom: 4 }}>
                No emergency contacts yet
              </Text>
              <Text style={{ fontSize: 14, fontFamily: Fonts.regular, color: '#6B7280', textAlign: 'center' }}>
                Add your primary emergency contact through your care team to enable 1-tap support.
              </Text>
            </View>
          ) : (
            <View style={styles.contactsList}>
              {emergencyContacts.map((contact) => {
                const isSelected = activeContact?.contactId === contact.contactId;
                const isCaregiverService = !contact.photoUrl;

                return (
                  <TouchableOpacity
                    key={contact.contactId || contact.name}
                    style={[styles.contactCard, isSelected && styles.contactCardSelected]}
                    onPress={() => handleSelectContact(contact)}
                    activeOpacity={0.8}
                    accessibilityLabel={`Select ${contact.name}`}
                    accessibilityRole="button"
                  >
                    {/* Left Avatar / Icon */}
                    {contact.photoUrl ? (
                      <View style={styles.avatarWrapper}>
                        <Image source={{ uri: contact.photoUrl }} style={styles.avatarImage} />
                      </View>
                    ) : (
                      <View style={styles.caregiverIconBox}>
                        <Shield size={20} color="#7C3AED" strokeWidth={1.8} />
                      </View>
                    )}

                    {/* Center Details */}
                    <View style={styles.contactDetails}>
                      <View style={styles.nameRow}>
                        <Text style={styles.contactName}>{contact.name}</Text>
                        {contact.relationshipTag ? (
                          <View style={styles.relTagBadge}>
                            <Text style={styles.relTagBadgeText}>{contact.relationshipTag}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.roleLabelText}>
                        {contact.roleLabel || 'Family Emergency Contact'}
                      </Text>
                    </View>

                    {/* Right Action */}
                    {contact.photoUrl ? (
                      <View style={styles.phoneIconCircle}>
                        <Phone size={14} color="#7C3AED" strokeWidth={2} />
                      </View>
                    ) : (
                      <ChevronRight size={18} color="#9CA3AF" strokeWidth={2} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Not Now Link */}
          <TouchableOpacity
            style={styles.notNowButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityLabel="Not now"
            accessibilityRole="button"
          >
            <Text style={styles.notNowText}>Not now</Text>
          </TouchableOpacity>

          {/* Step 2 of 2: DIAL GUARD ACTIVE Safeguard Card */}
          {showDialGuard && activeContact ? (
            <View style={styles.dialGuardCard}>
              {/* Header Tag Row */}
              <View style={styles.dialGuardHeaderRow}>
                <View style={styles.dialGuardTagLeft}>
                  <Shield size={14} color="#1F2937" strokeWidth={2} style={{ marginRight: 6 }} />
                  <Text style={styles.dialGuardTagTitle}>DIAL GUARD ACTIVE</Text>
                </View>
                <Text style={styles.dialGuardStepIndicator}>Step 2 of 2</Text>
              </View>

              {/* Title Question */}
              <Text style={styles.dialGuardQuestion}>Call {activeContact.name} now?</Text>

              {/* Information Notice Box */}
              <View style={styles.infoNoticeBox}>
                <Info size={16} color="#7C3AED" strokeWidth={2} style={{ marginRight: 8, marginTop: 1 }} />
                <Text style={styles.infoNoticeText}>
                  This will place a direct voice call to {activeContact.name}'s mobile phone ({activeContact.maskedPhone || '+1 555-234-5678'}).
                </Text>
              </View>

              {/* Primary Call Action */}
              <TouchableOpacity
                style={[styles.callConfirmButton, isCalling && styles.callConfirmButtonDisabled]}
                onPress={handleConfirmCall}
                disabled={isCalling}
                activeOpacity={0.85}
                accessibilityLabel={`Call ${activeContact.name}`}
                accessibilityRole="button"
              >
                <Phone size={18} color="#FFFFFF" strokeWidth={2} style={{ marginRight: 10 }} />
                <Text style={styles.callConfirmButtonText}>
                  {isCalling ? 'Connecting call...' : `Call ${activeContact.name}`}
                </Text>
              </TouchableOpacity>

              {/* Secondary Cancel Action */}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowDialGuard(false)}
                activeOpacity={0.8}
                accessibilityLabel="Cancel call"
                accessibilityRole="button"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              {/* Footer Reassurance Notice */}
              <View style={styles.dialGuardFooterNotice}>
                <Shield size={12} color="#6B7280" strokeWidth={1.8} style={{ marginRight: 6 }} />
                <Text style={styles.dialGuardFooterText}>
                  Two-step confirmation protects against accidental taps and tremor misdials.
                </Text>
              </View>
            </View>
          ) : null}
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
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: '#111827',
  },
  sanctuaryTopButton: {
    backgroundColor: '#6D28D9',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  sanctuaryTopButtonText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: '#FFFFFF',
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
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  purpleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6D28D9',
    marginRight: 6,
  },
  tagText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: '#6D28D9',
    letterSpacing: 0.8,
  },
  screenTitle: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: '#111827',
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 20,
  },
  contactsList: {
    gap: 10,
    marginBottom: 16,
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
  contactCardSelected: {
    borderColor: '#C4B5FD',
    backgroundColor: '#FAF5FF',
  },
  avatarWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#F3E8FF',
    marginRight: 14,
  },
  avatarImage: {
    width: 44,
    height: 44,
  },
  caregiverIconBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
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
  relTagBadge: {
    backgroundColor: '#F3E8FF',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  relTagBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.semiBold,
    color: '#6B21A8',
  },
  roleLabelText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: '#6B7280',
  },
  phoneIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notNowButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  notNowText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: '#4B5563',
  },
  dialGuardCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
      },
      default: {
        elevation: 3,
        shadowColor: '#000000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 6,
      },
    }),
  },
  dialGuardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dialGuardTagLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dialGuardTagTitle: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: '#1F2937',
    letterSpacing: 0.5,
  },
  dialGuardStepIndicator: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: '#6B7280',
  },
  dialGuardQuestion: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: '#111827',
    marginBottom: 12,
  },
  infoNoticeBox: {
    flexDirection: 'row',
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 6,
    padding: 12,
    marginBottom: 18,
  },
  infoNoticeText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: '#4B5563',
    lineHeight: 19,
  },
  callConfirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  callConfirmButtonDisabled: {
    opacity: 0.6,
  },
  callConfirmButtonText: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: '#FFFFFF',
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  cancelButtonText: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: '#374151',
  },
  dialGuardFooterNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialGuardFooterText: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
  },
});
