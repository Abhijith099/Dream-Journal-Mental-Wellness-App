import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { X, CheckCircle } from 'lucide-react-native';
import { Colors, Fonts } from '@/constants/theme';
import { QUIZ_QUESTIONS, QuizQuestion } from '@/constants/questions';

export default function QuizScreen() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(40);

  const startNewQuiz = useCallback(() => {
    // Shuffle and pick 10 questions
    const shuffled = [...QUIZ_QUESTIONS].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 10);
    setQuestions(selected);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setCorrectCount(0);
    setTimeLeft(40);
  }, []);

  useEffect(() => {
    startNewQuiz();
  }, [startNewQuiz]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (!isAnswered && currentIndex < questions.length && questions.length > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            // Time ran out!
            setCurrentIndex(c => c + 1);
            setSelectedAnswer(null);
            setIsAnswered(false);
            return 40;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [currentIndex, isAnswered, questions.length]);

  const handleSelectAnswer = (index: number) => {
    if (isAnswered) return; // Prevent changing answer
    setSelectedAnswer(index);
    setIsAnswered(true);
    
    if (questions[currentIndex].correctAnswerIndex === index) {
      setCorrectCount(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setTimeLeft(40);
    }
  };

  if (questions.length === 0) {
    return null; // Loading state
  }

  const isFinished = currentIndex >= questions.length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Persistent Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.exitButton} activeOpacity={0.7}>
          <X size={22} color={Colors.light.text} strokeWidth={1.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quiz</Text>
        <View style={{ width: 40 }} /> {/* Balancer */}
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {isFinished ? (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Quiz Complete</Text>
            <Text style={styles.summaryText}>You answered {correctCount} of {questions.length}</Text>
            <TouchableOpacity style={styles.playAgainButton} onPress={startNewQuiz} activeOpacity={0.8}>
              <Text style={styles.playAgainText}>Play Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.quizContainer}>
            <View style={styles.questionHeaderRow}>
              <Text style={styles.progressText}>Question {currentIndex + 1} of {questions.length}</Text>
              <Text style={styles.timerText}>{timeLeft}s</Text>
            </View>
            <Text style={styles.questionText}>{questions[currentIndex].text}</Text>
            
            <View style={styles.optionsContainer}>
              {questions[currentIndex].options.map((option, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrect = questions[currentIndex].correctAnswerIndex === index;
                const showFeedback = isAnswered;

                let backgroundColor = '#FFFFFF';
                let borderColor = 'rgba(45, 45, 45, 0.1)';

                if (showFeedback) {
                  if (isSelected && isCorrect) {
                    backgroundColor = Colors.light.cardMint;
                    borderColor = Colors.light.cardMintFilled;
                  } else if (isSelected && !isCorrect) {
                    backgroundColor = Colors.light.cardBlush;
                    borderColor = Colors.light.cardBlushFilled;
                  } else if (isCorrect) {
                    // Gently indicate the correct one if they missed it
                    backgroundColor = Colors.light.cardMint;
                    borderColor = Colors.light.cardMintFilled;
                  }
                } else if (isSelected) {
                  borderColor = Colors.light.text;
                }

                return (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.7}
                    onPress={() => handleSelectAnswer(index)}
                    style={[styles.optionCard, { backgroundColor, borderColor }]}
                  >
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {option}
                    </Text>
                    {showFeedback && isCorrect && (
                      <CheckCircle size={16} color={Colors.light.text} strokeWidth={1.5} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {isAnswered && (
              <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.8}>
                <Text style={styles.nextButtonText}>Next</Text>
              </TouchableOpacity>
            )}
          </View>
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
    paddingHorizontal: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  summaryContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  summaryTitle: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: Colors.light.text,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: Colors.light.secondaryText,
    marginBottom: 40,
  },
  playAgainButton: {
    backgroundColor: "#3B4A54",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  playAgainText: {
    color: "#F9F9F7",
    fontFamily: Fonts.bold,
    fontSize: 16,
  },
  quizContainer: {
    flex: 1,
    marginTop: 10,
  },
  questionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.light.secondaryText,
  },
  timerText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.light.secondaryText,
  },
  questionText: {
    fontSize: 22,
    fontFamily: Fonts.semiBold,
    color: Colors.light.text,
    marginBottom: 32,
    lineHeight: 30,
  },
  optionsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  optionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  optionText: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: Colors.light.text,
    flex: 1,
  },
  optionTextSelected: {
    fontFamily: Fonts.semiBold,
  },
  nextButton: {
    backgroundColor: "#3B4A54",
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  nextButtonText: {
    color: "#F9F9F7",
    fontFamily: Fonts.bold,
    fontSize: 16,
  },
});
