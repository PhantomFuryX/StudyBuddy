import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  SafeAreaView,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../utils/theme';
import { submitAnswer, getDailyQuestions, getCategoryQuestions } from '../utils/api';

const { width } = Dimensions.get('window');

const CATEGORY_COLORS = {
  reasoning: colors.reasoning,
  gk: colors.gk,
  current_affairs: colors.current_affairs,
};

const CATEGORY_ICONS = {
  reasoning: '🧩',
  gk: '📚',
  current_affairs: '📰',
};

export default function QuizScreen({ route, navigation }) {
  const [questions, setQuestions] = useState(route.params?.questions || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(!route.params?.questions);
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0, streak: 0, points: 0 });
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [newBadge, setNewBadge] = useState(null);
  const [startTime, setStartTime] = useState(Date.now());
  
  const progressAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(1)).current;
  const resultAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!route.params?.questions) {
      loadQuestions();
    }
  }, []);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (currentIndex + 1) / questions.length,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setStartTime(Date.now());
  }, [currentIndex, questions.length]);

  const loadQuestions = async () => {
    try {
      let data;
      if (route.params?.category) {
        data = await getCategoryQuestions(route.params.category, 10);
      } else {
        data = await getDailyQuestions();
      }
      setQuestions(data.questions);
    } catch (error) {
      console.log('Error loading questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (index) => {
    if (selectedAnswer !== null) return;
    
    setSelectedAnswer(index);
    const timeMs = Date.now() - startTime;
    const question = questions[currentIndex];
    
    try {
      const result = await submitAnswer(question.id, index, timeMs);
      setIsCorrect(result.correct);
      setExplanation(result.explanation);
      
      if (result.correct) {
        setScore(score + 1);
        setSessionStats(prev => ({
          ...prev,
          correct: prev.correct + 1,
          streak: result.streak,
          points: prev.points + result.points_earned,
        }));
      } else {
        setSessionStats(prev => ({ ...prev, wrong: prev.wrong + 1 }));
      }
      
      if (result.new_badge) {
        setNewBadge(result.new_badge);
        setTimeout(() => setShowBadgeModal(true), 1000);
      }
      
      setShowResult(true);
      Animated.timing(resultAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      const correct = index === question.answer_index;
      setIsCorrect(correct);
      setExplanation(question.explanation || '');
      if (correct) setScore(score + 1);
      setShowResult(true);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      navigation.replace('Result', {
        score,
        total: questions.length,
        stats: sessionStats,
      });
      return;
    }
    
    Animated.sequence([
      Animated.timing(cardAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    
    setTimeout(() => {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      resultAnim.setValue(0);
    }, 150);
  };

  const handleQuit = () => {
    navigation.goBack();
  };

  if (loading || questions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingEmoji}>📝</Text>
        <Text style={styles.loadingText}>Preparing your questions...</Text>
      </View>
    );
  }

  const question = questions[currentIndex];
  const categoryColor = CATEGORY_COLORS[question.category] || colors.primary;
  const categoryIcon = CATEGORY_ICONS[question.category] || '📝';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.quitButton} onPress={handleQuit}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>
            {currentIndex + 1} / {questions.length}
          </Text>
        </View>
        
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>⭐ {score}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <Animated.View 
          style={[
            styles.progressBar,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
              backgroundColor: categoryColor,
            }
          ]} 
        />
      </View>

      {/* Question Card */}
      <Animated.View style={[styles.questionCard, { opacity: cardAnim, transform: [{ scale: cardAnim }] }]}>
        <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}>
          <Text style={styles.categoryIcon}>{categoryIcon}</Text>
          <Text style={[styles.categoryText, { color: categoryColor }]}>
            {question.category?.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
        
        <Text style={styles.questionText}>{question.question}</Text>
        
        {/* Options */}
        <View style={styles.optionsContainer}>
          {question.options?.map((option, index) => {
            let optionStyle = styles.option;
            let textStyle = styles.optionText;
            
            if (showResult) {
              if (index === question.answer_index) {
                optionStyle = [styles.option, styles.optionCorrect];
                textStyle = [styles.optionText, styles.optionTextCorrect];
              } else if (index === selectedAnswer && !isCorrect) {
                optionStyle = [styles.option, styles.optionWrong];
                textStyle = [styles.optionText, styles.optionTextWrong];
              }
            } else if (index === selectedAnswer) {
              optionStyle = [styles.option, styles.optionSelected];
            }
            
            return (
              <TouchableOpacity
                key={index}
                style={optionStyle}
                onPress={() => handleAnswer(index)}
                disabled={showResult}
                activeOpacity={0.7}
              >
                <View style={styles.optionPrefix}>
                  <Text style={styles.optionPrefixText}>
                    {String.fromCharCode(65 + index)}
                  </Text>
                </View>
                <Text style={textStyle}>{option}</Text>
                {showResult && index === question.answer_index && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                )}
                {showResult && index === selectedAnswer && !isCorrect && (
                  <Ionicons name="close-circle" size={24} color={colors.error} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>

      {/* Result Feedback */}
      {showResult && (
        <Animated.View style={[styles.resultContainer, { opacity: resultAnim }]}>
          <View style={[styles.resultCard, isCorrect ? styles.resultCorrect : styles.resultWrong]}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultEmoji}>{isCorrect ? '🎉' : '💪'}</Text>
              <Text style={[styles.resultText, { color: isCorrect ? colors.success : colors.error }]}>
                {isCorrect ? 'Correct!' : 'Not quite!'}
              </Text>
            </View>
            {explanation && (
              <Text style={styles.explanationText}>{explanation}</Text>
            )}
          </View>
          
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <LinearGradient colors={colors.gradientPrimary} style={styles.nextButtonGradient}>
              <Text style={styles.nextButtonText}>
                {currentIndex + 1 >= questions.length ? 'See Results' : 'Next Question'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Badge Modal */}
      <Modal visible={showBadgeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.badgeModal}>
            <Text style={styles.badgeEmoji}>{newBadge?.icon}</Text>
            <Text style={styles.badgeTitle}>New Badge Earned!</Text>
            <Text style={styles.badgeName}>{newBadge?.name}</Text>
            <Text style={styles.badgeDesc}>{newBadge?.description}</Text>
            <TouchableOpacity
              style={styles.badgeButton}
              onPress={() => setShowBadgeModal(false)}
            >
              <Text style={styles.badgeButtonText}>Awesome! 🎉</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingEmoji: {
    fontSize: 60,
    marginBottom: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  quitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.small,
  },
  progressInfo: {
    flex: 1,
    alignItems: 'center',
  },
  progressText: {
    ...typography.bodyBold,
    color: colors.text,
  },
  scoreContainer: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
  },
  scoreText: {
    ...typography.bodyBold,
    color: colors.warning,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: colors.divider,
    marginHorizontal: spacing.lg,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  questionCard: {
    flex: 1,
    margin: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.medium,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    marginBottom: spacing.lg,
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  categoryText: {
    ...typography.small,
    fontWeight: '600',
  },
  questionText: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xl,
    lineHeight: 28,
  },
  optionsContainer: {
    gap: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  optionCorrect: {
    borderColor: colors.success,
    backgroundColor: colors.success + '15',
  },
  optionWrong: {
    borderColor: colors.error,
    backgroundColor: colors.error + '15',
  },
  optionPrefix: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  optionPrefixText: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  optionText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  optionTextCorrect: {
    color: colors.success,
    fontWeight: '600',
  },
  optionTextWrong: {
    color: colors.error,
  },
  resultContainer: {
    padding: spacing.lg,
  },
  resultCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  resultCorrect: {
    backgroundColor: colors.success + '15',
  },
  resultWrong: {
    backgroundColor: colors.error + '15',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  resultEmoji: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  resultText: {
    ...typography.h3,
  },
  explanationText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  nextButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  nextButtonText: {
    ...typography.bodyBold,
    color: '#fff',
    marginRight: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeModal: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    margin: spacing.lg,
    alignItems: 'center',
    ...shadows.large,
  },
  badgeEmoji: {
    fontSize: 80,
    marginBottom: spacing.md,
  },
  badgeTitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  badgeName: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  badgeDesc: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  badgeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  badgeButtonText: {
    ...typography.bodyBold,
    color: '#fff',
  },
});
