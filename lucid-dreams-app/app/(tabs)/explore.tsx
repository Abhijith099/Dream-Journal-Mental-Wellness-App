import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  FlatList,
  useWindowDimensions,
  Alert,
  Share,
  ActionSheetIOS,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Search,
  Compass,
  ChevronRight,
  ChevronLeft,
  ShieldAlert,
  Target,
  CheckCircle,
  CheckSquare,
  Check,
  Square,
  Heart,
  ArrowRight,
  GitMerge,
  Zap,
  Circle,
  Play,
  Sun,
  RefreshCw,
  Lock,
  Image as ImageIcon,
  HeartHandshake,
  Fingerprint,
  Users,
  Volume2,
  Clock,
  Moon,
  Cloud,
  CloudSun,
  CloudLightning,
  Activity,
  PlusCircle,
  Trophy,
  Contact,
  Archive,
  Feather,
  BookOpen,
  Wind,
  Brain,
  Anchor,
  Sparkles,
  MoreVertical,
  MoreHorizontal,
  ArrowUpRight,
  Sliders,
  Plus,
  RotateCcw,
} from "lucide-react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import { authenticatedFetch as fetch, BACKEND_URL } from "../../utils/api";
import SomaticCheckInCard from "@/components/wellness/SomaticCheckInCard";
import SomaticNextStepCard from "@/components/wellness/SomaticNextStepCard";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  withRepeat,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { LinearGradient as ExpoLinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import SafeBottomSheet from "@/components/SafeBottomSheet";
import * as Haptics from "expo-haptics";
import { Colors, Fonts } from "@/constants/theme";

const { width: screenWidth } = Dimensions.get('window');

const Theme = {
  accentBlue: Colors.light.cardSky,
  accentCoral: Colors.light.cardMint,
  textPrimary: Colors.light.text,
  textSecondary: Colors.light.secondaryText,
  cardBg: '#FFFFFF',
};

interface MoodItemConfig {
  name: string;
  tag: string;
  bg: string;
  iconColor: string;
  icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  unselectedLabelColor: string;
  selectedLabelColor: string;
}

const MOOD_ITEMS: MoodItemConfig[] = [
  {
    name: "Calm",
    tag: "calm",
    bg: "#DFF0FF",
    iconColor: "#2A7AB8",
    icon: Sun,
    unselectedLabelColor: "#4B5563",
    selectedLabelColor: "#1D4E7A",
  },
  {
    name: "Okay",
    tag: "okay",
    bg: "#DCFCE7",
    iconColor: "#15803D",
    icon: CloudSun,
    unselectedLabelColor: "#4B5563",
    selectedLabelColor: "#14532D",
  },
  {
    name: "Tense",
    tag: "tense",
    bg: "#FEF3C7",
    iconColor: "#B45309",
    icon: Cloud,
    unselectedLabelColor: "#4B5563",
    selectedLabelColor: "#78350F",
  },
  {
    name: "Low",
    tag: "low",
    bg: "#EDE9FE",
    iconColor: "#6D28D9",
    icon: Moon,
    unselectedLabelColor: "#4B5563",
    selectedLabelColor: "#4C1D95",
  },
  {
    name: "Overwhelmed",
    tag: "overwhelmed",
    bg: "#FFE4E6",
    iconColor: "#BE123C",
    icon: CloudLightning,
    unselectedLabelColor: "#4B5563",
    selectedLabelColor: "#9F1239",
  },
];

const getMoodAccentColor = (tag: string) => {
  const lower = (tag || "").toLowerCase();
  if (lower.includes("calm")) return "#2A7AB8";
  if (lower.includes("okay")) return "#15803D";
  if (lower.includes("tense")) return "#B45309";
  if (lower.includes("low")) return "#6D28D9";
  if (lower.includes("overwhelm")) return "#BE123C";
  return "#6B4FBB";
};

function MoodOrbItem({
  mood,
  isSelected,
  onPress,
}: {
  mood: MoodItemConfig;
  isSelected: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(isSelected ? 1.08 : 1.0);
  const opacity = useSharedValue(isSelected ? 1.0 : 0.45);

  useEffect(() => {
    scale.value = withSpring(isSelected ? 1.08 : 1.0, {
      stiffness: 180,
      damping: 14,
    });
    opacity.value = withSpring(isSelected ? 1.0 : 0.45, {
      stiffness: 180,
      damping: 14,
    });
  }, [isSelected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const IconComp = mood.icon;

  return (
    <Pressable
      onPress={onPress}
      style={styles.moodOrbContainer}
      accessibilityRole="button"
      accessibilityLabel={`Mood: ${mood.name}`}
    >
      <Animated.View
        style={[
          styles.moodOrbCircle,
          {
            backgroundColor: mood.bg,
            shadowColor: mood.iconColor,
            shadowOpacity: isSelected ? 0.35 : 0,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: isSelected ? 5 : 0,
          },
          animatedStyle,
        ]}
      >
        <IconComp size={22} color={mood.iconColor} strokeWidth={1.5} />
      </Animated.View>
      <Text
        style={[
          styles.moodOrbText,
          {
            color: isSelected
              ? mood.selectedLabelColor
              : mood.unselectedLabelColor,
            fontWeight: isSelected ? "600" : "500",
          },
        ]}
      >
        {mood.name}
      </Text>
    </Pressable>
  );
}

function WellnessTabChip({
  tab,
  isActive,
  onPress,
}: {
  tab: { id: string; label: string; icon?: React.ComponentType<any> };
  isActive: boolean;
  onPress: () => void;
}) {
  const activeOpacity = useSharedValue(isActive ? 1 : 0);
  const IconComp = tab.icon;

  useEffect(() => {
    activeOpacity.value = withTiming(isActive ? 1 : 0, { duration: 150 });
  }, [isActive]);

  const animatedBgStyle = useAnimatedStyle(() => ({
    opacity: activeOpacity.value,
  }));

  return (
    <Pressable
      onPress={onPress}
      style={styles.wellnessTabChip}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          styles.wellnessTabChipActiveBg,
          animatedBgStyle,
        ]}
      />
      {IconComp && (
        <IconComp
          size={13}
          color={isActive ? "#F9F9F7" : "rgba(45, 45, 45, 0.7)"}
          strokeWidth={1.5}
          style={{ marginRight: 8 }}
        />
      )}
      <Text
        style={[
          styles.wellnessTabChipText,
          isActive && styles.wellnessTabChipTextActive,
        ]}
      >
        {tab.label}
      </Text>
    </Pressable>
  );
}

function renderMoodCharacter(moodTag: string, size = 48) {
  return <Circle size={size} color="#2D2D2D" strokeWidth={1.5} />;
}

interface Dream {
  _id: string;
  title: string;
  description: string;
  memoryText?: string;
  isLucid: boolean;
  tags?: string[];
  aiInsight?: string;
  symbols?: string[];
  image?: string;
  imageUrl?: string;
  mediaType?: 'pending' | 'image' | 'video';
  videoUrl?: string;
  date: string;
  createdAt?: string;
  somaticArchiveTag?: string;
}

interface CopingCardData {
  _id: string;
  category: string;
  negativePattern: string;
  gentleReframing: string;
  actionStep: string;
}

interface MoodLogEntry {
  _id: string;
  energyLevel: number;
  emotionTag: string;
  createdAt: string;
}

interface PeerStoryData {
  _id: string;
  title: string;
  body: string;
  category?: string;
  isAnonymous?: boolean;
  authorName?: string;
  approved: boolean;
  likeCount?: number;
  createdAt: string;
}

interface ThoughtRecordData {
  _id: string;
  situation: string;
  automaticThought: string;
  distortion: string;
  rationalResponse: string;
  createdAt: string;
}

interface BehavioralTaskData {
  _id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

const PRESETS = ["All", "Lucid", "Nightmare", "Peaceful", "Surreal", "Recurring"];
const ARCHIVE_FILTER_CHIPS = ["All", "Lucid", "Nightmare", "Peaceful", "Surreal", "Recurring"];

const ARCHIVE_TABS = [
  { key: "memories", label: "Memories" },
  { key: "gallery", label: "Gallery" },
  { key: "wins", label: "Past wins" },
];

const formatDreamDate = (dateString?: string) => {
  if (!dateString) return "RECENT";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "RECENT";
    const month = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
    const day = d.getDate();
    return `${month} ${day}`;
  } catch {
    return "RECENT";
  }
};

const getDreamTypeLabel = (dream: Dream) => {
  if (dream.somaticArchiveTag) {
    return dream.somaticArchiveTag.replace(/_/g, " ");
  }
  const tags = (dream.tags || []).map((t) => t.toLowerCase());
  const isLucid = Boolean(dream.isLucid || tags.includes("lucid"));
  const isPeaceful = tags.includes("peaceful") || tags.includes("calm");
  const isNightmare = tags.includes("nightmare") || tags.includes("disturbing") || tags.includes("tense");
  const isSurreal = tags.includes("surreal");
  const isRecurring = tags.includes("recurring");

  if (isLucid && isPeaceful) return "DEEP SOMATIC REST";
  if (isNightmare) return "TENSION DISCHARGE";
  if (isSurreal && isRecurring) return "SUBCONSCIOUS ECHO";
  if (isLucid) return "LUCID STATE";
  if (isPeaceful) return "REST ARCHIVE";
  return "MEMORY LOG";
};

const getGalleryTagStyle = (tags: string[] = []) => {
  const upperTags = tags.map(t => t.toUpperCase());
  if (upperTags.includes('NIGHTMARE')) {
    return { bg: '#F9D6D5', text: '#C0392B', name: 'NIGHTMARE' };
  }
  if (upperTags.includes('LUCID')) {
    return { bg: '#DAD6F5', text: '#5B4B9E', name: 'LUCID' };
  }
  if (upperTags.includes('PEACEFUL')) {
    return { bg: '#E8E3F5', text: '#7B6FA0', name: 'PEACEFUL' };
  }
  if (upperTags.includes('MYSTICAL') || upperTags.includes('SURREAL')) {
    return { bg: '#F0E6D2', text: '#9C7A3C', name: 'MYSTICAL' };
  }
  return { bg: '#E8E3F5', text: '#7B6FA0', name: tags[0]?.toUpperCase() || 'PEACEFUL' };
};

const GALLERY_FILTERS = [
  { id: 'all', label: 'ALL LANDSCAPES' },
  { id: 'lucid', label: 'LUCID (1)' },
  { id: 'atmospheric', label: 'ATMOSPHERIC (3)' },
  { id: 'peaceful', label: 'PEACEFUL' },
  { id: 'recurring', label: 'RECURRING' },
];

const getClinicalRecallLabel = (item: Dream, index: number) => {
  const dateStr = item.date
    ? new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "Sep 2";
  const upperTags = (item.tags || []).map((t) => t.toUpperCase());
  let theme = "HIGH RECALL";
  if (upperTags.includes("PEACEFUL")) theme = "DEEP SOMATIC REST";
  else if (upperTags.includes("NIGHTMARE")) theme = "TENSION DISCHARGE";
  else if (upperTags.includes("LUCID")) theme = "LUCID RECALL";
  else if (upperTags.includes("RECURRING")) theme = "RECURRING PATTERN";
  else if (index % 3 === 0) theme = "HIGH RECALL";
  else if (index % 3 === 1) theme = "DEEP SOMATIC REST";
  else if (index % 3 === 2) theme = "TENSION DISCHARGE";
  return `${dateStr} • ${theme}`;
};

const getWinClinicalBadge = (item: any, index: number) => {
  if (item.category) {
    const cat = item.category.toUpperCase();
    if (cat.includes('REGULATION')) return 'REGULATION';
    if (cat.includes('GROUNDING')) return 'GROUNDING';
    if (cat.includes('VAGAL')) return 'VAGAL TONE';
    if (cat.includes('REST') || cat.includes('SLEEP')) return 'SOMATIC REST';
    if (cat.includes('COGNITIVE')) return 'COGNITIVE REFOCUS';
  }
  const badges = ['REGULATION', 'GROUNDING', 'VAGAL TONE', 'SOMATIC ANCHOR', 'INTEGRATION'];
  return badges[index % badges.length];
};

const formatWinTime = (dateStr?: string) => {
  if (!dateStr) return '9:15 AM';
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '9:15 AM';
  }
};

function GalleryCard({ item }: { item: Dream }) {
  const tagStyle = getGalleryTagStyle(item.tags);
  const imageUri = item.image || item.imageUrl
    ? `${BACKEND_URL.replace('/api', '')}${item.image || item.imageUrl}`
    : null;

  return (
    <TouchableOpacity
      style={styles.galleryCardContainer}
      onPress={() => router.push(`/dream/${item._id}` as any)}
      activeOpacity={0.88}
    >
      <View style={styles.galleryMediaWrapper}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.galleryCardImage}
            contentFit="cover"
          />
        ) : (
          <View style={styles.galleryPlaceholder}>
            <ImageIcon size={26} color="#8B7BB8" strokeWidth={1.5} />
          </View>
        )}

        {/* Diagonal expand arrow icon at top right */}
        <View style={styles.galleryExpandBadge}>
          <ArrowUpRight size={12} color="#FFFFFF" strokeWidth={2.4} />
        </View>

        {/* The Gradient Overlay: positioned absolutely over the bottom 40% of the image */}
        <ExpoLinearGradient
          colors={['transparent', 'rgba(30, 27, 75, 0.85)']}
          style={styles.galleryGradientOverlay}
        />

        {/* Text on Image: Position title and date over the dark gradient */}
        <View style={styles.galleryTextOverlay}>
          <Text style={styles.galleryCardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.galleryCardBottomRow}>
            <Text style={styles.galleryCardDate}>
              {new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </Text>
            <View style={styles.galleryBadgePill}>
              <Text style={styles.galleryBadgeText}>
                {tagStyle.name}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ExploreScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [currentTab, setCurrentTab] = useState<"memories" | "wellness" | "gallery" | "wins">("memories");
  const [wellnessMode, setWellnessMode] = useState<"somatic" | "cbt">("somatic");
  const [latestSomaticScale, setLatestSomaticScale] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("All");

  // Dreams States
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [filteredDreams, setFilteredDreams] = useState<Dream[]>([]);
  const [loading, setLoading] = useState(true);

  const params = useLocalSearchParams<{ tab?: string; subTab?: string; mode?: string }>();

  // Tab layout measurements & sliding underline indicator
  const [tabMeasurements, setTabMeasurements] = useState<Record<string, { x: number; width: number }>>({});
  const tabIndicatorX = useSharedValue(0);
  const tabIndicatorWidth = useSharedValue(0);
  const hasInitializedTabIndicator = useRef(false);

  useEffect(() => {
    const layout = tabMeasurements[currentTab];
    if (layout && layout.width > 0) {
      if (!hasInitializedTabIndicator.current) {
        tabIndicatorX.value = layout.x;
        tabIndicatorWidth.value = layout.width;
        hasInitializedTabIndicator.current = true;
      } else {
        tabIndicatorX.value = withSpring(layout.x, { damping: 20, stiffness: 130 });
        tabIndicatorWidth.value = withSpring(layout.width, { damping: 20, stiffness: 130 });
      }
    }
  }, [currentTab, tabMeasurements]);

  const animatedTabUnderlineStyle = useAnimatedStyle(() => ({
    position: "absolute",
    bottom: 0,
    left: tabIndicatorX.value,
    width: tabIndicatorWidth.value,
    height: 2,
    backgroundColor: "#6B4FBB",
    borderRadius: 1,
  }));

  const confirmDeleteDream = (dreamId: string) => {
    Alert.alert(
      "Delete Memory",
      "Are you sure you want to remove this dream from your somatic archive?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetch(`${BACKEND_URL}/dreams/${dreamId}`, {
                method: "DELETE",
              });
              if (res.ok) {
                setDreams((prev) => prev.filter((d) => d._id !== dreamId));
                setFilteredDreams((prev) => prev.filter((d) => d._id !== dreamId));
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            } catch (err) {
              console.error("Failed to delete dream:", err);
            }
          },
        },
      ]
    );
  };

  const handleDreamMenu = (dream: Dream) => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Edit Dream", "Share Dream", "Delete Dream"],
          destructiveButtonIndex: 3,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            router.push({ pathname: "/add", params: { editId: dream._id } });
          } else if (buttonIndex === 2) {
            Share.share({
              title: dream.title,
              message: `${dream.title}\n\n${dream.memoryText || dream.description || ""}`,
            });
          } else if (buttonIndex === 3) {
            confirmDeleteDream(dream._id);
          }
        }
      );
    } else {
      Alert.alert(
        dream.title || "Memory Options",
        "Choose an action for this dream entry",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Edit",
            onPress: () => router.push({ pathname: "/add", params: { editId: dream._id } }),
          },
          {
            text: "Share",
            onPress: () => {
              Share.share({
                title: dream.title,
                message: `${dream.title}\n\n${dream.memoryText || dream.description || ""}`,
              });
            },
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => confirmDeleteDream(dream._id),
          },
        ]
      );
    }
  };

  useEffect(() => {
    if (params.tab === "wellness" || params.tab === "somatic") {
      setCurrentTab("wellness");
      if (params.subTab === "cbt" || params.mode === "cbt") {
        setWellnessMode("cbt");
      }
    } else if (params.tab === "cbt") {
      setCurrentTab("wellness");
      setWellnessMode("cbt");
    } else if (params.tab === "memories") {
      setCurrentTab("memories");
    } else if (params.tab === "gallery") {
      setCurrentTab("gallery");
    } else if (params.tab === "wins" || params.tab === "done" || params.tab === "smallWins") {
      setCurrentTab("wins");
    } else if (params.tab === "memorySupport" || params.tab === "memory-support") {
      setCurrentTab("wellness");
    }
  }, [params.tab, params.subTab, params.mode]);

  // --- 1. CBT Tab States
  const [behavioralTasks, setBehavioralTasks] = useState<BehavioralTaskData[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [loadingTasks, setLoadingTasks] = useState(true);

  // --- 2. Somatic Tab States
  const microActions = [
    "Find a glass of water and take a slow sip.",
    "Roll your shoulders backward three times slowly.",
    "Look out the nearest window and find one green object.",
    "Feel the physical weight of your feet flat against the floor.",
    "Relax your jaw and let your shoulders drop slightly.",
    "Name three items in your line of sight that are circular.",
  ];
  const [currentMicroStep, setCurrentMicroStep] = useState(microActions[0]);

  // --- 3. Small Wins Tab States
  const [microTask, setMicroTask] = useState<any>({
    taskText: "Stretch your arms above your head for 30 seconds.",
    category: "Physical Grounding",
  });
  const [isTaskCompleted, setIsTaskCompleted] = useState(true);
  const [generatingWin, setGeneratingWin] = useState(false);
  const [savingWin, setSavingWin] = useState(false);
  const [doneItems, setDoneItems] = useState<any[]>([]);
  const [manualDoneText, setManualDoneText] = useState("");
  const [loadingDone, setLoadingDone] = useState(true);
  
  const bottomSheetRef = useRef<any>(null);
  const [masteryScore, setMasteryScore] = useState(3);
  const [pleasureScore, setPleasureScore] = useState(4);
  const winCardAnim = useSharedValue(1);

  // --- 4. Mood Tab States
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [moodConfirmed, setMoodConfirmed] = useState(false);
  const [moodHistory, setMoodHistory] = useState<MoodLogEntry[]>([]);

  
  // --- 6. Gallery Tab States
  const [gallerySearchQuery, setGallerySearchQuery] = useState("");
  const [galleryFilter, setGalleryFilter] = useState("all");
  const [filteredGalleryDreams, setFilteredGalleryDreams] = useState<Dream[]>([]);


  // --- 5. Peer Stories Tab States
  const [stories, setStories] = useState<PeerStoryData[]>([]);
  const [loadingStories, setLoadingStories] = useState(true);

  // Lifecycle
  useEffect(() => {
    fetchDreams();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (currentTab === "gallery") {
        fetchDreams();
      } else if (currentTab === "wellness") {
        fetchPeerStories();
      } else if (currentTab === "wins") {
        fetchDoneList();
      }
    }, [currentTab])
  );

  useEffect(() => {
    if (currentTab === "wellness") {
      setSearchQuery("");
      fetchBehavioralTasks();
      fetchMoodHistory();
      fetchPeerStories();
    } else if (currentTab === "wins") {
      fetchDoneList();
    } else {
      fetchDreams();
      setSearchQuery("");
    }
  }, [currentTab]);

  const fetchDoneList = async () => {
    try {
      setLoadingDone(true);
      const res = await fetch(`${BACKEND_URL}/wellness/done-list`);
      const data = await res.json();
      setDoneItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("Error loading done list:", err);
    } finally {
      setLoadingDone(false);
    }
  };

  const generateWin = async () => {
    try {
      setGeneratingWin(true);
      const res = await fetch(`${BACKEND_URL}/wellness/random-task`);
      if (res.ok) {
        const data = await res.json();
        winCardAnim.value = withTiming(0, { duration: 150 }, () => {
          runOnJS(setMicroTask)(data);
          runOnJS(setIsTaskCompleted)(false);
          runOnJS(setMasteryScore)(3);
          runOnJS(setPleasureScore)(4);
          winCardAnim.value = withTiming(1, { duration: 200 });
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (err) {
      console.log("Error fetching random task:", err);
    } finally {
      setGeneratingWin(false);
    }
  };

  const submitWin = async () => {
    const taskText = microTask?.taskText || "Stretch your arms above your head for 30 seconds.";
    const category = microTask?.category || "Physical Grounding";
    try {
      setSavingWin(true);
      const res = await fetch(`${BACKEND_URL}/wellness/wins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskText,
          category,
          masteryScore: masteryScore || 3,
          pleasureScore: pleasureScore || 4,
        }),
      });
      if (res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsTaskCompleted(false);
        await fetchDoneList();
        generateWin();
      }
    } catch (err) {
      console.log("Error submitting win:", err);
    } finally {
      setSavingWin(false);
    }
  };

  const submitManualWin = async () => {
    if (!manualDoneText.trim()) return;
    try {
      const res = await fetch(`${BACKEND_URL}/wellness/done-list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskText: manualDoneText })
      });
      if (res.ok) {
        setManualDoneText("");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        fetchDoneList();
      }
    } catch (err) {
      console.log("Error submitting manual win:", err);
    }
  };

  const fetchDreams = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/dreams`);
      const data = await res.json();
      setDreams(Array.isArray(data) ? data : (data?.dreams || []));
    } catch (err) {
      console.error("Error fetching dreams:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMoodHistory = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/wellness/mood-history`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMoodHistory(data.reverse());
        const todayString = new Date().toDateString();
        const checkedToday = data.find(
          (entry) => new Date(entry.createdAt).toDateString() === todayString
        );
        if (checkedToday) {
          setMoodConfirmed(true);
          setSelectedMood(checkedToday.emotionTag.charAt(0).toUpperCase() + checkedToday.emotionTag.slice(1));
        } else {
          setMoodConfirmed(false);
        }
      }
    } catch (err) {
      console.log("Error fetching mood history:", err);
    }
  };

  const fetchPeerStories = async () => {
    try {
      setLoadingStories(true);
      const res = await fetch(`${BACKEND_URL}/peer-stories`);
      const data = await res.json();
      setStories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("Error loading peer stories:", err);
    } finally {
      setLoadingStories(false);
    }
  };

  useEffect(() => {
    let result = dreams;
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(query) ||
          d.description.toLowerCase().includes(query) ||
          d.symbols?.some((s) => s.toLowerCase().includes(query))
      );
    }
    if (selectedTag !== "All") {
      if (selectedTag === "Lucid") {
        result = result.filter((d) => d.isLucid);
      } else {
        result = result.filter((d) => d.tags?.includes(selectedTag));
      }
    }
    setFilteredDreams(result);
  }, [searchQuery, selectedTag, dreams]);

  useEffect(() => {
    let result = dreams.filter(d => (d.image || d.imageUrl || d.mediaType) && d.mediaType !== 'pending');
    if (result.length === 0) {
      result = dreams;
    }
    if (gallerySearchQuery.trim() !== "") {
      const query = gallerySearchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(query) ||
          d.description?.toLowerCase().includes(query) ||
          d.tags?.some((t) => t.toLowerCase().includes(query))
      );
    }
    if (galleryFilter !== "all") {
      if (galleryFilter === "lucid") {
        result = result.filter(d => d.isLucid || d.tags?.some(t => t.toLowerCase().includes('lucid')));
      } else {
        result = result.filter(d => d.tags?.some(t => t.toLowerCase().includes(galleryFilter)));
      }
    }
    setFilteredGalleryDreams(result);
  }, [gallerySearchQuery, galleryFilter, dreams]);

  const getPillColor = (tag: string) => {
    return "#E8E3F5";
  };

  const getCardStyle = (tags: string[] = []) => {
    if (tags.includes('Peaceful')) {
      return { bg: '#F0EEF8', tagBg: 'rgba(128, 105, 191, 0.15)', tagText: '#8069BF', icon: Sun, iconColor: '#8069BF' };
    }
    if (tags.includes('Recurring') || tags.includes('Nightmare') || tags.includes('Surreal')) {
      const IconComp = tags.includes('Nightmare') ? ShieldAlert : tags.includes('Recurring') ? RefreshCw : GitMerge;
      return { bg: '#F8EEF2', tagBg: 'rgba(124, 114, 150, 0.15)', tagText: '#7C7296', icon: IconComp, iconColor: '#7C7296' };
    }
    // Neutral
    return { bg: '#F5F4F1', tagBg: 'rgba(45, 45, 45, 0.05)', tagText: '#2D2D2D', icon: null, iconColor: null };
  };

  const fetchBehavioralTasks = async () => {
    try {
      setLoadingTasks(true);
      const res = await fetch(`${BACKEND_URL}/wellness/behavioral-tasks`);
      const data = await res.json();
      setBehavioralTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("Error loading tasks:", err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const submitBehavioralTask = async () => {
    if (!newTaskTitle.trim()) return;
    try {
      const res = await fetch(`${BACKEND_URL}/wellness/behavioral-tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTaskTitle })
      });
      if (res.ok) {
        setNewTaskTitle("");
        fetchBehavioralTasks();
      }
    } catch (err) {
      console.log("Error adding task", err);
    }
  };

  const toggleBehavioralTask = async (taskId: string, completed: boolean) => {
    try {
      const res = await fetch(`${BACKEND_URL}/wellness/behavioral-tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !completed })
      });
      if (res.ok) {
        fetchBehavioralTasks();
      }
    } catch (err) {
      console.log("Error updating task", err);
    }
  };

  const handleMoodCheckIn = async (mood: string) => {
    setSelectedMood(mood);
    try {
      const res = await fetch(`${BACKEND_URL}/wellness/mood-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ energyLevel: 3, emotionTag: mood.toLowerCase() }),
      });
      if (res.ok) {
        setMoodConfirmed(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        fetchMoodHistory();
      }
    } catch (err) {
      console.error("Error submitting mood log:", err);
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: '#FAF9FC',
        },
      ]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          {currentTab === "wellness" ? (
            <View>
              <View style={styles.wellnessHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.wellnessHeaderSub}>SOMATIC EQUILIBRIUM</Text>
                  <Text style={styles.wellnessHeaderTitle}>Wellness Space</Text>
                </View>
                <TouchableOpacity
                  style={styles.archiveWellnessShortcutBtn}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setCurrentTab("memories");
                  }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Navigate to Somatic Archives"
                >
                  <Archive size={14} color="#1E1B4B" strokeWidth={1.8} />
                  <Text style={styles.archiveWellnessShortcutText}>Archives</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View>
              {currentTab === "wins" && (
                <View style={styles.sessionStatusRow}>
                  <View style={styles.sessionActiveDotRow}>
                    <View style={styles.sessionActiveDot} />
                    <Text style={styles.sessionActiveText}>Session Active</Text>
                  </View>
                  <View style={styles.pacedBadge}>
                    <Clock size={11} color="#7C3AED" strokeWidth={1.8} style={{ marginRight: 4 }} />
                    <Text style={styles.pacedBadgeText}>Paced</Text>
                  </View>
                </View>
              )}
              {/* Task 1 & Task 2: Header Title and Compact Wellness Shortcut Button */}
              <View style={styles.archiveHeaderRow}>
                <Text style={styles.archiveMainTitle}>
                  {currentTab === "gallery"
                    ? "Visual Gallery"
                    : currentTab === "wins"
                    ? "Accomplishments"
                    : "Somatic Memories"}
                </Text>

                <TouchableOpacity
                  style={styles.archiveWellnessShortcutBtn}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setCurrentTab("wellness");
                    setWellnessMode("cbt");
                  }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Navigate to Wellness"
                >
                  <Compass size={13} color="#6B4FBB" strokeWidth={1.5} />
                  <Text style={styles.archiveWellnessShortcutText}>Wellness</Text>
                </TouchableOpacity>
              </View>

              {/* Task 1: Three plain text tabs with animated underline */}
              <View style={styles.cleanTabContainer}>
                {ARCHIVE_TABS.map((tab) => {
                  const isActive = currentTab === tab.key;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setCurrentTab(tab.key as any);
                      }}
                      onLayout={(e) => {
                        const { x, width } = e.nativeEvent.layout;
                        setTabMeasurements((prev) => ({
                          ...prev,
                          [tab.key]: { x, width },
                        }));
                      }}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={styles.tabTouchable}
                    >
                      <Text
                        style={[
                          styles.cleanTabText,
                          isActive ? styles.cleanTabTextActive : styles.cleanTabTextInactive,
                        ]}
                      >
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <Animated.View style={animatedTabUnderlineStyle} pointerEvents="none" />
              </View>
            </View>
          )}
        </View>

        {/* Content Section */}
        {currentTab === "memories" ? (
          <FlatList
            data={filteredDreams}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.memoriesScrollContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <>
                {/* Status Bar */}
                <View style={styles.clinicalStatusRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={styles.purpleStatusDot} />
                    <Text style={styles.clinicalStatusText}>ARCHIVE SYNC: CALIBRATED</Text>
                  </View>
                  <Text style={styles.recallsActiveText}>
                    {filteredDreams.length} Recalls Active
                  </Text>
                </View>

                {/* Memories: Search Bar */}
                <View style={styles.memoriesSearchContainer}>
                  <Search size={16} strokeWidth={1.5} color="#ADA8C0" style={{ marginRight: 10 }} />
                  <TextInput
                    style={styles.memoriesSearchInput}
                    placeholder="Search titles, subconscious themes, or symb..."
                    placeholderTextColor="#ADA8C0"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCorrect={false}
                  />
                </View>

                {/* Memories: Filter Chips */}
                <View style={styles.filterSection}>
                  <View style={styles.filterHeaderRow}>
                    <Text style={styles.filterSectionLabel}>FILTER ATTRIBUTES</Text>
                    {selectedTag !== "All" && (
                      <TouchableOpacity
                        onPress={() => {
                          Haptics.selectionAsync();
                          setSelectedTag("All");
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.resetFilterText}>Reset ✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterPillsRow}
                  >
                    {ARCHIVE_FILTER_CHIPS.map((tag) => {
                      const isActive = selectedTag === tag;
                      return (
                        <TouchableOpacity
                          key={tag}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setSelectedTag(tag);
                          }}
                          activeOpacity={0.7}
                          style={[
                            styles.filterChip,
                            isActive ? styles.filterChipActive : styles.filterChipInactive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.filterChipText,
                              isActive ? styles.filterChipTextActive : styles.filterChipTextInactive,
                            ]}
                          >
                            {tag}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </>
            }
            ListEmptyComponent={
              loading ? (
                <ActivityIndicator size="small" color="#6B4FBB" style={{ marginTop: 40 }} />
              ) : (
                <View style={styles.archiveEmptyContainer}>
                  <Archive size={32} color="#D4CFEA" strokeWidth={1.5} />
                  <Text style={styles.archiveEmptyTitle}>No memories found</Text>
                  <Text style={styles.archiveEmptySubtitle}>
                    {searchQuery.trim().length > 0
                      ? "Try a different search term."
                      : selectedTag !== "All"
                      ? "No dreams match this filter."
                      : "Your first dream will appear here."}
                  </Text>
                  {dreams.length === 0 && searchQuery.trim().length === 0 && selectedTag === "All" && (
                    <TouchableOpacity
                      style={styles.archiveRecordOutlineBtn}
                      onPress={() => router.push("/add")}
                      activeOpacity={0.8}
                    >
                      <Plus size={15} color="#6B4FBB" strokeWidth={1.5} style={{ marginRight: 6 }} />
                      <Text style={styles.archiveRecordOutlineText}>Record a Dream</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )
            }
            renderItem={({ item }) => {
              const dateTypeLabel = `${formatDreamDate(item.createdAt || item.date)} · ${getDreamTypeLabel(item)}`;
              const rawBody = item.memoryText || item.description || "No memory transcription recorded.";
              const bodyPreview = rawBody.length > 120 ? `${rawBody.slice(0, 120)}...` : rawBody;
              const allTags = item.tags && item.tags.length > 0 ? item.tags : ["peaceful", "recurring"];
              const visibleTags = allTags.slice(0, 3);
              const overflowCount = allTags.length - 3;

              return (
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => router.push(`/dream/${item._id}` as any)}
                  style={styles.dreamCard}
                >
                  {/* Row 1 — Metadata line */}
                  <View style={styles.dreamCardMetaRow}>
                    <Text style={styles.dreamCardMetaText}>{dateTypeLabel}</Text>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation?.();
                        handleDreamMenu(item);
                      }}
                      style={styles.dreamCardMoreBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityRole="button"
                      accessibilityLabel="Dream Options"
                    >
                      <MoreHorizontal size={16} color="#C4C0D4" strokeWidth={1.5} />
                    </TouchableOpacity>
                  </View>

                  {/* Row 2 — Dream title */}
                  <Text style={styles.dreamCardTitle} numberOfLines={1}>
                    {item.title || "Untitled Dream"}
                  </Text>

                  {/* Row 3 — Body preview */}
                  <Text style={styles.dreamCardBody} numberOfLines={3}>
                    {bodyPreview}
                  </Text>

                  {/* Row 4 — Tags */}
                  <View style={styles.dreamCardTagsRow}>
                    {visibleTags.map((tag, tIdx) => (
                      <View key={tIdx} style={styles.dreamCardTagChip}>
                        <Text style={styles.dreamCardTagText}>
                          #{tag.toLowerCase().replace(/^#/, "")}
                        </Text>
                      </View>
                    ))}
                    {overflowCount > 0 && (
                      <View style={styles.dreamCardTagChip}>
                        <Text style={styles.dreamCardTagText}>+{overflowCount} more</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        ) : currentTab === "wellness" ? (
          /* Rebuilt Wellness Space: Tier 1 Somatic Check-In & Tier 2 Regulation Feed */
          <ScrollView
            contentContainerStyle={styles.wellnessScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Tier 1: Somatic State Check-In Card */}
            <SomaticCheckInCard
              onCheckInComplete={(entry) => {
                setLatestSomaticScale(entry?.somaticScale ?? null);
              }}
            />

            {/* Tier 2: Somatic Regulation Feed */}
            <View style={styles.regulationFeedSection}>
              <View style={styles.regulationHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.regulationHeaderDot} />
                  <Text style={styles.regulationFeedLabel}>REGULATION FEED</Text>
                </View>
                <Text style={styles.regulationFeedSub}>State-aware nervous system tools</Text>
              </View>

              {/* Card 1: Somatic Next Step (Micro Practice) */}
              <SomaticNextStepCard somaticScale={latestSomaticScale} />

              {/* Card 2: Guided Box Breathing */}
              <TouchableOpacity
                style={styles.regulationCard}
                onPress={() => router.push("/wellness/breathing")}
                activeOpacity={0.9}
                accessibilityRole="button"
                accessibilityLabel="Open Guided Box Breathing"
              >
                <View style={[styles.regulationIconCircle, { backgroundColor: '#F5F3FF' }]}>
                  <Sliders size={20} color="#8B5CF6" strokeWidth={1.8} />
                </View>
                <View style={styles.regulationCardContent}>
                  <View style={styles.regulationBadgeRow}>
                    <View style={[styles.regulationTagPill, { backgroundColor: '#EDE9FE' }]}>
                      <Text style={[styles.regulationTagText, { color: '#6B4FBB' }]}>PARASYMPATHETIC</Text>
                    </View>
                    <Text style={styles.regulationDuration}>• 4 MIN</Text>
                  </View>
                  <Text style={styles.regulationTitle}>Guided Box Breathing</Text>
                  <Text style={styles.regulationSub}>
                    4-4-4-4 autonomic pacing to reset high arousal, expand vagal tone, and ground heart rhythm.
                  </Text>
                </View>
                <View style={styles.regulationChevronBox}>
                  <ChevronRight size={15} strokeWidth={2.2} color="#9CA3AF" />
                </View>
              </TouchableOpacity>

              {/* Card 3: Cognitive Reframe */}
              <TouchableOpacity
                style={styles.regulationCard}
                onPress={() => router.push("/wellness/thought-record")}
                activeOpacity={0.9}
                accessibilityRole="button"
                accessibilityLabel="Open Cognitive Reframe"
              >
                <View style={[styles.regulationIconCircle, { backgroundColor: '#F5F3FF' }]}>
                  <Brain size={20} color="#7C3AED" strokeWidth={1.8} />
                </View>
                <View style={styles.regulationCardContent}>
                  <View style={styles.regulationBadgeRow}>
                    <View style={[styles.regulationTagPill, { backgroundColor: '#EDE9FE' }]}>
                      <Text style={[styles.regulationTagText, { color: '#7C3AED' }]}>COGNITIVE CBT</Text>
                    </View>
                    <Text style={styles.regulationDuration}>• 6 MIN</Text>
                  </View>
                  <Text style={styles.regulationTitle}>Cognitive Reframe</Text>
                  <Text style={styles.regulationSub}>
                    Examine cognitive friction, name distortions, and restore somatic perspective.
                  </Text>
                </View>
                <View style={styles.regulationChevronBox}>
                  <ChevronRight size={15} strokeWidth={2.2} color="#9CA3AF" />
                </View>
              </TouchableOpacity>

              {/* Card 4: Safe Reality Anchors */}
              <TouchableOpacity
                style={styles.regulationCard}
                onPress={() => router.push("/memory-support")}
                activeOpacity={0.9}
                accessibilityRole="button"
                accessibilityLabel="Open Safe Reality Anchors"
              >
                <View style={[styles.regulationIconCircle, { backgroundColor: '#D1FAE5' }]}>
                  <Anchor size={20} color="#059669" strokeWidth={1.8} />
                </View>
                <View style={styles.regulationCardContent}>
                  <View style={styles.regulationBadgeRow}>
                    <View style={[styles.regulationTagPill, { backgroundColor: '#D1FAE5' }]}>
                      <Text style={[styles.regulationTagText, { color: '#047857' }]}>SANCTUARY</Text>
                    </View>
                    <Text style={styles.regulationDuration}>• 3 MIN</Text>
                  </View>
                  <Text style={styles.regulationTitle}>Safe Reality Anchors</Text>
                  <Text style={styles.regulationSub}>
                    Grounded audio recordings, tactile sensory prompts, and physical orientation cues.
                  </Text>
                </View>
                <View style={styles.regulationChevronBox}>
                  <ChevronRight size={15} strokeWidth={2.2} color="#9CA3AF" />
                </View>
              </TouchableOpacity>

              {/* Card 5: Reflective Somatic Journal */}
              <TouchableOpacity
                style={styles.regulationCard}
                onPress={() => router.push("/wellness/thought-record")}
                activeOpacity={0.9}
                accessibilityRole="button"
                accessibilityLabel="Open Reflective Somatic Journal"
              >
                <View style={[styles.regulationIconCircle, { backgroundColor: '#FEF3C7' }]}>
                  <BookOpen size={20} color="#D97706" strokeWidth={1.8} />
                </View>
                <View style={styles.regulationCardContent}>
                  <View style={styles.regulationBadgeRow}>
                    <View style={[styles.regulationTagPill, { backgroundColor: '#FEF3C7' }]}>
                      <Text style={[styles.regulationTagText, { color: '#B45309' }]}>INTEGRATION</Text>
                    </View>
                    <Text style={styles.regulationDuration}>• Self-Paced</Text>
                  </View>
                  <Text style={styles.regulationTitle}>Reflective Somatic Journal</Text>
                  <Text style={styles.regulationSub}>
                    Reflective somatic journaling, sensation mapping, and emotional nervous system integration.
                  </Text>
                </View>
                <View style={styles.regulationChevronBox}>
                  <ChevronRight size={15} strokeWidth={2.2} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : currentTab === "gallery" ? (
          /* Step 2: Visual Gallery Tab (Refactor) */
          <ScrollView
            contentContainerStyle={styles.galleryScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Eyebrow & Title */}
            <View style={styles.gallerySubHeaderRow}>
              <Text style={styles.galleryEyebrow}>VISUAL ARCHIVE • SUBCONSCIOUS PROJECTIONS</Text>
              <Text style={styles.galleryArtifactCount}>
                {filteredGalleryDreams.length} ARTIFACTS
              </Text>
            </View>
            <Text style={styles.gallerySectionTitle}>Dream Gallery</Text>

            {/* Search Input */}
            <View style={styles.gallerySearchWrapper}>
              <Search size={15} strokeWidth={1.8} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.gallerySearchInputField}
                placeholder="Search visual themes, landscapes..."
                placeholderTextColor="#9CA3AF"
                value={gallerySearchQuery}
                onChangeText={setGallerySearchQuery}
                autoCorrect={false}
              />
            </View>

            {/* Filter Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.galleryFilterRow}
            >
              {GALLERY_FILTERS.map((pill) => {
                const isActive = galleryFilter === pill.id;
                return (
                  <TouchableOpacity
                    key={pill.id}
                    style={[
                      styles.galleryFilterPill,
                      isActive ? styles.galleryFilterPillActive : styles.galleryFilterPillInactive,
                    ]}
                    onPress={() => setGalleryFilter(pill.id)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.galleryFilterPillText,
                        isActive ? styles.galleryFilterPillTextActive : styles.galleryFilterPillTextInactive,
                      ]}
                    >
                      {pill.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 2-Column Grid */}
            {loading ? (
              <ActivityIndicator size="small" color="#8B5CF6" style={{ marginTop: 36 }} />
            ) : filteredGalleryDreams.length === 0 ? (
              <View style={[styles.emptyContainer, { marginTop: 36 }]}>
                <Compass size={28} strokeWidth={1.5} color="#9CA3AF" style={styles.emptyIcon} />
                <Text style={styles.emptyText}>No visual projections matched your criteria.</Text>
              </View>
            ) : (
              <View style={styles.galleryGridContainer}>
                {filteredGalleryDreams.map((item) => (
                  <GalleryCard key={item._id} item={item} />
                ))}
              </View>
            )}

            {/* Projection Calibration Footer */}
            <View style={styles.galleryCalibrationFooter}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <Sliders size={13} color="#6B7280" strokeWidth={1.8} />
                <Text style={styles.calibrationText}>Projection Calibration</Text>
              </View>
              <View style={styles.paginationRow}>
                <TouchableOpacity style={styles.paginationBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <ChevronLeft size={13} color="#6B7280" />
                </TouchableOpacity>
                <Text style={styles.paginationText}>1 / 1</Text>
                <TouchableOpacity style={styles.paginationBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <ChevronRight size={13} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        ) : (
          /* Step 3: Past Wins Tab (Refactor matching Reference) */
          <ScrollView
            contentContainerStyle={styles.winsScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Momentum Catalyst Card */}
            <View style={styles.momentumCard}>
              <View style={styles.winCardTopRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <View style={styles.momentumDot} />
                  <Text style={styles.momentumEyebrow}>MOMENTUM CATALYST</Text>
                </View>
                <View style={styles.lowEffortBadge}>
                  <Text style={styles.lowEffortBadgeText}>Low Effort</Text>
                </View>
              </View>

              <Text style={styles.winGeneratorDesc}>
                Feeling stuck or depleted? Generate a tiny action to interrupt physical inertia without cognitive overwhelm.
              </Text>

              {/* Generate Next Micro-Step Button */}
              <TouchableOpacity
                style={styles.generateMicroStepBtn}
                onPress={generateWin}
                disabled={generatingWin}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Generate next micro-step"
              >
                {generatingWin ? (
                  <ActivityIndicator size="small" color="#7C3AED" />
                ) : (
                  <Text style={styles.generateMicroStepBtnText}>→ Generate next micro-step</Text>
                )}
              </TouchableOpacity>

              {/* Current Micro-Action Section */}
              <View style={styles.currentMicroSection}>
                <Text style={styles.currentMicroEyebrow}>CURRENT MICRO-ACTION</Text>
                <TouchableOpacity
                  style={styles.currentMicroActionRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setIsTaskCompleted(!isTaskCompleted);
                  }}
                >
                  <View style={[styles.microCheckbox, isTaskCompleted && styles.microCheckboxChecked]}>
                    {isTaskCompleted ? (
                      <Check size={13} color="#FFFFFF" strokeWidth={2.8} />
                    ) : null}
                  </View>
                  <Text style={styles.currentMicroTaskText}>
                    {microTask?.taskText || "Stretch your arms above your head for 30 seconds."}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 2. Rate Your Win Card */}
            {isTaskCompleted && (
              <View style={styles.momentumCard}>
                <Text style={styles.rateCardTitle}>Rate your win</Text>
                <Text style={styles.rateCardSubtitle}>
                  {microTask?.taskText || "Stretch your arms above your head for 30 seconds."}
                </Text>

                {/* Sense of Mastery Row */}
                <View style={styles.ratingSectionRow}>
                  <Text style={styles.ratingLabelLeft}>Sense of mastery</Text>
                  <Text style={styles.ratingPromptRight}>How capable did you feel?</Text>
                </View>
                <View style={styles.ratingNumberBoxesRow}>
                  {[1, 2, 3, 4, 5].map((score) => {
                    const isSelected = masteryScore === score;
                    return (
                      <TouchableOpacity
                        key={`mastery-${score}`}
                        style={[
                          styles.ratingNumberBox,
                          isSelected && styles.ratingNumberBoxActive,
                        ]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setMasteryScore(score);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.ratingNumberText,
                            isSelected && styles.ratingNumberTextActive,
                          ]}
                        >
                          {score}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Sense of Pleasure Row */}
                <View style={[styles.ratingSectionRow, { marginTop: 14 }]}>
                  <Text style={styles.ratingLabelLeft}>Sense of pleasure</Text>
                  <Text style={styles.ratingPromptRight}>How enjoyable was it?</Text>
                </View>
                <View style={styles.ratingNumberBoxesRow}>
                  {[1, 2, 3, 4, 5].map((score) => {
                    const isSelected = pleasureScore === score;
                    return (
                      <TouchableOpacity
                        key={`pleasure-${score}`}
                        style={[
                          styles.ratingNumberBox,
                          isSelected && styles.ratingNumberBoxActive,
                        ]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setPleasureScore(score);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.ratingNumberText,
                            isSelected && styles.ratingNumberTextActive,
                          ]}
                        >
                          {score}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Save Accomplishment Button */}
                <TouchableOpacity
                  style={styles.saveAccomplishmentBtn}
                  onPress={submitWin}
                  disabled={savingWin}
                  activeOpacity={0.88}
                >
                  {savingWin ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveAccomplishmentBtnText}>Save accomplishment</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* 3. Done List: Today's Accomplishments */}
            <View style={styles.momentumCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Clock size={15} color="#1E1B4B" strokeWidth={2} />
                  <Text style={styles.timelineTitle}>Logged Momentum</Text>
                </View>
                <Text style={styles.summaryCountText}>{doneItems.length} Logged Today</Text>
              </View>

              {/* Action Cards List */}
              <View style={{ gap: 10 }}>
                {loadingDone ? (
                  <ActivityIndicator size="small" color="#8B5CF6" style={{ marginVertical: 20 }} />
                ) : doneItems.length === 0 ? (
                  <View style={styles.emptyCenteredView}>
                    <Text style={styles.emptyItalicText}>No wins logged yet today.</Text>
                  </View>
                ) : (
                  doneItems.map((item, idx) => {
                    const clinicalBadge = getWinClinicalBadge(item, idx);
                    const timeStr = formatWinTime(item.createdAt || item.completedAt);
                    return (
                      <View key={item._id || idx} style={styles.clinicalActionCard}>
                        <View style={styles.actionCardTopRow}>
                          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, flex: 1 }}>
                            <View style={styles.doneCheckIcon}>
                              <Check size={13} color="#8B5CF6" strokeWidth={2.6} />
                            </View>
                            <Text style={styles.actionCardText}>{item.taskText}</Text>
                          </View>
                          <View style={styles.clinicalBadgePill}>
                            <Text style={styles.clinicalBadgeText}>{item.category || clinicalBadge}</Text>
                          </View>
                        </View>
                        <View style={styles.actionCardBottomRow}>
                          <Clock size={11} color="#6B7280" strokeWidth={1.6} />
                          <Text style={styles.actionCardTimestamp}>
                            {`Completed ${timeStr}`}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      {/* Micro-Win Rating Bottom Sheet */}
      <SafeBottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={["60%"]}
        enablePanDownToClose
        onClose={() => setMicroTask(null)}
        backgroundStyle={{ backgroundColor: "#FFFFFF", borderRadius: 24 }}
        handleIndicatorStyle={{ backgroundColor: "#E4E2DC", width: 40 }}
        enableContentPanningGesture={false}
      >
        <View style={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Rate Your Win</Text>
            <Text style={styles.sheetSubtitle}>
              {microTask?.taskText}
            </Text>
          </View>

          <View style={styles.ratingSection}>
            <Text style={styles.ratingLabel}>Sense of Mastery (1-5)</Text>
            <Text style={styles.ratingDescription}>How capable or accomplished did you feel?</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((num) => (
                <TouchableOpacity
                  key={`mastery-${num}`}
                  style={[
                    styles.ratingDot,
                    masteryScore === num && styles.ratingDotActive
                  ]}
                  onPress={() => {
                    setMasteryScore(num);
                    Haptics.selectionAsync();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.ratingDotText,
                    masteryScore === num && styles.ratingDotTextActive
                  ]}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.ratingSection}>
            <Text style={styles.ratingLabel}>Sense of Pleasure (1-5)</Text>
            <Text style={styles.ratingDescription}>How enjoyable or positive was it?</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((num) => (
                <TouchableOpacity
                  key={`pleasure-${num}`}
                  style={[
                    styles.ratingDot,
                    pleasureScore === num && styles.ratingDotActive
                  ]}
                  onPress={() => {
                    setPleasureScore(num);
                    Haptics.selectionAsync();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.ratingDotText,
                    pleasureScore === num && styles.ratingDotTextActive
                  ]}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={[styles.actionBtn, (!masteryScore || !pleasureScore) && { opacity: 0.5 }, { backgroundColor: Theme.accentBlue }]}
            onPress={submitWin}
            disabled={!masteryScore || !pleasureScore}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnText}>Save Accomplishment</Text>
          </TouchableOpacity>
        </View>
      </SafeBottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  headerSub: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: "#6B7280",
    letterSpacing: 1.5,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  header: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    color: Theme.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.04)",
    borderRadius: 99,
    padding: 3,
    width: "100%",
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 99,
  },
  toggleButtonActive: {
    backgroundColor: "#E8E3F5",
  },
  toggleText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: "#6D6D6D",
  },
  toggleTextActive: {
    color: "#8069BF",
  },
  searchSection: {
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 18,
    height: 48,
    shadowColor: "#4A7FFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: Colors.light.text,
    fontFamily: Fonts.regular,
    fontSize: 15,
  },
  presetsSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  presetsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  presetPill: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(128, 105, 191, 0.18)",
  },
  presetText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: "#6B7280",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 110,
    gap: 14,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    marginBottom: 12,
    opacity: 0.5,
  },
  emptyText: {
    color: "#6B7280",
    fontFamily: Fonts.medium,
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  dreamCardWrapper: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#8B7BB8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 3,
  },
  legacyDreamCard: {
    borderRadius: 20,
    padding: 18,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  dreamTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: '#4A3F7A',
    flex: 1,
    marginRight: 10,
  },
  dreamDate: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: "#6B7280",
  },
  dreamDesc: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: "#6B7280",
    lineHeight: 18,
    marginBottom: 12,
  },
  symbolsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  symbolBadge: {
    backgroundColor: "rgba(74, 127, 255, 0.06)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  symbolText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: Theme.accentBlue,
  },

  // --- Consolidated Wellness Styles
  subTabContainer: {
    paddingVertical: 4,
  },
  subTabScroll: {
    gap: 8,
  },
  subTabPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 99,
    borderWidth: 1.2,
    borderColor: "rgba(74, 127, 255, 0.2)",
    backgroundColor: "transparent",
    marginRight: 6,
  },
  subTabPillActive: {
    backgroundColor: Theme.accentBlue,
    borderColor: Theme.accentBlue,
  },
  subTabText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    color: "#6B7280",
  },
  subTabTextActive: {
    color: "#FFFFFF",
  },
  sectionGap: {
    gap: 16,
  },

  // --- Breathable Sanctuary Polished Styles
  sanctuaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#1A1D29',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  sanctuarySectionLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  sanctuarySectionSubLabel: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: '#9CA3AF',
    lineHeight: 18,
    marginBottom: 12,
  },
  wellnessTabChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wellnessTabChipActiveBg: {
    backgroundColor: '#EDE9FF',
    borderRadius: 20,
  },
  wellnessTabChipText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontFamily: Fonts.medium,
  },
  wellnessTabChipTextActive: {
    fontWeight: '600',
    color: '#6B4FBB',
    fontFamily: Fonts.semiBold,
  },
  moodOrbRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  moodOrbContainer: {
    alignItems: 'center',
    gap: 6,
  },
  moodOrbCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodOrbText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  moodConfirmedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  moodConfirmedText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: Fonts.medium,
    flex: 1,
    lineHeight: 16,
  },
  moodHistoryRowItem: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
  },
  moodHistoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  moodHistoryCenter: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  moodHistoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1D29',
    fontFamily: Fonts.semiBold,
  },
  moodHistoryDate: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  moodHistorySeparator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 22,
  },
  emptyCenteredView: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyItalicText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
    fontFamily: Fonts.regular,
  },
  suggestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#6B4FBB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    marginTop: 12,
  },
  suggestBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Fonts.semiBold,
  },
  generatedWinCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#6B4FBB',
  },
  generatedWinText: {
    fontSize: 15,
    color: '#1A1D29',
    lineHeight: 22,
    fontFamily: Fonts.regular,
  },
  doneInputRow: {
    backgroundColor: '#F4F4F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 0,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  doneTextInput: {
    flex: 1,
    height: 48,
    fontSize: 14,
    color: '#1A1D29',
    backgroundColor: 'transparent',
    fontFamily: Fonts.regular,
  },
  doneAddBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  doneItemText: {
    fontSize: 14,
    color: '#1A1D29',
    lineHeight: 20,
    fontFamily: Fonts.medium,
  },
  doneItemMeta: {
    fontSize: 11,
    color: 'rgba(45,45,45,0.5)',
    marginTop: 2,
    fontFamily: Fonts.regular,
  },
  doneItemDate: {
    fontSize: 11,
    color: '#9CA3AF',
    marginLeft: 8,
    marginTop: 2,
    fontFamily: Fonts.regular,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 22,
    shadowColor: "#4A7FFF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  cardHeaderLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Theme.textPrimary,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  cardSubLabel: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: "rgba(31, 36, 48, 0.6)",
    lineHeight: 18,
    marginBottom: 16,
  },
  inputWrapper: {
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  shredInput: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: "#2D2D2D",
    lineHeight: 22,
    height: 100,
    textAlignVertical: "top",
  },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: 99,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Theme.accentBlue,
    width: "100%",
  },
  actionBtnText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
  },
  smallPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: "rgba(45, 45, 45, 0.15)",
    marginRight: 6,
  },
  smallPillActive: {
    backgroundColor: "#2D2D2D",
    borderColor: "#2D2D2D",
  },
  smallPillText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: "#2D2D2D",
    textTransform: "capitalize",
  },
  smallPillTextActive: {
    color: "#F9F9F7",
  },
  carouselDeck: {
    backgroundColor: "rgba(45, 45, 45, 0.03)",
    borderRadius: 20,
    padding: 16,
  },
  deckSection: {
    borderBottomWidth: 1,
    borderColor: "rgba(45, 45, 45, 0.08)",
    paddingBottom: 10,
    marginBottom: 10,
  },
  deckHeading: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: "rgba(45, 45, 45, 0.5)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  deckBody: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: "#2D2D2D",
    lineHeight: 20,
  },
  carouselNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(45, 45, 45, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  pageNum: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: "rgba(45, 45, 45, 0.5)",
  },

  // Breathing Box
  breathingOuterRing: {
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginVertical: 12,
  },
  breathingDashedRing: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 1,
    borderColor: "rgba(45, 45, 45, 0.15)",
    borderStyle: "dashed",
  },
  breathingInnerCircle: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Theme.accentBlue,
    opacity: 0.3,
  },
  breathingCenterText: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  breathingStatusText: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: "#2D2D2D",
  },

  // Microstep
  microStepItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    padding: 16,
    borderRadius: 20,
    gap: 12,
  },
  microStepText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: "#2D2D2D",
    flex: 1,
    lineHeight: 18,
  },

  // Worry Drop
  worryProgressTrack: {
    width: "100%",
    height: 6,
    backgroundColor: "rgba(45, 45, 45, 0.08)",
    borderRadius: 3,
    marginBottom: 24,
    overflow: "hidden",
  },
  worryProgressBar: {
    height: "100%",
    backgroundColor: "#2D2D2D",
  },
  worryOuterRing: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 70,
    borderWidth: 1,
    borderColor: "rgba(45, 45, 45, 0.15)",
  },
  worryCircleBtn: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#2D2D2D",
    alignItems: "center",
    justifyContent: "center",
  },
  worryBtnText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: "#F9F9F7",
  },

  // Guided voices
  voiceCarouselCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: 240,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  voicePlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2D2D2D",
    alignItems: "center",
    justifyContent: "center",
  },
  voiceCardTitle: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: "#2D2D2D",
  },
  voiceCardDuration: {
    fontSize: 10,
    fontFamily: Fonts.medium,
    color: "rgba(45, 45, 45, 0.5)",
    marginTop: 2,
  },
  waveformContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    height: 16,
  },
  waveBar: {
    width: 3,
    backgroundColor: "#2D2D2D",
    borderRadius: 1.5,
  },


  // Peer story
  peerStoryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(45, 45, 45, 0.05)",
  },
  peerStoryTitle: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: "#2D2D2D",
    marginBottom: 6,
  },
  peerStoryBody: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: "rgba(45, 45, 45, 0.7)",
    lineHeight: 18,
    marginBottom: 8,
  },
  peerStoryFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  peerStoryMeta: {
    fontSize: 9,
    fontFamily: Fonts.bold,
    color: "rgba(45, 45, 45, 0.4)",
    letterSpacing: 0.8,
  },
  
  // Bottom Sheet
  sheetContent: {
    padding: 24,
    paddingBottom: 40,
    flex: 1,
  },
  sheetHeader: {
    marginBottom: 24,
  },
  sheetTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: "#2D2D2D",
    marginBottom: 6,
  },
  sheetSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: "rgba(45,45,45,0.7)",
    lineHeight: 20,
  },
  ratingSection: {
    marginBottom: 24,
  },
  ratingLabel: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: "#2D2D2D",
    marginBottom: 4,
  },
  ratingDescription: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: "rgba(45,45,45,0.6)",
    marginBottom: 12,
  },
  ratingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  ratingDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(45,45,45,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  ratingDotActive: {
    backgroundColor: "#2D2D2D",
  },
  ratingDotText: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: "rgba(45,45,45,0.5)",
  },
  ratingDotTextActive: {
    color: "#FFFFFF",
  },
  lockedSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(45,45,45,0.05)',
    borderStyle: 'dashed',
    borderRadius: 16,
    marginVertical: 16,
  },
  lockedTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.light.text,
    marginBottom: 8,
  },
  lockedSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.light.secondaryText,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  lockedBtn: {
    backgroundColor: Colors.light.cardTint,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
  },
  lockedBtnText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: Colors.light.secondaryText,
  },
  gallerySearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 99,
    paddingHorizontal: 12,
    height: 38,
    width: 150,
  },
  gallerySearchInput: {
    flex: 1,
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: '#2D2D2D',
  },
  galleryContainer: {
    flex: 1,
  },
  galleryCardContainer: {
    width: (screenWidth - 40 - 12) / 2,
    height: 165,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0EDF6',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  galleryMediaWrapper: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#F3F0F8',
  },
  galleryCardImage: {
    width: '100%',
    height: '100%',
  },
  galleryPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F0F8',
  },
  galleryExpandBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(30, 27, 75, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  galleryGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '42%',
  },
  galleryTextOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  galleryCardTitle: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: Fonts.bold }),
    fontWeight: '700',
    fontSize: 13,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  galleryCardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  galleryCardDate: {
    fontFamily: Fonts.medium,
    fontSize: 10.5,
    color: '#D1D5DB',
  },
  galleryBadgePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  galleryBadgeText: {
    fontSize: 9,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: Fonts.bold }),
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  playButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  playButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  // Memory Support Tab Styles in Explore
  memorySupportExploreContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
  },
  memorySupportHeroCard: {
    borderRadius: 28,
    padding: 24,
    marginBottom: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(212, 201, 247, 0.8)',
    overflow: 'hidden',
    shadowColor: '#8B7BB8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(91, 75, 158, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  heroBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: '#5B4B9E',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: '#2D234A',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  heroDesc: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: '#5A4D7E',
    lineHeight: 22,
    marginBottom: 18,
  },
  heroLaunchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A2E64',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 3,
  },
  heroLaunchBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    overflow: 'hidden',
    shadowColor: '#8B7BB8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  moduleIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  moduleTextBox: {
    flex: 1,
    marginRight: 8,
  },
  moduleTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: '#2D234A',
    marginBottom: 3,
  },
  moduleDesc: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: '#6B5E91',
    lineHeight: 18,
  },
  sundownInfoCard: {
    borderRadius: 22,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(253, 230, 138, 0.8)',
    overflow: 'hidden',
    marginTop: 6,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  sundownInfoTitle: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: '#92400E',
  },
  sundownInfoDesc: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: '#78350F',
    lineHeight: 18,
  },
  wellnessHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  wellnessHeaderSub: {
    fontSize: 10,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: Fonts.bold }),
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  wellnessHeaderTitle: {
    fontSize: 28,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: Fonts.bold }),
    fontWeight: '700',
    color: '#1E1B4B',
    letterSpacing: -0.6,
  },
  archiveHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  archiveMainTitle: {
    flex: 1,
    fontSize: 28,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: Fonts.bold }),
    fontWeight: '700',
    color: '#1E1B2E',
    letterSpacing: -0.6,
  },
  archiveWellnessShortcutBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 12,
    marginTop: 2,
  },
  archiveWellnessShortcutText: {
    fontSize: 12,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: Fonts.bold }),
    fontWeight: '600',
    color: '#1E1B4B',
  },
  cleanTabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
    marginTop: 14,
    marginBottom: 4,
    paddingHorizontal: 2,
    paddingBottom: 6,
    position: 'relative',
  },
  tabTouchable: {
    paddingVertical: 4,
  },
  cleanTabText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: '#9CA3AF',
    fontWeight: '400',
  },
  cleanTabTextActive: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: Fonts.bold }),
    fontWeight: '600',
    color: '#1E1B2E',
  },
  cleanTabTextInactive: {
    fontFamily: Fonts.regular,
    fontWeight: '400',
    color: '#9CA3AF',
  },

  // --- Somatic Memories Tab
  memoriesScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 120,
  },
  clinicalStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 2,
    gap: 16,
  },
  purpleStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6B4FBB',
  },
  clinicalStatusText: {
    fontSize: 11,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: Fonts.bold }),
    fontWeight: '600',
    color: '#6B4FBB',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  recallsActiveText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: '#7B7490',
  },
  memoriesSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F2FA',
    borderRadius: 10,
    borderWidth: 0,
    height: 44,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  memoriesSearchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: '#1E1B2E',
  },
  filterSection: {
    marginBottom: 20,
  },
  filterHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  filterSectionLabel: {
    fontSize: 11,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: Fonts.bold }),
    fontWeight: '600',
    color: '#7B7490',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  resetFilterText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: '#6B4FBB',
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    height: 32,
    borderRadius: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: '#6B4FBB',
    borderColor: 'transparent',
  },
  filterChipInactive: {
    backgroundColor: 'transparent',
    borderColor: '#E5E1F0',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: Fonts.medium,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterChipTextInactive: {
    color: '#7B7490',
  },
  dreamCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EDEAF4',
    shadowColor: '#6B4FBB',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    padding: 16,
    marginBottom: 20,
  },
  dreamCardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dreamCardMetaText: {
    fontSize: 10,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: Fonts.bold }),
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1.3,
    flex: 1,
  },
  dreamCardMoreBtn: {
    padding: 4,
    marginRight: -4,
  },
  dreamCardTitle: {
    fontSize: 18,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: Fonts.bold }),
    fontWeight: '700',
    color: '#1E1B2E',
    marginTop: 6,
    letterSpacing: -0.2,
  },
  dreamCardBody: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: '#7B7490',
    lineHeight: 21,
    marginTop: 6,
    fontWeight: '400',
  },
  dreamCardTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  dreamCardTagChip: {
    backgroundColor: '#F0EDF8',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dreamCardTagText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: '#6B4FBB',
    fontWeight: '500',
  },
  archiveEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  archiveEmptyTitle: {
    fontSize: 16,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: Fonts.bold }),
    fontWeight: '600',
    color: '#7B7490',
    marginTop: 12,
    marginBottom: 4,
  },
  archiveEmptySubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: '#ADA8C0',
    textAlign: 'center',
    marginBottom: 16,
  },
  archiveRecordOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#6B4FBB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  archiveRecordOutlineText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    fontWeight: '600',
    color: '#6B4FBB',
  },
  encryptedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#F0EDF6',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  encryptedLockCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  encryptedTitle: {
    fontSize: 17,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: Fonts.bold }),
    fontWeight: '700',
    color: '#1E1B4B',
    marginBottom: 6,
    textAlign: 'center',
  },
  encryptedDesc: {
    fontSize: 12.5,
    fontFamily: Fonts.regular,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
    paddingHorizontal: 12,
  },
  encryptedLogBtn: {
    backgroundColor: '#1E1B4B',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  encryptedLogBtnText: {
    fontSize: 12.5,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: Fonts.bold }),
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },

  // --- Visual Gallery Tab
  galleryScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 120,
  },
  gallerySubHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  galleryEyebrow: {
    fontSize: 10,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: Fonts.bold }),
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  galleryArtifactCount: {
    fontSize: 10,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: Fonts.bold }),
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  gallerySectionTitle: {
    fontSize: 22,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: Fonts.bold }),
    fontWeight: '700',
    color: '#1E1B4B',
    marginBottom: 14,
    letterSpacing: -0.4,
  },
  gallerySearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0EDF6',
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 14,
  },
  gallerySearchInputField: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: Fonts.regular,
    color: '#1E1B4B',
  },
  galleryFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  galleryFilterPill: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 8,
  },
  galleryFilterPillActive: {
    backgroundColor: '#1E1B4B',
  },
  galleryFilterPillInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  galleryFilterPillText: {
    fontSize: 11.5,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: Fonts.bold }),
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  galleryFilterPillTextActive: {
    color: '#FFFFFF',
  },
  galleryFilterPillTextInactive: {
    color: '#6B7280',
  },
  galleryGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  galleryCalibrationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0EDF6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  calibrationText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: '#6B7280',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paginationBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: '#6B7280',
  },

  // --- Past Wins Tab
  sessionStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionActiveDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionActiveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  sessionActiveText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: '#10B981',
  },
  pacedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF9FD',
    borderWidth: 1,
    borderColor: '#EDEAF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pacedBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: '#7C3AED',
  },
  winsScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 120,
  },
  momentumCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EDEAF4',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  winCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  momentumDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#8B5CF6',
  },
  momentumEyebrow: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: '#8B5CF6',
    letterSpacing: 0.8,
  },
  lowEffortBadge: {
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  lowEffortBadgeText: {
    fontSize: 10.5,
    fontFamily: Fonts.medium,
    color: '#7C3AED',
  },
  winGeneratorDesc: {
    fontSize: 13.5,
    fontFamily: Fonts.regular,
    color: '#6B7280',
    lineHeight: 19,
    marginBottom: 14,
  },
  generateMicroStepBtn: {
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    backgroundColor: '#FAF9FD',
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  generateMicroStepBtnText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: '#7C3AED',
  },
  currentMicroSection: {
    borderTopWidth: 1,
    borderTopColor: '#F0EDF6',
    paddingTop: 12,
  },
  currentMicroEyebrow: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: '#6B7280',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  currentMicroActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  microCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  microCheckboxChecked: {
    backgroundColor: '#8B5CF6',
  },
  currentMicroTaskText: {
    fontSize: 13.5,
    fontFamily: Fonts.medium,
    color: '#1E1B4B',
    lineHeight: 19,
    flex: 1,
  },
  rateCardTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: '#1E1B2E',
    marginBottom: 4,
  },
  rateCardSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 16,
  },
  ratingSectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingLabelLeft: {
    fontSize: 13.5,
    fontFamily: Fonts.bold,
    color: '#1E1B2E',
  },
  ratingPromptRight: {
    fontSize: 11.5,
    fontFamily: Fonts.regular,
    color: '#6B7280',
  },
  ratingNumberBoxesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingNumberBox: {
    flex: 1,
    height: 38,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingNumberBoxActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  ratingNumberText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: '#1E1B2E',
  },
  ratingNumberTextActive: {
    color: '#FFFFFF',
  },
  saveAccomplishmentBtn: {
    backgroundColor: '#15131C',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveAccomplishmentBtnText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
  },
  doneCheckIcon: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  clinicalWinCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0EDF6',
    marginBottom: 16,
  },
  suggestMicroWinBtn: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  suggestMicroWinBtnText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  currentMicroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F0EDF6',
  },
  currentMicroEst: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: '#6B7280',
  },
  generateAnotherText: {
    fontSize: 11,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: Fonts.bold }),
    fontWeight: '600',
    color: '#7C3AED',
  },
  timelineTitle: {
    fontSize: 16,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: Fonts.bold }),
    fontWeight: '700',
    color: '#1E1B4B',
    letterSpacing: -0.3,
  },
  timelineSub: {
    fontSize: 12.5,
    fontFamily: Fonts.regular,
    color: '#6B7280',
    lineHeight: 17,
    marginBottom: 14,
  },
  timelineInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  timelineInput: {
    flex: 1,
    height: 42,
    backgroundColor: '#FAF9FD',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: '#1E1B4B',
  },
  timelineAddBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#1E1B4B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clinicalActionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0EDF6',
  },
  actionCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  actionCardText: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: Fonts.medium,
    color: '#1E1B4B',
    lineHeight: 18,
  },
  clinicalBadgePill: {
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  clinicalBadgeText: {
    fontSize: 10,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: Fonts.bold }),
    fontWeight: '700',
    color: '#7C3AED',
    letterSpacing: 0.6,
  },
  actionCardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionCardTimestamp: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: '#6B7280',
  },
  winsSummaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAF9FD',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F0EDF6',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  summaryPurpleDot: {
    width: 6,
    height: 6,
    borderRadius: 1.5,
    backgroundColor: '#7C3AED',
  },
  summaryCountText: {
    fontSize: 11.5,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: Fonts.bold }),
    fontWeight: '600',
    color: '#1E1B4B',
  },
  summaryStatusText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: '#6B7280',
  },
  wellnessScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 120,
  },
  regulationFeedSection: {
    marginTop: 6,
  },
  regulationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  regulationHeaderDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8B5CF6',
    marginRight: 8,
  },
  regulationFeedLabel: {
    fontSize: 11,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: Fonts.bold }),
    fontWeight: '700',
    color: '#1E1B4B',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  regulationFeedSub: {
    fontSize: 11,
    fontStyle: 'italic',
    fontFamily: Fonts.regular,
    color: '#6B7280',
  },
  regulationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0EDF6',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  regulationIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  regulationCardContent: {
    flex: 1,
    marginRight: 8,
  },
  regulationBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  regulationTagPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  regulationTagText: {
    fontSize: 9.5,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: Fonts.bold }),
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  regulationDuration: {
    fontSize: 10,
    fontFamily: Fonts.medium,
    color: '#6B7280',
  },
  regulationTitle: {
    fontSize: 14.5,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: Fonts.bold }),
    fontWeight: '700',
    color: '#1E1B4B',
    marginBottom: 3,
  },
  regulationSub: {
    fontSize: 11.5,
    fontFamily: Fonts.regular,
    color: '#6B7280',
    lineHeight: 16,
  },
  regulationChevronBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F0EDF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
