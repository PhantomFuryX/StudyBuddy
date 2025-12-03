import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { colors, typography, spacing, borderRadius, shadows } from '../utils/theme';
import { getStats, getBadges } from '../utils/api';

const { width } = Dimensions.get('window');
const chartWidth = width - spacing.lg * 2;

export default function StatsScreen() {
  const [stats, setStats] = useState(null);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [statsData, badgesData] = await Promise.all([
        getStats(),
        getBadges(),
      ]);
      setStats(statsData);
      setBadges(badgesData.badges || []);
    } catch (error) {
      console.log('Error fetching stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingEmoji}>📊</Text>
        <Text style={styles.loadingText}>Loading your stats...</Text>
      </View>
    );
  }

  const weeklyData = stats?.weekly_stats || [];
  const chartData = {
    labels: weeklyData.map(d => d.day),
    datasets: [{
      data: weeklyData.map(d => d.questions || 0),
      color: () => colors.primary,
      strokeWidth: 3,
    }],
  };

  const categoryData = stats?.category_breakdown || {};
  const categories = Object.keys(categoryData);
  const categoryChartData = {
    labels: categories.map(c => c.replace('_', '\n').substring(0, 8)),
    datasets: [{
      data: categories.map(c => categoryData[c]?.correct || 0),
    }],
  };

  const levelProgress = ((stats?.points || 0) % 100) / 100;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        <Text style={styles.headerTitle}>Your Progress</Text>

        {/* Overview Cards */}
        <View style={styles.overviewGrid}>
          <View style={[styles.overviewCard, { backgroundColor: colors.streak + '15' }]}>
            <Text style={styles.overviewEmoji}>🔥</Text>
            <Text style={[styles.overviewValue, { color: colors.streak }]}>{stats?.streak || 0}</Text>
            <Text style={styles.overviewLabel}>Current Streak</Text>
            <Text style={styles.overviewSub}>Best: {stats?.longest_streak || 0} days</Text>
          </View>
          
          <View style={[styles.overviewCard, { backgroundColor: colors.points + '15' }]}>
            <Text style={styles.overviewEmoji}>⭐</Text>
            <Text style={[styles.overviewValue, { color: colors.points }]}>{stats?.points || 0}</Text>
            <Text style={styles.overviewLabel}>Total Points</Text>
            <Text style={styles.overviewSub}>Level {stats?.level || 1}</Text>
          </View>
        </View>

        <View style={styles.overviewGrid}>
          <View style={[styles.overviewCard, { backgroundColor: colors.primary + '15' }]}>
            <Text style={styles.overviewEmoji}>📝</Text>
            <Text style={[styles.overviewValue, { color: colors.primary }]}>{stats?.total_questions || 0}</Text>
            <Text style={styles.overviewLabel}>Questions Answered</Text>
            <Text style={styles.overviewSub}>{stats?.correct_answers || 0} correct</Text>
          </View>
          
          <View style={[styles.overviewCard, { backgroundColor: colors.success + '15' }]}>
            <Text style={styles.overviewEmoji}>🎯</Text>
            <Text style={[styles.overviewValue, { color: colors.success }]}>{stats?.accuracy_percentage || 0}%</Text>
            <Text style={styles.overviewLabel}>Accuracy</Text>
            <Text style={styles.overviewSub}>Keep improving!</Text>
          </View>
        </View>

        {/* Level Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Level Progress</Text>
          <View style={styles.levelCard}>
            <View style={styles.levelHeader}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelEmoji}>🏆</Text>
                <Text style={styles.levelNumber}>Level {stats?.level || 1}</Text>
              </View>
              <Text style={styles.levelPoints}>{stats?.points || 0} points</Text>
            </View>
            <View style={styles.levelProgressBg}>
              <View style={[styles.levelProgressBar, { width: `${levelProgress * 100}%` }]} />
            </View>
            <Text style={styles.levelHint}>
              {Math.ceil((1 - levelProgress) * 100)} points to next level
            </Text>
          </View>
        </View>

        {/* Weekly Activity Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Activity</Text>
          <View style={styles.chartCard}>
            {weeklyData.length > 0 ? (
              <LineChart
                data={chartData}
                width={chartWidth - spacing.lg * 2}
                height={180}
                chartConfig={{
                  backgroundColor: colors.surface,
                  backgroundGradientFrom: colors.surface,
                  backgroundGradientTo: colors.surface,
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(108, 99, 255, ${opacity})`,
                  labelColor: () => colors.textSecondary,
                  propsForDots: {
                    r: '6',
                    strokeWidth: '2',
                    stroke: colors.primary,
                  },
                }}
                bezier
                style={{ borderRadius: borderRadius.md }}
              />
            ) : (
              <Text style={styles.noDataText}>Start practicing to see your progress!</Text>
            )}
          </View>
        </View>

        {/* Category Breakdown */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category Performance</Text>
            <View style={styles.chartCard}>
              <BarChart
                data={categoryChartData}
                width={chartWidth - spacing.lg * 2}
                height={180}
                chartConfig={{
                  backgroundColor: colors.surface,
                  backgroundGradientFrom: colors.surface,
                  backgroundGradientTo: colors.surface,
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(108, 99, 255, ${opacity})`,
                  labelColor: () => colors.textSecondary,
                  barPercentage: 0.7,
                }}
                style={{ borderRadius: borderRadius.md }}
                showValuesOnTopOfBars
              />
            </View>
            
            {/* Category Details */}
            <View style={styles.categoryList}>
              {categories.map((cat) => {
                const data = categoryData[cat];
                const accuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                return (
                  <View key={cat} style={styles.categoryItem}>
                    <View style={styles.categoryInfo}>
                      <Text style={styles.categoryName}>
                        {cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Text>
                      <Text style={styles.categoryStats}>
                        {data.correct}/{data.total} correct
                      </Text>
                    </View>
                    <View style={styles.categoryAccuracy}>
                      <Text style={styles.accuracyValue}>{accuracy}%</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Badges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Badges ({badges.length})</Text>
          {badges.length > 0 ? (
            <View style={styles.badgesGrid}>
              {badges.map((badge, index) => (
                <View key={index} style={styles.badgeCard}>
                  <Text style={styles.badgeIcon}>{badge.icon}</Text>
                  <Text style={styles.badgeName}>{badge.name}</Text>
                  <Text style={styles.badgeDesc}>{badge.description}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyBadges}>
              <Text style={styles.emptyBadgesEmoji}>🏅</Text>
              <Text style={styles.emptyBadgesText}>
                Keep practicing to earn your first badge!
              </Text>
            </View>
          )}
        </View>

        {/* Today's Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Summary</Text>
          <View style={styles.todayCard}>
            <View style={styles.todayRow}>
              <Text style={styles.todayLabel}>Questions Answered</Text>
              <Text style={styles.todayValue}>{stats?.today_questions || 0}</Text>
            </View>
            <View style={styles.todayDivider} />
            <View style={styles.todayRow}>
              <Text style={styles.todayLabel}>Correct Answers</Text>
              <Text style={[styles.todayValue, { color: colors.success }]}>
                {stats?.today_correct || 0}
              </Text>
            </View>
            <View style={styles.todayDivider} />
            <View style={styles.todayRow}>
              <Text style={styles.todayLabel}>Today's Accuracy</Text>
              <Text style={[styles.todayValue, { color: colors.primary }]}>
                {stats?.today_questions > 0 
                  ? Math.round((stats.today_correct / stats.today_questions) * 100) 
                  : 0}%
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
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
  headerTitle: {
    ...typography.h2,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  overviewGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  overviewCard: {
    flex: 1,
    marginHorizontal: spacing.xs,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  overviewEmoji: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  overviewValue: {
    ...typography.h2,
  },
  overviewLabel: {
    ...typography.caption,
    color: colors.text,
    marginTop: spacing.xs,
  },
  overviewSub: {
    ...typography.small,
    color: colors.textSecondary,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  levelCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.small,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelEmoji: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  levelNumber: {
    ...typography.h3,
    color: colors.level,
  },
  levelPoints: {
    ...typography.body,
    color: colors.textSecondary,
  },
  levelProgressBg: {
    height: 12,
    backgroundColor: colors.divider,
    borderRadius: 6,
    overflow: 'hidden',
  },
  levelProgressBar: {
    height: '100%',
    backgroundColor: colors.level,
    borderRadius: 6,
  },
  levelHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.small,
  },
  noDataText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  categoryList: {
    marginTop: spacing.md,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.small,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    ...typography.bodyBold,
    color: colors.text,
  },
  categoryStats: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  categoryAccuracy: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
  },
  accuracyValue: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  badgeCard: {
    width: (width - spacing.lg * 2 - spacing.md) / 2,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginRight: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
    ...shadows.small,
  },
  badgeIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  badgeName: {
    ...typography.bodyBold,
    color: colors.text,
    textAlign: 'center',
  },
  badgeDesc: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  emptyBadges: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.small,
  },
  emptyBadgesEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyBadgesText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  todayCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.small,
  },
  todayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  todayDivider: {
    height: 1,
    backgroundColor: colors.divider,
  },
  todayLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  todayValue: {
    ...typography.h3,
    color: colors.text,
  },
});
