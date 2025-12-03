import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Share,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../utils/theme';

export default function ResultScreen({ route, navigation }) {
  const { score, total, stats = {} } = route.params;
  const percentage = Math.round((score / total) * 100);
  
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getEmoji = () => {
    if (percentage >= 90) return '🏆';
    if (percentage >= 70) return '🌟';
    if (percentage >= 50) return '💪';
    if (percentage >= 30) return '📈';
    return '🎯';
  };

  const getMessage = () => {
    if (percentage >= 90) return 'Outstanding! You\'re a champion!';
    if (percentage >= 70) return 'Great work! Keep it up!';
    if (percentage >= 50) return 'Good effort! Room for improvement!';
    if (percentage >= 30) return 'Keep practicing, you\'ll get there!';
    return 'Every expert was once a beginner!';
  };

  const getGradient = () => {
    if (percentage >= 70) return colors.gradientSuccess;
    if (percentage >= 40) return colors.gradientStreak;
    return colors.gradientPrimary;
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🎯 I scored ${score}/${total} (${percentage}%) on Study Buddy!\n🔥 Streak: ${stats.streak} days\n⭐ Points earned: ${stats.points}\n\nJoin me in preparing for govt exams!`,
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={getGradient()} style={styles.header}>
        <Animated.View style={[styles.scoreCircle, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.emoji}>{getEmoji()}</Text>
          <Text style={styles.scoreText}>{score}/{total}</Text>
          <Text style={styles.percentText}>{percentage}%</Text>
        </Animated.View>
        <Text style={styles.message}>{getMessage()}</Text>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>✅</Text>
            <Text style={styles.statValue}>{stats.correct || score}</Text>
            <Text style={styles.statLabel}>Correct</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>❌</Text>
            <Text style={styles.statValue}>{stats.wrong || (total - score)}</Text>
            <Text style={styles.statLabel}>Wrong</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={styles.statValue}>{stats.streak || 0}</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>⭐</Text>
            <Text style={styles.statValue}>+{stats.points || score * 10}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
        </View>

        {/* Performance Breakdown */}
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Performance Breakdown</Text>
          
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownInfo}>
              <Text style={styles.breakdownLabel}>Correct Answers</Text>
              <Text style={styles.breakdownValue}>{score} questions</Text>
            </View>
            <View style={styles.breakdownBar}>
              <View 
                style={[
                  styles.breakdownProgress, 
                  { width: `${(score/total)*100}%`, backgroundColor: colors.success }
                ]} 
              />
            </View>
          </View>
          
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownInfo}>
              <Text style={styles.breakdownLabel}>Wrong Answers</Text>
              <Text style={styles.breakdownValue}>{total - score} questions</Text>
            </View>
            <View style={styles.breakdownBar}>
              <View 
                style={[
                  styles.breakdownProgress, 
                  { width: `${((total-score)/total)*100}%`, backgroundColor: colors.error }
                ]} 
              />
            </View>
          </View>
        </View>

        {/* Motivational Tip */}
        <View style={styles.tipCard}>
          <Text style={styles.tipIcon}>💡</Text>
          <Text style={styles.tipText}>
            {percentage >= 70 
              ? "Amazing! Review wrong answers to reach 100%!" 
              : "Tip: Review the explanations and try again tomorrow. Consistency beats perfection!"}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => navigation.replace('Home')}
          >
            <LinearGradient colors={colors.gradientPrimary} style={styles.buttonGradient}>
              <Ionicons name="home-outline" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Back to Home</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <View style={styles.secondaryActions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleShare}>
              <Ionicons name="share-outline" size={20} color={colors.primary} />
              <Text style={styles.secondaryButtonText}>Share</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => navigation.replace('Quiz')}
            >
              <Ionicons name="refresh-outline" size={20} color={colors.primary} />
              <Text style={styles.secondaryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 40,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
  },
  scoreCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emoji: {
    fontSize: 40,
  },
  scoreText: {
    ...typography.h1,
    color: '#fff',
    marginTop: spacing.xs,
  },
  percentText: {
    ...typography.h3,
    color: 'rgba(255,255,255,0.9)',
  },
  message: {
    ...typography.h3,
    color: '#fff',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    marginTop: -20,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    width: '48%',
    marginBottom: spacing.md,
    ...shadows.small,
  },
  statEmoji: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  statValue: {
    ...typography.h3,
    color: colors.text,
  },
  statLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },
  breakdownCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  breakdownTitle: {
    ...typography.bodyBold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  breakdownRow: {
    marginBottom: spacing.md,
  },
  breakdownInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  breakdownLabel: {
    ...typography.body,
    color: colors.text,
  },
  breakdownValue: {
    ...typography.body,
    color: colors.textSecondary,
  },
  breakdownBar: {
    height: 8,
    backgroundColor: colors.divider,
    borderRadius: 4,
    overflow: 'hidden',
  },
  breakdownProgress: {
    height: '100%',
    borderRadius: 4,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  tipIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  tipText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  actions: {
    marginBottom: spacing.xl,
  },
  primaryButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  primaryButtonText: {
    ...typography.bodyBold,
    color: '#fff',
    marginLeft: spacing.sm,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    flex: 1,
    marginHorizontal: spacing.xs,
    ...shadows.small,
  },
  secondaryButtonText: {
    ...typography.bodyBold,
    color: colors.primary,
    marginLeft: spacing.sm,
  },
});
