import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

const colors = {
  primary: '#6C63FF',
  background: '#F8F9FE',
  surface: '#FFFFFF',
  text: '#1A1A2E',
  textSecondary: '#666687',
  gradientPrimary: ['#6C63FF', '#8B85FF'],
  gradientPractice: ['#4CAF50', '#81C784'],
  gradientTest: ['#FF9500', '#FFCC00'],
};

const QUESTION_COUNTS = [5, 30, 50, 70, 100];
const DIFFICULTIES = [
  { id: 'easy', label: 'Easy', emoji: '😊', color: '#4CAF50' },
  { id: 'medium', label: 'Medium', emoji: '🤔', color: '#FF9500' },
  { id: 'hard', label: 'Hard', emoji: '🔥', color: '#FF3B30' },
];
const MODES = [
  { 
    id: 'practice', 
    label: 'Practice Mode', 
    emoji: '📚', 
    description: 'See answers after each question',
    gradient: ['#4CAF50', '#81C784']
  },
  { 
    id: 'test', 
    label: 'Test Mode', 
    emoji: '⏱️', 
    description: 'Timed quiz, answers shown at the end',
    gradient: ['#FF9500', '#FFCC00']
  },
];

export default function QuizConfigScreen() {
  const [questionCount, setQuestionCount] = useState(30);
  const [difficulty, setDifficulty] = useState('medium');
  const [mode, setMode] = useState('practice');
  const CATEGORY_OPTIONS = [
    { id: 'reasoning', label: 'General Intelligence & Reasoning', emoji: '🧠' },
    { id: 'gk', label: 'General Awareness', emoji: '🌍' },
    { id: 'quantitative_aptitude', label: 'Quantitative Aptitude', emoji: '➗' },
    { id: 'english', label: 'English', emoji: '📘' },
  ];
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [mixAndMatch, setMixAndMatch] = useState(true);
  const [topic, setTopic] = useState("");
  const params = useLocalSearchParams();

  useEffect(() => {
    if (params?.preset === 'daily') {
      setMixAndMatch(true);
      setSelectedCategories([]);
      // Optionally enforce defaults for daily
      // setQuestionCount(30);
      // setDifficulty('medium');
      // setMode('practice');
    }
  }, []);

  const startQuiz = () => {
    const categories = mixAndMatch
      ? CATEGORY_OPTIONS.map(c => c.id)
      : (selectedCategories.length > 0 ? selectedCategories : CATEGORY_OPTIONS.map(c => c.id));
    router.push({
      pathname: '/quiz',
      params: {
        count: questionCount,
        difficulty,
        mode,
        timeLimit: mode === 'test' ? questionCount * 60 : 0,
        categories: JSON.stringify(categories),
        query: topic || undefined,
      },
    });
  };

  const selectedMode = MODES.find(m => m.id === mode);

  return (
    <View style={styles.container}>
      <LinearGradient colors={colors.gradientPrimary} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configure Quiz</Text>
        <Text style={styles.headerSubtitle}>
          Customize your quiz settings
        </Text>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Question Count */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Number of Questions</Text>
          <View style={styles.optionsRow}>
            {QUESTION_COUNTS.map((count) => (
              <TouchableOpacity
                key={count}
                style={[
                  styles.countButton,
                  questionCount === count && styles.countButtonActive,
                ]}
                onPress={() => setQuestionCount(count)}
              >
                <Text
                  style={[
                    styles.countButtonText,
                    questionCount === count && styles.countButtonTextActive,
                  ]}
                >
                  {count}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Difficulty */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Difficulty Level</Text>
          <View style={styles.difficultyRow}>
            {DIFFICULTIES.map((diff) => (
              <TouchableOpacity
                key={diff.id}
                style={[
                  styles.difficultyButton,
                  difficulty === diff.id && { backgroundColor: diff.color + '20', borderColor: diff.color },
                ]}
                onPress={() => setDifficulty(diff.id)}
              >
                <Text style={styles.difficultyEmoji}>{diff.emoji}</Text>
                <Text
                  style={[
                    styles.difficultyText,
                    difficulty === diff.id && { color: diff.color, fontWeight: '600' },
                  ]}
                >
                  {diff.label}
                </Text>
                {difficulty === diff.id && (
                  <Ionicons name="checkmark-circle" size={20} color={diff.color} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, mixAndMatch && styles.toggleBtnActive]}
              onPress={() => setMixAndMatch(true)}
            >
              <Text style={[styles.toggleText, mixAndMatch && styles.toggleTextActive]}>Mix & Match</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, !mixAndMatch && styles.toggleBtnActive]}
              onPress={() => setMixAndMatch(false)}
            >
              <Text style={[styles.toggleText, !mixAndMatch && styles.toggleTextActive]}>Choose</Text>
            </TouchableOpacity>
          </View>
          {!mixAndMatch && (
            <View style={styles.categoryGrid}>
              {CATEGORY_OPTIONS.map(cat => {
                const active = selectedCategories.includes(cat.id);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryChip, active && styles.categoryChipActive]}
                    onPress={() => setSelectedCategories(prev => active ? prev.filter(c => c !== cat.id) : [...prev, cat.id])}
                  >
                    <Text style={[styles.categoryEmoji]}>{cat.emoji}</Text>
                    <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{cat.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {/* Topical query for semantic retrieval */}
          <View style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 6 }}>Search by Topic (optional)</Text>
            <View style={styles.topicInputWrapper}>
              <Ionicons name="search" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.topicInput}
                placeholder="e.g., clock problems, profit & loss, polity"
                placeholderTextColor={colors.textSecondary}
                value={topic}
                onChangeText={setTopic}
                returnKeyType="done"
              />
            </View>
          </View>
        </View>

        {/* Mode Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quiz Mode</Text>
          <View style={styles.modesContainer}>
            {MODES.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.modeCard,
                  mode === m.id && styles.modeCardActive,
                ]}
                onPress={() => setMode(m.id)}
              >
                <LinearGradient
                  colors={mode === m.id ? m.gradient : ['#F0F0F5', '#E8E8EE']}
                  style={styles.modeGradient}
                >
                  <Text style={styles.modeEmoji}>{m.emoji}</Text>
                  <Text style={[
                    styles.modeLabel,
                    mode === m.id && styles.modeLabelActive
                  ]}>
                    {m.label}
                  </Text>
                  <Text style={[
                    styles.modeDescription,
                    mode === m.id && styles.modeDescriptionActive
                  ]}>
                    {m.description}
                  </Text>
                  {mode === m.id && (
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Quiz Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Questions</Text>
            <Text style={styles.summaryValue}>{questionCount}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Difficulty</Text>
            <Text style={styles.summaryValue}>
              {DIFFICULTIES.find(d => d.id === difficulty)?.emoji} {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Categories</Text>
            <Text style={styles.summaryValue}>
              {mixAndMatch ? 'Mix & Match' : (selectedCategories.length ? `${selectedCategories.length} selected` : 'All')}
            </Text>
          </View>
          {topic ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Topic</Text>
              <Text style={styles.summaryValue}>{topic}</Text>
            </View>
          ) : null}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Mode</Text>
            <Text style={styles.summaryValue}>
              {selectedMode?.emoji} {selectedMode?.label}
            </Text>
          </View>
          {mode === 'test' && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Time Limit</Text>
              <Text style={styles.summaryValue}>
                ⏱️ {questionCount} minutes
              </Text>
            </View>
          )}
        </View>

        {/* Start Button */}
        <TouchableOpacity style={styles.startButton} onPress={startQuiz}>
          <LinearGradient
            colors={selectedMode?.gradient || colors.gradientPrimary}
            style={styles.startButtonGradient}
          >
            <Text style={styles.startButtonText}>Generate Quiz</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backBtn: {
    position: 'absolute',
    top: 52,
    left: 16,
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 100,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F0F0F5',
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: colors.primary + '20',
  },
  toggleText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: colors.primary,
  },
  categoryGrid: {
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryChipActive: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  categoryEmoji: { fontSize: 18, marginRight: 8 },
  categoryText: { fontSize: 14, color: colors.text },
  categoryTextActive: { color: colors.primary, fontWeight: '600' },
  topicInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  topicInput: {
    flex: 1,
    height: 44,
    color: colors.text,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  countButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  countButtonActive: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  countButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  countButtonTextActive: {
    color: colors.primary,
  },
  difficultyRow: {
    gap: 12,
  },
  difficultyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 8,
  },
  difficultyEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  difficultyText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  modesContainer: {
    gap: 16,
  },
  modeCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  modeCardActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  modeGradient: {
    padding: 20,
    alignItems: 'center',
  },
  modeEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  modeLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  modeLabelActive: {
    color: '#fff',
  },
  modeDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modeDescriptionActive: {
    color: 'rgba(255,255,255,0.9)',
  },
  checkBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  startButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },
});
