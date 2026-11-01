import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { ChevronLeft, CheckSquare, Square } from "lucide-react-native";
import { router } from "expo-router";
import { authenticatedFetch as fetch, BACKEND_URL } from "../../utils/api";
import * as Haptics from "expo-haptics";
import { Colors, Fonts } from "@/constants/theme";

export default function ShareStoryScreen() {
  const [newStory, setNewStory] = useState({ title: "", body: "", overcomeDetail: "" });
  const [consentGiven, setConsentGiven] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // true = "Found what helps", false = "Still working through it"
  const [overcame, setOvercame] = useState<boolean | null>(null);

  const submitPeerStory = async () => {
    if (!newStory.title.trim() || !newStory.body.trim() || !consentGiven || overcame === null || !newStory.overcomeDetail.trim()) {
      setErrorMsg("Please fill in all fields.");
      return;
    }
    setIsSubmitting(true);
    setErrorMsg("");

    const payload = {
      ...newStory,
      isAnonymous: true,
      overcame,
      consentGiven
    };

    console.log("API CALL INTRODUCED: Sending POST to /wellness/peer-stories");
    console.log("Payload:", JSON.stringify(payload, null, 2));

    try {
      const res = await fetch(`${BACKEND_URL}/wellness/peer-stories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      console.log("Response status code:", res.status);
      const data = await res.json();
      console.log("Response payload data:", data);

      if (res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      } else {
        setErrorMsg(data.error || "Failed to submit story.");
      }
    } catch (err: any) {
      console.log("Error submitting peer story:", err);
      setErrorMsg(err.message || "Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = !!(
    newStory.title.trim() &&
    newStory.body.trim() &&
    consentGiven &&
    overcame !== null &&
    newStory.overcomeDetail.trim()
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
            <ChevronLeft size={22} color="#8069BF" strokeWidth={1.5} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Share Your Story</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, { backgroundColor: "#F5F3FA" }]}>
            <Text style={styles.cardHeaderLabel}>Anonymous Reflection</Text>
            <Text style={styles.cardSubLabel}>
              Share what you're going through. All stories are reviewed before being shared with the community.
            </Text>

            <TextInput
              style={styles.shredInput}
              placeholder="Story Title"
              placeholderTextColor="rgba(45, 45, 45, 0.4)"
              value={newStory.title}
              onChangeText={(t) => setNewStory({ ...newStory, title: t })}
            />

            <TextInput
              style={[styles.shredInput, { marginTop: 12, minHeight: 120 }]}
              placeholder="Your reflection..."
              placeholderTextColor="rgba(45, 45, 45, 0.4)"
              multiline
              textAlignVertical="top"
              value={newStory.body}
              maxLength={2000}
              onChangeText={(t) => setNewStory({ ...newStory, body: t })}
            />
            <Text style={{ alignSelf: 'flex-end', fontSize: 11, fontFamily: Fonts.medium, color: 'rgba(45, 45, 45, 0.5)', marginTop: 4 }}>
              {newStory.body.length} / 2000 characters
            </Text>

            <View style={styles.toggleSection}>
              <Text style={styles.toggleLabel}>Where are you in this process?</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, overcame === true && styles.toggleBtnActive]}
                  onPress={() => setOvercame(true)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.toggleBtnText, overcame === true && styles.toggleBtnTextActive]}>
                    Found what helps
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, overcame === false && styles.toggleBtnActive]}
                  onPress={() => setOvercame(false)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.toggleBtnText, overcame === false && styles.toggleBtnTextActive]}>
                    Still working through it
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {overcame !== null && (
              <TextInput
                style={[styles.shredInput, { marginTop: 12, minHeight: 80 }]}
                placeholder={
                  overcame
                    ? "What helped you get through it?"
                    : "What are you doing right now to work through it?"
                }
                placeholderTextColor="rgba(45, 45, 45, 0.4)"
                multiline
                textAlignVertical="top"
                value={newStory.overcomeDetail}
                onChangeText={(t) => setNewStory({ ...newStory, overcomeDetail: t })}
              />
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20 }}>
              <TouchableOpacity
                onPress={() => setConsentGiven(!consentGiven)}
                style={{ marginRight: 8 }}
              >
                {consentGiven ? (
                  <CheckSquare size={20} color="#8069BF" strokeWidth={1.5} />
                ) : (
                  <Square size={20} color="#79767D" strokeWidth={1.5} />
                )}
              </TouchableOpacity>
              <Text style={{ flex: 1, fontSize: 13, fontFamily: Fonts.medium, color: "#79767D" }}>
                I consent to share this story anonymously in the public feed.
              </Text>
            </View>

            {!!errorMsg && (
              <Text style={{ color: "#D32F2F", fontSize: 13, fontFamily: Fonts.medium, marginTop: 16, textAlign: 'center' }}>
                {errorMsg}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.actionBtn, { marginTop: 24 }, !isFormValid && { opacity: 0.5 }]}
              onPress={submitPeerStory}
              disabled={isSubmitting || !isFormValid}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#F9F9F7" />
              ) : (
                <Text style={styles.actionBtnText}>Submit Story</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  card: {
    padding: 24,
    borderRadius: 24,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  cardHeaderLabel: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: "#1A1A2E",
    marginBottom: 4,
  },
  cardSubLabel: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: "#79767D",
    marginBottom: 16,
    lineHeight: 18,
  },
  shredInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(128, 105, 191, 0.15)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: "#1A1A2E",
  },
  toggleSection: {
    marginTop: 20,
    marginBottom: 8,
  },
  toggleLabel: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: "#1A1A2E",
    marginBottom: 10,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(128, 105, 191, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleBtnActive: {
    backgroundColor: "#8069BF",
    borderColor: "#8069BF",
  },
  toggleBtnText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: "#79767D",
    textAlign: "center",
  },
  toggleBtnTextActive: {
    color: "#FFFFFF",
  },
  actionBtn: {
    backgroundColor: "#4C3B87",
    paddingVertical: 16,
    borderRadius: 99,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: '#4C3B87',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontFamily: Fonts.bold,
    fontSize: 15,
  },
});
