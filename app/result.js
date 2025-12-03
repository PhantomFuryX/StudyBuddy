import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Share,
  ScrollView,
  Vibration,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

const ConfettiPiece = ({ delay, startX }) => {
  const translateY = useRef(new Animated.Value(-50)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  
  const confettiColors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3'];
  const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
  const size = 8 + Math.random() * 8;
  
  useEffect(() => {
    const duration = 2500 + Math.random() * 1000;
    const xDistance = (Math.random() - 0.5) * 150;
    
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: Dimensions.get('window').height + 100,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: xDistance,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: Math.random() * 10,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: duration * 0.8,
        delay: delay + duration * 0.5,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: startX,
        top: -20,
        width: size,
        height: size * 1.5,
        backgroundColor: color,
        borderRadius: 2,
        opacity,
        transform: [
          { translateY },
          { translateX },
          { rotate: rotate.interpolate({ inputRange: [0, 10], outputRange: ['0deg', '3600deg'] }) },
        ],
      }}
    />
  );
};

const Confetti = ({ count = 50 }) => {
  const { width } = Dimensions.get('window');
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: count }).map((_, i) => (
        <ConfettiPiece 
          key={i} 
          delay={i * 30} 
          startX={Math.random() * width}
        />
      ))}
    </View>
  );
};

const { width } = Dimensions.get('window');

const colors = {
  primary: '#6C63FF',
  background: '#F8F9FE',
  surface: '#FFFFFF',
  text: '#1A1A2E',
  textSecondary: '#666687',
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
  gradientPrimary: ['#6C63FF', '#8B85FF'],
  gradientSuccess: ['#4CAF50', '#81C784'],
  gradientWarning: ['#FF9500', '#FFCC00'],
};

export default function ResultScreen() {
  const params = useLocalSearchParams();
  const score = parseInt(params.score) || 0;
  const total = parseInt(params.total) || 5;
  const mode = params.mode || 'practice';
  const timeUsed = parseInt(params.timeUsed) || 0;
  const percentage = Math.round((score / total) * 100);
  
  const [showConfetti, setShowConfetti] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const starScale = useRef(new Animated.Value(0)).current;
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  useEffect(() => {
    // Vibrate on result
    if (percentage >= 70) {
      Vibration.vibrate([0, 100, 50, 100]);
      setShowConfetti(true);
    } else {
      Vibration.vibrate(50);
    }
    
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Pulse animation for score
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    // Star animation
    Animated.spring(starScale, {
      toValue: 1,
      delay: 500,
      tension: 100,
      friction: 5,
      useNativeDriver: true,
    }).start();
  }, []);

  const getGrade = () => {
    if (percentage >= 90) return { emoji: '🏆', text: 'Excellent!', color: colors.gold };
    if (percentage >= 70) return { emoji: '🥈', text: 'Great Job!', color: colors.silver };
    if (percentage >= 50) return { emoji: '🥉', text: 'Good Effort!', color: colors.bronze };
    return { emoji: '💪', text: 'Keep Practicing!', color: colors.primary };
  };

  const grade = getGrade();

  const handleShare = async () => {
    try {
      await Share.share({
        message: `I scored ${score}/${total} (${percentage}%) on Study Buddy! 🎓📚 Can you beat my score?`,
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  const earnedPoints = score * 10;
  const streakBonus = score >= Math.ceil(total * 0.7) ? 5 : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {showConfetti && <Confetti count={60} />}
      
      <LinearGradient colors={colors.gradientPrimary} style={styles.header}>
        {/* Decorative stars */}
        <Animated.Text style={[styles.decorStar, styles.star1, { transform: [{ scale: starScale }] }]}>⭐</Animated.Text>
        <Animated.Text style={[styles.decorStar, styles.star2, { transform: [{ scale: starScale }] }]}>✨</Animated.Text>
        <Animated.Text style={[styles.decorStar, styles.star3, { transform: [{ scale: starScale }] }]}>⭐</Animated.Text>
        
        <Animated.View style={[styles.scoreCircle, { transform: [{ scale: scaleAnim }, { scale: pulseAnim }] }]}>
          <Text style={styles.emoji}>{grade.emoji}</Text>
          <Text style={styles.scoreText}>{score}/{total}</Text>
          <Text style={styles.percentText}>{percentage}%</Text>
        </Animated.View>
        <Animated.Text style={[styles.gradeText, { opacity: fadeAnim }]}>{grade.text}</Animated.Text>
      </LinearGradient>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Your Rewards</Text>
          
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statEmoji}>⭐</Text>
              <View>
                <Text style={styles.statValue}>+{earnedPoints}</Text>
                <Text style={styles.statLabel}>Points Earned</Text>
              </View>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statEmoji}>🔥</Text>
              <View>
                <Text style={styles.statValue}>+{streakBonus}</Text>
                <Text style={styles.statLabel}>Streak Bonus</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.performanceRow}>
            <View style={styles.perfItem}>
              <Text style={styles.perfValue}>{score}</Text>
              <Text style={styles.perfLabel}>Correct</Text>
            </View>
            <View style={styles.perfItem}>
              <Text style={styles.perfValue}>{total - score}</Text>
              <Text style={styles.perfLabel}>Wrong</Text>
            </View>
            <View style={styles.perfItem}>
              <Text style={styles.perfValue}>{percentage}%</Text>
              <Text style={styles.perfLabel}>Accuracy</Text>
            </View>
          </View>
          
          {mode === 'test' && timeUsed > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.timeRow}>
                <Text style={styles.timeEmoji}>⏱️</Text>
                <Text style={styles.timeValue}>Time: {formatTime(timeUsed)}</Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.messageCard}>
          <Text style={styles.messageEmoji}>
            {percentage >= 70 ? '🎉' : '📚'}
          </Text>
          <Text style={styles.messageText}>
            {percentage >= 90
              ? "Outstanding performance! You're on fire!"
              : percentage >= 70
              ? "Great job! Keep up the good work!"
              : percentage >= 50
              ? "Good effort! A little more practice and you'll ace it!"
              : "Don't give up! Every attempt makes you stronger!"}
          </Text>
        </View>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace('/quiz-config')}
          >
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </TouchableOpacity>

          <View style={styles.secondaryButtons}>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleShare}>
              <Ionicons name="share-social" size={20} color={colors.primary} />
              <Text style={styles.secondaryButtonText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.replace('/(tabs)')}
            >
              <Ionicons name="home" size={20} color={colors.primary} />
              <Text style={styles.secondaryButtonText}>Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 60,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  decorStar: {
    position: 'absolute',
    fontSize: 24,
  },
  star1: {
    top: 40,
    left: 30,
  },
  star2: {
    top: 60,
    right: 40,
    fontSize: 20,
  },
  star3: {
    top: 100,
    left: 60,
    fontSize: 18,
  },
  scoreCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emoji: {
    fontSize: 40,
    marginBottom: 4,
  },
  scoreText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  percentText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  gradeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 24,
    marginTop: -30,
  },
  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F5',
    marginVertical: 16,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  perfItem: {
    alignItems: 'center',
  },
  perfValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  perfLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  messageCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  messageEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  messageText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonsContainer: {
    marginTop: 'auto',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  secondaryButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 6,
  },
});
