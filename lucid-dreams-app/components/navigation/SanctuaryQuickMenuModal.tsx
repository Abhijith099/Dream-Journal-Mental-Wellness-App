import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Volume2, Users, Music, HeartHandshake, Compass, X } from 'lucide-react-native';
import { Fonts } from '@/constants/theme';

interface SanctuaryQuickMenuModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SanctuaryQuickMenuModal({
  visible,
  onClose,
}: SanctuaryQuickMenuModalProps) {
  const router = useRouter();

  const handleSelect = (route: string) => {
    onClose();
    router.push(route as any);
  };

  const options = [
    {
      title: 'Hear a familiar voice',
      subtitle: 'Recorded grounding audio notes',
      route: '/memory-support/voices',
      icon: Volume2,
      color: '#A78BFA',
    },
    {
      title: 'See familiar faces',
      subtitle: 'Photos and reassuring relations',
      route: '/memory-support/faces',
      icon: Users,
      color: '#A78BFA',
    },
    {
      title: 'Listen to music',
      subtitle: 'Comforting soothing frequencies',
      route: '/memory-support/music',
      icon: Music,
      color: '#A78BFA',
    },
    {
      title: 'I need someone',
      subtitle: 'Connect with designated companion',
      route: '/memory-support/emergency',
      icon: HeartHandshake,
      color: '#F87171',
    },
  ];

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
          style={styles.menuContainer}
          accessibilityRole="menu"
          aria-label="Sanctuary quick actions"
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.compassBox}>
                <Compass size={16} color="#C4B5FD" strokeWidth={2} />
              </View>
              <Text style={styles.menuTitle}>Sanctuary Quick Access</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close menu">
              <X size={16} color="#9CA3AF" strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Options Stack */}
          <View style={styles.optionsList}>
            {options.map((item) => {
              const IconComp = item.icon;
              return (
                <TouchableOpacity
                  key={item.route}
                  style={styles.optionRow}
                  onPress={() => handleSelect(item.route)}
                  activeOpacity={0.8}
                  accessibilityRole="menuitem"
                  accessibilityLabel={item.title}
                >
                  <View style={styles.iconCircle}>
                    <IconComp size={18} color={item.color} strokeWidth={2} />
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>{item.title}</Text>
                    <Text style={styles.optionSubtitle}>{item.subtitle}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Full Welcome Screen Link */}
          <TouchableOpacity
            style={styles.welcomeLink}
            onPress={() => handleSelect('/memory-support')}
            activeOpacity={0.7}
          >
            <Text style={styles.welcomeLinkText}>Open Sanctuary Welcome Screen</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 96, // Sits comfortably above navigation bar
    paddingHorizontal: 20,
  },
  dismissOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  menuContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 10,
      },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compassBox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  closeBtn: {
    padding: 4,
  },
  optionsList: {
    gap: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#262626',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    marginVertical: 3,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: '#F3F4F6',
  },
  optionSubtitle: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: '#9CA3AF',
    marginTop: 1,
  },
  welcomeLink: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 8,
  },
  welcomeLinkText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: '#C4B5FD',
  },
});
