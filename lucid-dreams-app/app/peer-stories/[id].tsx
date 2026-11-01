import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { ChevronLeft, Heart } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { authenticatedFetch as fetch, BACKEND_URL } from "../../utils/api";
import * as Haptics from "expo-haptics";
import { Colors, Fonts } from "@/constants/theme";

interface StoryDetail {
  _id: string;
  title: string;
  body: string;
  isAnonymous?: boolean;
  authorName?: string;
  overcame?: boolean;
  overcomeDetail?: string;
  likeCount: number;
  hasLiked: boolean;
}

export default function PeerStoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [story, setStory] = useState<StoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLiking, setIsLiking] = useState(false);

  useEffect(() => {
    if (id) {
      fetchStoryDetail();
    }
  }, [id]);

  const fetchStoryDetail = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const res = await fetch(`${BACKEND_URL}/peer-stories/${id}`);
      const data = await res.json();
      if (res.ok) {
        setStory(data);
      } else {
        setErrorMsg(data.error || "Failed to load story details.");
      }
    } catch (err: any) {
      console.log("Error loading story details:", err);
      setErrorMsg(err.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLikeToggle = async () => {
    if (!story || isLiking) return;
    setIsLiking(true);
    try {
      const res = await fetch(`${BACKEND_URL}/peer-stories/${id}/like`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setStory((prev) =>
          prev
            ? {
                ...prev,
                likeCount: data.likeCount,
                hasLiked: data.hasLiked,
              }
            : null
        );
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (err) {
      console.log("Error toggling like:", err);
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <ChevronLeft size={24} color="#8069BF" strokeWidth={1.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Curated Story</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color="#2D2D2D" />
        </View>
      ) : errorMsg ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchStoryDetail}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : story ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.storyTitle}>{story.title}</Text>
            <Text style={styles.storyBody}>"{story.body}"</Text>
            
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>
                {story.isAnonymous
                  ? "ANONYMOUS REFLECTION"
                  : (story.authorName || "COMMUNITY REFLECTION").toUpperCase()}
              </Text>
            </View>

            {story.overcomeDetail ? (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>
                  {story.overcame ? "FOUND WHAT HELPS" : "WORKING THROUGH IT"}
                </Text>
                <Text style={styles.detailText}>{story.overcomeDetail}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.resonateCard}>
            <Text style={styles.resonateLabel}>Did this resonate with you?</Text>
            <View style={styles.likeRow}>
              <TouchableOpacity
                onPress={handleLikeToggle}
                activeOpacity={0.8}
                style={[
                  styles.likeBtn,
                  story.hasLiked && styles.likeBtnActive,
                ]}
              >
                <Heart
                  size={20}
                  color={story.hasLiked ? "#FFFFFF" : "#8069BF"}
                  fill={story.hasLiked ? "#FFFFFF" : "transparent"}
                  strokeWidth={1.5}
                />
                <Text
                  style={[
                    styles.likeBtnText,
                    story.hasLiked && styles.likeBtnTextActive,
                  ]}
                >
                  {story.hasLiked ? "Resonated" : "Resonate"}
                </Text>
              </TouchableOpacity>
              <Text style={styles.likeCountText}>
                {story.likeCount} {story.likeCount === 1 ? "person" : "people"} felt this
              </Text>
            </View>
          </View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF9FC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(128, 105, 191, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: "#1A1A2E",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: "#D32F2F",
    textAlign: "center",
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: "#4C3B87",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 99,
  },
  retryText: {
    color: "#FFFFFF",
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(128, 105, 191, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 16,
  },
  storyTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: "#1A1A2E",
    marginBottom: 16,
  },
  storyBody: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: "#79767D",
    lineHeight: 22,
    marginBottom: 20,
    fontStyle: "italic",
  },
  metaRow: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128, 105, 191, 0.1)",
    paddingBottom: 16,
    marginBottom: 16,
  },
  metaText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: "#79767D",
    letterSpacing: 0.8,
  },
  detailSection: {
    backgroundColor: "#F5F3FA",
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#8069BF",
  },
  detailLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: "#8069BF",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  detailText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: "#79767D",
    lineHeight: 20,
  },
  resonateCard: {
    backgroundColor: "#F5F3FA",
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  resonateLabel: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: "#1A1A2E",
    marginBottom: 16,
  },
  likeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  likeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: "#8069BF",
    backgroundColor: "transparent",
    gap: 8,
  },
  likeBtnActive: {
    backgroundColor: "#4C3B87",
    borderColor: "#4C3B87",
  },
  likeBtnText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: "#8069BF",
  },
  likeBtnTextActive: {
    color: "#FFFFFF",
  },
  likeCountText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: "#79767D",
    flex: 1,
  },
});
