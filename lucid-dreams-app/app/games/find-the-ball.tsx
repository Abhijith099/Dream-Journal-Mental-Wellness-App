import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import { Colors, Fonts } from '@/constants/theme';

export default function FindTheBallScreen() {
  const [phase, setPhase] = useState<'idle' | 'shuffling' | 'guessing' | 'revealed'>('idle');
  const [round, setRound] = useState(1);
  const [ballCupIndex, setBallCupIndex] = useState(1);
  const [guessResult, setGuessResult] = useState<'correct' | 'incorrect' | null>(null);

  const baseCoords = [-110, 0, 110];

  const cup0X = useSharedValue(baseCoords[0]);
  const cup1X = useSharedValue(baseCoords[1]);
  const cup2X = useSharedValue(baseCoords[2]);
  const cupXs = [cup0X, cup1X, cup2X];

  const cup0Y = useSharedValue(0);
  const cup1Y = useSharedValue(0);
  const cup2Y = useSharedValue(0);
  const cupYs = [cup0Y, cup1Y, cup2Y];

  const resetCups = useCallback(() => {
    cup0X.value = baseCoords[0];
    cup1X.value = baseCoords[1];
    cup2X.value = baseCoords[2];
    cup0Y.value = 0;
    cup1Y.value = 0;
    cup2Y.value = 0;
  }, [baseCoords, cup0X, cup1X, cup2X, cup0Y, cup1Y, cup2Y]);

  const startRound = useCallback(async () => {
    setGuessResult(null);
    setPhase('idle');
    resetCups();
    
    const newBallIndex = Math.floor(Math.random() * 3);
    setBallCupIndex(newBallIndex);
    
    // Briefly show the ball before shuffling
    setTimeout(() => {
      cupYs[newBallIndex].value = withTiming(-70, { duration: 400 });
      
      setTimeout(() => {
        // Put cup down
        cupYs[newBallIndex].value = withTiming(0, { duration: 400 });
        
        setTimeout(() => {
          shuffleCups();
        }, 600);
      }, 1200);
    }, 400);
  }, [resetCups, cupYs]);

  useEffect(() => {
    startRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shuffleCups = async () => {
    setPhase('shuffling');
    const swaps = Math.floor(Math.random() * 3) + 3; // 3 to 5 swaps
    let currentPositions = [0, 1, 2]; // cup i is at position currentPositions[i]
    
    for (let i = 0; i < swaps; i++) {
      let p1 = Math.floor(Math.random() * 3);
      let p2 = (p1 + 1 + Math.floor(Math.random() * 2)) % 3; 
      
      const cup1 = currentPositions.findIndex(p => p === p1);
      const cup2 = currentPositions.findIndex(p => p === p2);
      
      currentPositions[cup1] = p2;
      currentPositions[cup2] = p1;
      
      cupXs[cup1].value = withTiming(baseCoords[p2], { duration: 400 });
      cupXs[cup2].value = withTiming(baseCoords[p1], { duration: 400 });
      
      await new Promise(resolve => setTimeout(resolve, 450));
    }
    
    setPhase('guessing');
  };

  const handleGuess = (guessedCupIndex: number) => {
    if (phase !== 'guessing') return;
    
    setPhase('revealed');
    // Lift the guessed cup
    cupYs[guessedCupIndex].value = withTiming(-70, { duration: 400 });
    
    if (guessedCupIndex === ballCupIndex) {
      setGuessResult('correct');
    } else {
      setGuessResult('incorrect');
    }
  };

  const handleNextRound = () => {
    setRound(prev => prev + 1);
    startRound();
  };

  const wrapperStyles = [
    useAnimatedStyle(() => ({ transform: [{ translateX: cup0X.value }] })),
    useAnimatedStyle(() => ({ transform: [{ translateX: cup1X.value }] })),
    useAnimatedStyle(() => ({ transform: [{ translateX: cup2X.value }] })),
  ];

  const cupGraphicsStyles = [
    useAnimatedStyle(() => ({ transform: [{ translateY: cup0Y.value }] })),
    useAnimatedStyle(() => ({ transform: [{ translateY: cup1Y.value }] })),
    useAnimatedStyle(() => ({ transform: [{ translateY: cup2Y.value }] })),
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Persistent Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.exitButton} activeOpacity={0.7}>
          <X size={22} color={Colors.light.text} strokeWidth={1.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find the Ball</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.topSection}>
          <Text style={styles.roundText}>Round {round}</Text>
          <Text style={styles.instructionText}>
            {phase === 'idle' && 'Watch closely...'}
            {phase === 'shuffling' && 'Keep your eyes on the cup...'}
            {phase === 'guessing' && 'Which cup hides the ball?'}
            {phase === 'revealed' && (guessResult === 'correct' ? 'Found it.' : 'Not this one — try again?')}
          </Text>
        </View>

        <View style={styles.gameArea}>
          {/* Base shadow/platform */}
          <View style={styles.platform} />
          
          {/* The Cups */}
          {[0, 1, 2].map((cupIndex) => {
            const hasBall = cupIndex === ballCupIndex;
            return (
              <Animated.View
                key={cupIndex}
                style={[styles.cupWrapper, wrapperStyles[cupIndex]]}
              >
                {hasBall && <View style={styles.ballInner} />}

                <Animated.View style={cupGraphicsStyles[cupIndex]}>
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => handleGuess(cupIndex)}
                    disabled={phase !== 'guessing'}
                    style={styles.cupTouchArea}
                  >
                    <View style={styles.cupBody} />
                    <View style={styles.cupLip} />
                  </TouchableOpacity>
                </Animated.View>
              </Animated.View>
            );
          })}
        </View>

        <View style={styles.bottomSection}>
          {phase === 'revealed' && (
            <TouchableOpacity style={styles.nextRoundButton} onPress={handleNextRound} activeOpacity={0.8}>
              <Text style={styles.nextRoundText}>
                {guessResult === 'correct' ? 'Next Round' : 'Try Again'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
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
    shadowColor: "#000",
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
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  topSection: {
    alignItems: 'center',
    marginTop: 40,
    height: 80,
  },
  roundText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.light.secondaryText,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  instructionText: {
    fontSize: 22,
    fontFamily: Fonts.medium,
    color: Colors.light.text,
    textAlign: 'center',
  },
  gameArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  platform: {
    position: 'absolute',
    bottom: '40%',
    width: 320,
    height: 20,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 10,
  },
  ballInner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.light.cardMintFilled,
    bottom: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    zIndex: -1,
  },
  cupWrapper: {
    position: 'absolute',
    bottom: '42%',
    alignItems: 'center',
  },
  cupTouchArea: {
    alignItems: 'center',
    width: 80,
    height: 90,
    justifyContent: 'flex-end',
  },
  cupBody: {
    width: 70,
    height: 80,
    backgroundColor: Colors.light.cardSky,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    borderWidth: 2,
    borderColor: 'rgba(45, 45, 45, 0.05)',
  },
  cupLip: {
    position: 'absolute',
    bottom: 0,
    width: 80,
    height: 12,
    backgroundColor: Colors.light.cardSkyFilled,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(45, 45, 45, 0.05)',
  },
  bottomSection: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextRoundButton: {
    backgroundColor: "#3B4A54",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  nextRoundText: {
    color: "#F9F9F7",
    fontFamily: Fonts.bold,
    fontSize: 16,
  },
});
