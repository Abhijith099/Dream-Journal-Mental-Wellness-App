import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
} from "react-native";
import { ChevronLeft, MessageCircle } from "lucide-react-native";
import { Colors, Fonts } from "@/constants/theme";
import { useRouter } from "expo-router";
import { authenticatedFetch, BACKEND_URL } from "../utils/api";

interface Session {
  _id: string;
  title: string;
  updatedAt: string;
}

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

export default function ChatHistoryScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await authenticatedFetch(`${BACKEND_URL}/chat/sessions`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setSessions(data);
      }
    } catch (err) {
      console.error("Error fetching chat sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionPress = (sessionId: string) => {
    router.push({
      pathname: '/(tabs)/chatbot',
      params: { sessionId }
    });
  };

  const isWeb = Platform.OS === "web";

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={isWeb ? styles.webHeaderWrapper : null}>
        <View style={[styles.header, isWeb && styles.webInnerContainer]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
            <ChevronLeft size={22} strokeWidth={1.5} color="#2D2D2D" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerSub}>PAST SESSIONS</Text>
            <Text style={styles.headerTitle}>Chat History</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <View style={isWeb ? styles.webMainContainer : { flex: 1 }}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="small" color={Colors.light.text} />
          </View>
        ) : sessions.length === 0 ? (
          <View style={styles.emptyState}>
            <MessageCircle size={28} strokeWidth={1.5} color="rgba(45, 45, 45, 0.2)" />
            <Text style={styles.emptyStateText}>No conversations yet.</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {sessions.map((session) => (
              <TouchableOpacity
                key={session._id}
                style={styles.sessionCard}
                onPress={() => handleSessionPress(session._id)}
                activeOpacity={0.7}
              >
                <View style={styles.sessionCardContent}>
                  <Text style={styles.sessionTitle} numberOfLines={2}>
                    "{session.title}"
                  </Text>
                  <Text style={styles.sessionDate}>
                    {timeAgo(session.updatedAt)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F9F7",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: "rgba(45, 45, 45, 0.05)",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(45, 45, 45, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerSub: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: "#8A8A8A",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: "#2D2D2D",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 40, // Visual balance
  },
  emptyStateText: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: "#8A8A8A",
    marginTop: 16,
  },
  sessionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(45, 45, 45, 0.04)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  sessionCardContent: {
    gap: 6,
  },
  sessionTitle: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: "#2D2D2D",
    lineHeight: 22,
  },
  sessionDate: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: "#8A8A8A",
  },
  // Web Layout Handling
  webHeaderWrapper: {
    backgroundColor: "#F9F9F7",
    width: "100%",
  },
  webInnerContainer: {
    width: "100%",
    alignSelf: "center",
    borderBottomWidth: 1,
    borderColor: "rgba(45, 45, 45, 0.05)",
  },
  webMainContainer: {
    width: "100%",
    alignSelf: "center",
    flex: 1,
    backgroundColor: "#F9F9F7",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(45, 45, 45, 0.04)",
  },
});
