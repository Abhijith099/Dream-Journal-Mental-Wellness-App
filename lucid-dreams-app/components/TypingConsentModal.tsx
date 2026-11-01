import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Activity, ShieldCheck } from 'lucide-react-native';
import { Fonts, Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { authenticatedFetch, BACKEND_URL } from '@/utils/api';

interface TypingConsentModalProps {
  visible: boolean;
  onClose: () => void;
  onPreferenceSet?: (enabled: boolean) => void;
}

export default function TypingConsentModal({
  visible,
  onClose,
  onPreferenceSet,
}: TypingConsentModalProps) {
  const { user, updateTypingDynamicsConsent } = useAuth();
  const [isEnabled, setIsEnabled] = useState(user?.typingDynamicsEnabled ?? false);
  const [saving, setSaving] = useState(false);

  const handleSave = async (enableChoice: boolean) => {
    setSaving(true);
    try {
      await authenticatedFetch(`${BACKEND_URL}/auth/typing-dynamics-consent`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: enableChoice }),
      });
      await updateTypingDynamicsConsent(enableChoice);
      onPreferenceSet?.(enableChoice);
      onClose();
    } catch (err) {
      console.error('Failed to save typing dynamics preference:', err);
      onPreferenceSet?.(enableChoice);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCardContainer}>
          <BlurView intensity={70} tint="light" style={styles.card}>
            {/* Header Icon */}
            <View style={styles.iconCircle}>
              <Activity size={28} strokeWidth={1.5} color="#6B4FBB" />
            </View>

            <Text style={styles.title}>Journaling Fluency</Text>
            <Text style={styles.subtitle}>Passive Typing Dynamics</Text>

            <Text style={styles.description}>
              We can optionally track how easily journaling comes to you over time
              (typing pace and pauses — nothing you type is analyzed this way).
              This stays completely private to your Insights tab.
            </Text>

            {/* Privacy Badge */}
            <View style={styles.privacyBadge}>
              <ShieldCheck size={16} strokeWidth={1.5} color="#4A6B82" />
              <Text style={styles.privacyBadgeText}>
                Opt-in only • Never shared • Zero keystroke content logged
              </Text>
            </View>

            {/* Toggle Row */}
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>Enable Fluency Tracking</Text>
                <Text style={styles.toggleSub}>Measures pace and pauses</Text>
              </View>
              <Switch
                value={isEnabled}
                onValueChange={setIsEnabled}
                trackColor={{ false: '#E4E2DC', true: '#8FA996' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Actions */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.saveBtn, isEnabled ? styles.saveBtnActive : styles.saveBtnNeutral]}
                onPress={() => handleSave(isEnabled)}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {isEnabled ? 'Enable & Continue' : 'Keep Disabled'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipBtn}
                onPress={() => handleSave(false)}
                disabled={saving}
                activeOpacity={0.7}
              >
                <Text style={styles.skipBtnText}>Maybe Later</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCardContainer: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  card: {
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    alignItems: 'center',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(107, 79, 187, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 20,
    color: '#2D2D2D',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: '#8A9A9D',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
    marginBottom: 14,
  },
  description: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: '#4A4A4A',
    textAlign: 'center',
    marginBottom: 16,
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDF3F7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
  },
  privacyBadgeText: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: '#4A6B82',
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 16,
    marginBottom: 20,
  },
  toggleLabel: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: '#2D2D2D',
  },
  toggleSub: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: '#8A9A9D',
    marginTop: 2,
  },
  actionsContainer: {
    width: '100%',
    gap: 10,
  },
  saveBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnActive: {
    backgroundColor: '#6B4FBB',
  },
  saveBtnNeutral: {
    backgroundColor: '#2D2D2D',
  },
  saveBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  skipBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  skipBtnText: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: '#8A9A9D',
  },
});
