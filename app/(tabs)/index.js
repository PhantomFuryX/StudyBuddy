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
import { router } from 'expo-router';
import { getDashboard, getDailyQuestions, getExams } from '../../utils/api';
import { DashboardSkeleton } from '../../components/SkeletonLoader';

const { width } = Dimensions.get('window');

const colors = {
  primary: '#6C63FF',
  background: '#F8F9FE',
  surface: '#FFFFFF',
  text: '#1A1A2E',
  textSecondary: '#666687',
  textLight: '#9999B3',
  divider: '#F0F0F5',
  streak: '#FF9500',
  points: '#34C759',
  level: '#AF52DE',
  gradientPrimary: ['#6C63FF', '#8B85FF'],
  gradientSuccess: ['#4CAF50', '#81C784'],
  gradientStreak: ['#FF9500', '#FFCC00'],
  gradientLevel: ['#AF52DE', '#DA70D6'],
};

export default function HomeScreen() {
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
      // Set default data for demo
      setDashboard({
        user_name: 'Champion',
        greeting: 'Good Morning',
        streak: 0,
        points: 0,
        level: 1,
        today_progress: { questions_answered: 0, daily_goal: 30, percentage: 0 },
        motivational_quote: { quote: 'Believe in yourself!', author: 'Anonymous' },
        did_you_know: { fact: 'India has 28 States and 8 Union Territories!' },
        pending_tasks: [],
        next_review_questions: 0,
      });
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

  const startQuiz = async () => {
    router.push('/quiz-config?preset=daily');
  };

  const urgentExams = (exams || [])
    .filter(e => typeof e.days_left === 'number' && e.days_left >= 0 && e.days_left <= 90)
    .sort((a, b) => a.days_left - b.days_left);
  const urgentCount = urgentExams.length;
  const cardWidth = urgentCount >= 3
    ? (width - 24 * 2 - 8 * 2) / 3
    : urgentCount === 2
      ? (width - 24 * 2 - 8) / 2
      : (width - 24 * 2);

  const getExamColors = (days) => {
    if (days < 30) return { bg: '#F4433615', pill: '#F44336' };
    if (days < 90) return { bg: '#FF950015', pill: '#FF9500' };
    return { bg: '#34C75915', pill: '#34C759' };
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  const progress = dashboard?.today_progress || { questions_answered: 0, daily_goal: 30, percentage: 0 };

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
        
        {/* Urgent Exam Tabs */}
        {urgentCount > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 8 }}
            style={{ marginBottom: 8 }}
          >
            {urgentExams.map((ex, idx) => {
              const c = getExamColors(ex.days_left);
              return (
                <TouchableOpacity
                  key={ex.id || idx}
                  style={[styles.examTab, { width: cardWidth, backgroundColor: c.bg }]}
                  onPress={() => router.push('/exams')}
                  activeOpacity={0.9}
                >
                  <View style={styles.examTabHeader}>
                    <Text numberOfLines={1} style={[styles.examTabName]}>{ex.name}</Text>
                    <View style={[styles.examPill, { backgroundColor: c.pill }]}>
                      <Text style={styles.examPillText}>{ex.days_left}d</Text>
                    </View>
                  </View>
                  <Text style={styles.examTabDate}>📅 {ex.date}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.quoteCard}>
          <Text style={styles.quoteText}>"{dashboard?.motivational_quote?.quote || 'Believe in yourself!'}"</Text>
          <Text style={styles.quoteAuthor}>— {dashboard?.motivational_quote?.author || 'Unknown'}</Text>
        </View>
      </LinearGradient>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>🔥</Text>
          <Text style={styles.statValue}>{dashboard?.streak || 0}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>⭐</Text>
          <Text style={styles.statValue}>{dashboard?.points || 0}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>🏆</Text>
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
            <View style={[styles.progressBar, { width: `${Math.min(progress.percentage, 100)}%` }]} />
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={startQuiz}>
            <LinearGradient colors={colors.gradientPrimary} style={styles.actionGradient}>
              <Text style={styles.actionIcon}>📝</Text>
              <Text style={styles.actionTitle}>Daily Quiz</Text>
              <Text style={styles.actionSubtitle}>30 Questions</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/tasks')}>
            <LinearGradient colors={colors.gradientStreak} style={styles.actionGradient}>
              <Text style={styles.actionIcon}>📋</Text>
              <Text style={styles.actionTitle}>Tasks</Text>
              <Text style={styles.actionSubtitle}>{dashboard?.pending_tasks?.length || 0} Pending</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/stats')}>
            <LinearGradient colors={colors.gradientSuccess} style={styles.actionGradient}>
              <Text style={styles.actionIcon}>📊</Text>
              <Text style={styles.actionTitle}>Stats</Text>
              <Text style={styles.actionSubtitle}>View Progress</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/upload')}>
            <LinearGradient colors={colors.gradientLevel} style={styles.actionGradient}>
              <Text style={styles.actionIcon}>📤</Text>
              <Text style={styles.actionTitle}>Upload Notes</Text>
              <Text style={styles.actionSubtitle}>Generate Quiz</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

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
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 48,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  examTab: {
    borderRadius: 16,
    padding: 12,
    marginRight: 8,
  },
  examTabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  examTabName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    marginRight: 6,
  },
  examPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  examPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  examTabDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)'
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  streakIcon: {
    fontSize: 20,
    marginRight: 4,
  },
  streakCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  quoteCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 16,
  },
  quoteText: {
    fontSize: 16,
    color: '#fff',
    fontStyle: 'italic',
  },
  quoteAuthor: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    textAlign: 'right',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -30,
    marginHorizontal: 24,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: (width - 48 - 16) / 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  statEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  section: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  progressCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressCount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: '600',
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
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: (width - 48 - 16) / 2,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  actionGradient: {
    padding: 24,
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  actionSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  factModal: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 32,
    margin: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  factEmoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  factTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  factText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  factButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
  },
  factButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
