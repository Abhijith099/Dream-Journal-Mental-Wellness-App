import React, { useState, useEffect, useRef } from 'react';
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
import { Audio } from 'expo-av';
import {
  ChevronLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Sparkles,
  HeartHandshake,
  CheckCircle,
} from 'lucide-react-native';
import { useSanctuary } from '../../context/SanctuaryContext';
import { Fonts } from '@/constants/theme';
import { BACKEND_URL, authenticatedFetch } from '../../utils/api';

interface SoothingTrack {
  id: string;
  title: string;
  artist: string;
  albumArtUrl: string;
  audioUrl: string;
  durationSeconds: number;
}

const DEFAULT_TRACKS: SoothingTrack[] = [
  {
    id: 'track-01',
    title: 'Peaceful Sanctuary Dawn',
    artist: 'Serene Acoustic & Piano',
    albumArtUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=600&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    durationSeconds: 180,
  },
  {
    id: 'track-02',
    title: 'Gentle Meadow Breeze',
    artist: 'Mindful Ambient Soundscapes',
    albumArtUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    durationSeconds: 210,
  },
  {
    id: 'track-03',
    title: 'Warm Harbor Lights',
    artist: 'Grounding Strings',
    albumArtUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
    durationSeconds: 195,
  },
];

export default function FamiliarMusicScreen() {
  const router = useRouter();
  const { setLastActivity, logEvent } = useSanctuary();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [tracks, setTracks] = useState<SoothingTrack[]>(DEFAULT_TRACKS);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [positionMillis, setPositionMillis] = useState<number>(0);
  const [durationMillis, setDurationMillis] = useState<number>(180000);

  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<any>(null);

  const activeTrack = tracks[currentTrackIndex] || DEFAULT_TRACKS[0];

  useEffect(() => {
    logEvent('sanctuary_music_view', undefined, activeTrack.title);

    // Fetch user spotify favorites if connected
    const loadSpotifyTracks = async () => {
      try {
        const res = await authenticatedFetch(`${BACKEND_URL}/spotify/favorites`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setTracks(
              data.map((t: any, idx: number) => ({
                id: t.trackId || t.id || `spotify-${idx}`,
                title: t.title || t.name || 'Familiar Song',
                artist: t.artist || 'Your Liked Song',
                albumArtUrl: t.albumArtUrl || t.album?.images?.[0]?.url || DEFAULT_TRACKS[0].albumArtUrl,
                audioUrl: t.previewUrl || DEFAULT_TRACKS[0].audioUrl,
                durationSeconds: Math.floor((t.duration_ms || 180000) / 1000),
              }))
            );
          }
        }
      } catch (e) {
        // Fall back to soothing default tracks
      }
    };

    loadSpotifyTracks();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [logEvent, activeTrack.title]);

  const handleFinishGrounding = () => {
    if (soundRef.current) {
      soundRef.current.stopAsync().catch(() => {});
    }

    setLastActivity({
      contactName: 'Music Grounding',
      noteTitle: activeTrack.title,
      summaryDuration: 'Familiar music session completed',
      photoUrl: activeTrack.albumArtUrl,
    });

    logEvent('music_listen', undefined, activeTrack.title, Math.floor(positionMillis / 1000));
    router.push('/memory-support/feelings' as any);
  };

  const togglePlay = async () => {
    if (isPlaying) {
      if (soundRef.current) {
        await soundRef.current.pauseAsync().catch(() => {});
      }
      if (timerRef.current) clearInterval(timerRef.current);
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      try {
        if (!soundRef.current) {
          const { sound } = await Audio.Sound.createAsync(
            { uri: activeTrack.audioUrl },
            { shouldPlay: true, isLooping: true },
            (status) => {
              if (status.isLoaded) {
                setPositionMillis(status.positionMillis);
                if (status.durationMillis) {
                  setDurationMillis(status.durationMillis);
                }
              }
            }
          );
          soundRef.current = sound;
        } else {
          await soundRef.current.playAsync();
        }
      } catch (err) {
        // Simulation timer
        timerRef.current = setInterval(() => {
          setPositionMillis((prev) => {
            const next = prev + 1000;
            if (next >= durationMillis) return 0;
            return next;
          });
        }, 1000);
      }
    }
  };

  const handleNextTrack = async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    setCurrentTrackIndex((prev) => (prev + 1) % tracks.length);
    setPositionMillis(0);
    setIsPlaying(false);
  };

  const handlePrevTrack = async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    setCurrentTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
    setPositionMillis(0);
    setIsPlaying(false);
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = durationMillis > 0 ? Math.min(100, (positionMillis / durationMillis) * 100) : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header Bar */}
      <View style={styles.topHeaderBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (soundRef.current) {
              soundRef.current.stopAsync().catch(() => {});
            }
            router.back();
          }}
          activeOpacity={0.7}
          accessibilityLabel="Back"
          accessibilityRole="button"
        >
          <ChevronLeft size={20} color="#111827" strokeWidth={2} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.headerCenterTitle}>Sanctuary Grounding Arrival</Text>

        <View style={styles.sanctuaryBadge}>
          <Sparkles size={13} color="#6D28D9" strokeWidth={2} style={{ marginRight: 4 }} />
          <Text style={styles.sanctuaryBadgeText}>Sanctuary</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.mainCardContainer, !isMobile && styles.desktopContainer]}>
          {/* Section Heading */}
          <View style={styles.headingSection}>
            <Text style={styles.screenTitle}>Familiar music</Text>
            <Text style={styles.screenSubtitle}>Your favorite calming tracks</Text>
          </View>

          {/* Centered Album Artwork */}
          <View style={styles.albumArtContainer}>
            <Image source={{ uri: activeTrack.albumArtUrl }} style={styles.albumArtImage} resizeMode="cover" />
          </View>

          {/* Track Info */}
          <View style={styles.trackInfoSection}>
            <Text style={styles.trackTitle}>{activeTrack.title}</Text>
            <Text style={styles.trackArtist}>{activeTrack.artist}</Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatTime(positionMillis)}</Text>
              <Text style={styles.timeText}>{formatTime(durationMillis)}</Text>
            </View>
          </View>

          {/* Media Player Controls */}
          <View style={styles.controlsRow}>
            <TouchableOpacity onPress={handlePrevTrack} style={styles.secondaryControlBtn} activeOpacity={0.7}>
              <SkipBack size={22} color="#111827" strokeWidth={1.8} />
            </TouchableOpacity>

            <TouchableOpacity onPress={togglePlay} style={styles.mainPlayBtn} activeOpacity={0.85}>
              {isPlaying ? (
                <Pause size={22} color="#FFFFFF" fill="#FFFFFF" />
              ) : (
                <Play size={22} color="#FFFFFF" fill="#FFFFFF" />
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleNextTrack} style={styles.secondaryControlBtn} activeOpacity={0.7}>
              <SkipForward size={22} color="#111827" strokeWidth={1.8} />
            </TouchableOpacity>
          </View>

          {/* Finish Grounding CTA leading to Screen 5 */}
          <TouchableOpacity
            style={styles.finishGroundingBtn}
            onPress={handleFinishGrounding}
            activeOpacity={0.85}
            accessibilityLabel="Finish Grounding"
            accessibilityRole="button"
          >
            <CheckCircle size={18} color="#111827" strokeWidth={2} style={{ marginRight: 8 }} />
            <Text style={styles.finishGroundingBtnText}>Finish Grounding & Check In</Text>
          </TouchableOpacity>

          {/* Urgent Care / Emergency Action Button */}
          <View style={styles.emergencyBlockWrapper}>
            <TouchableOpacity
              style={styles.emergencyDarkButton}
              onPress={() => {
                if (soundRef.current) {
                  soundRef.current.stopAsync().catch(() => {});
                }
                router.push('/memory-support/emergency' as any);
              }}
              activeOpacity={0.85}
              accessibilityLabel="I need someone"
              accessibilityRole="button"
            >
              <HeartHandshake size={20} color="#FFFFFF" strokeWidth={2} style={{ marginRight: 10 }} />
              <Text style={styles.emergencyDarkButtonText}>I need someone</Text>
            </TouchableOpacity>
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
    alignItems: 'center',
  },
  desktopContainer: {
    paddingHorizontal: 12,
  },
  headingSection: {
    alignItems: 'center',
    marginBottom: 24,
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
  albumArtContainer: {
    width: 220,
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#EDE9FE',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
      },
      default: {
        elevation: 3,
        shadowColor: '#000000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
      },
    }),
  },
  albumArtImage: {
    width: '100%',
    height: '100%',
  },
  trackInfoSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  trackTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  trackArtist: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: '#6B7280',
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 20,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7C3AED',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  timeText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: '#6B7280',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 28,
  },
  secondaryControlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainPlayBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishGroundingBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  finishGroundingBtnText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: '#111827',
  },
  emergencyBlockWrapper: {
    width: '100%',
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
});
