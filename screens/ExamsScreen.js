import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, RefreshControl, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../utils/theme';
import { getExams, addExam } from '../utils/api';

export default function ExamsScreen({ navigation }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [examName, setExamName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [notes, setNotes] = useState('');

  const load = async () => {
    try {
      const data = await getExams();
      setExams(data || []);
    } catch (e) {
      console.log('Error loading exams', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setLoading(true);
      load();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const saveExam = async () => {
    if (!examName || !examDate) return;
    try {
      await addExam(examName.trim(), examDate.trim(), notes.trim() || null);
      setShowModal(false);
      setExamName('');
      setExamDate('');
      setNotes('');
      load();
    } catch (e) {
      console.log('Error saving exam', e);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.examCard}>
      <View style={styles.examLeft}>
        <Text style={styles.examName}>{item.name}</Text>
        <Text style={styles.examDate}>📅 {item.date}</Text>
        {item.notes ? <Text style={styles.examNotes}>{item.notes}</Text> : null}
      </View>
      <View style={styles.examRight}>
        <Text style={styles.daysLeft}>{Math.max(0, item.days_left ?? 0)}</Text>
        <Text style={styles.daysLabel}>days left</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Exam Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={exams}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🗓️</Text>
            <Text style={styles.emptyText}>No exams added yet</Text>
            <Text style={styles.emptyHint}>Add your upcoming exams to track days left</Text>
          </View>
        ) : null}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Exam</Text>
            <TextInput
              placeholder="Exam Name (e.g., SSC CGL)"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              value={examName}
              onChangeText={setExamName}
            />
            <TextInput
              placeholder="Date (YYYY-MM-DD)"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              value={examDate}
              onChangeText={setExamDate}
            />
            <TextInput
              placeholder="Notes (optional)"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { height: 80 }]} 
              multiline
              value={notes}
              onChangeText={setNotes}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.surface }]} onPress={() => setShowModal(false)}>
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtn} onPress={saveExam}>
                <Text style={styles.modalBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: colors.surface },
  title: { ...typography.h2, color: colors.text },
  examCard: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadows.small },
  examLeft: { flex: 1 },
  examName: { ...typography.bodyBold, color: colors.text },
  examDate: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  examNotes: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  examRight: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  daysLeft: { ...typography.h1, color: colors.primary, lineHeight: 40 },
  daysLabel: { ...typography.small, color: colors.textSecondary },
  empty: { alignItems: 'center', marginTop: spacing.xl },
  emptyEmoji: { fontSize: 48 },
  emptyText: { ...typography.bodyBold, color: colors.text, marginTop: spacing.sm },
  emptyHint: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadows.large },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: spacing.xl, margin: spacing.lg, width: '90%', ...shadows.large },
  modalTitle: { ...typography.h2, color: colors.text, marginBottom: spacing.md },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider, borderRadius: borderRadius.md, padding: spacing.md, color: colors.text, marginBottom: spacing.sm },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.md, gap: spacing.sm },
  modalBtn: { backgroundColor: colors.primary, borderRadius: borderRadius.lg, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  modalBtnText: { ...typography.bodyBold, color: '#fff' },
});
