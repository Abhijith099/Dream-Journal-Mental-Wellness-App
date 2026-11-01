import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Image } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { X } from 'lucide-react-native';
import { Colors, Fonts } from '@/constants/theme';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { availableYogaGifs } from '../assets/yoga/availableGifs';

const EXERCISES = [
  {
    id: '1', name: 'Dhanurasana', benefit: 'Back stretch', poseKey: 'dhanurasana', accentColor: 'rgba(212, 224, 208, 0.5)', duration: 'Hold 15-30 seconds, repeat 2-3 times',
    steps: ['Lie on your stomach.', 'Bend your knees and hold your ankles.', 'Lift your chest and thighs off the floor.', 'Breathe steadily.', 'Release gently.']
  },
  {
    id: '2', name: 'Matsyasana', benefit: 'Chest opener', poseKey: 'matsyasana', accentColor: 'rgba(235, 229, 217, 0.5)', duration: 'Hold 30-60 seconds',
    steps: ['Lie on your back.', 'Prop yourself up on your elbows.', 'Lift your chest and drop your head back.', 'Keep legs straight or crossed.', 'Breathe deeply.']
  },
  {
    id: '3', name: 'Vrikshasana', benefit: 'Balance', poseKey: 'vrikshasana', accentColor: 'rgba(210, 223, 230, 0.5)', duration: 'Hold 20-30 seconds per side',
    steps: ['Stand tall, shift your weight onto one foot.', 'Place the sole of the other foot on your inner calf or thigh.', 'Bring hands together at your chest.', 'Fix your gaze on a point ahead to help balance.', 'Hold, then switch sides.']
  },
  {
    id: '4', name: 'Bhujangasana', benefit: 'Back/chest stretch', poseKey: 'bhujangasana', accentColor: 'rgba(212, 224, 208, 0.5)', duration: 'Hold 20-30 seconds, repeat 3-5 times',
    steps: ['Lie on your stomach, hands under your shoulders.', 'Press hands down, lift your chest slowly.', 'Keep elbows slightly bent, shoulders relaxed away from the ears.', 'Hold briefly, breathing steadily.', 'Lower back down slowly.']
  },
  {
    id: '5', name: 'Chakrasana', benefit: 'Full body stretch', poseKey: 'chakrasana', accentColor: 'rgba(235, 229, 217, 0.5)', duration: 'Hold 15-30 seconds if comfortable',
    steps: ['Lie on your back with knees bent.', 'Place hands next to your ears, fingers pointing to shoulders.', 'Press into hands and feet to lift your hips and chest.', 'Straighten arms if comfortable.', 'Lower down slowly.']
  },
  {
    id: '6', name: 'Balasana', benefit: 'Relaxation', poseKey: 'balasana', accentColor: 'rgba(210, 223, 230, 0.5)', duration: 'Stay 1-3 minutes',
    steps: ['Kneel with big toes touching, knees apart.', 'Sit back onto your heels.', 'Fold forward, arms extended in front or resting alongside the body.', 'Rest your forehead on the mat.', 'Breathe slowly, stay as long as feels comfortable.']
  },
  {
    id: '7', name: 'Natarajasana', benefit: 'Balance and stretch', poseKey: 'natarajasana', accentColor: 'rgba(212, 224, 208, 0.5)', duration: 'Hold 20-30 seconds per side',
    steps: ['Stand tall, shift weight to one leg.', 'Bend the other knee and hold the inside of your foot.', 'Lean forward slightly, lifting the foot up and back.', 'Reach the opposite arm forward for balance.', 'Hold, then release and switch sides.']
  },
  {
    id: '8', name: 'Padmasana', benefit: 'Meditation posture', poseKey: 'padmasana', accentColor: 'rgba(235, 229, 217, 0.5)', duration: 'Sit for 1-5 minutes',
    steps: ['Sit on the floor with legs crossed.', 'Place each foot on the opposite thigh.', 'Keep your spine straight.', 'Rest hands on your knees.', 'Breathe deeply and hold.']
  },
  {
    id: '9', name: 'Paschimottanasana', benefit: 'Hamstring stretch', poseKey: 'paschimottanasana', accentColor: 'rgba(210, 223, 230, 0.5)', duration: 'Hold 1-3 minutes',
    steps: ['Sit with your legs extended straight in front of you.', 'Inhale and sit tall.', 'Exhale and fold forward from the hips.', 'Reach for your feet or shins.', 'Relax your neck and breathe.']
  },
  {
    id: '10', name: 'Sarvangasana', benefit: 'Inversion', poseKey: 'sarvangasana', accentColor: 'rgba(212, 224, 208, 0.5)', duration: 'Hold 30-60 seconds — skip or take care if you have neck concerns',
    steps: ['Lie on your back.', 'Lift your legs and hips off the floor.', 'Support your lower back with your hands.', 'Straighten your legs up toward the ceiling.', 'Keep your neck still and weight on your shoulders.']
  },
  {
    id: '11', name: 'Shalabhasana', benefit: 'Back strength', poseKey: 'shalabhasana', accentColor: 'rgba(235, 229, 217, 0.5)', duration: 'Hold 10-20 seconds, repeat 3-5 times',
    steps: ['Lie on your stomach, arms by your sides.', 'Inhale and lift your chest, arms, and legs off the floor.', 'Keep your neck long.', 'Breathe smoothly.', 'Exhale and release down.']
  },
  {
    id: '12', name: 'Supta Vajrasana', benefit: 'Quad stretch', poseKey: 'supta_vajrasana', accentColor: 'rgba(210, 223, 230, 0.5)', duration: 'Stay 30-60 seconds',
    steps: ['Kneel and sit between your heels.', 'Slowly lean back onto your elbows.', 'If comfortable, lie all the way back onto the floor.', 'Rest your arms overhead or by your sides.', 'Breathe deeply.']
  },
  {
    id: '13', name: 'Surya Namaskar', benefit: 'Full body flow', poseKey: 'surya_namaskar', accentColor: 'rgba(212, 224, 208, 0.5)', duration: 'Flow through 3-5 rounds',
    steps: ['Start in Tadasana (Mountain Pose).', 'Inhale, arms up. Exhale, fold forward.', 'Inhale, lift halfway. Exhale, step back to plank and lower down.', 'Inhale, upward dog. Exhale, downward dog.', 'Step forward, fold, and rise back to standing.']
  },
  {
    id: '14', name: 'Surya Namaskar 2', benefit: 'Full body flow', poseKey: 'surya_namaskar2', accentColor: 'rgba(235, 229, 217, 0.5)', duration: 'Flow through 3-5 rounds',
    steps: ['Similar to Surya Namaskar 1.', 'Focus on fluid movement linking breath to posture.', 'Move steadily and mindfully.', 'Rest in Balasana when finished.']
  },
  {
    id: '15', name: 'Uttanasana', benefit: 'Forward fold', poseKey: 'uttanasana', accentColor: 'rgba(210, 223, 230, 0.5)', duration: 'Hold 30-60 seconds',
    steps: ['Stand tall with feet hip-width apart.', 'Exhale and fold forward from the hips.', 'Let your arms hang or hold opposite elbows.', 'Keep a slight bend in your knees.', 'Relax your head and neck.']
  }
];

export default function ExercisesScreen() {
  const glowOpacity = useSharedValue(0.4);
  const [renderedPoses, setRenderedPoses] = useState<typeof EXERCISES>([]);

  useFocusEffect(
    useCallback(() => {
      // 1. Filter poses that exist in availableYogaGifs
      const available = EXERCISES.filter((pose) => availableYogaGifs[pose.poseKey]);

      // 2. Shuffle array (Fisher-Yates shuffle)
      const shuffled = [...available];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      // 3. Take up to 8
      setRenderedPoses(shuffled.slice(0, 8));
    }, [])
  );

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withTiming(0.8, {
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, [glowOpacity]);

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.exitButton} activeOpacity={0.7}>
          <X size={22} color={Colors.light.text} strokeWidth={1.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gentle Movement</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.introText}>
          Move gently, and stop if anything feels uncomfortable.
        </Text>

        <View style={styles.listContainer}>
          {renderedPoses.map((exercise) => (
            <View key={exercise.id} style={styles.exerciseCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.exerciseTitle}>{exercise.name}</Text>
                <Text style={styles.exerciseBenefit}>{exercise.benefit}</Text>
                {!!exercise.duration && (
                  <Text style={styles.exerciseDuration}>{exercise.duration}</Text>
                )}
              </View>

              <View style={styles.illustrationWrapper}>
                <Animated.View style={[
                  styles.illustrationCircle,
                  { backgroundColor: exercise.accentColor },
                  glowAnimatedStyle
                ]} />
                <View style={styles.svgContainer}>
                  <Image
                    source={availableYogaGifs[exercise.poseKey]}
                    style={styles.gifImage}
                    resizeMode="contain"
                  />
                </View>
              </View>

              <View style={styles.stepsContainer}>
                {exercise.steps.map((step, idx) => (
                  <View key={idx} style={styles.stepRow}>
                    <Text style={styles.stepNumber}>{idx + 1}.</Text>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
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
    paddingTop: 10,
    paddingBottom: 20,
  },
  exitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.light.text,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  introText: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: Colors.light.secondaryText,
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  listContainer: {
    gap: 20,
  },
  exerciseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    flexDirection: 'column',
  },
  cardHeader: {
    marginBottom: 16,
  },
  exerciseTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.light.text,
  },
  exerciseBenefit: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.light.secondaryText,
    marginTop: 4,
  },
  exerciseDuration: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.light.secondaryText,
    marginTop: 6,
    fontStyle: 'italic',
  },
  illustrationWrapper: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    position: 'relative',
  },
  illustrationCircle: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  svgContainer: {
    zIndex: 2,
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gifImage: {
    width: 160,
    height: 160,
  },
  stepsContainer: {
    marginTop: 16,
    gap: 10,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  stepNumber: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.light.secondaryText,
    width: 20,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.light.text,
    lineHeight: 20,
  },
});
