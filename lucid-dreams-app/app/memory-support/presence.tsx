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
  Clock,
  Play,
  Pause,
  Sparkles,
  HeartHandshake,
  User as UserIcon,
} from 'lucide-react-native';
import { useSanctuary } from '../../context/SanctuaryContext';
import { Fonts } from '@/constants/theme';

export default function VoicePresenceScreen() {
  const router = useRouter();
  const { selectedContact, setLastActivity, logEvent } = useSanctuary();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const contact = selectedContact || {
    contactId: 'sarah-default-01',
    name: 'Sarah',
    relationship: 'Your daughter',
    relationshipTag: 'Recent',
    roleLabel: 'Family Emergency Contact',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80',
    phoneNumber: '+15552345678',
    maskedPhone: '+1 555-234-5678',
    recordingId: 'sarah-rec-01',
    recordingTitle: "Sarah's grounding note",
    recordingDuration: 102,
    recordingLabel: '1m 45s soothing message',
    recordedAt: 'yesterday at 4:15 PM',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    isSample: false,
    isPrimary: true,
  };

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [positionMillis, setPositionMillis] = useState<number>(0);
  const [durationMillis, setDurationMillis] = useState<number>((contact.recordingDuration || 102) * 1000);
  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    logEvent('sanctuary_presence_view', contact.contactId, contact.name);

    return () => {
      // Clean up audio on exit
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [contact.contactId, logEvent]);

  // Audio completion handler -> transitions to Feelings Check-In Screen 5
  const handlePlaybackFinished = () => {
    setIsPlaying(false);
    setPositionMillis(durationMillis);

    const durSec = Math.floor(durationMillis / 1000);
    const mins = Math.floor(durSec / 60);
    const secs = durSec % 60;
    const summaryDuration = `${mins}m ${secs}s audio completed`;

    setLastActivity({
      contactName: contact.name,
      noteTitle: `${contact.name}'s grounding note`,
      summaryDuration,
      photoUrl: contact.photoUrl,
    });

    logEvent('voice_playback', contact.contactId, contact.name, durSec);

    // Auto-advance to Screen 5 Feelings Check-In
    setTimeout(() => {
      router.push('/memory-support/feelings' as any);
    }, 600);
  };

  const togglePlayPause = async () => {
    if (isPlaying) {
      // Pause
      if (soundRef.current) {
        await soundRef.current.pauseAsync().catch(() => {});
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setIsPlaying(false);
    } else {
      // Play
      setIsPlaying(true);

      try {
        if (!soundRef.current && contact.audioUrl) {
          const { sound } = await Audio.Sound.createAsync(
            { uri: contact.audioUrl },
            { shouldPlay: true },
            (status) => {
              if (status.isLoaded) {
                setPositionMillis(status.positionMillis);
                if (status.durationMillis) {
                  setDurationMillis(status.durationMillis);
                }
                if (status.didJustFinish) {
                  handlePlaybackFinished();
                }
              }
            }
          );
          soundRef.current = sound;
        } else if (soundRef.current) {
          await soundRef.current.playAsync();
        }
      } catch (err) {
        console.warn('Audio playback fallback simulated timer:', err);
        // Fallback simulation timer for web or network dropout
        const interval = 1000;
        timerRef.current = setInterval(() => {
          setPositionMillis((prev) => {
            const next = prev + interval;
            if (next >= durationMillis) {
              if (timerRef.current) clearInterval(timerRef.current);
              handlePlaybackFinished();
              return durationMillis;
            }
            return next;
          });
        }, interval);
      }
    }
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
        {/* Left: Back */}
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

        {/* Right: Deep Purple Badge "Sanctuary" */}
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
            <Text style={styles.screenTitle}>{contact.name} is here with you.</Text>
            <Text style={styles.screenSubtitle}>Take a quiet moment. You are safe and supported.</Text>
          </View>

          {/* Large Portrait Frame with Connected Badge */}
          <View style={styles.photoContainer}>
            {contact.photoUrl ? (
              <Image
                source={{ uri: contact.photoUrl }}
                style={styles.photoImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.photoFallback}>
                <UserIcon size={64} color="#7C3AED" strokeWidth={1.5} />
              </View>
            )}

            {/* Bottom-Right Connected Pill */}
            <View style={styles.connectedBadge}>
              <View style={styles.greenPulseDot} />
              <Text style={styles.connectedText}>Connected</Text>
            </View>
          </View>

          {/* Timestamp Metadata */}
          <View style={styles.metadataRow}>
            <Clock size={14} color="#6B7280" strokeWidth={1.8} style={{ marginRight: 6 }} />
            <Text style={styles.metadataText}>
              Recorded {contact.recordedAt || 'yesterday at 4:15 PM'} • {contact.recordingLabel?.split(' ')[0] || '1m'} {contact.recordingLabel?.split(' ')[1] || '42s'}
            </Text>
          </View>

          {/* Audio Controls */}
          <View style={styles.playerSection}>
            {/* Primary Action Button */}
            <TouchableOpacity
              style={styles.playDarkButton}
              onPress={togglePlayPause}
              activeOpacity={0.85}
              accessibilityLabel={`Play ${contact.name}'s message`}
              accessibilityRole="button"
            >
              {isPlaying ? (
                <Pause size={18} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 10 }} />
              ) : (
                <Play size={18} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 10 }} />
              )}
              <Text style={styles.playDarkButtonText}>
                {isPlaying ? `Pause ${contact.name}'s message` : `Play ${contact.name}'s message`}
              </Text>
            </TouchableOpacity>

            {/* Audio Progress Bar */}
            <View style={styles.progressBarWrapper}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
              </View>
              <View style={styles.timeRow}>
                <Text style={styles.timeText}>{formatTime(positionMillis)}</Text>
                <Text style={styles.timeText}>{formatTime(durationMillis)}</Text>
              </View>
            </View>
          </View>

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

            <Text style={styles.emergencyFooterCaption}>
              Instantly alerts your verified emergency circle & care companion
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
  headingSection: {
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 20,
  },
  screenTitle: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
  },
  screenSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  photoContainer: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#EDE9FE',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
      },
      default: {
        elevation: 2,
        shadowColor: '#000000',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
      },
    }),
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectedBadge: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  greenPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  connectedText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: '#FFFFFF',
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    marginBottom: 20,
  },
  metadataText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: '#6B7280',
  },
  playerSection: {
    marginBottom: 32,
  },
  playDarkButton: {
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
  playDarkButtonText: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: '#FFFFFF',
  },
  progressBarWrapper: {
    marginTop: 12,
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
