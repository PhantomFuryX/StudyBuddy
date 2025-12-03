import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const SkeletonPulse = ({ style }) => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        style,
        { opacity: pulseAnim },
      ]}
    />
  );
};

export const DashboardSkeleton = () => (
  <View style={styles.container}>
    {/* Header skeleton */}
    <View style={styles.header}>
      <View>
        <SkeletonPulse style={styles.greetingText} />
        <SkeletonPulse style={styles.nameText} />
      </View>
      <SkeletonPulse style={styles.avatar} />
    </View>

    {/* Stats row skeleton */}
    <View style={styles.statsRow}>
      <SkeletonPulse style={styles.statCard} />
      <SkeletonPulse style={styles.statCard} />
      <SkeletonPulse style={styles.statCard} />
    </View>

    {/* Progress card skeleton */}
    <SkeletonPulse style={styles.progressCard} />

    {/* Action button skeleton */}
    <SkeletonPulse style={styles.actionButton} />

    {/* Cards skeleton */}
    <SkeletonPulse style={styles.card} />
    <SkeletonPulse style={styles.card} />
  </View>
);

export const QuizSkeleton = () => (
  <View style={styles.quizContainer}>
    <SkeletonPulse style={styles.quizHeader} />
    <SkeletonPulse style={styles.questionBox} />
    <View style={styles.optionsContainer}>
      <SkeletonPulse style={styles.option} />
      <SkeletonPulse style={styles.option} />
      <SkeletonPulse style={styles.option} />
      <SkeletonPulse style={styles.option} />
    </View>
  </View>
);

export const TasksSkeleton = () => (
  <View style={styles.container}>
    <SkeletonPulse style={styles.pageTitle} />
    <SkeletonPulse style={styles.aiCard} />
    <View style={styles.statsRow}>
      <SkeletonPulse style={styles.smallStat} />
      <SkeletonPulse style={styles.smallStat} />
    </View>
    <SkeletonPulse style={styles.taskItem} />
    <SkeletonPulse style={styles.taskItem} />
    <SkeletonPulse style={styles.taskItem} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#F8F9FE',
  },
  skeleton: {
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greetingText: {
    width: 100,
    height: 16,
    marginBottom: 8,
  },
  nameText: {
    width: 160,
    height: 28,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    height: 80,
    borderRadius: 16,
  },
  progressCard: {
    height: 120,
    borderRadius: 20,
    marginBottom: 24,
  },
  actionButton: {
    height: 56,
    borderRadius: 16,
    marginBottom: 24,
  },
  card: {
    height: 100,
    borderRadius: 16,
    marginBottom: 16,
  },
  quizContainer: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },
  quizHeader: {
    height: 120,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  questionBox: {
    height: 150,
    margin: 24,
    borderRadius: 16,
  },
  optionsContainer: {
    paddingHorizontal: 24,
    gap: 12,
  },
  option: {
    height: 60,
    borderRadius: 12,
  },
  pageTitle: {
    width: 150,
    height: 32,
    marginBottom: 24,
  },
  aiCard: {
    height: 90,
    borderRadius: 16,
    marginBottom: 20,
  },
  smallStat: {
    flex: 1,
    height: 70,
    borderRadius: 12,
  },
  taskItem: {
    height: 70,
    borderRadius: 12,
    marginBottom: 12,
  },
});

export default SkeletonPulse;
