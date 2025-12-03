import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../utils/theme';
import { getDashboard, getDailyQuestions, getExams } from '../utils/api';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [dashboard, setDashboard] = useState(null);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFactModal, setShowFactModal] = useState(false);

  const fetchDashboard = async () => {
    try {
      const [data, examList] = await Promise.all([
        getDashboard(),
        getExams().catch(() => []),
      ]);
      setDashboard(data);
      setExams(examList || []);
    } catch (error) {
      console.log('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboard();
  }, []);

  const startQuiz = async (type = 'daily') => {
    try {
      const data = await getDailyQuestions();
      navigation.navigate('Quiz', { 
        questions: data.questions,
        quizType: type,
      });
    } catch (error) {
      console.log('Error starting quiz:', error);
    }
  };

  // Exam creation moved to Exams screen (Profile > Exam Profile)

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingEmoji}>📚</Text>
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  const progress = dashboard?.today_progress || { questions_answered: 0, daily_goal: 30, percentage: 0 };
  const urgentExams = (exams || [])
    .filter(e => typeof e.days_left === 'number' && e.days_left >= 0 && e.days_left <= 90)
    .sort((a, b) => a.days_left - b.days_left);
  const urgentCount = urgentExams.length;
  const cardWidth = urgentCount >= 3
    ? (width - spacing.lg * 2 - spacing.sm * 2) / 3
    : urgentCount === 2
      ? (width - spacing.lg * 2 - spacing.sm) / 2
      : (width - spacing.lg * 2);

  const getExamColors = (days) => {
    if (days < 30) return { bg: colors.error + '15', pill: colors.error, text: colors.error };
    if (days < 90) return { bg: colors.warning + '15', pill: colors.warning, text: colors.warning };
    return { bg: colors.success + '15', pill: colors.success, text: colors.success };
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      {/* Header */}
      <LinearGradient colors={colors.gradientPrimary} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{dashboard?.greeting || 'Hello'},</Text>
            <Text style={styles.userName}>{dashboard?.user_name || 'Champion'}! 👋</Text>
          </View>
          <View style={styles.streakBadge}>
            <Text style={styles.streakIcon}>🔥</Text>
            <Text style={styles.streakCount}>{dashboard?.streak || 0}</Text>
          </View>
        </View>

        {/* Upcoming Exams (Urgent: red/yellow) */}
        {urgentCount > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: spacing.sm }}
            style={{ marginBottom: spacing.md }}
          >
            {urgentExams.map((ex, idx) => {
              const c = getExamColors(ex.days_left);
              return (
                <TouchableOpacity
                  key={ex.id || idx}
                  style={[styles.examTab, { width: cardWidth, backgroundColor: c.bg }]}
                  onPress={() => navigation.navigate('Exams')}
                  activeOpacity={0.9}
                >
                  <View style={styles.examTabHeader}>
                    <Text numberOfLines={1} style={[styles.examTabName, { color: '#fff' }]}>{ex.name}</Text>
                    <View style={[styles.examPill, { backgroundColor: c.pill }]}>
                      <Text style={styles.examPillText}>{ex.days_left}d</Text>
                    </View>
                  </View>
                  <Text style={styles.examTabDate}>📅 {ex.date}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.examCard}>
            {dashboard?.upcoming_exam ? (
              <View style={styles.examRow}>
                <View style={styles.examLeft}>
                  <Text style={styles.examLabel}>Next Exam</Text>
                  <Text style={styles.examName}>{dashboard.upcoming_exam.name}</Text>
                  <Text style={styles.examDate}>📅 {dashboard.upcoming_exam.date}</Text>
                </View>
                <View style={styles.examRight}>
                  <Text style={styles.examDays}>{Math.max(0, dashboard.upcoming_exam.days_left)}</Text>
                  <Text style={styles.examDaysLabel}>days left</Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.setExamButton} onPress={() => navigation.navigate('Exams')}>
                <Ionicons name="calendar-outline" size={18} color="#fff" />
                <Text style={styles.setExamText}>Set your exam date</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        
        {/* Motivational Quote */}
        <View style={styles.quoteCard}>
          <Text style={styles.quoteText}>"{dashboard?.motivational_quote?.quote || 'Believe in yourself!'}"</Text>
          <Text style={styles.quoteAuthor}>— {dashboard?.motivational_quote?.author || 'Unknown'}</Text>
        </View>
      </LinearGradient>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.streak + '20' }]}>
            <Text style={styles.statEmoji}>🔥</Text>
          </View>
          <Text style={styles.statValue}>{dashboard?.streak || 0}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.points + '20' }]}>
            <Text style={styles.statEmoji}>⭐</Text>
          </View>
          <Text style={styles.statValue}>{dashboard?.points || 0}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.level + '20' }]}>
            <Text style={styles.statEmoji}>🏆</Text>
          </View>
          <Text style={styles.statValue}>Lv.{dashboard?.level || 1}</Text>
          <Text style={styles.statLabel}>Level</Text>
        </View>
      </View>

      {/* Today's Progress */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Progress</Text>
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressCount}>
              {progress.questions_answered}/{progress.daily_goal} Questions
            </Text>
            <Text style={styles.progressPercent}>{progress.percentage}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBar, { width: `${progress.percentage}%` }]} />
          </View>
          <Text style={styles.progressHint}>
            {progress.percentage >= 100 
              ? "🎉 Goal achieved! Keep going!" 
              : `${progress.daily_goal - progress.questions_answered} more to reach your daily goal`}
          </Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={() => startQuiz('daily')}>
            <LinearGradient colors={colors.gradientPrimary} style={styles.actionGradient}>
              <Text style={styles.actionIcon}>📝</Text>
              <Text style={styles.actionTitle}>Daily Quiz</Text>
              <Text style={styles.actionSubtitle}>30 Questions</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionCard} onPress={() => startQuiz('review')}>
            <LinearGradient colors={colors.gradientSuccess} style={styles.actionGradient}>
              <Text style={styles.actionIcon}>🔄</Text>
              <Text style={styles.actionTitle}>Review</Text>
              <Text style={styles.actionSubtitle}>{dashboard?.next_review_questions || 0} Due</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Tasks')}>
            <LinearGradient colors={colors.gradientStreak} style={styles.actionGradient}>
              <Text style={styles.actionIcon}>📋</Text>
              <Text style={styles.actionTitle}>Tasks</Text>
              <Text style={styles.actionSubtitle}>{dashboard?.pending_tasks?.length || 0} Pending</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionCard} onPress={() => setShowFactModal(true)}>
            <LinearGradient colors={colors.gradientLevel} style={styles.actionGradient}>
              <Text style={styles.actionIcon}>💡</Text>
              <Text style={styles.actionTitle}>Did You Know?</Text>
              <Text style={styles.actionSubtitle}>Learn Facts</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Quick Start */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Practice by Category</Text>
        <View style={styles.categoryRow}>
          <TouchableOpacity 
            style={[styles.categoryCard, { backgroundColor: colors.reasoning + '15' }]}
            onPress={() => navigation.navigate('Quiz', { category: 'reasoning' })}
          >
            <Text style={styles.categoryIcon}>🧩</Text>
            <Text style={[styles.categoryName, { color: colors.reasoning }]}>Reasoning</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.categoryCard, { backgroundColor: colors.gk + '15' }]}
            onPress={() => navigation.navigate('Quiz', { category: 'gk' })}
          >
            <Text style={styles.categoryIcon}>📚</Text>
            <Text style={[styles.categoryName, { color: colors.gk }]}>GK</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.categoryCard, { backgroundColor: colors.current_affairs + '15' }]}
            onPress={() => navigation.navigate('Quiz', { category: 'current_affairs' })}
          >
            <Text style={styles.categoryIcon}>📰</Text>
            <Text style={[styles.categoryName, { color: colors.current_affairs }]}>Current Affairs</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Pending Tasks Preview */}
      {dashboard?.pending_tasks?.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Tasks</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Tasks')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {dashboard.pending_tasks.slice(0, 3).map((task, index) => (
            <View key={index} style={styles.taskCard}>
              <View style={styles.taskCheck}>
                <Ionicons name="square-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.taskInfo}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                {task.due_date && (
                  <Text style={styles.taskDue}>Due: {task.due_date}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 100 }} />

      {/* Did You Know Modal */}
      <Modal
        visible={showFactModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFactModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.factModal}>
            <Text style={styles.factEmoji}>💡</Text>
            <Text style={styles.factTitle}>Did You Know?</Text>
            <Text style={styles.factText}>
              {dashboard?.did_you_know?.fact || 'India has the world\'s largest postal network!'}
            </Text>
            <TouchableOpacity
              style={styles.factButton}
              onPress={() => setShowFactModal(false)}
            >
              <Text style={styles.factButtonText}>Got it! 👍</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Exam creation moved to Exams screen */}
    </ScrollView>
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
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  greeting: {
    ...typography.body,
    color: 'rgba(255,255,255,0.8)',
  },
  userName: {
    ...typography.h2,
    color: '#fff',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
  },
  streakIcon: {
    fontSize: 20,
    marginRight: spacing.xs,
  },
  streakCount: {
    ...typography.bodyBold,
    color: '#fff',
  },
  quoteCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  examCard: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  examTab: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginRight: spacing.sm,
  },
  examTabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  examTabName: {
    ...typography.bodyBold,
    flex: 1,
    marginRight: spacing.xs,
  },
  examPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.round,
  },
  examPillText: {
    ...typography.small,
    color: '#fff',
  },
  examTabDate: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.9)'
  },
  examRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  examLeft: { flex: 1 },
  examLabel: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.8)'
  },
  examName: {
    ...typography.h3,
    color: '#fff',
  },
  examDate: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.85)'
  },
  examRight: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  examDays: {
    ...typography.h1,
    color: '#fff',
    lineHeight: 40,
  },
  examDaysLabel: {
    ...typography.small,
    color: 'rgba(255,255,255,0.9)'
  },
  setExamButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    gap: spacing.xs,
  },
  setExamText: {
    ...typography.bodyBold,
    color: '#fff',
    marginLeft: spacing.xs,
  },
  quoteText: {
    ...typography.body,
    color: '#fff',
    fontStyle: 'italic',
  },
  quoteAuthor: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.7)',
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -30,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    width: (width - spacing.lg * 2 - spacing.md * 2) / 3,
    ...shadows.medium,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statEmoji: {
    fontSize: 20,
  },
  statValue: {
    ...typography.h3,
    color: colors.text,
  },
  statLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },
  section: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  seeAll: {
    ...typography.body,
    color: colors.primary,
  },
  progressCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.small,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  progressCount: {
    ...typography.bodyBold,
    color: colors.text,
  },
  progressPercent: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.divider,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: (width - spacing.lg * 2 - spacing.md) / 2,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.medium,
  },
  actionGradient: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  actionTitle: {
    ...typography.bodyBold,
    color: '#fff',
  },
  actionSubtitle: {
    ...typography.small,
    color: 'rgba(255,255,255,0.8)',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryCard: {
    flex: 1,
    marginHorizontal: spacing.xs,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  categoryName: {
    ...typography.caption,
    fontWeight: '600',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.small,
  },
  taskCheck: {
    marginRight: spacing.md,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    ...typography.body,
    color: colors.text,
  },
  taskDue: {
    ...typography.small,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  factModal: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    margin: spacing.lg,
    alignItems: 'center',
    ...shadows.large,
  },
  factEmoji: {
    fontSize: 60,
    marginBottom: spacing.md,
  },
  factTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.md,
  },
  factText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  factButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  factButtonText: {
    ...typography.bodyBold,
    color: '#fff',
  },
});
