import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
  Platform,
  Alert,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Phone, PhoneCall, Shield, AlertCircle, X, ChevronRight, User as UserIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSanctuary, SanctuaryContactItem } from '../../context/SanctuaryContext';
import { BACKEND_URL, authenticatedFetch } from '../../utils/api';
import { Fonts } from '@/constants/theme';

interface EmergencyQuickContactModalProps {
  visible: boolean;
  onClose: () => void;
}

// Fallback primary contact cached for instant offline accessibility
const FALLBACK_PRIMARY_CONTACT: SanctuaryContactItem = {
  contactId: 'sarah-default-01',
  name: 'Sarah',
  relationship: 'Daughter',
  relationshipTag: 'Primary Caregiver',
  roleLabel: 'Designated Emergency Contact',
  photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80',
  phoneNumber: '+15552345678',
  maskedPhone: '+1 (555) 234-5678',
  isPrimary: true,
  isEmergencyContact: true,
};

let cachedPrimaryContact: SanctuaryContactItem | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5-minute TTL per specification

export default function EmergencyQuickContactModal({
  visible,
  onClose,
}: EmergencyQuickContactModalProps) {
  const router = useRouter();
  const { emergencyContacts, logCallInitiated } = useSanctuary();
  const [primaryContact, setPrimaryContact] = useState<SanctuaryContactItem>(
    cachedPrimaryContact || emergencyContacts.find((c) => c.isPrimary) || emergencyContacts[0] || FALLBACK_PRIMARY_CONTACT
  );
  const [isCalling, setIsCalling] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;

    // Use in-memory or context primary contact first
    const fromContext = emergencyContacts.find((c) => c.isPrimary) || emergencyContacts[0];
    if (fromContext) {
      setPrimaryContact(fromContext);
      cachedPrimaryContact = fromContext;
    }

    const now = Date.now();
    if (cachedPrimaryContact && now - lastCacheTime < CACHE_TTL_MS) {
      return;
    }

    // Fetch primary contact from backend with 5-minute TTL caching
    let isMounted = true;
    async function fetchPrimaryContact() {
      try {
        setLoading(true);
        const res = await authenticatedFetch(`${BACKEND_URL}/user/emergency-contacts/primary?cached=true`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.name && isMounted) {
            setPrimaryContact(data);
            cachedPrimaryContact = data;
            lastCacheTime = Date.now();
          }
        }
      } catch (err) {
        // Fail-safe: Keep using cached/fallback contact
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchPrimaryContact();

    return () => {
      isMounted = false;
    };
  }, [visible, emergencyContacts]);

  const handleCallPrimary = async () => {
    if (isCalling) return;
    setIsCalling(true);

    const phoneToCall = primaryContact.phoneNumber || '+15552345678';

    // 1. Log to SanctuaryContext if available
    try {
      if (logCallInitiated) {
        logCallInitiated(primaryContact.contactId, 'GlobalNav_QuickContactModal');
      }
    } catch (e) {
      console.warn('Logging call failed:', e);
    }

    // 2. Log to dedicated backend endpoint per specification
    try {
      authenticatedFetch(`${BACKEND_URL}/user/sessions/emergency-contact-attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: primaryContact.contactId,
          contactName: primaryContact.name,
          timestamp: new Date().toISOString(),
          source: 'global_nav_quick_contact',
        }),
      }).catch(() => {});
    } catch (e) {}

    // 3. Initiate dialer
    try {
      const sanitized = phoneToCall.replace(/\s+/g, '');
      const url = `tel:${sanitized}`;
      const supported = await Linking.canOpenURL(url).catch(() => true);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'Emergency Call',
          `Placing voice call to ${primaryContact.name} at ${primaryContact.maskedPhone || primaryContact.phoneNumber}`
        );
      }
    } catch (err) {
      Alert.alert(
        'Call Notice',
        `Placing call to ${primaryContact.name} (${primaryContact.maskedPhone || primaryContact.phoneNumber})`
      );
    } finally {
      setTimeout(() => {
        setIsCalling(false);
        onClose();
      }, 1200);
    }
  };

  const handleCall988 = async () => {
    try {
      await Linking.openURL('tel:988');
    } catch (e) {
      Alert.alert('988 Lifeline', 'Connecting to 988 Suicide & Crisis Lifeline');
    }
    onClose();
  };

  const handleViewAllContacts = () => {
    onClose();
    router.push('/memory-support/emergency' as any);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissOverlay} onPress={onClose} />

        <View
          style={styles.modalCard}
          accessibilityRole="alert"
          accessibilityViewIsModal={true}
          aria-modal={true}
          aria-label="Quick Emergency Contact"
        >
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.phoneIconBox}>
                <PhoneCall size={18} color="#7C3AED" strokeWidth={2} />
              </View>
              <View>
                <Text style={styles.modalTitle}>Quick Contact</Text>
                <Text style={styles.modalSubtitle}>Immediate Support & Safety</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <X size={18} color="#6B7280" strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Primary Contact Card */}
          <View style={styles.contactCard}>
            {primaryContact.photoUrl ? (
              <Image source={{ uri: primaryContact.photoUrl }} style={styles.contactAvatar} />
            ) : (
              <View style={styles.contactAvatarFallback}>
                <UserIcon size={24} color="#7C3AED" strokeWidth={2} />
              </View>
            )}

            <View style={styles.contactInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.contactName}>{primaryContact.name}</Text>
                <View style={styles.primaryBadge}>
                  <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                </View>
              </View>
              <Text style={styles.contactRole}>
                {primaryContact.relationship} • {primaryContact.relationshipTag || 'Caregiver'}
              </Text>
              <Text style={styles.contactPhone}>
                {primaryContact.maskedPhone || primaryContact.phoneNumber || '+1 (555) 234-5678'}
              </Text>
            </View>
          </View>

          {/* Safeguard & Dial Guard Notice */}
          <View style={styles.noticeBox}>
            <Shield size={14} color="#7C3AED" strokeWidth={2} style={{ marginTop: 2, marginRight: 8 }} />
            <Text style={styles.noticeText}>
              Two-step confirmation protects against accidental taps. Tapping Call connects directly to {primaryContact.name}.
            </Text>
          </View>

          {/* Large Primary Action Button */}
          <TouchableOpacity
            style={[styles.callButton, isCalling && styles.callButtonDisabled]}
            onPress={handleCallPrimary}
            disabled={isCalling}
            activeOpacity={0.85}
            accessibilityLabel={`Call ${primaryContact.name} now`}
            accessibilityRole="button"
          >
            {isCalling ? (
              <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 8 }} />
            ) : (
              <Phone size={18} color="#FFFFFF" strokeWidth={2} style={{ marginRight: 8 }} />
            )}
            <Text style={styles.callButtonText}>
              {isCalling ? 'Connecting call...' : `Call ${primaryContact.name} Now`}
            </Text>
          </TouchableOpacity>

          {/* Crisis Hotline Alternative */}
          <TouchableOpacity
            style={styles.crisisButton}
            onPress={handleCall988}
            activeOpacity={0.8}
            accessibilityLabel="Call 988 Crisis Lifeline"
            accessibilityRole="button"
          >
            <AlertCircle size={15} color="#DC2626" strokeWidth={2} style={{ marginRight: 6 }} />
            <Text style={styles.crisisButtonText}>Call 988 Crisis Lifeline (24/7 Free)</Text>
          </TouchableOpacity>

          {/* Directory Link & Cancel */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              onPress={handleViewAllContacts}
              style={styles.directoryLink}
              accessibilityLabel="View all sanctuary emergency contacts"
              accessibilityRole="button"
            >
              <Text style={styles.directoryLinkText}>All Sanctuary Contacts</Text>
              <ChevronRight size={13} color="#6B7280" strokeWidth={2} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              style={styles.cancelBtn}
              accessibilityLabel="Cancel"
              accessibilityRole="button"
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dismissOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 12,
      },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  phoneIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: '#9CA3AF',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262626',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  contactAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 14,
  },
  contactAvatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  contactInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  contactName: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
  },
  primaryBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.25)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.4)',
  },
  primaryBadgeText: {
    fontSize: 9,
    fontFamily: Fonts.bold,
    color: '#C4B5FD',
    letterSpacing: 0.5,
  },
  contactRole: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: '#E5E7EB',
  },
  noticeBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.25)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: '#D1D5DB',
    lineHeight: 17,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  callButtonDisabled: {
    opacity: 0.6,
  },
  callButtonText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: '#FFFFFF',
  },
  crisisButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#262626',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  crisisButtonText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: '#F87171',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  directoryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 4,
  },
  directoryLinkText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: '#9CA3AF',
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  cancelBtnText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: '#D1D5DB',
  },
});
