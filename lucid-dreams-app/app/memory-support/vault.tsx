import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { useRouter } from 'expo-router';
import { useSundown } from '../../context/SundownContext';
import { useMemorySupport, MemoryItem } from '../../context/MemorySupportContext';
import { BACKEND_URL, authenticatedFetch } from '../../utils/api';
import {
  Plus,
  Trash2,
  X,
  Play,
  Square,
  Archive,
  Volume2,
  Images,
  ArrowLeft,
  ChevronLeft,
  Sparkles,
  Calendar,
  Radio,
} from 'lucide-react-native';
import { Fonts } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MemoryVaultScreen() {
  const router = useRouter();
  const { theme } = useSundown();
  const { vaultRefreshKey, triggerVaultRefresh } = useMemorySupport();

  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Audio Playback State
  const [activeSound, setActiveSound] = useState<Audio.Sound | null>(null);
  const [playingMemoryId, setPlayingMemoryId] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);

  // Add Memory Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [audioUrlInput, setAudioUrlInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Detail Modal State
  const [selectedMemory, setSelectedMemory] = useState<MemoryItem | null>(null);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (activeSound) {
        activeSound.unloadAsync().catch(() => {});
      }
    };
  }, [activeSound]);

  const stopAudio = async () => {
    if (activeSound) {
      try {
        await activeSound.stopAsync();
        await activeSound.unloadAsync();
      } catch (e) {
        console.warn('Error stopping audio:', e);
      }
      setActiveSound(null);
      setPlayingMemoryId(null);
    }
  };

  // Fetch memories from API
  const fetchMemories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authenticatedFetch(`${BACKEND_URL}/memory-support/vault`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setMemories(data);
        }
      }
    } catch (err) {
      console.error('Error fetching vault:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories, vaultRefreshKey]);

  // Play / Stop Audio Handler
  const handleToggleAudio = async (item: MemoryItem) => {
    if (!item.audioUrl) {
      Alert.alert('No Voice Note', 'No audio recording is attached to this memory.');
      return;
    }

    if (playingMemoryId === item._id && activeSound) {
      await stopAudio();
      return;
    }

    try {
      setAudioLoading(true);
      if (activeSound) {
        await activeSound.unloadAsync().catch(() => {});
        setActiveSound(null);
      }

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: item.audioUrl },
        { shouldPlay: true },
        (status: AVPlaybackStatus) => {
          if (!status.isLoaded) {
            setPlayingMemoryId(null);
          } else if (status.didJustFinish) {
            setPlayingMemoryId(null);
            sound.unloadAsync().catch(() => {});
            setActiveSound(null);
          }
        }
      );

      setActiveSound(sound);
      setPlayingMemoryId(item._id);
    } catch (err) {
      console.error('Failed to play audio:', err);
      Alert.alert('Playback Notice', 'Could not stream audio track.');
      setPlayingMemoryId(null);
    } finally {
      setAudioLoading(false);
    }
  };

  // Add Memory Handler
  const handleAddMemory = async () => {
    const photo = imageUrlInput.trim() || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80';
    const audio = audioUrlInput.trim() || 'https://actions.google.com/sounds/v1/ambiences/outdoor_ambience.ogg';

    try {
      setSaving(true);
      const res = await authenticatedFetch(`${BACKEND_URL}/memory-support/vault`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: titleInput.trim() || 'Cherished Memory',
          description: descInput.trim(),
          photoUrl: photo,
          imageUrl: photo,
          audioUrl: audio,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setMemories((prev) => [created, ...prev]);
        setTitleInput('');
        setDescInput('');
        setImageUrlInput('');
        setAudioUrlInput('');
        setModalVisible(false);
      } else {
        Alert.alert('Error', 'Failed to save memory.');
      }
    } catch (err) {
      console.error('Error adding memory:', err);
      Alert.alert('Error', 'Unable to add memory.');
    } finally {
      setSaving(false);
    }
  };

  // Delete Memory Handler
  const handleDeleteMemory = async (id: string, title: string) => {
    Alert.alert('Remove Memory', `Are you sure you want to remove "${title}" from your vault?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await authenticatedFetch(`${BACKEND_URL}/memory-support/vault/${id}`, {
              method: 'DELETE',
            });
            if (res.ok) {
              setMemories((prev) => prev.filter((m) => m._id !== id));
              if (playingMemoryId === id) {
                await stopAudio();
              }
              if (selectedMemory?._id === id) {
                setSelectedMemory(null);
              }
            }
          } catch (err) {
            console.error('Error deleting memory:', err);
          }
        },
      },
    ]);
  };

  // Render individual memory card in 2-column grid
  const renderMemoryCard = ({ item }: { item: MemoryItem }) => {
    const isThisPlaying = playingMemoryId === item._id;
    const photo = item.photoUrl || item.imageUrl || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80';

    return (
      <View style={styles.gridCard}>
        {/* Cover Photo */}
        <View style={styles.cardImageWrap}>
          <Image source={{ uri: photo }} style={styles.cardImage} contentFit="cover" transition={300} />
          {item.audioUrl ? (
            <View style={styles.audioBadge}>
              <Volume2 size={11} color="#FFFFFF" strokeWidth={1.5} />
              <Text style={styles.audioBadgeText}>AUDIO ATTACHED</Text>
            </View>
          ) : null}
        </View>

        {/* Card Body */}
        <View style={styles.cardBody}>
          <View style={styles.cardTagRow}>
            <Archive size={13} color="#6B4FBB" strokeWidth={1.5} />
            <Text style={styles.cardTagText}>MEMORY</Text>
          </View>

          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title || 'Cherished Memory'}
          </Text>

          {item.description ? (
            <Text style={styles.cardDesc} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          {/* Bottom Actions */}
          <View style={styles.cardFooter}>
            {item.audioUrl ? (
              <TouchableOpacity
                style={[styles.audioPlayBtn, isThisPlaying && styles.audioPlayBtnActive]}
                onPress={() => handleToggleAudio(item)}
                activeOpacity={0.8}
                accessibilityLabel={isThisPlaying ? 'Stop Audio' : 'Play Audio'}
              >
                {isThisPlaying ? (
                  <>
                    <Square size={13} color="#FFFFFF" fill="#FFFFFF" strokeWidth={1.5} style={{ marginRight: 8 }} />
                    <Text style={styles.audioPlayBtnTextActive}>Pause Voice</Text>
                  </>
                ) : (
                  <>
                    <Play size={13} color="#5B4B9E" fill="#5B4B9E" strokeWidth={1.5} style={{ marginRight: 8 }} />
                    <Text style={styles.audioPlayBtnText}>Listen Voice</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={{ flex: 1 }} />
            )}

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDeleteMemory(item._id, item.title)}
              activeOpacity={0.7}
              accessibilityLabel="Remove memory"
            >
              <Trash2 size={16} color="#8A829A" strokeWidth={1.5} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
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
          onPress={() => router.replace('/memory-support')}
          activeOpacity={0.8}
        >
          <Sparkles size={13} color="#6D28D9" strokeWidth={2} style={{ marginRight: 4 }} />
          <Text style={styles.sanctuaryBadgeText}>Sanctuary</Text>
        </TouchableOpacity>
      </View>

      {/* Header Row (Matching Screenshot 3) */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.pageTitle}>Memory Vault</Text>
          <Text style={styles.pageSubtitle}>Cherished moments and familiar voices</Text>
        </View>

        <TouchableOpacity
          style={styles.addVaultBtn}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.85}
          accessibilityLabel="Add Memory"
          accessibilityRole="button"
        >
          <Plus size={16} color="#FFFFFF" strokeWidth={1.5} style={{ marginRight: 8 }} />
          <Text style={styles.addVaultBtnText}>Add Memory</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#5B4B9E" />
        </View>
      ) : memories.length === 0 ? (
        /* Empty State Card (Exact Match to Screenshot 3) */
        <ScrollView contentContainerStyle={styles.emptyScrollContent}>
          <View style={styles.emptyCard}>
            {/* Centered Large Circular Icon Container */}
            <View style={styles.emptyCircleIcon}>
              <Images size={40} color="#5B4B9E" strokeWidth={1.5} />
            </View>

            {/* Empty State Title */}
            <Text style={styles.emptyTitle}>No Memories Recorded</Text>

            {/* Empty State Subtitle */}
            <Text style={styles.emptySubtitle}>
              Tap "Add Memory" above to store photos paired with comforting audio voice recordings. This space is designed to be your visual sanctuary.
            </Text>
          </View>
        </ScrollView>
      ) : (
        /* Populated 2-Column Grid */
        <FlatList
          data={memories}
          keyExtractor={(item) => item._id}
          renderItem={renderMemoryCard}
          numColumns={2}
          columnWrapperStyle={styles.gridColumnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={() => {
            setRefreshing(true);
            fetchMemories();
          }}
          refreshing={refreshing}
        />
      )}

      {/* Add Memory Modal */}
      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Plus size={18} color="#5B4B9E" strokeWidth={1.5} />
                <Text style={styles.modalTitle}>Add Cherished Memory</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color="#7C758F" strokeWidth={1.5} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Memory Title</Text>
                <TextInput
                  style={styles.textInput}
                  value={titleInput}
                  onChangeText={setTitleInput}
                  placeholder="e.g. Morning in the Garden"
                  placeholderTextColor="#A49CB5"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description / Notes</Text>
                <TextInput
                  style={styles.textArea}
                  value={descInput}
                  onChangeText={setDescInput}
                  placeholder="Describe this cherished moment..."
                  placeholderTextColor="#A49CB5"
                  multiline={true}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Photo URL</Text>
                <TextInput
                  style={styles.textInput}
                  value={imageUrlInput}
                  onChangeText={setImageUrlInput}
                  placeholder="https://example.com/photo.jpg"
                  placeholderTextColor="#A49CB5"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Audio URL (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={audioUrlInput}
                  onChangeText={setAudioUrlInput}
                  placeholder="https://example.com/audio.mp3"
                  placeholderTextColor="#A49CB5"
                  autoCapitalize="none"
                />
              </View>

              {/* Sample Presets */}
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.presetLabel}>Quick Presets:</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                  <TouchableOpacity
                    style={styles.presetBtn}
                    onPress={() => {
                      setTitleInput('Morning Walk');
                      setDescInput('Gentle walk surrounded by morning dew and blooming flowers.');
                      setImageUrlInput('https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80');
                      setAudioUrlInput('https://actions.google.com/sounds/v1/water/rain_heavy.ogg');
                    }}
                  >
                    <Text style={styles.presetBtnText}>Garden Preset</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.presetBtn}
                    onPress={() => {
                      setTitleInput('Lakeside Sunset');
                      setDescInput('Peaceful orange hues reflecting across calm waters.');
                      setImageUrlInput('https://images.unsplash.com/photo-1439853949127-fa647821eba0?auto=format&fit=crop&w=800&q=80');
                      setAudioUrlInput('https://actions.google.com/sounds/v1/water/gentle_stream.ogg');
                    }}
                  >
                    <Text style={styles.presetBtnText}>Lakeside Preset</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleAddMemory}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Save to Memory Vault</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8FC',
  },
  topHeaderBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FAF8FC',
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 36,
    paddingTop: 32,
    paddingBottom: 24,
  },
  pageTitle: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    color: '#2D234A',
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: '#6B4FBB',
    marginTop: 4,
  },
  addVaultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5B4B9E',
    height: 40,
    borderRadius: 999,
    paddingHorizontal: 20,
    shadowColor: '#5B4B9E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  addVaultBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  // Empty State Matching Screenshot 3
  emptyScrollContent: {
    paddingHorizontal: 36,
    paddingTop: 16,
    paddingBottom: 60,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 64,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0EAF8',
    shadowColor: '#6B4FBB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  emptyCircleIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8DEFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: '#2D234A',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: '#7C758F',
    textAlign: 'center',
    maxWidth: 380,
    lineHeight: 22,
  },
  // 2-Column Grid
  listContent: {
    paddingHorizontal: 36,
    paddingBottom: 60,
  },
  gridColumnWrapper: {
    gap: 20,
    marginBottom: 20,
  },
  gridCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0EAF8',
    overflow: 'hidden',
    shadowColor: '#6B4FBB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardImageWrap: {
    width: '100%',
    height: 200,
    backgroundColor: '#EBE5F7',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  audioBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(45, 35, 74, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  audioBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: Fonts.bold,
    letterSpacing: 0.6,
  },
  cardBody: {
    padding: 18,
  },
  cardTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardTagText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: '#6B4FBB',
    letterSpacing: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: Fonts.bold,
    color: '#2D234A',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: '#7C758F',
    lineHeight: 18,
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F5F0FC',
    paddingTop: 12,
  },
  audioPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE8FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  audioPlayBtnActive: {
    backgroundColor: '#5B4B9E',
  },
  audioPlayBtnText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: '#5B4B9E',
  },
  audioPlayBtnTextActive: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
  },
  deleteBtn: {
    padding: 6,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(38, 28, 62, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EAF8',
  },
  modalTitle: {
    fontSize: 19,
    fontFamily: Fonts.bold,
    color: '#2D234A',
  },
  closeBtn: {
    padding: 6,
  },
  modalBody: {
    paddingTop: 16,
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: '#2D234A',
    marginBottom: 6,
  },
  textInput: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2DAF0',
    backgroundColor: '#FAF8FD',
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: '#2D234A',
  },
  textArea: {
    minHeight: 70,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2DAF0',
    backgroundColor: '#FAF8FD',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: '#2D234A',
    textAlignVertical: 'top',
  },
  presetLabel: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: '#8A829A',
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3EEFC',
    alignItems: 'center',
  },
  presetBtnText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: '#5B4B9E',
  },
  modalSaveBtn: {
    backgroundColor: '#5B4B9E',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#5B4B9E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  modalSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
});
