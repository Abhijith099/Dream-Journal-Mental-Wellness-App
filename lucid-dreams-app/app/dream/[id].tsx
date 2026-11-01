import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  useWindowDimensions,
  Share,
  ActionSheetIOS,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ChevronLeft,
  X,
  Bookmark,
  RotateCcw,
  MoreHorizontal,
  Play,
  Pause,
  Zap,
  Check,
  Eye,
  Activity,
  Sparkles,
} from "lucide-react-native";
import { Image } from "expo-image";
import { authenticatedFetch as fetch, BACKEND_URL, BASE_SERVER_URL } from "../../utils/api";
import * as Haptics from "expo-haptics";

interface DreamDetailData {
  _id: string;
  title: string;
  description: string;
  memoryText?: string;
  isLucid: boolean;
  lucidAwareness?: string;
  tags?: string[];
  symbols?: string[];
  imageUrl?: string;
  image?: string;
  mediaType?: "pending" | "image" | "video";
  videoUrl?: string;
  date: string;
  createdAt?: string;
  wordCount?: number;
  somaticArchiveTag?: string;
  lucidityScore?: number;
  narrativeContinuity?: number;
  emotionalTone?: string[];
  reflectionPrompt?: string;
  vocalCharacterization?: string;
}

export default function DreamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [dream, setDream] = useState<DreamDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMediaTab, setActiveMediaTab] = useState<"image" | "video">("image");
  const [generating, setGenerating] = useState(false);
  const [isSavedToArchive, setIsSavedToArchive] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Reflection note modal
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [reflectionNote, setReflectionNote] = useState("");
  const [savingReflection, setSavingReflection] = useState(false);
  const [reflectionSavedSuccess, setReflectionSavedSuccess] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchDream = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${BACKEND_URL}/dreams/${id}/full`);
        const fallbackRes = res.ok ? res : await fetch(`${BACKEND_URL}/dreams/${id}`);
        if (!fallbackRes.ok) throw new Error("Dream not found");
        const data = await fallbackRes.json();
        setDream(data);
      } catch (err) {
        console.error("Error fetching dream:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDream();
  }, [id]);

  const handleGenerateVision = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const res = await fetch(`${BACKEND_URL}/dreams/${id}/generate-media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaType: activeMediaTab }),
      });
      if (res.ok) {
        const media = await res.json();
        if (media && media.mediaUrl) {
          setDream((prev) => (prev ? { ...prev, imageUrl: media.mediaUrl } : null));
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      console.error("Generation error:", e);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveToArchive = () => {
    setIsSavedToArchive(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleMenuPress = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Share Dream", "Delete Memory"],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        async (btnIdx) => {
          if (btnIdx === 1 && dream) {
            Share.share({
              title: dream.title,
              message: `${dream.title}\n\n${dream.memoryText || dream.description || ""}`,
            });
          } else if (btnIdx === 2) {
            await fetch(`${BACKEND_URL}/dreams/${id}`, { method: "DELETE" });
            router.back();
          }
        }
      );
    }
  };

  const handleSaveReflectionNote = async () => {
    if (!reflectionNote.trim()) return;
    setSavingReflection(true);
    try {
      await fetch(`${BACKEND_URL}/wellness/thought-records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          situation: `Dream Reflection: ${dream?.title}`,
          automaticThought: dream?.reflectionPrompt || "Subconscious reflection note",
          distortion: "Reflection",
          rationalResponse: reflectionNote.trim(),
        }),
      });
      setReflectionSavedSuccess(true);
      setTimeout(() => {
        setSavingReflection(false);
        setShowReflectionModal(false);
        setReflectionNote("");
        setReflectionSavedSuccess(false);
      }, 1000);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error("Error saving reflection note:", e);
      setSavingReflection(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#6B4FBB" />
      </SafeAreaView>
    );
  }

  if (!dream) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.errorText}>Dream memory not found.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const rawText = dream.memoryText || dream.description || "";
  const wordsCount = dream.wordCount || (rawText.trim() ? rawText.trim().split(/\s+/).length : 0);

  const lucidityVal =
    typeof dream.lucidityScore === "number" && dream.lucidityScore > 0
      ? dream.lucidityScore
      : dream.isLucid || ["yes_briefly", "yes_mostly"].includes(dream.lucidAwareness || "")
      ? 95
      : 15;

  const continuityVal =
    typeof dream.narrativeContinuity === "number" && dream.narrativeContinuity > 0
      ? dream.narrativeContinuity
      : Math.min(90, Math.max(40, Math.round(wordsCount * 1.2)));

  const formattedDate = new Date(dream.date || dream.createdAt || Date.now()).toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  );

  const displaySymbols =
    dream.symbols && dream.symbols.length > 0
      ? dream.symbols
      : ["Night Sky", "Levitation", "Cityscape", "Luminescence"];

  const displayEmotionalTones =
    dream.emotionalTone && dream.emotionalTone.length > 0
      ? dream.emotionalTone
      : dream.tags && dream.tags.length > 0
      ? dream.tags.slice(0, 3).map((t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase())
      : ["Peaceful", "Recurring", "Elevated"];

  const displayReflectionPrompt =
    dream.reflectionPrompt ||
    "How can you bring this feeling of quiet ease and weightlessness into your waking day tomorrow?";

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.iconHit}
          accessibilityLabel="Back to memories"
        >
          <ChevronLeft size={22} color="#1E1B2E" strokeWidth={1.8} />
        </TouchableOpacity>

        <View style={styles.headerCenterColumn}>
          <Text style={styles.headerEyebrow}>
            LOG #{dream._id.slice(-4).toUpperCase()} •{" "}
            {dream.somaticArchiveTag
              ? dream.somaticArchiveTag.replace(/_/g, " ")
              : dream.isLucid
              ? "LUCID STATE"
              : "MEMORY LOG"}
          </Text>
          <Text style={styles.headerSubtext}>DREAM ARCHIVE ENTRY</Text>
        </View>

        <TouchableOpacity
          onPress={handleMenuPress}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.iconHit}
          accessibilityLabel="Dream menu options"
        >
          <MoreHorizontal size={20} color="#7B7490" strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title & Metadata Line */}
        <View style={styles.titleSection}>
          <Text style={styles.dreamTitle}>{dream.title || "Untitled Dream"}</Text>

          <View style={styles.dateTagRow}>
            <Text style={styles.dateLabel}>{formattedDate}</Text>
            <View style={styles.lucidPillBadge}>
              <Text style={styles.lucidPillText}>
                {dream.isLucid ? `Lucid State (${lucidityVal}%)` : `Recall (${continuityVal}%)`}
              </Text>
            </View>
          </View>
        </View>

        {/* 1. VISION PORTAL */}
        <View style={styles.visionPortalCard}>
          <View style={styles.visionHeaderRow}>
            <Text style={styles.visionCardEyebrow}>VISION PORTAL</Text>
            <View style={styles.mediaToggleGroup}>
              <TouchableOpacity
                style={[styles.togglePill, activeMediaTab === "image" && styles.togglePillActive]}
                onPress={() => setActiveMediaTab("image")}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.togglePillText,
                    activeMediaTab === "image" && styles.togglePillTextActive,
                  ]}
                >
                  Image
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.togglePill, activeMediaTab === "video" && styles.togglePillActive]}
                onPress={() => setActiveMediaTab("video")}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.togglePillText,
                    activeMediaTab === "video" && styles.togglePillTextActive,
                  ]}
                >
                  Video
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Visual Display Container */}
          <View style={styles.visualDisplayContainer}>
            {dream.imageUrl ? (
              <Image
                source={{
                  uri: dream.imageUrl.startsWith("http")
                    ? dream.imageUrl
                    : `${BASE_SERVER_URL}${dream.imageUrl}`,
                }}
                style={styles.portalImage}
                contentFit="cover"
              />
            ) : (
              <View style={styles.portalGraphicPlaceholder}>
                <View style={styles.waveformGraphicRow}>
                  <View style={[styles.waveBar, { height: 18 }]} />
                  <View style={[styles.waveBar, { height: 32 }]} />
                  <View style={[styles.waveBar, { height: 48 }]} />
                  <View style={[styles.waveBar, { height: 26 }]} />
                  <View style={[styles.waveBar, { height: 60 }]} />
                  <View style={[styles.waveBar, { height: 40 }]} />
                  <View style={[styles.waveBar, { height: 20 }]} />
                  <View style={[styles.waveBar, { height: 35 }]} />
                </View>

                <TouchableOpacity
                  style={styles.generateVisionBtn}
                  onPress={handleGenerateVision}
                  disabled={generating}
                  activeOpacity={0.85}
                >
                  {generating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Zap size={14} color="#FFFFFF" strokeWidth={2} style={{ marginRight: 6 }} />
                      <Text style={styles.generateVisionBtnText}>Generate Vision</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Bottom Overlay Tag & Timestamp */}
            <View style={styles.portalBottomOverlay}>
              <Text style={styles.portalProjectionText}>Lucid flight projection</Text>
              <Text style={styles.portalTimestampText}>02:44 AM</Text>
            </View>
          </View>

          {/* Bottom Actions Row */}
          <View style={styles.portalActionRow}>
            <TouchableOpacity
              style={[styles.portalOutlineBtn, isSavedToArchive && styles.portalOutlineBtnSaved]}
              onPress={handleSaveToArchive}
              activeOpacity={0.75}
            >
              {isSavedToArchive ? (
                <>
                  <Check size={14} color="#10B981" strokeWidth={2.2} style={{ marginRight: 6 }} />
                  <Text style={[styles.portalOutlineBtnText, { color: "#10B981" }]}>
                    Saved to archive
                  </Text>
                </>
              ) : (
                <>
                  <Bookmark
                    size={14}
                    color="#4B5563"
                    strokeWidth={1.8}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.portalOutlineBtnText}>Save to archive</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.portalOutlineBtn}
              onPress={handleGenerateVision}
              disabled={generating}
              activeOpacity={0.75}
            >
              <RotateCcw
                size={14}
                color="#4B5563"
                strokeWidth={1.8}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.portalOutlineBtnText}>Regenerate</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. MEMORY PLAYBACK */}
        <View style={styles.whiteCard}>
          <View style={styles.cardHeaderWithCount}>
            <Text style={styles.cardEyebrowLabel}>MEMORY PLAYBACK</Text>
            <Text style={styles.wordCountBadge}>{wordsCount} words</Text>
          </View>

          <View style={styles.quoteBlock}>
            <Text style={styles.memoryNarrativeText}>
              "{rawText || "No detailed narrative recorded for this entry."}"
            </Text>
          </View>

          {/* Voice Recall Audio Player Bar */}
          <View style={styles.audioPlayerBar}>
            <TouchableOpacity
              style={styles.audioPlayCircle}
              onPress={() => setIsPlayingAudio(!isPlayingAudio)}
              activeOpacity={0.8}
            >
              {isPlayingAudio ? (
                <Pause size={14} color="#FFFFFF" strokeWidth={2} />
              ) : (
                <Play size={14} color="#FFFFFF" strokeWidth={2} style={{ marginLeft: 2 }} />
              )}
            </TouchableOpacity>

            <View style={styles.audioMetaColumn}>
              <Text style={styles.audioTitleText}>Voice recall note</Text>
              <Text style={styles.audioDurationText}>0:42 / 1:14</Text>
            </View>

            <Text style={styles.audioTimestamp}>RECORDED 07:15 AM</Text>
          </View>
        </View>

        {/* 3. INSIGHT SIGNALS */}
        <View style={styles.whiteCard}>
          <View style={styles.cardHeaderWithCount}>
            <View>
              <Text style={styles.cardEyebrowLabel}>INSIGHT SIGNALS</Text>
              <Text style={styles.cardSubtextLabel}>Awareness level and continuity</Text>
            </View>
            <View style={styles.biometricBadge}>
              <Text style={styles.biometricBadgeText}>BIOMETRIC SYNC</Text>
            </View>
          </View>

          {/* Signal 1: Lucidity Awareness */}
          <View style={styles.signalBlock}>
            <View style={styles.signalTopRow}>
              <Text style={styles.signalNameText}>Lucidity awareness</Text>
              <Text style={styles.signalScoreText}>{lucidityVal}%</Text>
            </View>
            <View style={styles.signalProgressBarTrack}>
              <View style={[styles.signalProgressBarFill, { width: `${lucidityVal}%` }]} />
            </View>
            <Text style={styles.signalDescriptionText}>
              You recognized that you were dreaming and could influence what happened.
            </Text>
          </View>

          {/* Signal 2: Narrative Continuity */}
          <View style={styles.signalBlock}>
            <View style={styles.signalTopRow}>
              <Text style={styles.signalNameText}>Narrative continuity</Text>
              <Text style={styles.signalScoreText}>{continuityVal}%</Text>
            </View>
            <View style={styles.signalProgressBarTrack}>
              <View style={[styles.signalProgressBarFill, { width: `${continuityVal}%` }]} />
            </View>
            <Text style={styles.signalDescriptionText}>
              The dream had a fairly clear visual sequence.
            </Text>
          </View>
        </View>

        {/* 4. SYMBOLS & THEMES */}
        <View style={styles.sectionSpacer}>
          <Text style={styles.sectionSmallEyebrow}>SYMBOLS & THEMES</Text>
          <Text style={styles.symbolsInlineText}>{displaySymbols.join(", ")}</Text>
        </View>

        {/* 5. EMOTIONAL TONE */}
        <View style={styles.sectionSpacer}>
          <Text style={styles.sectionSmallEyebrow}>EMOTIONAL TONE</Text>
          <View style={styles.toneChipsRow}>
            {displayEmotionalTones.map((tone, idx) => (
              <View key={idx} style={styles.toneRectangularChip}>
                <Text style={styles.toneChipText}>{tone}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.toneSummarySubtext}>
            Quiet calm and autonomic balance throughout.
          </Text>
        </View>

        {/* 6. REFLECTION PROMPT */}
        <View style={styles.whiteCard}>
          <View style={styles.cardHeaderWithCount}>
            <Text style={styles.cardEyebrowLabel}>REFLECTION PROMPT</Text>
            <View style={styles.dailyBadge}>
              <Text style={styles.dailyBadgeText}>DAILY</Text>
            </View>
          </View>

          <Text style={styles.reflectionQuoteText}>"{displayReflectionPrompt}"</Text>

          <TouchableOpacity
            style={styles.recordReflectionOutlineBtn}
            onPress={() => setShowReflectionModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.recordReflectionBtnText}>+ Record reflection note</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Reflection Note Modal */}
      <Modal
        visible={showReflectionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowReflectionModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Daily Dream Reflection</Text>
              <TouchableOpacity onPress={() => setShowReflectionModal(false)}>
                <X size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalPromptQuote}>"{displayReflectionPrompt}"</Text>

            <TextInput
              style={styles.modalTextInput}
              placeholder="Record your waking reflection or grounding thought..."
              placeholderTextColor="#9CA3AF"
              multiline
              value={reflectionNote}
              onChangeText={setReflectionNote}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[
                styles.modalSaveBtn,
                !reflectionNote.trim() && { opacity: 0.5 },
              ]}
              onPress={handleSaveReflectionNote}
              disabled={!reflectionNote.trim() || savingReflection}
              activeOpacity={0.85}
            >
              {savingReflection ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : reflectionSavedSuccess ? (
                <Text style={styles.modalSaveBtnText}>Saved ✓</Text>
              ) : (
                <Text style={styles.modalSaveBtnText}>Save Reflection Note</Text>
              )}
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
    backgroundColor: "#FAF9FC",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#FAF9FC",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 16,
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#F3F0F8",
  },
  backButtonText: {
    color: "#6B4FBB",
    fontWeight: "600",
  },

  // Header Bar
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 14 : 8,
    paddingBottom: 10,
    backgroundColor: "#FAF9FC",
    borderBottomWidth: 1,
    borderBottomColor: "#F0EDF6",
  },
  iconHit: {
    padding: 6,
  },
  headerCenterColumn: {
    alignItems: "center",
  },
  headerEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    color: "#7B7490",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  headerSubtext: {
    fontSize: 9,
    fontWeight: "500",
    color: "#9CA3AF",
    letterSpacing: 1,
    marginTop: 1,
  },

  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110,
  },

  // Title Section
  titleSection: {
    marginBottom: 16,
  },
  dreamTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E1B2E",
    letterSpacing: -0.3,
  },
  dateTagRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 8,
  },
  dateLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  lucidPillBadge: {
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#EDE8F7",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  lucidPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B4FBB",
  },

  // 1. Vision Portal Card
  visionPortalCard: {
    backgroundColor: "#15131C",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  visionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  visionCardEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8B7BB8",
    letterSpacing: 1.2,
  },
  mediaToggleGroup: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 6,
    padding: 2,
  },
  togglePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  togglePillActive: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  togglePillText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#9CA3AF",
  },
  togglePillTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  visualDisplayContainer: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    backgroundColor: "#0D0B1A",
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  portalImage: {
    width: "100%",
    height: "100%",
  },
  portalGraphicPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  },
  waveformGraphicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  waveBar: {
    width: 4,
    backgroundColor: "#4C3F75",
    borderRadius: 2,
  },
  generateVisionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6B4FBB",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  generateVisionBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  portalBottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(13,11,26,0.75)",
  },
  portalProjectionText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#D4CFEA",
  },
  portalTimestampText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#A78BFA",
  },

  portalActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  portalOutlineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 8,
    paddingVertical: 9,
  },
  portalOutlineBtnSaved: {
    borderColor: "#10B981",
  },
  portalOutlineBtnText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#F1F0FF",
  },

  // 2. White Card Container
  whiteCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EDEAF4",
    padding: 16,
    marginBottom: 14,
  },
  cardHeaderWithCount: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardEyebrowLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8B7BB8",
    letterSpacing: 1.2,
  },
  cardSubtextLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  wordCountBadge: {
    fontSize: 11,
    color: "#9CA3AF",
  },

  quoteBlock: {
    borderLeftWidth: 2,
    borderLeftColor: "#8B5CF6",
    paddingLeft: 12,
    paddingVertical: 2,
    marginBottom: 14,
  },
  memoryNarrativeText: {
    fontSize: 14,
    color: "#2D2D2D",
    lineHeight: 22,
    fontStyle: "italic",
  },

  // Audio Bar
  audioPlayerBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F8FD",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F0EDF8",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  audioPlayCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#8B5CF6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  audioMetaColumn: {
    flex: 1,
  },
  audioTitleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E1B2E",
  },
  audioDurationText: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 1,
  },
  audioTimestamp: {
    fontSize: 9,
    fontWeight: "600",
    color: "#9CA3AF",
    letterSpacing: 0.8,
  },

  // 3. Insight Signals
  biometricBadge: {
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#EDE8F7",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  biometricBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#8B5CF6",
    letterSpacing: 0.8,
  },
  signalBlock: {
    marginBottom: 14,
  },
  signalTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  signalNameText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E1B2E",
  },
  signalScoreText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E1B2E",
  },
  signalProgressBarTrack: {
    width: "100%",
    height: 5,
    borderRadius: 3,
    backgroundColor: "#EDE8F7",
    overflow: "hidden",
    marginBottom: 6,
  },
  signalProgressBarFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "#8B5CF6",
  },
  signalDescriptionText: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 17,
  },

  // 4 & 5. Symbols & Emotional Tone
  sectionSpacer: {
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  sectionSmallEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8B7BB8",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  symbolsInlineText: {
    fontSize: 13,
    color: "#2D2D2D",
    lineHeight: 20,
    fontWeight: "500",
  },
  toneChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },
  toneRectangularChip: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#EDEAF4",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  toneChipText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#4B5563",
  },
  toneSummarySubtext: {
    fontSize: 12,
    color: "#6B7280",
    fontStyle: "italic",
    marginTop: 4,
  },

  // 6. Reflection Prompt
  dailyBadge: {
    backgroundColor: "#F5F3FF",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dailyBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#8B5CF6",
    letterSpacing: 0.8,
  },
  reflectionQuoteText: {
    fontSize: 13,
    color: "#2D2D2D",
    lineHeight: 20,
    fontStyle: "italic",
    marginBottom: 14,
  },
  recordReflectionOutlineBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#8B5CF6",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  recordReflectionBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8B5CF6",
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E1B2E",
  },
  modalPromptQuote: {
    fontSize: 12,
    fontStyle: "italic",
    color: "#6B7280",
    marginBottom: 14,
  },
  modalTextInput: {
    borderWidth: 1,
    borderColor: "#EDEAF4",
    borderRadius: 10,
    padding: 12,
    minHeight: 100,
    fontSize: 14,
    color: "#1E1B2E",
    marginBottom: 14,
  },
  modalSaveBtn: {
    backgroundColor: "#1E1B2E",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSaveBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
});
