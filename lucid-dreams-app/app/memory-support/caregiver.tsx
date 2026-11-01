import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  Modal,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  SlidersHorizontal,
  Clock,
  Shield,
  Plus,
  Link as LinkIcon,
  RotateCcw,
  Lock,
  User as UserIcon,
  Mic,
  MicOff,
  Volume2,
  Music,
  Radio,
  Phone,
  AlertTriangle,
  X,
  Users,
  CheckCircle,
  TrendingUp,
} from 'lucide-react-native';
import { Fonts } from '@/constants/theme';
import { BACKEND_URL, authenticatedFetch } from '../../utils/api';
import { useSanctuary } from '../../context/SanctuaryContext';

interface VoiceNoteItem {
  id: string;
  title: string;
  creatorName: string;
  relationship: string;
  recordingLabel: string;
  durationSeconds: number;
  isActive: boolean;
  isFlagged?: boolean;
  flagReason?: string;
}

interface PhotoItem {
  id: string;
  imageName: string;
  locationContext: string;
  imageUrl: string;
  isActive: boolean;
  isFlagged?: boolean;
}

interface MusicItem {
  id: string;
  trackTitle: string;
  artist: string;
  source: string;
  isActive: boolean;
}

interface InterventionLogItem {
  id: string;
  title: string;
  timestamp: string;
  badge: string;
  badgeType: 'calmer' | 'same' | 'resolved' | 'more_upset';
  summary: string;
}

export default function CaregiverDashboardScreen() {
  const router = useRouter();
  const { refreshSanctuary } = useSanctuary();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Active Top Tab
  const [activeTab, setActiveTab] = useState<'content' | 'history'>('content');
  const [loading, setLoading] = useState<boolean>(true);

  // Content Data
  const [voiceNotes, setVoiceNotes] = useState<VoiceNoteItem[]>([
    {
      id: 'voice-1',
      title: "Sarah's Grounding N...",
      creatorName: 'Sarah',
      relationship: 'Daughter',
      recordingLabel: '1m 42s audio • Sept 12',
      durationSeconds: 102,
      isActive: true,
      isFlagged: false,
    },
    {
      id: 'voice-2',
      title: "David's Morning Reassur...",
      creatorName: 'David',
      relationship: 'Son',
      recordingLabel: '2m 10s audio • Aug 28',
      durationSeconds: 130,
      isActive: true,
      isFlagged: false,
    },
    {
      id: 'voice-3',
      title: 'Dr. Evans Calm Breath...',
      creatorName: 'Dr. Evans',
      relationship: 'Clinician',
      recordingLabel: '3m 05s audio • Jul 04',
      durationSeconds: 185,
      isActive: false,
      isFlagged: true,
      flagReason: 'Paused • Agitation trigger flagged during Oct 2 episode',
    },
  ]);

  const [photographs, setPhotographs] = useState<PhotoItem[]>([
    {
      id: 'photo-1',
      imageName: 'Sarah & Grandkids',
      locationContext: 'Family Gathering • Living Room',
      imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80',
      isActive: true,
    },
    {
      id: 'photo-2',
      imageName: 'Family Garden in Summer',
      locationContext: 'Backyard • Peaceful Daylight',
      imageUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=600&q=80',
      isActive: true,
    },
    {
      id: 'photo-3',
      imageName: 'Golden Retriever Buster',
      locationContext: 'Companion Pet • Bedroom R...',
      imageUrl: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=600&q=80',
      isActive: true,
    },
  ]);

  const [musicTracks, setMusicTracks] = useState<MusicItem[]>([
    {
      id: 'music-1',
      trackTitle: 'Gentle Cello & Rain',
      artist: 'Spotify Linked • 432 Hz Tuned',
      source: 'spotify',
      isActive: true,
    },
    {
      id: 'music-2',
      trackTitle: 'Ambient Wind Chimes',
      artist: 'Local File • Seamless Loop',
      source: 'local_file',
      isActive: true,
    },
  ]);

  // Primary Contact State
  const [primaryContactName, setPrimaryContactName] = useState('Sarah Jenkins');
  const [primaryRelationship, setPrimaryRelationship] = useState('Daughter (Primary Caregiver)');
  const [primaryPhone, setPrimaryPhone] = useState('+1(555) 234-8901');
  const [directCallEnabled, setDirectCallEnabled] = useState(true);

  // Intervention History
  const [interventions, setInterventions] = useState<InterventionLogItem[]>([
    {
      id: 'sess-1',
      title: "Sarah's voice note",
      timestamp: 'Today, 11:20 AM',
      badge: 'Calmer',
      badgeType: 'calmer',
      summary: "Listened for 1 min 20 sec. Tapped 'Calmer' at check-in. Returned to Sanctuary without distress.",
    },
    {
      id: 'sess-2',
      title: 'Family garden in su...',
      timestamp: 'Yesterday, 4:45 PM',
      badge: 'Same',
      badgeType: 'same',
      summary: "Viewed gallery for 2 min 40 sec. Selected 'Same' state. No agitation escalation recorded.",
    },
    {
      id: 'sess-3',
      title: 'I need someone ca...',
      timestamp: 'Oct 2, 8:15 PM',
      badge: 'Resolved',
      badgeType: 'resolved',
      summary: 'User pressed primary support button. Call connected (4 mins duration). Evening anxiety calmed.',
    },
    {
      id: 'sess-4',
      title: "David's morning reas...",
      timestamp: 'Oct 1, 9:10 AM',
      badge: 'Calmer',
      badgeType: 'calmer',
      summary: "Full audio played. Tapped 'Calmer'. Rested peacefully for 30 minutes after.",
    },
  ]);

  // Modals state
  const [isAddVoiceModalOpen, setIsAddVoiceModalOpen] = useState(false);
  const [isAddPhotoModalOpen, setIsAddPhotoModalOpen] = useState(false);
  const [isLinkMusicModalOpen, setIsLinkMusicModalOpen] = useState(false);
  const [isEditContactModalOpen, setIsEditContactModalOpen] = useState(false);

  // Add form fields
  const [newVoiceName, setNewVoiceName] = useState('');
  const [newVoiceRelation, setNewVoiceRelation] = useState('');
  const [newVoiceDur, setNewVoiceDur] = useState('90');

  const [newPhotoName, setNewPhotoName] = useState('');
  const [newPhotoContext, setNewPhotoContext] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');

  const [newMusicTitle, setNewMusicTitle] = useState('');
  const [newMusicArtist, setNewMusicArtist] = useState('');

  // Fetch Caregiver Content
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authenticatedFetch(`${BACKEND_URL}/caregiver/content`);
      if (res.ok) {
        const data = await res.json();
        if (data.voiceNotes && data.voiceNotes.length > 0) {
          setVoiceNotes(data.voiceNotes);
        }
        if (data.photographs && data.photographs.length > 0) {
          setPhotographs(data.photographs);
        }
        if (data.musicTracks && data.musicTracks.length > 0) {
          setMusicTracks(data.musicTracks);
        }
        if (data.emergencySupport?.primaryContact) {
          setPrimaryContactName(data.emergencySupport.primaryContact.name);
          setPrimaryRelationship(data.emergencySupport.primaryContact.relationship);
          setPrimaryPhone(data.emergencySupport.primaryContact.maskedPhone || data.emergencySupport.primaryContact.phoneNumber);
          setDirectCallEnabled(data.emergencySupport.primaryContact.directCallEnabled !== false);
        }
      }

      // Load Sessions
      const sessRes = await authenticatedFetch(`${BACKEND_URL}/caregiver/sessions`);
      if (sessRes.ok) {
        const sessData = await sessRes.json();
        if (Array.isArray(sessData) && sessData.length > 0) {
          setInterventions(sessData);
        }
      }
    } catch (e) {
      console.warn('Error loading caregiver dashboard:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Toggle Content Active State
  const handleToggle = async (type: 'voice' | 'photo' | 'music', id: string, currentState: boolean) => {
    const newState = !currentState;

    // Optimistic UI update
    if (type === 'voice') {
      setVoiceNotes((prev) =>
        prev.map((v) => (v.id === id ? { ...v, isActive: newState } : v))
      );
    } else if (type === 'photo') {
      setPhotographs((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isActive: newState } : p))
      );
    } else if (type === 'music') {
      setMusicTracks((prev) =>
        prev.map((m) => (m.id === id ? { ...m, isActive: newState } : m))
      );
    }

    try {
      await authenticatedFetch(`${BACKEND_URL}/caregiver/${type}/${id}/active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newState }),
      });
      // Synchronize patient sanctuary views immediately
      refreshSanctuary();
    } catch (e) {
      console.warn('Toggle failed:', e);
      // Revert on error
      loadDashboardData();
    }
  };

  // Add Voice Note
  const handleSaveVoice = async () => {
    if (!newVoiceName.trim()) {
      Alert.alert('Required', 'Please enter creator name');
      return;
    }
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/caregiver/voice-recordings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator_name: newVoiceName.trim(),
          relationship: newVoiceRelation.trim() || 'Family Member',
          duration_seconds: parseInt(newVoiceDur) || 90,
          title: `${newVoiceName.trim()}'s Message`,
        }),
      });
      if (res.ok) {
        setIsAddVoiceModalOpen(false);
        setNewVoiceName('');
        setNewVoiceRelation('');
        loadDashboardData();
        refreshSanctuary();
      }
    } catch (e) {
      Alert.alert('Error', 'Unable to upload voice note');
    }
  };

  // Add Photograph
  const handleSavePhoto = async () => {
    if (!newPhotoName.trim()) {
      Alert.alert('Required', 'Please enter a photo title');
      return;
    }
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/caregiver/photographs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_name: newPhotoName.trim(),
          location_context: newPhotoContext.trim() || 'Family Memory • Sanctuary Space',
          image_url: newPhotoUrl.trim() || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=600&q=80',
        }),
      });
      if (res.ok) {
        setIsAddPhotoModalOpen(false);
        setNewPhotoName('');
        setNewPhotoContext('');
        setNewPhotoUrl('');
        loadDashboardData();
        refreshSanctuary();
      }
    } catch (e) {
      Alert.alert('Error', 'Unable to upload photograph');
    }
  };

  // Link Music Track
  const handleSaveMusic = async () => {
    if (!newMusicTitle.trim()) {
      Alert.alert('Required', 'Please enter track title');
      return;
    }
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/caregiver/music/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          track_title: newMusicTitle.trim(),
          artist: newMusicArtist.trim() || 'Spotify Linked • 432 Hz Tuned',
          source: 'spotify',
        }),
      });
      if (res.ok) {
        setIsLinkMusicModalOpen(false);
        setNewMusicTitle('');
        setNewMusicArtist('');
        loadDashboardData();
        refreshSanctuary();
      }
    } catch (e) {
      Alert.alert('Error', 'Unable to link track');
    }
  };

  // Update Primary Contact
  const handleSavePrimaryContact = async () => {
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/caregiver/emergency-contacts/primary`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: primaryContactName.trim(),
          relationship: primaryRelationship.trim(),
          phone_number: primaryPhone.trim(),
          direct_call_enabled: directCallEnabled,
        }),
      });
      if (res.ok) {
        setIsEditContactModalOpen(false);
        loadDashboardData();
        refreshSanctuary();
      }
    } catch (e) {
      Alert.alert('Error', 'Unable to update primary contact');
    }
  };

  const activeVoicesCount = voiceNotes.filter((v) => v.isActive).length;
  const activePhotosCount = photographs.filter((p) => p.isActive).length;
  const activeMusicCount = musicTracks.filter((m) => m.isActive).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header Bar */}
      <View style={styles.topHeaderBar}>
        <View style={styles.topHeaderLeft}>
          <View style={styles.caregiverTagRow}>
            <View style={styles.purpleDot} />
            <Text style={styles.caregiverTagText}>CAREGIVER MODE</Text>
          </View>
          <Text style={styles.headerMainTitle}>Patient History & Logs</Text>
        </View>

        <View style={styles.topHeaderRight}>
          <TouchableOpacity
            style={styles.lockBtn}
            onPress={() => router.replace('/memory-support' as any)}
            activeOpacity={0.7}
            accessibilityLabel="Lock Caregiver Mode"
          >
            <Lock size={16} color="#111827" strokeWidth={2} />
          </TouchableOpacity>
          <View style={styles.caregiverAvatar}>
            <UserIcon size={16} color="#FFFFFF" strokeWidth={2} />
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.mainCardContainer, !isMobile && styles.desktopContainer]}>
          {/* Segmented Tab Switcher */}
          <View style={styles.segmentedTabContainer}>
            <TouchableOpacity
              style={[styles.segmentBtn, activeTab === 'content' && styles.segmentBtnActive]}
              onPress={() => setActiveTab('content')}
              activeOpacity={0.8}
            >
              <SlidersHorizontal
                size={16}
                color={activeTab === 'content' ? '#111827' : '#6B7280'}
                strokeWidth={activeTab === 'content' ? 2 : 1.8}
                style={{ marginRight: 8 }}
              />
              <Text
                style={[
                  styles.segmentBtnText,
                  activeTab === 'content' && styles.segmentBtnTextActive,
                ]}
              >
                Manage Content
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentBtn, activeTab === 'history' && styles.segmentBtnActive]}
              onPress={() => setActiveTab('history')}
              activeOpacity={0.8}
            >
              <Clock
                size={16}
                color={activeTab === 'history' ? '#111827' : '#6B7280'}
                strokeWidth={activeTab === 'history' ? 2 : 1.8}
                style={{ marginRight: 8 }}
              />
              <Text
                style={[
                  styles.segmentBtnText,
                  activeTab === 'history' && styles.segmentBtnTextActive,
                ]}
              >
                Intervention History
              </Text>
            </TouchableOpacity>
          </View>

          {/* TAB 1: MANAGE CONTENT */}
          {activeTab === 'content' ? (
            <View style={styles.tabContent}>
              {/* Informational Banner: Live Content Routing */}
              <View style={styles.liveRoutingBanner}>
                <View style={styles.shieldIconBox}>
                  <Shield size={20} color="#7C3AED" strokeWidth={2} />
                </View>
                <View style={styles.routingBannerTextCol}>
                  <Text style={styles.routingBannerTitle}>Live Content Routing</Text>
                  <Text style={styles.routingBannerDesc}>
                    Manage media feeding into Sanctuary. Instantly disable any voice, face, or
                    sound that sparks acute agitation without deleting the recording.
                  </Text>
                </View>
              </View>

              {/* 1. Familiar Voices Section */}
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionTitleGroup}>
                    <Text style={styles.sectionHeading}>Familiar Voices</Text>
                    <View style={styles.activeCountBadge}>
                      <Text style={styles.activeCountBadgeText}>{activeVoicesCount} ACTIVE</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.addTextButton}
                    onPress={() => setIsAddVoiceModalOpen(true)}
                    activeOpacity={0.7}
                  >
                    <Plus size={14} color="#6D28D9" strokeWidth={2.5} style={{ marginRight: 4 }} />
                    <Text style={styles.addTextButtonLabel}>Add Voice Note</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.sectionSubtitle}>
                  Spoken soothing phrases played during elevated somatic alerts.
                </Text>

                <View style={styles.itemsList}>
                  {voiceNotes.map((item) => (
                    <View key={item.id} style={styles.listItemCard}>
                      <View style={styles.listItemRow}>
                        {/* Icon */}
                        <View
                          style={[
                            styles.itemIconBox,
                            !item.isActive && styles.itemIconBoxInactive,
                          ]}
                        >
                          {item.isActive ? (
                            <Volume2 size={20} color="#7C3AED" strokeWidth={1.8} />
                          ) : (
                            <MicOff size={20} color="#9CA3AF" strokeWidth={1.8} />
                          )}
                        </View>

                        {/* Title and Meta */}
                        <View style={styles.itemTextCol}>
                          <View style={styles.itemTitleRow}>
                            <Text style={styles.itemPrimaryTitle} numberOfLines={1}>
                              {item.title}
                            </Text>
                            <Text style={styles.itemDotRelation}> • {item.relationship}</Text>
                          </View>
                          <Text style={styles.itemMetaSubtitle}>{item.recordingLabel}</Text>
                        </View>

                        {/* Toggle Switch */}
                        <Switch
                          value={item.isActive}
                          onValueChange={() => handleToggle('voice', item.id, item.isActive)}
                          trackColor={{ false: '#D1D5DB', true: '#6D28D9' }}
                          thumbColor="#FFFFFF"
                          ios_backgroundColor="#D1D5DB"
                        />
                      </View>

                      {/* Flag Warning Banner (if flagged) */}
                      {item.isFlagged && item.flagReason ? (
                        <View style={styles.warningAlertBox}>
                          <AlertTriangle
                            size={14}
                            color="#991B1B"
                            strokeWidth={2}
                            style={{ marginRight: 8, marginTop: 1 }}
                          />
                          <Text style={styles.warningAlertText}>{item.flagReason}</Text>
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              </View>

              {/* 2. Familiar Faces Section */}
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionTitleGroup}>
                    <Text style={styles.sectionHeading}>Familiar Faces</Text>
                    <View style={styles.activeCountBadge}>
                      <Text style={styles.activeCountBadgeText}>{activePhotosCount} ACTIVE</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.addTextButton}
                    onPress={() => setIsAddPhotoModalOpen(true)}
                    activeOpacity={0.7}
                  >
                    <Plus size={14} color="#6D28D9" strokeWidth={2.5} style={{ marginRight: 4 }} />
                    <Text style={styles.addTextButtonLabel}>Add Photograph</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.sectionSubtitle}>
                  Displayed in ambient breathing slides to anchor visual memory.
                </Text>

                <View style={styles.itemsList}>
                  {photographs.map((item) => (
                    <View key={item.id} style={styles.listItemCard}>
                      <View style={styles.listItemRow}>
                        {/* Thumbnail */}
                        <View style={styles.photoThumbWrapper}>
                          <Image
                            source={{ uri: item.imageUrl }}
                            style={styles.photoThumbImg}
                            resizeMode="cover"
                          />
                        </View>

                        {/* Title and Meta */}
                        <View style={styles.itemTextCol}>
                          <Text style={styles.itemPrimaryTitle} numberOfLines={1}>
                            {item.imageName}
                          </Text>
                          <Text style={styles.itemMetaSubtitle}>{item.locationContext}</Text>
                        </View>

                        {/* Toggle Switch */}
                        <Switch
                          value={item.isActive}
                          onValueChange={() => handleToggle('photo', item.id, item.isActive)}
                          trackColor={{ false: '#D1D5DB', true: '#6D28D9' }}
                          thumbColor="#FFFFFF"
                          ios_backgroundColor="#D1D5DB"
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* 3. Music & Soundscapes Section */}
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionTitleGroup}>
                    <Text style={styles.sectionHeading}>Music & Soundscapes</Text>
                    <View style={styles.activeCountBadge}>
                      <Text style={styles.activeCountBadgeText}>{activeMusicCount} TRACKS</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.addTextButton}
                    onPress={() => setIsLinkMusicModalOpen(true)}
                    activeOpacity={0.7}
                  >
                    <LinkIcon
                      size={14}
                      color="#6D28D9"
                      strokeWidth={2.5}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.addTextButtonLabel}>Link Track</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.sectionSubtitle}>
                  Continuous restorative audio stream mapped to safe rhythm ranges.
                </Text>

                <View style={styles.itemsList}>
                  {musicTracks.map((item) => (
                    <View key={item.id} style={styles.listItemCard}>
                      <View style={styles.listItemRow}>
                        {/* Icon */}
                        <View style={styles.musicIconBox}>
                          {item.source === 'spotify' ? (
                            <Music size={20} color="#7C3AED" strokeWidth={1.8} />
                          ) : (
                            <Radio size={20} color="#7C3AED" strokeWidth={1.8} />
                          )}
                        </View>

                        {/* Title and Meta */}
                        <View style={styles.itemTextCol}>
                          <Text style={styles.itemPrimaryTitle} numberOfLines={1}>
                            {item.trackTitle}
                          </Text>
                          <Text style={styles.itemMetaSubtitle}>• {item.artist}</Text>
                        </View>

                        {/* Toggle Switch */}
                        <Switch
                          value={item.isActive}
                          onValueChange={() => handleToggle('music', item.id, item.isActive)}
                          trackColor={{ false: '#D1D5DB', true: '#6D28D9' }}
                          thumbColor="#FFFFFF"
                          ios_backgroundColor="#D1D5DB"
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* 4. Emergency Support [I Need Someone] */}
              <View style={styles.emergencySupportSection}>
                <Text style={styles.emergencySectionHeading}>
                  Emergency Support <Text style={styles.dimHeadingTag}>[I Need Someone]</Text>
                </Text>
                <Text style={styles.sectionSubtitle}>
                  The primary contact triggered when the user taps the tactile distress anchor in
                  Sanctuary mode.
                </Text>

                <View style={styles.primaryContactCard}>
                  {/* Field 1: Primary Contact Name */}
                  <Text style={styles.contactFieldLabel}>PRIMARY CONTACT NAME</Text>
                  <View style={styles.contactFieldBox}>
                    <UserIcon size={16} color="#6B7280" style={{ marginRight: 10 }} />
                    <Text style={styles.contactFieldValue}>{primaryContactName}</Text>
                  </View>

                  {/* Field 2: Relationship */}
                  <Text style={styles.contactFieldLabel}>RELATIONSHIP</Text>
                  <View style={styles.contactFieldBox}>
                    <Users size={16} color="#6B7280" style={{ marginRight: 10 }} />
                    <Text style={styles.contactFieldValue}>{primaryRelationship}</Text>
                  </View>

                  {/* Field 3: Direct Emergency Dial */}
                  <Text style={styles.contactFieldLabel}>DIRECT EMERGENCY DIAL</Text>
                  <View style={styles.contactFieldBox}>
                    <Phone size={16} color="#6B7280" style={{ marginRight: 10 }} />
                    <Text style={styles.contactFieldValue}>{primaryPhone}</Text>
                  </View>

                  {/* Care Team Crisis Hotline Row */}
                  <View style={styles.crisisHotlineBox}>
                    <View style={styles.crisisHotlineLeft}>
                      <Shield size={16} color="#6D28D9" style={{ marginRight: 8 }} />
                      <View>
                        <Text style={styles.crisisHotlineTitle}>Care Team Crisis Hotline</Text>
                        <Text style={styles.crisisHotlinePhone}>+1 (800) 273-8255</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => setIsEditContactModalOpen(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.editContactText}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            /* TAB 2: INTERVENTION HISTORY */
            <View style={styles.tabContent}>
              {/* Top-Level Metrics (Horizontal Row of 3 Cards) */}
              <View style={styles.metricsRow}>
                {/* Metric 1: Visits */}
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>14</Text>
                  <Text style={styles.metricLabel}>Visits</Text>
                  <Text style={styles.metricSubtext}>Sanctuary (7d)</Text>
                </View>

                {/* Metric 2: Calmer Effectiveness */}
                <View style={styles.metricCard}>
                  <Text style={[styles.metricValue, { color: '#6D28D9' }]}>71%</Text>
                  <Text style={[styles.metricLabel, { color: '#6D28D9' }]}>Calmer</Text>
                  <Text style={styles.metricSubtext}>Post-audio</Text>
                </View>

                {/* Metric 3: Support Calls */}
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>1</Text>
                  <Text style={styles.metricLabel}>Support</Text>
                  <Text style={styles.metricSubtext}>Calls placed</Text>
                </View>
              </View>

              {/* What Helps Most Card */}
              <View style={styles.whatHelpsCard}>
                <Text style={styles.whatHelpsTitle}>What helps most</Text>
                <Text style={styles.whatHelpsSubtitle}>
                  Based on 14 recorded post-audio check-ins. No AI guessing—pure user responses.
                </Text>

                {/* Bar 1: Sarah's Voice Note */}
                <View style={styles.progressItem}>
                  <View style={styles.progressLabelRow}>
                    <Text style={styles.progressName}>Sarah's Voice Note</Text>
                    <Text style={styles.progressStatPurple}>83% Calmer (10 of 12)</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: '83%', backgroundColor: '#6D28D9' }]} />
                  </View>
                </View>

                {/* Bar 2: Garden Photos */}
                <View style={styles.progressItem}>
                  <View style={styles.progressLabelRow}>
                    <Text style={styles.progressName}>Garden Photos</Text>
                    <Text style={styles.progressStat}>66% Calmer (4 of 6)</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: '66%', backgroundColor: '#4C1D95' }]} />
                  </View>
                </View>

                {/* Bar 3: Quiet Music */}
                <View style={styles.progressItem}>
                  <View style={styles.progressLabelRow}>
                    <Text style={styles.progressName}>Quiet Music</Text>
                    <Text style={styles.progressStat}>50% Calmer (2 of 4)</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: '50%', backgroundColor: '#4B5563' }]} />
                  </View>
                </View>
              </View>

              {/* Recent Interventions Log */}
              <View style={styles.recentSection}>
                <Text style={styles.recentSectionTitle}>Recent Interventions</Text>
                <Text style={styles.sectionSubtitle}>
                  Reverse-chronological log of calming events and patient responses
                </Text>

                <View style={styles.interventionsList}>
                  {interventions.map((entry) => (
                    <View key={entry.id} style={styles.interventionCard}>
                      <View style={styles.interventionHeaderRow}>
                        <Text style={styles.interventionTitleTime} numberOfLines={1}>
                          {entry.title} <Text style={styles.dimTime}>• {entry.timestamp}</Text>
                        </Text>

                        {/* Outcome Badge */}
                        <View
                          style={[
                            styles.outcomeBadge,
                            entry.badgeType === 'resolved'
                              ? styles.outcomeBadgeResolved
                              : styles.outcomeBadgeCalmer,
                          ]}
                        >
                          <Text
                            style={[
                              styles.outcomeBadgeText,
                              entry.badgeType === 'resolved'
                                ? styles.outcomeBadgeTextResolved
                                : styles.outcomeBadgeTextCalmer,
                            ]}
                          >
                            {entry.badge}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.interventionSummaryText}>{entry.summary}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Bottom Fixed Action Button: Exit to Sanctuary Safe Mode */}
          <TouchableOpacity
            style={styles.exitToSanctuaryBtn}
            onPress={() => router.replace('/memory-support' as any)}
            activeOpacity={0.85}
            accessibilityLabel="Exit to Sanctuary Safe Mode"
            accessibilityRole="button"
          >
            <RotateCcw size={18} color="#FFFFFF" strokeWidth={2.2} style={{ marginRight: 8 }} />
            <Text style={styles.exitToSanctuaryBtnText}>Exit to Sanctuary Safe Mode</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MODAL 1: ADD VOICE NOTE */}
      <Modal visible={isAddVoiceModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Add Voice Note</Text>
              <TouchableOpacity onPress={() => setIsAddVoiceModalOpen(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.formLabel}>Speaker / Creator Name</Text>
            <TextInput
              style={styles.inputField}
              value={newVoiceName}
              onChangeText={setNewVoiceName}
              placeholder="e.g. Sarah"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.formLabel}>Relationship to Patient</Text>
            <TextInput
              style={styles.inputField}
              value={newVoiceRelation}
              onChangeText={setNewVoiceRelation}
              placeholder="e.g. Daughter"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.formLabel}>Duration (seconds)</Text>
            <TextInput
              style={styles.inputField}
              value={newVoiceDur}
              onChangeText={setNewVoiceDur}
              placeholder="e.g. 102"
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity style={styles.saveModalBtn} onPress={handleSaveVoice} activeOpacity={0.85}>
              <Text style={styles.saveModalBtnText}>Save & Enable in Sanctuary</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: ADD PHOTOGRAPH */}
      <Modal visible={isAddPhotoModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Add Photograph</Text>
              <TouchableOpacity onPress={() => setIsAddPhotoModalOpen(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.formLabel}>Photo Title</Text>
            <TextInput
              style={styles.inputField}
              value={newPhotoName}
              onChangeText={setNewPhotoName}
              placeholder="e.g. Golden Retriever Buster"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.formLabel}>Location / Context</Text>
            <TextInput
              style={styles.inputField}
              value={newPhotoContext}
              onChangeText={setNewPhotoContext}
              placeholder="e.g. Backyard • Peaceful Daylight"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.formLabel}>Image URL</Text>
            <TextInput
              style={styles.inputField}
              value={newPhotoUrl}
              onChangeText={setNewPhotoUrl}
              placeholder="https://images.unsplash.com/..."
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity style={styles.saveModalBtn} onPress={handleSavePhoto} activeOpacity={0.85}>
              <Text style={styles.saveModalBtnText}>Upload & Enable in Sanctuary</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: LINK MUSIC TRACK */}
      <Modal visible={isLinkMusicModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Link Music Track</Text>
              <TouchableOpacity onPress={() => setIsLinkMusicModalOpen(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.formLabel}>Track Title</Text>
            <TextInput
              style={styles.inputField}
              value={newMusicTitle}
              onChangeText={setNewMusicTitle}
              placeholder="e.g. Gentle Cello & Rain"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.formLabel}>Artist / Source Meta</Text>
            <TextInput
              style={styles.inputField}
              value={newMusicArtist}
              onChangeText={setNewMusicArtist}
              placeholder="e.g. Spotify Linked • 432 Hz Tuned"
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity style={styles.saveModalBtn} onPress={handleSaveMusic} activeOpacity={0.85}>
              <Text style={styles.saveModalBtnText}>Link to Patient Sanctuary</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: EDIT PRIMARY CONTACT */}
      <Modal visible={isEditContactModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Edit Primary Emergency Contact</Text>
              <TouchableOpacity onPress={() => setIsEditContactModalOpen(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.formLabel}>Full Name</Text>
            <TextInput
              style={styles.inputField}
              value={primaryContactName}
              onChangeText={setPrimaryContactName}
              placeholder="e.g. Sarah Jenkins"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.formLabel}>Relationship</Text>
            <TextInput
              style={styles.inputField}
              value={primaryRelationship}
              onChangeText={setPrimaryRelationship}
              placeholder="e.g. Daughter (Primary Caregiver)"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.formLabel}>Direct Phone Number</Text>
            <TextInput
              style={styles.inputField}
              value={primaryPhone}
              onChangeText={setPrimaryPhone}
              placeholder="+1(555) 234-8901"
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.switchRowModal}>
              <Text style={styles.switchModalLabel}>Direct Emergency Call Enabled</Text>
              <Switch
                value={directCallEnabled}
                onValueChange={setDirectCallEnabled}
                trackColor={{ false: '#D1D5DB', true: '#6D28D9' }}
                thumbColor="#FFFFFF"
              />
            </View>
            <TouchableOpacity style={styles.saveModalBtn} onPress={handleSavePrimaryContact} activeOpacity={0.85}>
              <Text style={styles.saveModalBtnText}>Save Contact Details</Text>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: '#FAF9FB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#EDE9FE',
  },
  topHeaderLeft: {
    flex: 1,
  },
  caregiverTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  purpleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6D28D9',
    marginRight: 6,
  },
  caregiverTagText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: '#6D28D9',
    letterSpacing: 0.8,
  },
  headerMainTitle: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: '#111827',
  },
  topHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lockBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  caregiverAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6D28D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  mainCardContainer: {
    width: '100%',
    maxWidth: 440,
  },
  desktopContainer: {
    paddingHorizontal: 12,
  },
  segmentedTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#EDE9FE',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
      },
      default: {
        elevation: 1,
        shadowColor: '#000000',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 2,
      },
    }),
  },
  segmentBtnText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: '#6B7280',
  },
  segmentBtnTextActive: {
    fontFamily: Fonts.bold,
    color: '#111827',
  },
  tabContent: {
    marginBottom: 16,
  },
  liveRoutingBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 6px rgba(109, 40, 217, 0.04)',
      },
      default: {
        elevation: 1,
        shadowColor: '#6D28D9',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
      },
    }),
  },
  shieldIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#FAF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  routingBannerTextCol: {
    flex: 1,
  },
  routingBannerTitle: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: '#111827',
    marginBottom: 4,
  },
  routingBannerDesc: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: '#4B5563',
    lineHeight: 18,
  },
  sectionContainer: {
    marginBottom: 26,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeading: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: '#111827',
  },
  activeCountBadge: {
    backgroundColor: '#EDE9FE',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  activeCountBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: '#6B21A8',
  },
  addTextButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addTextButtonLabel: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: '#6D28D9',
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: '#6B7280',
    marginBottom: 14,
    lineHeight: 18,
  },
  itemsList: {
    gap: 12,
  },
  listItemCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 14,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
      },
      default: {
        elevation: 1,
        shadowColor: '#000000',
        shadowOpacity: 0.03,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 2,
      },
    }),
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIconBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#FAF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  itemIconBoxInactive: {
    backgroundColor: '#F3F4F6',
  },
  itemTextCol: {
    flex: 1,
    marginRight: 10,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  itemPrimaryTitle: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: '#111827',
  },
  itemDotRelation: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: '#6B7280',
  },
  itemMetaSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: '#6B7280',
  },
  photoThumbWrapper: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#EDE9FE',
    marginRight: 14,
  },
  photoThumbImg: {
    width: 44,
    height: 44,
  },
  musicIconBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#FAF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  warningAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    borderRadius: 6,
    padding: 8,
    marginTop: 10,
  },
  warningAlertText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: '#6B21A8',
    lineHeight: 16,
  },
  emergencySupportSection: {
    marginBottom: 26,
  },
  emergencySectionHeading: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: '#111827',
    marginBottom: 4,
  },
  dimHeadingTag: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: '#6B7280',
  },
  primaryContactCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 18,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
      },
      default: {
        elevation: 1,
        shadowColor: '#000000',
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
      },
    }),
  },
  contactFieldLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: '#6B7280',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  contactFieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  contactFieldValue: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: '#111827',
  },
  crisisHotlineBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  crisisHotlineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  crisisHotlineTitle: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: '#111827',
  },
  crisisHotlinePhone: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: '#6B7280',
  },
  editContactText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: '#6D28D9',
    paddingHorizontal: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
  metricValue: {
    fontSize: 26,
    fontFamily: Fonts.bold,
    color: '#111827',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: '#4B5563',
    marginBottom: 2,
  },
  metricSubtext: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: '#6B7280',
  },
  whatHelpsCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  whatHelpsTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: '#111827',
    marginBottom: 4,
  },
  whatHelpsSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 18,
  },
  progressItem: {
    marginBottom: 16,
  },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressName: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: '#111827',
  },
  progressStatPurple: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    color: '#6D28D9',
  },
  progressStat: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: '#374151',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#EDE9FE',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  recentSection: {
    marginBottom: 20,
  },
  recentSectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: '#111827',
    marginBottom: 4,
  },
  interventionsList: {
    gap: 12,
    marginTop: 10,
  },
  interventionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 16,
  },
  interventionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  interventionTitleTime: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: '#111827',
    marginRight: 8,
  },
  dimTime: {
    fontFamily: Fonts.regular,
    color: '#6B7280',
    fontSize: 12,
  },
  outcomeBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  outcomeBadgeText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
  },
  outcomeBadgeCalmer: {
    backgroundColor: '#EDE9FE',
  },
  outcomeBadgeTextCalmer: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    color: '#6D28D9',
  },
  outcomeBadgeResolved: {
    backgroundColor: '#E2E8F0',
  },
  outcomeBadgeTextResolved: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    color: '#334155',
  },
  interventionSummaryText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: '#4B5563',
    lineHeight: 19,
  },
  exitToSanctuaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6D28D9',
    borderRadius: 10,
    paddingVertical: 16,
    marginTop: 12,
    marginBottom: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(109, 40, 217, 0.25)',
      },
      default: {
        elevation: 3,
        shadowColor: '#6D28D9',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 6,
      },
    }),
  },
  exitToSanctuaryBtnText: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 22,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: '#111827',
  },
  formLabel: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: '#374151',
    marginBottom: 6,
    marginTop: 10,
  },
  inputField: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  switchRowModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  switchModalLabel: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: '#374151',
  },
  saveModalBtn: {
    backgroundColor: '#6D28D9',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  saveModalBtnText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: '#FFFFFF',
  },
});
