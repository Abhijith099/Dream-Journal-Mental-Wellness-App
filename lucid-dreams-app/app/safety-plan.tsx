import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { authenticatedFetch as fetch, BACKEND_URL } from '../utils/api';
import { ChevronLeft, Plus, X, Anchor, Link2 } from 'lucide-react-native';
import { Colors, Fonts } from '@/constants/theme';

export default function SafetyPlanScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState({
    warningSigns: [],
    copingStrategies: [],
    distractions: [],
    professionalSupport: []
  });

  const [newInputs, setNewInputs] = useState({
    warningSigns: '',
    copingStrategies: '',
    distractions: '',
    professionalSupport: ''
  });

  useEffect(() => {
    fetchPlan();
  }, []);

  const fetchPlan = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/wellness/safety-plan`);
      if (res.ok) {
        const data = await res.json();
        setPlan({
          warningSigns: data.warningSigns || [],
          copingStrategies: data.copingStrategies || [],
          distractions: data.distractions || [],
          professionalSupport: data.professionalSupport || []
        });
      }
    } catch (err) {
      console.error('Error fetching safety plan:', err);
    } finally {
      setLoading(false);
    }
  };

  const savePlan = async (updatedPlan: typeof plan) => {
    setSaving(true);
    try {
      await fetch(`${BACKEND_URL}/wellness/safety-plan`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedPlan)
      });
    } catch (err) {
      console.error('Error saving safety plan:', err);
    } finally {
      setSaving(false);
    }
  };

  const addItem = (field: keyof typeof plan) => {
    const value = newInputs[field].trim();
    if (!value) return;
    
    const updatedPlan = {
      ...plan,
      [field]: [...plan[field], value]
    };
    
    setPlan(updatedPlan);
    setNewInputs({ ...newInputs, [field]: '' });
    savePlan(updatedPlan);
  };

  const removeItem = (field: keyof typeof plan, index: number) => {
    const updatedPlan = {
      ...plan,
      [field]: plan[field].filter((_, i) => i !== index)
    };
    setPlan(updatedPlan);
    savePlan(updatedPlan);
  };

  const renderSection = (title: string, field: keyof typeof plan, description: string) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionDesc}>{description}</Text>
      
      <View style={styles.list}>
        {plan[field].map((item, index) => (
          <View key={index} style={styles.listItem}>
            <Text style={styles.listItemText}>{item}</Text>
            <TouchableOpacity onPress={() => removeItem(field, index)} style={styles.removeBtn}>
              <X size={16} color={Colors.light.secondaryText} strokeWidth={1.5} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Add new item..."
          placeholderTextColor="#A0A0A0"
          value={newInputs[field]}
          onChangeText={(val) => setNewInputs({ ...newInputs, [field]: val })}
          onSubmitEditing={() => addItem(field)}
        />
        <TouchableOpacity onPress={() => addItem(field)} style={styles.addBtn}>
          <Plus size={16} color="#F9F9F7" strokeWidth={1.5} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color={Colors.light.text} strokeWidth={1.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Safety Plan</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.light.text} style={{ marginTop: 40 }} />
        ) : (
          <>
            <Text style={styles.introText}>
              A safety plan is a personalized, practical plan that can help you avoid a crisis or navigate through one. Keep it updated and accessible.
            </Text>

            {renderSection('1. Warning Signs', 'warningSigns', 'Thoughts, images, mood, situation, or behavior that a crisis might be developing.')}
            
            {renderSection('2. Internal Coping', 'copingStrategies', 'Things I can do to take my mind off my problems without contacting another person.')}
            
            {/* Quick Links for internal coping */}
            <View style={styles.quickLinks}>
              <Text style={styles.quickLinksTitle}>In-App Tools:</Text>
              <View style={styles.quickLinksRow}>
                <TouchableOpacity style={styles.quickLinkBtn} onPress={() => router.push('/explore?tab=somatic')}>
                  <Anchor size={13} color={Colors.light.text} strokeWidth={1.5} />
                  <Text style={styles.quickLinkText}>Breathing</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickLinkBtn} onPress={() => router.push('/explore?tab=soundscapes')}>
                  <Link2 size={13} color={Colors.light.text} strokeWidth={1.5} />
                  <Text style={styles.quickLinkText}>Soundscapes</Text>
                </TouchableOpacity>
              </View>
            </View>

            {renderSection('3. Distractions', 'distractions', 'People and social settings that provide distraction.')}
            
            {renderSection('4. Professional Support', 'professionalSupport', 'Professionals or agencies I can contact during a crisis.')}
            
            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.light.text,
  },
  scrollContent: {
    padding: 20,
  },
  introText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.light.secondaryText,
    lineHeight: 22,
    marginBottom: 24,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.light.text,
    marginBottom: 6,
  },
  sectionDesc: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.light.secondaryText,
    marginBottom: 16,
    lineHeight: 18,
  },
  list: {
    gap: 8,
    marginBottom: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  listItemText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.light.text,
  },
  removeBtn: {
    padding: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.light.text,
  },
  addBtn: {
    backgroundColor: '#2D2D2D',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLinks: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  quickLinksTitle: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    color: Colors.light.secondaryText,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  quickLinksRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.cardBlush,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
  },
  quickLinkText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: Colors.light.text,
  }
});
