import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../utils/theme';

const CATEGORY_COLORS = {
  reasoning: colors.reasoning,
  gk: colors.gk,
  current_affairs: colors.current_affairs,
};

export default function QuestionCard({ question, selectedAnswer, showResult, onAnswer }) {
  const categoryColor = CATEGORY_COLORS[question.category] || colors.primary;

  return (
    <View style={styles.card}>
      <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}>
        <Text style={[styles.categoryText, { color: categoryColor }]}>
          {question.category?.replace('_', ' ').toUpperCase()}
        </Text>
      </View>

      <Text style={styles.questionText}>{question.question}</Text>

      <View style={styles.optionsContainer}>
        {question.options?.map((option, index) => {
          let optionStyle = [styles.option];
          let textStyle = [styles.optionText];

          if (showResult) {
            if (index === question.answer_index) {
              optionStyle.push(styles.optionCorrect);
              textStyle.push(styles.optionTextCorrect);
            } else if (index === selectedAnswer && index !== question.answer_index) {
              optionStyle.push(styles.optionWrong);
              textStyle.push(styles.optionTextWrong);
            }
          } else if (index === selectedAnswer) {
            optionStyle.push(styles.optionSelected);
          }

          return (
            <TouchableOpacity
              key={index}
              style={optionStyle}
              onPress={() => !showResult && onAnswer(index)}
              disabled={showResult}
              activeOpacity={0.7}
            >
              <View style={styles.optionPrefix}>
                <Text style={styles.optionPrefixText}>
                  {String.fromCharCode(65 + index)}
                </Text>
              </View>
              <Text style={textStyle} numberOfLines={3}>
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.medium,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    marginBottom: spacing.lg,
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
});
