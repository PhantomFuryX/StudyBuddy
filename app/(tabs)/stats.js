import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getStats } from '../../utils/api';

const { width } = Dimensions.get('window');

const colors = {
  primary: '#6C63FF',
  background: '#F8F9FE',
  surface: '#FFFFFF',
  text: '#1A1A2E',
  textSecondary: '#666687',
  success: '#34C759',
  warning: '#FF9500',
  gradientPrimary: ['#6C63FF', '#8B85FF'],
};

export default function StatsScreen() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await getStats();
      setStats(data);
    } catch (error) {
      console.log('Error fetching stats:', error);
      setStats(getMockStats());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getMockStats = () => ({
    streak: 5,
    longest_streak: 12,
    points: 450,
    level: 3,
    total_questions: 150,
    correct_answers: 112,
    accuracy_percentage: 74.7,
    badges_count: 4,
    today_questions: 15,
    today_correct: 12,
    category_breakdown: {
      reasoning: { total: 50, correct: 38 },
      gk: { total: 50, correct: 40 },
      current_affairs: { total: 50, correct: 34 },
    },
  });

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingEmoji}>📊</Text>
        <Text style={styles.loadingText}>Loading stats...</Text>
      </View>
    );
  }

  const data = stats || getMockStats();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <LinearGradient colors={colors.gradientPrimary} style={styles.header}>
        <Text style={styles.headerTitle}>Your Progress</Text>
        <Text style={styles.headerSubtitle}>Keep up the great work!</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Main Stats */}
        <View style={styles.mainStats}>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={styles.statValue}>{data.streak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>⭐</Text>
            <Text style={styles.statValue}>{data.points}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🏆</Text>
            <Text style={styles.statValue}>Lv.{data.level}</Text>
            <Text style={styles.statLabel}>Level</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🎖️</Text>
            <Text style={styles.statValue}>{data.badges_count}</Text>
            <Text style={styles.statLabel}>Badges</Text>
          </View>
        </View>

        {/* Accuracy Card */}
        <View style={styles.accuracyCard}>
          <Text style={styles.sectionTitle}>Overall Accuracy</Text>
          <View style={styles.accuracyCircle}>
            <Text style={styles.accuracyValue}>{data.accuracy_percentage}%</Text>
          </View>
          <Text style={styles.accuracyDetail}>
            {data.correct_answers} correct out of {data.total_questions} questions
          </Text>
        </View>

        {/* Today's Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Progress</Text>
          <View style={styles.todayCard}>
            <View style={styles.todayRow}>
              <Text style={styles.todayLabel}>Questions Attempted</Text>
              <Text style={styles.todayValue}>{data.today_questions}</Text>
            </View>
            <View style={styles.todayRow}>
              <Text style={styles.todayLabel}>Correct Answers</Text>
              <Text style={[styles.todayValue, { color: colors.success }]}>{data.today_correct}</Text>
            </View>
            <View style={styles.todayRow}>
              <Text style={styles.todayLabel}>Today's Accuracy</Text>
              <Text style={styles.todayValue}>
                {data.today_questions > 0 
                  ? Math.round((data.today_correct / data.today_questions) * 100) 
                  : 0}%
              </Text>
            </View>
          </View>
        </View>

        {/* Category Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category Performance</Text>
          {Object.entries(data.category_breakdown || {}).map(([category, catStats]) => {
            const accuracy = catStats.total > 0 ? Math.round((catStats.correct / catStats.total) * 100) : 0;
            return (
              <View key={category} style={styles.categoryCard}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryName}>
                    {category === 'reasoning' ? '🧠 Reasoning' :
                     category === 'gk' ? '📚 General Knowledge' : '📰 Current Affairs'}
                  </Text>
                  <Text style={styles.categoryPercent}>{accuracy}%</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBar, { width: `${accuracy}%` }]} />
                </View>
                <Text style={styles.categoryDetail}>
                  {catStats.correct}/{catStats.total} correct
                </Text>
              </View>
            );
          })}
        </View>

        {/* Records */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Records</Text>
          <View style={styles.recordsRow}>
            <View style={styles.recordCard}>
              <Text style={styles.recordEmoji}>🔥</Text>
              <Text style={styles.recordValue}>{data.longest_streak}</Text>
              <Text style={styles.recordLabel}>Longest Streak</Text>
            </View>
            <View style={styles.recordCard}>
              <Text style={styles.recordEmoji}>📝</Text>
              <Text style={styles.recordValue}>{data.total_questions}</Text>
              <Text style={styles.recordLabel}>Total Questions</Text>
            </View>
          </View>
        </View>
      </View>
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
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  content: {
    padding: 24,
    marginTop: -20,
  },
  mainStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: (width - 48 - 12) / 2,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  statEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  accuracyCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  accuracyCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
  },
  accuracyValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
  },
  accuracyDetail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  todayCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
  },
  todayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
  },
  todayLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  todayValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  categoryCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  categoryPercent: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#F0F0F5',
    borderRadius: 4,
    marginBottom: 4,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  categoryDetail: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  recordsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  recordCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  recordEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  recordValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  recordLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
