import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
  Alert,
  Vibration,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { generateQuiz, submitAnswer } from '../utils/api';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const { width } = Dimensions.get('window');

const colors = {
  primary: '#6C63FF',
  background: '#F8F9FE',
  surface: '#FFFFFF',
  text: '#1A1A2E',
  textSecondary: '#666687',
  correct: '#34C759',
  incorrect: '#FF3B30',
  warning: '#FF9500',
  gradientPrimary: ['#6C63FF', '#8B85FF'],
  gradientPractice: ['#4CAF50', '#81C784'],
  gradientTest: ['#FF9500', '#FFCC00'],
};

export default function QuizScreen() {
  const params = useLocalSearchParams();
  console.log('Quiz params received:', JSON.stringify(params));
  const mode = params.mode || 'practice';
  const targetCount = parseInt(params.count) || 30;
  const difficulty = params.difficulty || 'medium';
  let categories = undefined;
  try {
    categories = params.categories ? JSON.parse(params.categories) : undefined;
  } catch {}
  const initialTimeLimit = parseInt(params.timeLimit) || 0;
  console.log('Parsed values - count:', targetCount, 'mode:', mode, 'difficulty:', difficulty);

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);
  const [startTime, setStartTime] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(initialTimeLimit);
  const [answers, setAnswers] = useState([]);
  const [markedForReview, setMarkedForReview] = useState({});
  const [skippedQuestions, setSkippedQuestions] = useState([]);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef(null);

  useEffect(() => {
    fetchQuestions();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (mode === 'test' && timeRemaining > 0 && !loading) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            finishQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, mode]);

  const fetchQuestions = async () => {
    console.log('Fetching questions with targetCount:', targetCount);
    try {
      const data = await generateQuiz({
        count: targetCount,
        difficulty,
        mode,
        include_custom: true,
        categories,
      });
      console.log('Quiz API response - total:', data.total_count, 'questions received:', data.questions?.length);
      if (data.questions && data.questions.length > 0) {
        console.log('Using API questions, count:', data.questions.length);
        setQuestions(data.questions);
      } else {
        console.log('No questions from API, using mock with count:', targetCount);
        setQuestions(getMockQuestions(targetCount));
      }
    } catch (error) {
      console.log('Quiz API error, using mock questions with count:', targetCount, error);
      setQuestions(getMockQuestions(targetCount));
    } finally {
      setLoading(false);
      setStartTime(Date.now());
    }
  };

  const getMockQuestions = (count = 5) => {
    const allMockQuestions = [
      { id: '1', question: 'What is the capital of India?', options: ['Mumbai', 'New Delhi', 'Kolkata', 'Chennai'], answer_index: 1, category: 'gk', explanation: 'New Delhi is the capital city of India.' },
      { id: '2', question: 'If A = 1, B = 2... then CAT = ?', options: ['24', '25', '26', '27'], answer_index: 0, category: 'reasoning', explanation: 'C(3) + A(1) + T(20) = 24' },
      { id: '3', question: 'Who is the current President of India (2024)?', options: ['Ram Nath Kovind', 'Droupadi Murmu', 'Pratibha Patil', 'A.P.J Abdul Kalam'], answer_index: 1, category: 'current_affairs', explanation: 'Droupadi Murmu is the 15th President of India since July 2022.' },
      { id: '4', question: 'Find the missing number: 2, 6, 12, 20, ?', options: ['28', '30', '32', '26'], answer_index: 1, category: 'reasoning', explanation: 'Pattern: n × (n+1). 5 × 6 = 30' },
      { id: '5', question: 'Which river is known as the "Sorrow of Bengal"?', options: ['Ganga', 'Brahmaputra', 'Damodar', 'Hooghly'], answer_index: 2, category: 'gk', explanation: 'Damodar River is called the Sorrow of Bengal due to frequent floods.' },
      { id: '6', question: 'What is the largest planet in our solar system?', options: ['Earth', 'Mars', 'Jupiter', 'Saturn'], answer_index: 2, category: 'gk', explanation: 'Jupiter is the largest planet in our solar system.' },
      { id: '7', question: 'What is 15% of 200?', options: ['25', '30', '35', '40'], answer_index: 1, category: 'reasoning', explanation: '15% of 200 = (15/100) × 200 = 30' },
      { id: '8', question: 'Which gas do plants absorb from the atmosphere?', options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'], answer_index: 2, category: 'gk', explanation: 'Plants absorb Carbon Dioxide for photosynthesis.' },
      { id: '9', question: 'Complete the series: 1, 4, 9, 16, ?', options: ['20', '23', '25', '27'], answer_index: 2, category: 'reasoning', explanation: 'These are perfect squares: 1², 2², 3², 4², 5² = 25' },
      { id: '10', question: 'Who wrote the Indian National Anthem?', options: ['Bankim Chandra', 'Rabindranath Tagore', 'Sarojini Naidu', 'Subhas Bose'], answer_index: 1, category: 'gk', explanation: 'Rabindranath Tagore wrote Jana Gana Mana.' },
      { id: '11', question: 'Which is the longest river in India?', options: ['Yamuna', 'Godavari', 'Ganga', 'Brahmaputra'], answer_index: 2, category: 'gk', explanation: 'Ganga is the longest river in India at 2,525 km.' },
      { id: '12', question: 'If 5 workers can do a job in 10 days, how many days for 10 workers?', options: ['5 days', '20 days', '15 days', '8 days'], answer_index: 0, category: 'reasoning', explanation: 'Work = Workers × Days. 5×10 = 10×x, so x = 5 days.' },
      { id: '13', question: 'What is the chemical symbol for Gold?', options: ['Go', 'Gd', 'Au', 'Ag'], answer_index: 2, category: 'gk', explanation: 'Au is the chemical symbol for Gold (from Latin: Aurum).' },
      { id: '14', question: 'Find the odd one out: 2, 5, 10, 17, 26, 35', options: ['10', '17', '26', '35'], answer_index: 3, category: 'reasoning', explanation: 'Pattern is n²+1. 35 should be 37 (6²+1).' },
      { id: '15', question: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Mercury'], answer_index: 1, category: 'gk', explanation: 'Mars is called the Red Planet due to iron oxide on its surface.' },
      { id: '16', question: 'What is the square root of 144?', options: ['11', '12', '13', '14'], answer_index: 1, category: 'reasoning', explanation: '√144 = 12 because 12 × 12 = 144.' },
      { id: '17', question: 'Who is known as the Father of the Nation in India?', options: ['Nehru', 'Gandhi', 'Patel', 'Ambedkar'], answer_index: 1, category: 'gk', explanation: 'Mahatma Gandhi is known as the Father of the Nation.' },
      { id: '18', question: 'A train 100m long passes a pole in 10 seconds. What is its speed?', options: ['36 km/h', '10 km/h', '100 km/h', '25 km/h'], answer_index: 0, category: 'reasoning', explanation: 'Speed = 100/10 = 10 m/s = 36 km/h' },
      { id: '19', question: 'Which ocean is the largest?', options: ['Atlantic', 'Indian', 'Pacific', 'Arctic'], answer_index: 2, category: 'gk', explanation: 'Pacific Ocean is the largest ocean on Earth.' },
      { id: '20', question: 'What comes next: 1, 1, 2, 3, 5, 8, ?', options: ['11', '12', '13', '14'], answer_index: 2, category: 'reasoning', explanation: 'Fibonacci sequence: 5 + 8 = 13.' },
      { id: '21', question: 'In which year did India gain independence?', options: ['1945', '1946', '1947', '1948'], answer_index: 2, category: 'gk', explanation: 'India gained independence on August 15, 1947.' },
      { id: '22', question: 'What is 25% of 400?', options: ['75', '100', '125', '150'], answer_index: 1, category: 'reasoning', explanation: '25% of 400 = (25/100) × 400 = 100.' },
      { id: '23', question: 'Which vitamin is produced by sunlight?', options: ['Vitamin A', 'Vitamin B', 'Vitamin C', 'Vitamin D'], answer_index: 3, category: 'gk', explanation: 'Vitamin D is produced when skin is exposed to sunlight.' },
      { id: '24', question: 'If today is Monday, what day will it be after 100 days?', options: ['Wednesday', 'Thursday', 'Friday', 'Saturday'], answer_index: 0, category: 'reasoning', explanation: '100 ÷ 7 = 14 weeks + 2 days. Monday + 2 = Wednesday.' },
      { id: '25', question: 'What is the currency of Japan?', options: ['Yuan', 'Won', 'Yen', 'Dollar'], answer_index: 2, category: 'gk', explanation: 'Yen (¥) is the currency of Japan.' },
      { id: '26', question: 'Which is the smallest prime number?', options: ['0', '1', '2', '3'], answer_index: 2, category: 'reasoning', explanation: '2 is the smallest and only even prime number.' },
      { id: '27', question: 'Mount Everest is located in which mountain range?', options: ['Andes', 'Alps', 'Himalayas', 'Rockies'], answer_index: 2, category: 'gk', explanation: 'Mount Everest is part of the Himalayan mountain range.' },
      { id: '28', question: 'How many degrees in a right angle?', options: ['45°', '90°', '180°', '360°'], answer_index: 1, category: 'reasoning', explanation: 'A right angle is exactly 90 degrees.' },
      { id: '29', question: 'Who invented the telephone?', options: ['Edison', 'Bell', 'Tesla', 'Marconi'], answer_index: 1, category: 'gk', explanation: 'Alexander Graham Bell invented the telephone in 1876.' },
      { id: '30', question: 'What is the LCM of 4 and 6?', options: ['10', '12', '18', '24'], answer_index: 1, category: 'reasoning', explanation: 'LCM of 4 and 6 is 12.' },
    ];
    
    const questions = [];
    for (let i = 0; i < Math.min(count, allMockQuestions.length); i++) {
      questions.push({ ...allMockQuestions[i], id: `mock_${i + 1}` });
    }
    
    // If we need more questions than mock available, repeat them
    while (questions.length < count) {
      const idx = questions.length % allMockQuestions.length;
      questions.push({ 
        ...allMockQuestions[idx], 
        id: `mock_${questions.length + 1}` 
      });
    }
    
    return questions;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswer = async (index) => {
    if (selectedAnswer !== null) return;

    setSelectedAnswer(index);
    const currentQ = questions[currentIndex];
    const isCorrect = index === currentQ.answer_index;
    const timeMs = Date.now() - startTime;

    // Haptic feedback
    if (isCorrect) {
      Vibration.vibrate(50);
    } else {
      Vibration.vibrate([0, 50, 50, 50]);
    }

    const answerRecord = {
      questionId: currentQ.id,
      selectedIndex: index,
      correctIndex: currentQ.answer_index,
      isCorrect,
      timeMs,
    };
    setAnswers((prev) => [...prev, answerRecord]);

    if (isCorrect) {
      setScore((prev) => prev + 1);
    }

    // Only submit to backend if it's a real question (not mock)
    if (!currentQ.id.startsWith('mock_')) {
      try {
        await submitAnswer(currentQ.id, index, timeMs);
      } catch (error) {
        console.log('Error submitting answer:', error);
      }
    }

    if (mode === 'practice') {
      setShowResult(true);
    } else {
      setTimeout(() => nextQuestion(), 300);
    }
  };

  const nextQuestion = () => {
    // Check if there are skipped questions to handle at the end
    if (currentIndex + 1 >= questions.length) {
      // If there are skipped questions, go back to first skipped
      if (skippedQuestions.length > 0) {
        const nextSkipped = skippedQuestions[0];
        setSkippedQuestions(prev => prev.slice(1));
        goToQuestion(nextSkipped);
        return;
      }
      finishQuiz();
      return;
    }

    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();

    setCurrentIndex((prev) => prev + 1);
    setSelectedAnswer(null);
    setShowResult(false);
    setStartTime(Date.now());
  };

  const goToQuestion = (index) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();

    setCurrentIndex(index);
    setSelectedAnswer(null);
    setShowResult(false);
    setStartTime(Date.now());
  };

  const handleSkip = () => {
    if (selectedAnswer !== null) return;
    
    // Add to skipped list if not already there
    if (!skippedQuestions.includes(currentIndex)) {
      setSkippedQuestions(prev => [...prev, currentIndex]);
    }
    
    // Record as skipped
    const currentQ = questions[currentIndex];
    const answerRecord = {
      questionId: currentQ.id,
      selectedIndex: -1,
      correctIndex: currentQ.answer_index,
      isCorrect: false,
      isSkipped: true,
      timeMs: Date.now() - startTime,
    };
    setAnswers((prev) => [...prev, answerRecord]);
    
    nextQuestion();
  };

  const handleMarkForReview = () => {
    const currentQ = questions[currentIndex];
    setMarkedForReview(prev => ({
      ...prev,
      [currentQ.id]: !prev[currentQ.id]
    }));
  };

  const finishQuiz = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    router.replace({
      pathname: '/result',
      params: { 
        score, 
        total: questions.length,
        mode,
        timeUsed: initialTimeLimit - timeRemaining,
        answers: JSON.stringify(answers),
      },
    });
  };

  const confirmExit = () => {
    Alert.alert(
      'Exit Quiz?',
      'Your progress will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Exit', style: 'destructive', onPress: () => router.back() },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading questions...</Text>
      </View>
    );
  }

  const currentQ = questions[currentIndex];
  
  if (!currentQ || questions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>No questions available</Text>
        <TouchableOpacity 
          style={{marginTop: 20, padding: 16, backgroundColor: colors.primary, borderRadius: 12}}
          onPress={() => router.back()}
        >
          <Text style={{color: '#fff', fontWeight: '600'}}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const progress = ((currentIndex + 1) / questions.length) * 100;
  const headerGradient = mode === 'test' ? colors.gradientTest : colors.gradientPrimary;

  return (
    <View style={styles.container}>
      <LinearGradient colors={headerGradient} style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={confirmExit}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <View style={styles.progressInfo}>
            <Text style={styles.questionNum}>
              {currentIndex + 1}/{questions.length}
            </Text>
            <Text style={styles.scoreText}>Score: {score}</Text>
          </View>

          {mode === 'test' && (
            <View style={[
              styles.timerBadge,
              timeRemaining < 60 && styles.timerWarning
            ]}>
              <Ionicons name="time" size={18} color="#fff" />
              <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
            </View>
          )}

          {mode === 'practice' && (
            <View style={styles.modeBadge}>
              <Text style={styles.modeBadgeText}>📚 Practice</Text>
            </View>
          )}
        </View>

        <View style={styles.progressBarBg}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
      </LinearGradient>

      <Animated.ScrollView 
        style={[styles.content, { opacity: fadeAnim }]}
        contentContainerStyle={[
          styles.contentContainer,
          (mode === 'practice' && showResult) && styles.contentWithButton
        ]}
      >
        <View style={styles.questionHeader}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
              {currentQ.category === 'reasoning' ? '🧠 Reasoning' :
               currentQ.category === 'gk' ? '📚 General Knowledge' : 
               currentQ.category === 'current_affairs' ? '📰 Current Affairs' : '📝 Custom'}
            </Text>
          </View>
          {markedForReview[currentQ.id] && (
            <View style={styles.reviewBadge}>
              <Ionicons name="flag" size={12} color={colors.warning} />
              <Text style={styles.reviewBadgeText}>Review</Text>
            </View>
          )}
        </View>

        <Text style={styles.question}>{currentQ.question}</Text>

        <View style={styles.optionsContainer}>
          {currentQ.options?.map((option, idx) => {
            let optionStyle = styles.option;
            let textStyle = styles.optionText;

            if (mode === 'practice' && showResult) {
              if (idx === currentQ.answer_index) {
                optionStyle = [styles.option, styles.optionCorrect];
                textStyle = [styles.optionText, styles.optionTextSelected];
              } else if (idx === selectedAnswer && idx !== currentQ.answer_index) {
                optionStyle = [styles.option, styles.optionIncorrect];
                textStyle = [styles.optionText, styles.optionTextSelected];
              }
            } else if (selectedAnswer === idx) {
              optionStyle = [styles.option, styles.optionSelected];
            }

            return (
              <TouchableOpacity
                key={idx}
                style={optionStyle}
                onPress={() => handleAnswer(idx)}
                disabled={selectedAnswer !== null}
              >
                <View style={styles.optionLetter}>
                  <Text style={styles.letterText}>{String.fromCharCode(65 + idx)}</Text>
                </View>
                <Text style={textStyle}>{option}</Text>
                {mode === 'practice' && showResult && idx === currentQ.answer_index && (
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                )}
                {mode === 'practice' && showResult && idx === selectedAnswer && idx !== currentQ.answer_index && (
                  <Ionicons name="close-circle" size={24} color="#fff" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {mode === 'practice' && showResult && (
          <View style={styles.explanationCard}>
            <Text style={styles.explanationTitle}>
              {selectedAnswer === currentQ.answer_index ? '✅ Correct!' : '❌ Incorrect'}
            </Text>
            <Text style={styles.explanationText}>{currentQ.explanation}</Text>
          </View>
        )}

        {mode === 'test' && selectedAnswer !== null && (
          <View style={styles.testNextContainer}>
            <Text style={styles.testNextHint}>Answer recorded. Moving to next...</Text>
          </View>
        )}

        {/* Skip and Mark for Review buttons - show when no answer selected */}
        {selectedAnswer === null && !showResult && (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity 
              style={styles.skipButton} 
              onPress={handleSkip}
            >
              <Ionicons name="play-skip-forward" size={18} color={colors.textSecondary} />
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.reviewButton,
                markedForReview[currentQ.id] && styles.reviewButtonActive
              ]} 
              onPress={handleMarkForReview}
            >
              <Ionicons 
                name={markedForReview[currentQ.id] ? "flag" : "flag-outline"} 
                size={18} 
                color={markedForReview[currentQ.id] ? colors.warning : colors.textSecondary} 
              />
              <Text style={[
                styles.reviewButtonText,
                markedForReview[currentQ.id] && styles.reviewButtonTextActive
              ]}>
                {markedForReview[currentQ.id] ? 'Marked' : 'Mark for Review'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Show skipped/review count */}
        {(skippedQuestions.length > 0 || Object.keys(markedForReview).filter(k => markedForReview[k]).length > 0) && (
          <View style={styles.statusBar}>
            {skippedQuestions.length > 0 && (
              <Text style={styles.statusText}>
                ⏭️ {skippedQuestions.length} skipped
              </Text>
            )}
            {Object.keys(markedForReview).filter(k => markedForReview[k]).length > 0 && (
              <Text style={styles.statusText}>
                🚩 {Object.keys(markedForReview).filter(k => markedForReview[k]).length} marked
              </Text>
            )}
          </View>
        )}
      </Animated.ScrollView>

      {mode === 'practice' && showResult && (
        <View style={styles.fixedBottomButton}>
          <TouchableOpacity style={styles.nextButton} onPress={nextQuestion}>
            <Text style={styles.nextButtonText}>
              {currentIndex + 1 >= questions.length ? 'See Results' : 'Next Question'}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  closeBtn: {
    position: 'absolute',
    top: 52,
    right: 24,
    padding: 8,
    zIndex: 10,
  },
  headerContent: {
    marginBottom: 16,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionNum: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  scoreText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  timerWarning: {
    backgroundColor: colors.incorrect,
  },
  timerText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 6,
  },
  modeBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  modeBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 3,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  contentWithButton: {
    paddingBottom: 100,
  },
  categoryBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  question: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 24,
    lineHeight: 28,
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F0EFFF',
  },
  optionCorrect: {
    backgroundColor: colors.correct,
    borderColor: colors.correct,
  },
  optionIncorrect: {
    backgroundColor: colors.incorrect,
    borderColor: colors.incorrect,
  },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  letterText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  optionTextSelected: {
    color: '#fff',
  },
  explanationCard: {
    marginTop: 24,
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  explanationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  fixedBottomButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#E8E8EE',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },
  testNextContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  testNextHint: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  reviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  reviewBadgeText: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '600',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8E8EE',
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E8E8EE',
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E8E8EE',
  },
  reviewButtonActive: {
    backgroundColor: colors.warning + '15',
    borderColor: colors.warning,
  },
  reviewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  reviewButtonTextActive: {
    color: colors.warning,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
    paddingVertical: 8,
  },
  statusText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
