import React, { useState, useEffect } from "react";
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
  Modal,
  Pressable,
  Alert,
} from "react-native";
import { ChevronLeft, ChevronDown, Info, Check } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { authenticatedFetch as fetch, BACKEND_URL } from "../../utils/api";
import * as Haptics from "expo-haptics";
import { Fonts } from "@/constants/theme";

const DISTORTION_OPTIONS = [
  {
    name: "Catastrophizing",
    desc: "Assuming the absolute worst-case scenario will happen.",
  },
  {
    name: "Mind Reading",
    desc: "Assuming you know what others are thinking without real evidence.",
  },
  {
    name: "All-or-Nothing",
    desc: "Viewing situations in black-and-white extremes with no middle ground.",
  },
  {
    name: "Overgeneralizing",
    desc: "Viewing a single negative event as a never-ending pattern of defeat.",
  },
  {
    name: "Emotional Reasoning",
    desc: "Believing that because you feel a negative emotion, it must reflect reality.",
  },
  {
    name: "Should Statements",
    desc: "Holding rigid expectations using 'should', 'must', or 'ought to'.",
  },
];

const QUICK_CHIPS = ["Catastrophizing", "Mind Reading", "All-or-Nothing"];

export default function ThoughtRecordScreen() {
  const params = useLocalSearchParams<{ situation?: string; prompt?: string }>();

  const [thoughtRecord, setThoughtRecord] = useState({
    situation: "",
    automaticThought: "",
    distortion: "",
    rationalResponse: "",
  });

  useEffect(() => {
    if (params.situation || params.prompt) {
      setThoughtRecord((prev) => ({
        ...prev,
        situation: params.situation || params.prompt || prev.situation,
      }));
    }
  }, [params.situation, params.prompt]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReframing, setIsReframing] = useState(false);
  const [showDistortionModal, setShowDistortionModal] = useState(false);
  const [hasAiSuggested, setHasAiSuggested] = useState(false);

  const handleSuggestReframe = async () => {
    if (!thoughtRecord.automaticThought.trim()) {
      Alert.alert(
        "Thought Required",
        "Please enter your automatic thought in Step 2 before requesting an AI reframe."
      );
      return;
    }
    setIsReframing(true);
    try {
      const res = await fetch(`${BACKEND_URL}/cbt/reframe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thought: thoughtRecord.automaticThought,
          situation: thoughtRecord.situation,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setThoughtRecord((prev) => ({
          ...prev,
          distortion:
            data.distortions && data.distortions.length > 0
              ? data.distortions[0]
              : prev.distortion,
          rationalResponse: data.reframe || prev.rationalResponse,
        }));
        setHasAiSuggested(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.log("Error suggesting reframe", err);
    } finally {
      setIsReframing(false);
    }
  };

  const submitThoughtRecord = async () => {
    if (
      !thoughtRecord.situation.trim() ||
      !thoughtRecord.automaticThought.trim() ||
      !thoughtRecord.distortion.trim() ||
      !thoughtRecord.rationalResponse.trim()
    ) {
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/wellness/thought-records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(thoughtRecord),
      });
      if (res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      }
    } catch (err) {
      console.log("Error submitting thought record", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid =
    thoughtRecord.situation.trim() &&
    thoughtRecord.automaticThought.trim() &&
    thoughtRecord.distortion.trim() &&
    thoughtRecord.rationalResponse.trim();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={22} color="#1E1B2E" strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerBreadcrumb}>THOUGHT RECORD</Text>
          <TouchableOpacity
            style={styles.infoBtn}
            activeOpacity={0.8}
            onPress={() =>
              Alert.alert(
                "Cognitive Reframing",
                "A structured technique to identify subconscious thinking traps and construct grounded, fact-based counter-statements."
              )
            }
          >
            <Info size={18} color="#6B7280" strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title Section */}
          <View style={styles.titleSection}>
            <View style={styles.badgeRow}>
              <View style={styles.purpleDot} />
              <Text style={styles.badgeText}>COGNITIVE REFRAMING</Text>
            </View>
            <Text style={styles.mainTitle}>Challenge a Thought</Text>
            <Text style={styles.subTitle}>
              Break down and reframe automatic thoughts by identifying cognitive
              distortions and grounding in objective evidence.
            </Text>
          </View>

          {/* Four-Step Unified Glass Card */}
          <View style={styles.formCard}>
            {/* STEP 1: Situation & Trigger */}
            <View style={styles.stepSection}>
              <View style={styles.stepHeaderRow}>
                <Text style={styles.stepLabel}>1. Situation & Trigger</Text>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>Context</Text>
                </View>
              </View>
              <TextInput
                style={styles.cleanInput}
                placeholder="What is happening? Who, where, and when?"
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
                value={thoughtRecord.situation}
                onChangeText={(t) =>
                  setThoughtRecord({ ...thoughtRecord, situation: t })
                }
              />
            </View>

            <View style={styles.divider} />

            {/* STEP 2: Automatic Thought */}
            <View style={styles.stepSection}>
              <View style={styles.stepHeaderRow}>
                <Text style={styles.stepLabel}>2. Automatic Thought</Text>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>First reaction</Text>
                </View>
              </View>
              <TextInput
                style={styles.cleanInput}
                placeholder="What exact thought or self-talk crossed your mind?"
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
                value={thoughtRecord.automaticThought}
                onChangeText={(t) =>
                  setThoughtRecord({ ...thoughtRecord, automaticThought: t })
                }
              />
            </View>

            <View style={styles.divider} />

            {/* STEP 3: Cognitive Distortion */}
            <View style={styles.stepSection}>
              <View style={styles.stepHeaderRow}>
                <Text style={styles.stepLabel}>3. Cognitive Distortion</Text>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>Thinking trap</Text>
                </View>
              </View>

              {/* Dropdown Selector */}
              <TouchableOpacity
                style={styles.dropdownSelector}
                onPress={() => setShowDistortionModal(true)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dropdownText,
                    !thoughtRecord.distortion && { color: "#9CA3AF" },
                  ]}
                  numberOfLines={1}
                >
                  {thoughtRecord.distortion || "Select distortion type..."}
                </Text>
                <ChevronDown size={16} color="#9CA3AF" strokeWidth={1.8} />
              </TouchableOpacity>

              {/* Quick Select Rectangular Chips */}
              <View style={styles.quickChipsRow}>
                {QUICK_CHIPS.map((chip) => {
                  const isSelected = thoughtRecord.distortion === chip;
                  return (
                    <TouchableOpacity
                      key={chip}
                      style={[
                        styles.quickChip,
                        isSelected && styles.quickChipActive,
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setThoughtRecord({
                          ...thoughtRecord,
                          distortion: isSelected ? "" : chip,
                        });
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.quickChipText,
                          isSelected && styles.quickChipTextActive,
                        ]}
                      >
                        {chip}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.divider} />

            {/* STEP 4: Grounded Rational Response */}
            <View style={styles.stepSection}>
              <View style={styles.stepHeaderRow}>
                <Text style={styles.stepLabel}>4. Grounded Rational Response</Text>
                <TouchableOpacity
                  style={[
                    styles.suggestBtn,
                    (!thoughtRecord.automaticThought.trim() || isReframing) && {
                      opacity: 0.6,
                    },
                  ]}
                  onPress={handleSuggestReframe}
                  disabled={isReframing || !thoughtRecord.automaticThought.trim()}
                  activeOpacity={0.7}
                >
                  {isReframing ? (
                    <ActivityIndicator size="small" color="#8B5CF6" />
                  ) : (
                    <Text style={styles.suggestBtnText}>+ Suggest Reframe</Text>
                  )}
                </TouchableOpacity>
              </View>

              {hasAiSuggested && (
                <Text style={styles.aiSuggestionNote}>
                  AI suggestion — edit this to make it yours.
                </Text>
              )}

              <TextInput
                style={[styles.cleanInput, { minHeight: 70 }]}
                placeholder="What is an objective, balanced counter-statement based on real facts?"
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
                value={thoughtRecord.rationalResponse}
                onChangeText={(t) => {
                  setThoughtRecord({ ...thoughtRecord, rationalResponse: t });
                }}
              />
            </View>
          </View>

          {/* Wide Solid Dark Button */}
          <TouchableOpacity
            style={[
              styles.saveBtn,
              !isFormValid && { opacity: 0.5 },
            ]}
            onPress={submitThoughtRecord}
            disabled={isSubmitting || !isFormValid}
            activeOpacity={0.88}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>Save Record</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Distortion Selector Modal */}
      <Modal
        visible={showDistortionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDistortionModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDistortionModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cognitive Distortion Type</Text>
              <Text style={styles.modalSub}>
                Select the thinking pattern that best matches this thought.
              </Text>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              {DISTORTION_OPTIONS.map((item) => {
                const isSelected = thoughtRecord.distortion === item.name;
                return (
                  <TouchableOpacity
                    key={item.name}
                    style={[
                      styles.modalOptionRow,
                      isSelected && styles.modalOptionRowSelected,
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setThoughtRecord({
                        ...thoughtRecord,
                        distortion: item.name,
                      });
                      setShowDistortionModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.modalOptionName,
                          isSelected && styles.modalOptionNameSelected,
                        ]}
                      >
                        {item.name}
                      </Text>
                      <Text style={styles.modalOptionDesc}>{item.desc}</Text>
                    </View>
                    {isSelected && (
                      <Check size={18} color="#8B5CF6" strokeWidth={2.2} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowDistortionModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
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
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(139, 92, 246, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerBreadcrumb: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: "#6B5FA0",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  infoBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  titleSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  purpleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#8B5CF6",
  },
  badgeText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: "#8B5CF6",
    letterSpacing: 0.8,
  },
  mainTitle: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: "#1E1B2E",
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subTitle: {
    fontSize: 13.5,
    fontFamily: Fonts.regular,
    color: "#6B7280",
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EDEAF4",
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  stepSection: {
    paddingVertical: 4,
  },
  stepHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  stepLabel: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: "#1E1B2E",
  },
  stepBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stepBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: "#6B7280",
  },
  cleanInput: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: "#1E1B2E",
    minHeight: 48,
    lineHeight: 21,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  divider: {
    height: 1,
    backgroundColor: "#F0EDF6",
    marginVertical: 14,
  },
  dropdownSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FAF9FC",
    borderWidth: 1,
    borderColor: "#EDEAF4",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
    marginBottom: 10,
  },
  dropdownText: {
    fontSize: 13.5,
    fontFamily: Fonts.regular,
    color: "#1E1B2E",
    flex: 1,
  },
  quickChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickChip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quickChipActive: {
    backgroundColor: "#F5F3FF",
    borderColor: "#8B5CF6",
  },
  quickChipText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: "#6B7280",
  },
  quickChipTextActive: {
    color: "#7C3AED",
    fontFamily: Fonts.bold,
  },
  suggestBtn: {
    borderWidth: 1,
    borderColor: "#8B5CF6",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  suggestBtnText: {
    fontSize: 11.5,
    fontFamily: Fonts.bold,
    color: "#7C3AED",
  },
  aiSuggestionNote: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    fontStyle: "italic",
    color: "#7C3AED",
    marginBottom: 6,
  },
  saveBtn: {
    backgroundColor: "#15131C",
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: Fonts.bold,
    color: "#1E1B2E",
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 12.5,
    fontFamily: Fonts.regular,
    color: "#6B7280",
    lineHeight: 18,
  },
  modalOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalOptionRowSelected: {
    backgroundColor: "#F5F3FF",
  },
  modalOptionName: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: "#1E1B2E",
    marginBottom: 2,
  },
  modalOptionNameSelected: {
    color: "#7C3AED",
  },
  modalOptionDesc: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: "#6B7280",
    lineHeight: 16,
  },
  modalCloseBtn: {
    marginTop: 16,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCloseBtnText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: "#1E1B2E",
  },
});
