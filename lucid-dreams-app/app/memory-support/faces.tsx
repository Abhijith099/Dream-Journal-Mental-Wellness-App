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
  TextInput,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Sparkles,
  HeartHandshake,
  Plus,
  X,
  Phone,
  Volume2,
  User as UserIcon,
} from 'lucide-react-native';
import { useSanctuary, SanctuaryContactItem } from '../../context/SanctuaryContext';
import { Fonts } from '@/constants/theme';
import { BACKEND_URL, authenticatedFetch } from '../../utils/api';

export default function FamiliarFacesScreen() {
  const router = useRouter();
  const {
    facesContacts,
    setSelectedContact,
    setSelectedEmergencyContact,
    logEvent,
    refreshSanctuary,
  } = useSanctuary();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [selectedFace, setSelectedFace] = useState<SanctuaryContactItem | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false);
  const [addModalVisible, setAddModalVisible] = useState<boolean>(false);

  // Form states
  const [nameInput, setNameInput] = useState('');
  const [relInput, setRelInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [photoInput, setPhotoInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    logEvent('sanctuary_faces_directory_view');
  }, [logEvent]);

  const handleCardPress = (contact: SanctuaryContactItem) => {
    setSelectedFace(contact);
    setDetailModalVisible(true);
  };

  const handleQuickCall = (contact: SanctuaryContactItem) => {
    setDetailModalVisible(false);
    setSelectedEmergencyContact(contact);
    router.push('/memory-support/emergency' as any);
  };

  const handlePlayVoice = (contact: SanctuaryContactItem) => {
    setDetailModalVisible(false);
    setSelectedContact(contact);
    router.push('/memory-support/presence' as any);
  };

  const handleSavePerson = async () => {
    if (!nameInput.trim()) {
      Alert.alert('Required', 'Please enter a name.');
      return;
    }

    setSaving(true);
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/memory-support/familiar-faces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameInput.trim(),
          relationship: relInput.trim() || 'Loved One',
          description: noteInput.trim(),
          photoUrl: photoInput.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
        }),
      });

      if (res.ok) {
        setNameInput('');
        setRelInput('');
        setNoteInput('');
        setPhotoInput('');
        setAddModalVisible(false);
        await refreshSanctuary();
      } else {
        Alert.alert('Error', 'Could not save person.');
      }
    } catch (e) {
      console.warn('Error saving familiar face:', e);
      Alert.alert('Error', 'Network error while adding person.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header Bar */}
      <View style={styles.topHeaderBar}>
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

        <Text style={styles.headerCenterTitle}>Sanctuary Grounding Arrival</Text>

        <TouchableOpacity
          style={styles.sanctuaryBadge}
          onPress={() => router.replace('/memory-support' as any)}
          activeOpacity={0.8}
        >
          <Sparkles size={13} color="#6D28D9" strokeWidth={2} style={{ marginRight: 4 }} />
          <Text style={styles.sanctuaryBadgeText}>Sanctuary</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.mainCardContainer, !isMobile && styles.desktopContainer]}>
          {/* Header Block */}
          <View style={styles.headingBlock}>
            <View style={styles.headingRow}>
              <View>
                <Text style={styles.screenTitle}>Familiar faces</Text>
                <Text style={styles.screenSubtitle}>People who care about you.</Text>
              </View>
              <TouchableOpacity
                style={styles.addPersonIconBtn}
                onPress={() => setAddModalVisible(true)}
                activeOpacity={0.8}
                accessibilityLabel="Add Person"
                accessibilityRole="button"
              >
                <Plus size={16} color="#6D28D9" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>

          {/* 2-Column Photo Card Grid */}
          {facesContacts.length === 0 ? (
            <View style={{ padding: 28, alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 16, marginVertical: 12 }}>
              <UserIcon size={32} color="#9CA3AF" strokeWidth={1.5} style={{ marginBottom: 8 }} />
              <Text style={{ fontSize: 16, fontFamily: Fonts.semiBold, color: '#374151', textAlign: 'center', marginBottom: 4 }}>
                No familiar faces yet
              </Text>
              <Text style={{ fontSize: 14, fontFamily: Fonts.regular, color: '#6B7280', textAlign: 'center', marginBottom: 12 }}>
                Tap the '+' icon above to add photographs of your family, friends, and loved ones.
              </Text>
            </View>
          ) : (
            <View style={styles.facesGrid}>
              {facesContacts.map((contact) => (
                <TouchableOpacity
                  key={contact.contactId || contact.name}
                  style={styles.faceCard}
                  onPress={() => handleCardPress(contact)}
                  activeOpacity={0.8}
                  accessibilityLabel={`View ${contact.name}`}
                  accessibilityRole="button"
                >
                  <View style={styles.faceImageContainer}>
                    {contact.photoUrl ? (
                      <Image
                        source={{ uri: contact.photoUrl }}
                        style={styles.faceImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.fallbackIconBox}>
                        <UserIcon size={32} color="#7C3AED" strokeWidth={1.5} />
                      </View>
                    )}
                  </View>
                  <View style={styles.faceInfoBox}>
                    <Text style={styles.faceName} numberOfLines={1}>{contact.name}</Text>
                    <Text style={styles.faceRelation} numberOfLines={1}>{contact.relationship}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Emergency Bottom Action Button */}
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
              Instant direct connection to your designated emergency contact or care team.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Face Detail Modal */}
      {selectedFace ? (
        <Modal
          visible={detailModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setDetailModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setDetailModalVisible(false)}
                activeOpacity={0.7}
              >
                <X size={20} color="#6B7280" />
              </TouchableOpacity>

              <View style={styles.modalPhotoFrame}>
                {selectedFace.photoUrl ? (
                  <Image source={{ uri: selectedFace.photoUrl }} style={styles.modalPhotoImg} resizeMode="cover" />
                ) : (
                  <UserIcon size={56} color="#7C3AED" />
                )}
              </View>

              <Text style={styles.modalContactName}>{selectedFace.name}</Text>
              <Text style={styles.modalContactRel}>{selectedFace.relationship}</Text>

              {selectedFace.reassuranceNote ? (
                <View style={styles.modalNoteBox}>
                  <Text style={styles.modalNoteText}>“{selectedFace.reassuranceNote}”</Text>
                </View>
              ) : null}

              {/* Action Buttons */}
              <View style={styles.modalActionButtons}>
                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  onPress={() => handleQuickCall(selectedFace)}
                  activeOpacity={0.85}
                >
                  <Phone size={16} color="#FFFFFF" strokeWidth={2} style={{ marginRight: 8 }} />
                  <Text style={styles.modalPrimaryBtnText}>Call {selectedFace.name}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSecondaryBtn}
                  onPress={() => handlePlayVoice(selectedFace)}
                  activeOpacity={0.85}
                >
                  <Volume2 size={16} color="#111827" strokeWidth={2} style={{ marginRight: 8 }} />
                  <Text style={styles.modalSecondaryBtnText}>Hear Message</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      {/* Add Person Modal */}
      <Modal
        visible={addModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.addModalCard}>
            <View style={styles.addModalHeader}>
              <Text style={styles.addModalTitle}>Add Familiar Face</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Full Name</Text>
                <TextInput
                  style={styles.formInput}
                  value={nameInput}
                  onChangeText={setNameInput}
                  placeholder="e.g. Sarah"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Relationship</Text>
                <TextInput
                  style={styles.formInput}
                  value={relInput}
                  onChangeText={setRelInput}
                  placeholder="e.g. Your daughter"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Reassurance Note</Text>
                <TextInput
                  style={[styles.formInput, { height: 72 }]}
                  value={noteInput}
                  onChangeText={setNoteInput}
                  placeholder="A calming reminder or shared memory"
                  placeholderTextColor="#9CA3AF"
                  multiline={true}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Photo URL (Optional)</Text>
                <TextInput
                  style={styles.formInput}
                  value={photoInput}
                  onChangeText={setPhotoInput}
                  placeholder="https://images.unsplash.com/..."
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <TouchableOpacity
                style={styles.savePersonBtn}
                onPress={handleSavePerson}
                disabled={saving}
                activeOpacity={0.85}
              >
                <Text style={styles.savePersonBtnText}>
                  {saving ? 'Saving...' : 'Save Person to Sanctuary'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
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
  sanctuaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  sanctuaryBadgeText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    color: '#6D28D9',
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
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  },
  addPersonIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  facesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 28,
  },
  faceCard: {
    width: '47.8%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
    paddingBottom: 12,
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
  faceImageContainer: {
    width: '100%',
    height: 140,
    backgroundColor: '#EDE9FE',
  },
  faceImage: {
    width: '100%',
    height: '100%',
  },
  fallbackIconBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceInfoBox: {
    paddingHorizontal: 10,
    paddingTop: 10,
    alignItems: 'center',
  },
  faceName: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: '#111827',
    marginBottom: 2,
  },
  faceRelation: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: '#6B7280',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  modalPhotoFrame: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
    backgroundColor: '#EDE9FE',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#E9D5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPhotoImg: {
    width: '100%',
    height: '100%',
  },
  modalContactName: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: '#111827',
    marginBottom: 2,
  },
  modalContactRel: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: '#6B7280',
    marginBottom: 12,
  },
  modalNoteBox: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    marginBottom: 20,
  },
  modalNoteText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    fontStyle: 'italic',
    color: '#374151',
    lineHeight: 19,
    textAlign: 'center',
  },
  modalActionButtons: {
    width: '100%',
    gap: 10,
  },
  modalPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 14,
  },
  modalPrimaryBtnText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: '#FFFFFF',
  },
  modalSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 14,
  },
  modalSecondaryBtnText: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: '#111827',
  },
  addModalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  addModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  addModalTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: '#111827',
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: '#374151',
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  savePersonBtn: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 6,
  },
  savePersonBtnText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: '#FFFFFF',
  },
});
