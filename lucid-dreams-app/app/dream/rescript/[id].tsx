import { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { authenticatedFetch as fetch, BACKEND_URL } from "../../../utils/api";
import { ChevronLeft, CheckCircle2 } from "lucide-react-native";
import { Colors, Fonts } from "@/constants/theme";

interface Dream {
  _id: string;
  title: string;
  memoryText?: string;
  description: string;
  rescriptedEnding?: string;
}

export default function RescriptDreamScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [dream, setDream] = useState<Dream | null>(null);
  const [loading, setLoading] = useState(true);
  const [rescriptedEnding, setRescriptedEnding] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchDream = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${BACKEND_URL}/dreams/${id}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setDream(data);
        if (data.rescriptedEnding) {
          setRescriptedEnding(data.rescriptedEnding);
        }
      } catch (err) {
        console.error("Error fetching dream:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDream();
  }, [id]);

  const handleSave = async () => {
    if (!rescriptedEnding.trim()) {
      Alert.alert("Wait", "Please write a new ending before saving.");
      return;
    }
    
    setSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/dreams/${id}/rescript`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rescriptedEnding }),
      });
      if (!res.ok) throw new Error("Failed to save");
      
      Alert.alert("Saved", "Your new ending has been rehearsed and saved.", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not save your new ending. Please try again.");
    } finally {
      setSaving(false);
    }
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
        <Text style={styles.errorText}>Dream not found.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const originalContent = dream.memoryText || dream.description;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={22} color={Colors.light.text} strokeWidth={1.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Imagery Rehearsal
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: Colors.light.cardSand }]}>
          <Text style={styles.cardLabel}>Original Dream</Text>
          <Text style={styles.memoryText}>{originalContent}</Text>
        </View>

        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>Rewrite the Ending</Text>
          <Text style={styles.instructionsText}>
            Take control of this narrative. How would you like this dream to end instead? 
            Describe a positive, empowering, or simply neutral resolution.
          </Text>
        </View>

        <TextInput
          style={styles.textInput}
          multiline
          placeholder="I turn around and face the..."
          placeholderTextColor={Colors.light.secondaryText}
          value={rescriptedEnding}
          onChangeText={setRescriptedEnding}
          autoFocus={!dream.rescriptedEnding}
        />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.saveButton, !rescriptedEnding.trim() && { opacity: 0.5 }]} 
          onPress={handleSave}
          disabled={saving || !rescriptedEnding.trim()}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <CheckCircle2 size={16} color="#FFFFFF" strokeWidth={1.5} style={{ marginRight: 8 }} />
              <Text style={styles.saveButtonText}>Save New Ending</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.light.background,
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
    gap: 20,
  },
  card: {
    borderRadius: 22,
    padding: 20,
  },
  cardLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.light.text,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  memoryText: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.light.text,
    lineHeight: 23,
    opacity: 0.8,
  },
  instructionsContainer: {
    paddingHorizontal: 4,
  },
  instructionsTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.light.text,
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.light.secondaryText,
    lineHeight: 20,
  },
  textInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    paddingTop: 20,
    minHeight: 180,
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.light.text,
    lineHeight: 23,
    textAlignVertical: "top",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.light.background,
    borderTopWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  saveButton: {
    flexDirection: "row",
    backgroundColor: Colors.light.tint,
    paddingVertical: 14,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontFamily: Fonts.bold,
    fontSize: 15,
  },
  errorText: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: Colors.light.secondaryText,
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
});
