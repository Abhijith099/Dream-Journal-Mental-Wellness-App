import { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { authenticatedFetch as fetch, BACKEND_URL, BASE_SERVER_URL } from "../../utils/api";
import { ChevronLeft, X, Volume2, ScanLine, AlertTriangle, Image as ImageIcon, Video, Play, Pause, Eye, Grid, Droplet, MapPin, Bookmark, RefreshCw } from "lucide-react-native";
import { Image } from "expo-image";
import { Video as ExpoVideo, ResizeMode } from "expo-av";
import { BlurView } from "expo-blur";
import { LinearGradient as ExpoLinearGradient } from "expo-linear-gradient";
import { Colors, Fonts } from "@/constants/theme";

interface Dream {
  _id: string;
  title: string;
  description: string;
  memoryText?: string;
  isLucid: boolean;
  tags?: string[];
  aiInsight?: string;
  symbols?: string[];
  imageUrl?: string;
  isRecurring?: boolean;
  mood?: string;
  date: string;
}

// Client-side dictionary of dream symbol meanings matching the Android app
const SYMBOL_DICTIONARY: { [key: string]: string } = {
  Water: "often ties to emotional depth, flow, or sudden change.",
  Flying: "signals a desire for freedom, release, or high perspective.",
  Falling: "represents insecurity, loss of control, or waking anxiety.",
  Fire: "symbolizes intense passion, anger, transformation, or purification.",
  Chase: "suggests running from a waking life challenge or threat.",
  Chased: "suggests running from a waking life challenge or threat.",
  Darkness: "reflects the unknown, hidden fears, or raw potential.",
  Light: "indicates clarity, fresh understanding, or spiritual guidance.",
  School: "ties to performance anxiety or feeling evaluated.",
  Exam: "ties to performance anxiety or feeling evaluated.",
  Family: "relates to foundational connections, roles, or security.",
  Forest: "reflects the subconscious, growth, or feeling lost.",
  Mirror: "represents self-reflection, identity, or search for truth.",
  Door: "indicates new opportunities, transitions, or hidden secrets.",
  Clock: "reflects anxiety about time, aging, or missed windows.",
};

export default function DreamDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [dream, setDream] = useState<Dream | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'image' | 'video'>('image');
  const [generating, setGenerating] = useState(false);
  const [generatedMedia, setGeneratedMedia] = useState<any>(null);
  const [pollIntervalId, setPollIntervalId] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);

  const pollStatus = async (mediaId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/media/${mediaId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'completed' || data.status === 'failed') {
           setGenerating(false);
           setGeneratedMedia(data);
           return true; // done
        }
      }
    } catch(e) {
      console.log('poll error', e);
    }
    return false;
  };

  
  const handleSaveToGallery = async () => {
    if (!generatedMedia || isSaving || isSaved) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/media/${generatedMedia._id}/save`, {
        method: 'POST'
      });
      if (res.ok) {
        setIsSaved(true);
      } else {
        setErrorMsg("Failed to save. Please try again.");
      }
    } catch (e) {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    setErrorMsg(null);
    setGeneratedMedia(null);
    setIsSaved(false);
    try {
      const res = await fetch(`${BACKEND_URL}/dreams/${id}/generate-media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaType: activeTab })
      });
      if (!res.ok) {
        setErrorMsg("Failed to initiate generation. Please try again.");
        setGenerating(false);
        return;
      }
      const data = await res.json();
      
      if (activeTab === 'image') {
        setGenerating(false);
        setGeneratedMedia(data);
      } else {
        // Video polling
        const pid = setInterval(async () => {
          const done = await pollStatus(data._id);
          if (done) clearInterval(pid);
        }, 3000);
        setPollIntervalId(pid);
      }
    } catch(err) {
       setErrorMsg("Network error. Please try again.");
       setGenerating(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pollIntervalId) clearInterval(pollIntervalId);
    };
  }, [pollIntervalId]);


  useEffect(() => {
    if (!id) return;
    
    const fetchDreamDetails = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${BACKEND_URL}/dreams/${id}`);
        if (!res.ok) {
          throw new Error("Failed to fetch dream");
        }
        const data = await res.json();
        setDream(data);
      } catch (err) {
        console.error("Error fetching dream details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDreamDetails();
  }, [id]);

  const handleSpeakPrompt = (promptText: string) => {
    Alert.alert(
      "Read Aloud",
      "Playing reflection prompt audio signal...",
      [{ text: "Done", style: "cancel" }]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.light.text} />
      </SafeAreaView>
    );
  }

  if (!dream) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <AlertTriangle size={32} color={Colors.light.secondaryText} strokeWidth={1.5} />
        <Text style={styles.errorText}>Dream memory not found.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Calculate scores dynamically based on dream characteristics
  const calculateInsightScores = () => {
    const textLength = (dream.memoryText || dream.description || "").length;
    const clarityScore = Math.min(100, Math.max(25, Math.round(textLength / 6)));
    
    let lucidityScore = dream.isLucid ? 95 : 15;
    
    let stressScore = 20;
    if (dream.tags?.includes("Nightmare")) {
      stressScore = 85;
    } else if (dream.tags?.includes("Uncomfortable")) {
      stressScore = 55;
    } else if (dream.tags?.includes("Peaceful")) {
      stressScore = 10;
    }
    
    const confidenceScore = dream.isRecurring ? 80 : 40;

    return [
      { label: "Lucidity", score: lucidityScore, fillColor: Colors.light.cardSkyFilled },
      { label: "Clarity", score: clarityScore, fillColor: Colors.light.cardSandFilled },
      { label: "Stress Signal", score: stressScore, fillColor: Colors.light.cardBlushFilled },
      { label: "Pattern Confidence", score: confidenceScore, fillColor: Colors.light.cardMintFilled },
    ];
  };

  const scores = calculateInsightScores();

  // Get symbol meaning
  const getSymbolMeaning = (symbol: string) => {
    const cleanSym = symbol.charAt(0).toUpperCase() + symbol.slice(1).toLowerCase().trim();
    return SYMBOL_DICTIONARY[cleanSym] || "representing internal currents and unique personal themes.";
  };

  // Generate dynamic description for emotional tone if not stored
  const getEmotionalToneDescription = () => {
    if (dream.tags?.includes("Nightmare")) {
      return "An active distress signal showing unresolved tension or fear.";
    } else if (dream.tags?.includes("Peaceful")) {
      return "A serene, balanced signal indicating mental calm and harmony.";
    } else if (dream.tags?.includes("Surreal")) {
      return "A highly fluid, symbolic state with high dream architecture activity.";
    } else {
      return "A neutral, observant state processing daily thoughts and details.";
    }
  };

  // Generate dynamic reflection prompt if not stored
  const getReflectionPrompt = () => {
    if (dream.tags?.includes("Nightmare")) {
      return "What is this dream running from? Consider what waking stress you are currently avoiding.";
    } else if (dream.tags?.includes("Peaceful")) {
      return "How can you bring this feeling of quiet ease into your waking day tomorrow?";
    } else if (dream.symbols && dream.symbols.length > 0) {
      return `Reflect on the symbol of ${dream.symbols[0]}. Where does this theme appear in your current conscious life?`;
    } else {
      return "What key emotion from this dream lingers with you most now that you are awake?";
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={22} color={Colors.light.text} strokeWidth={1.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {dream.title}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Date line */}
        <Text style={styles.dateText}>
          {new Date(dream.date).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </Text>

        {/* 1. Dream Summary Card */}
        <View style={[styles.card, { backgroundColor: Colors.light.cardSand }]}>
          <Text style={styles.cardLabel}>Memory Playback</Text>
          <Text style={styles.memoryText}>
            {dream.memoryText || dream.description}
          </Text>
          {dream.aiInsight && (
            <View style={styles.aiInsightBox}>
              <ScanLine size={13} color={Colors.light.text} strokeWidth={1.5} />
              <Text style={styles.aiInsightText}>{dream.aiInsight}</Text>
            </View>
          )}
        </View>

        {/* 2. Symbols & Meanings Card */}
        <View style={styles.whiteCard}>
          <Text style={styles.cardLabelSecondary}>Symbols & Meanings</Text>
          {dream.symbols && dream.symbols.length > 0 ? (
            <View style={styles.symbolsList}>
              {dream.symbols.map((sym, index) => {
                const palette = [
                  Colors.light.cardMint,
                  Colors.light.cardBlush,
                  Colors.light.cardSky,
                ];
                const pillBg = palette[index % palette.length];
                return (
                  <View key={sym} style={styles.symbolRow}>
                    <View style={[styles.symbolPill, { backgroundColor: pillBg }]}>
                      <Text style={styles.symbolPillText}>{sym}</Text>
                    </View>
                    <Text style={styles.symbolMeaningText}>
                      — {getSymbolMeaning(sym)}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptyCardText}>No specific symbols detected in this log.</Text>
          )}
        </View>

        {/* 3. Emotional Tone Card */}
        <View style={styles.whiteCard}>
          <Text style={styles.cardLabelSecondary}>Emotional Tone</Text>
          <View style={styles.moodChipsRow}>
            {dream.tags?.slice(0, 3).map((tag, idx) => {
              const palette = [
                Colors.light.cardBlush,
                Colors.light.cardMint,
                Colors.light.cardSky,
              ];
              const chipBg = palette[idx % palette.length];
              return (
                <View key={tag} style={[styles.moodChip, { backgroundColor: chipBg }]}>
                  <Text style={styles.moodChipText}>{tag}</Text>
                </View>
              );
            })}
            {(!dream.tags || dream.tags.length === 0) && (
              <View style={[styles.moodChip, { backgroundColor: Colors.light.cardSand }]}>
                <Text style={styles.moodChipText}>{dream.mood || "neutral"}</Text>
              </View>
            )}
          </View>
          <Text style={styles.moodDescription}>
            {getEmotionalToneDescription()}
          </Text>
        </View>

        {/* 4. Reflection Prompt Card */}
        <View style={[styles.card, { backgroundColor: Colors.light.cardMint }]}>
          <View style={styles.promptHeader}>
            <Text style={styles.cardLabel}>Reflection Prompt</Text>
            <TouchableOpacity 
              style={styles.listenButton} 
              onPress={() => handleSpeakPrompt(getReflectionPrompt())}
              activeOpacity={0.7}
            >
              <Volume2 size={18} color={Colors.light.text} strokeWidth={1.5} />
            </TouchableOpacity>
          </View>
          <Text style={styles.promptText}>
            {getReflectionPrompt()}
          </Text>
        </View>

        {/* Re-Scripting Card (Only for difficult dreams) */}
        {(dream.tags?.some(t => ['nightmare', 'distressing', 'uncomfortable'].includes(t.toLowerCase()))) && (
          <View style={[styles.card, { backgroundColor: Colors.light.cardSky }]}>
            <Text style={styles.cardLabel}>Imagery Rehearsal</Text>
            <Text style={styles.promptText}>
              This dream was flagged as distressing. Rewrite its ending to change how it affects you.
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: Colors.light.text, paddingVertical: 12, borderRadius: 999, alignItems: 'center', marginTop: 16 }}
              onPress={() => router.push(`/dream/rescript/${dream._id}` as any)}
            >
              <Text style={{ color: '#FFFFFF', fontFamily: Fonts.bold, fontSize: 14 }}>Re-script this dream</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 5. Insight Scores Card */}
        <View style={styles.whiteCard}>
          <Text style={styles.cardLabelSecondary}>Insight Scores</Text>
          <View style={styles.scoresContainer}>
            {scores.map((item) => (
              <View key={item.label} style={styles.scoreRow}>
                <View style={styles.scoreInfoRow}>
                  <Text style={styles.scoreLabel}>{item.label}</Text>
                  <Text style={styles.scoreValue}>{item.score}%</Text>
                </View>
                {/* Progress bar track */}
                <View style={styles.progressBarTrack}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { width: `${item.score}%`, backgroundColor: item.fillColor }
                    ]} 
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Dream Generation Section */}
        <View style={[styles.card, { marginTop: 24, padding: 20 }]}>
          <Text style={styles.cardLabel}>Bring this dream to life</Text>
          
          <View style={{ flexDirection: 'row', backgroundColor: '#F0EFEA', borderRadius: 999, padding: 4, marginVertical: 16 }}>
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => !generating && setActiveTab('image')}
              style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 999, backgroundColor: activeTab === 'image' ? '#FFFFFF' : 'transparent', shadowOpacity: activeTab === 'image' ? 0.05 : 0, shadowRadius: 4 }}
            >
              <Text style={{ fontFamily: activeTab === 'image' ? Fonts.bold : Fonts.medium, color: activeTab === 'image' ? Colors.light.text : Colors.light.secondaryText }}>Image</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => !generating && setActiveTab('video')}
              style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 999, backgroundColor: activeTab === 'video' ? '#FFFFFF' : 'transparent', shadowOpacity: activeTab === 'video' ? 0.05 : 0, shadowRadius: 4 }}
            >
              <Text style={{ fontFamily: activeTab === 'video' ? Fonts.bold : Fonts.medium, color: activeTab === 'video' ? Colors.light.text : Colors.light.secondaryText }}>Video</Text>
            </TouchableOpacity>
          </View>

          {errorMsg ? (
            <Text style={{ color: Colors.light.cardMint, fontFamily: Fonts.medium, fontSize: 13, marginBottom: 12 }}>{errorMsg}</Text>
          ) : null}

          {!generatedMedia && !generating ? (
            <TouchableOpacity 
              style={{ backgroundColor: Colors.light.tint, paddingVertical: 14, borderRadius: 999, alignItems: 'center' }}
              onPress={handleGenerate}
            >
              <Text style={{ color: '#FFFFFF', fontFamily: Fonts.bold, fontSize: 15 }}>Generate</Text>
            </TouchableOpacity>
          ) : null}

          {generating ? (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <ActivityIndicator size="small" color={Colors.light.tint} />
              <Text style={{ marginTop: 12, fontFamily: Fonts.medium, color: Colors.light.secondaryText, fontSize: 14 }}>
                {activeTab === 'image' ? 'Crafting your image...' : 'Rendering your dream...'}
              </Text>
            </View>
          ) : null}

          {generatedMedia && generatedMedia.status === 'completed' ? (
            <View style={{ marginTop: 8 }}>
              {generatedMedia.mediaType === 'image' ? (
                 <TouchableOpacity activeOpacity={0.9} onPress={() => setIsImageModalVisible(true)}>
                   <Image 
                     source={{ uri: `${BASE_SERVER_URL}${generatedMedia.mediaUrl}` }} 
                     style={{ width: '100%', height: 240, borderRadius: 16, backgroundColor: '#EFEFEF' }}
                     contentFit="cover"
                   />
                 </TouchableOpacity>
              ) : (
                 <ExpoVideo
                   source={{ uri: `${BASE_SERVER_URL}${generatedMedia.mediaUrl}` }}
                   style={{ width: '100%', height: 240, borderRadius: 16 }}
                   useNativeControls
                   resizeMode={ResizeMode.COVER}
                 />
              )}
              
              {isSaved ? (
                <View style={{ alignItems: 'center', marginTop: 16 }}>
                  <Text style={{ fontFamily: Fonts.medium, color: Colors.light.secondaryText, fontSize: 13 }}>
                    Saved to your Gallery
                  </Text>
                  <TouchableOpacity 
                    style={{ marginTop: 12, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 999, backgroundColor: '#F0EFEA' }}
                    onPress={handleGenerate}
                    disabled={generating}
                  >
                    <Text style={{ color: Colors.light.text, fontFamily: Fonts.bold, fontSize: 14 }}>Regenerate</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 16 }}>
                  <TouchableOpacity 
                    style={{ flex: 1, backgroundColor: Colors.light.tint, paddingVertical: 12, borderRadius: 999, alignItems: 'center', opacity: isSaving ? 0.7 : 1 }}
                    onPress={handleSaveToGallery}
                    disabled={isSaving || generating}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={{ color: '#FFFFFF', fontFamily: Fonts.bold, fontSize: 14 }}>Save to Gallery</Text>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={{ flex: 1, backgroundColor: '#F0EFEA', paddingVertical: 12, borderRadius: 999, alignItems: 'center', opacity: generating ? 0.7 : 1 }}
                    onPress={handleGenerate}
                    disabled={generating || isSaving}
                  >
                    <Text style={{ color: Colors.light.text, fontFamily: Fonts.bold, fontSize: 14 }}>Regenerate</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : null}

          {generatedMedia && generatedMedia.status === 'failed' ? (
            <View style={{ marginTop: 8, alignItems: 'center' }}>
               <Text style={{ color: Colors.light.secondaryText, fontFamily: Fonts.medium, fontSize: 13, marginBottom: 12 }}>
                 {generatedMedia.errorMessage || "Generation failed."}
               </Text>
               <TouchableOpacity 
                style={{ backgroundColor: Colors.light.tint, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 999, alignItems: 'center' }}
                onPress={handleGenerate}
               >
                <Text style={{ color: '#FFFFFF', fontFamily: Fonts.bold, fontSize: 14 }}>Retry</Text>
               </TouchableOpacity>
            </View>
          ) : null}

        </View>

      </ScrollView>

      {/* Fullscreen Image Modal */}
      <Modal visible={isImageModalVisible} transparent={true} animationType="fade" onRequestClose={() => setIsImageModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity 
            style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 999 }}
            onPress={() => setIsImageModalVisible(false)}
          >
            <X size={22} color="#FFF" strokeWidth={1.5} />
          </TouchableOpacity>
          {generatedMedia && generatedMedia.mediaType === 'image' ? (
            <Image 
              source={{ uri: `${BASE_SERVER_URL}${generatedMedia.mediaUrl}` }} 
              style={{ width: '100%', height: '80%' }}
              contentFit="contain"
            />
          ) : null}
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 56,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.light.text,
    flex: 1,
    textAlign: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
    gap: 16,
  },
  dateText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: Colors.light.secondaryText,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  card: {
    borderRadius: 22,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  whiteCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.light.text,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  cardLabelSecondary: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.light.secondaryText,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 14,
  },
  memoryText: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.light.text,
    lineHeight: 23,
  },
  aiInsightBox: {
    flexDirection: "row",
    gap: 8,
    borderTopWidth: 1,
    borderColor: "rgba(26, 26, 46, 0.06)",
    paddingTop: 14,
    marginTop: 14,
  },
  aiInsightText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.light.text,
    lineHeight: 18,
  },
  symbolsList: {
    gap: 12,
  },
  symbolRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  symbolPill: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  symbolPillText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    color: Colors.light.text,
  },
  symbolMeaningText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.light.text,
    marginLeft: 6,
    flex: 1,
  },
  moodChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  moodChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  moodChipText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    color: Colors.light.text,
  },
  moodDescription: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.light.secondaryText,
    lineHeight: 18,
  },
  promptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  listenButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(26, 26, 46, 0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  promptText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: Colors.light.text,
    lineHeight: 22,
  },
  scoresContainer: {
    gap: 14,
  },
  scoreRow: {
    gap: 6,
  },
  scoreInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scoreLabel: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.light.text,
  },
  scoreValue: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: Colors.light.text,
  },
  progressBarTrack: {
    height: 8,
    width: "100%",
    backgroundColor: "#F0EFEA",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  errorText: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: Colors.light.secondaryText,
    marginTop: 10,
    marginBottom: 20,
  },
  backBtn: {
    backgroundColor: Colors.light.buttonPrimary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  backBtnText: {
    color: Colors.light.buttonPrimaryText,
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
  emptyCardText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.light.secondaryText,
    fontStyle: "italic",
  },
});
