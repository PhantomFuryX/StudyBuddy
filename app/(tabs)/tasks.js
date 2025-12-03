import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  getTasks, 
  createTask, 
  updateTask, 
  deleteTask, 
  generateAITasks,
  getTaskSuggestions 
} from '../../utils/api';

const colors = {
  primary: '#6C63FF',
  background: '#F8F9FE',
  surface: '#FFFFFF',
  text: '#1A1A2E',
  textSecondary: '#666687',
  success: '#34C759',
  warning: '#FF9500',
  danger: '#FF3B30',
  ai: '#AF52DE',
};

export default function TasksScreen() {
  const [tasks, setTasks] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [newTask, setNewTask] = useState('');

  useEffect(() => {
    fetchTasks();
    fetchSuggestions();
  }, []);

  const fetchTasks = async () => {
    try {
      const data = await getTasks();
      setTasks(data.tasks || []);
    } catch (error) {
      console.log('Error fetching tasks:', error);
      setTasks(getMockTasks());
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const data = await getTaskSuggestions();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      setSuggestions(getDefaultSuggestions());
    }
  };

  const getMockTasks = () => [
    { id: '1', title: 'Complete 30 questions today', status: 'pending', priority: 'high', category: 'daily' },
    { id: '2', title: 'Review current affairs', status: 'pending', priority: 'medium', category: 'current_affairs' },
  ];

  const getDefaultSuggestions = () => [
    { title: 'Complete daily quiz (30 questions)', priority: 'high', category: 'daily', reason: 'Daily goal' },
    { title: 'Read current affairs for 15 mins', priority: 'medium', category: 'current_affairs', reason: 'Stay updated' },
    { title: 'Practice reasoning problems', priority: 'medium', category: 'reasoning', reason: 'Skill building' },
  ];

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      Alert.alert('Enter something', 'Tell me what you want to study today');
      return;
    }

    setAiLoading(true);
    try {
      const data = await generateAITasks(aiPrompt);
      if (data.tasks && data.tasks.length > 0) {
        fetchTasks(); // Refresh tasks list
        setAiPrompt('');
        setShowAIChat(false);
        Alert.alert('Tasks Created! ✨', `${data.tasks.length} tasks added to your list`);
      }
    } catch (error) {
      console.log('AI generation error:', error);
      // Add default tasks on error
      const defaultTasks = [
        { title: `Study: ${aiPrompt}`, priority: 'high' },
        { title: 'Take a practice quiz', priority: 'medium' },
      ];
      for (const task of defaultTasks) {
        await handleAddTaskDirect(task.title, task.priority);
      }
      setAiPrompt('');
      setShowAIChat(false);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddSuggestion = async (suggestion) => {
    try {
      await createTask({ 
        title: suggestion.title, 
        priority: suggestion.priority,
        category: suggestion.category 
      });
      fetchTasks();
      Alert.alert('Added! ✅', suggestion.title);
    } catch (error) {
      const mockTask = { 
        id: Date.now().toString(), 
        title: suggestion.title, 
        status: 'pending', 
        priority: suggestion.priority 
      };
      setTasks([mockTask, ...tasks]);
    }
  };

  const handleAddTaskDirect = async (title, priority = 'medium') => {
    try {
      await createTask({ title, priority });
      fetchTasks();
    } catch (error) {
      const mockTask = { id: Date.now().toString(), title, status: 'pending', priority };
      setTasks([mockTask, ...tasks]);
    }
  };

  const handleAddManualTask = async () => {
    if (!newTask.trim()) return;
    await handleAddTaskDirect(newTask);
    setNewTask('');
    setShowManualAdd(false);
  };

  const toggleTask = async (task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await updateTask(task.id, { status: newStatus });
      fetchTasks();
    } catch (error) {
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    }
  };

  const handleDeleteTask = (taskId) => {
    Alert.alert('Delete Task', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTask(taskId);
            fetchTasks();
          } catch (error) {
            setTasks(tasks.filter(t => t.id !== taskId));
          }
        },
      },
    ]);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return colors.danger;
      case 'medium': return colors.warning;
      default: return colors.success;
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'daily': return '📝';
      case 'reasoning': return '🧠';
      case 'gk': return '📚';
      case 'current_affairs': return '📰';
      case 'revision': return '🔄';
      default: return '✅';
    }
  };

  const renderTask = ({ item }) => (
    <View style={styles.taskCard}>
      <TouchableOpacity style={styles.checkbox} onPress={() => toggleTask(item)}>
        <Ionicons
          name={item.status === 'completed' ? 'checkbox' : 'square-outline'}
          size={24}
          color={item.status === 'completed' ? colors.success : colors.textSecondary}
        />
      </TouchableOpacity>
      
      <View style={styles.taskContent}>
        <Text style={[styles.taskTitle, item.status === 'completed' && styles.taskCompleted]}>
          {getCategoryIcon(item.category)} {item.title}
        </Text>
        <View style={styles.taskMeta}>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + '20' }]}>
            <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
              {item.priority}
            </Text>
          </View>
          {item.ai_generated && (
            <View style={[styles.priorityBadge, { backgroundColor: colors.ai + '20' }]}>
              <Text style={[styles.priorityText, { color: colors.ai }]}>AI</Text>
            </View>
          )}
        </View>
      </View>
      
      <TouchableOpacity onPress={() => handleDeleteTask(item.id)}>
        <Ionicons name="trash-outline" size={20} color={colors.danger} />
      </TouchableOpacity>
    </View>
  );

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Tasks</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowManualAdd(true)}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* AI Assistant Card */}
      <TouchableOpacity style={styles.aiCard} onPress={() => setShowAIChat(true)}>
        <LinearGradient colors={[colors.ai, '#DA70D6']} style={styles.aiGradient}>
          <View style={styles.aiContent}>
            <Text style={styles.aiEmoji}>🤖</Text>
            <View style={styles.aiTextContent}>
              <Text style={styles.aiTitle}>AI Study Planner</Text>
              <Text style={styles.aiSubtitle}>Tell me what you're studying, I'll create tasks for you</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Smart Suggestions */}
      {suggestions.length > 0 && (
        <View style={styles.suggestionsSection}>
          <Text style={styles.sectionTitle}>💡 Suggested for you</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionCard}
                onPress={() => handleAddSuggestion(suggestion)}
              >
                <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
                <Text style={styles.suggestionReason}>{suggestion.reason}</Text>
                <View style={styles.addSuggestionBtn}>
                  <Ionicons name="add-circle" size={20} color={colors.primary} />
                  <Text style={styles.addSuggestionText}>Add</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{pendingTasks.length}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.success }]}>{completedTasks.length}</Text>
          <Text style={styles.statLabel}>Done</Text>
        </View>
      </View>

      {/* Tasks List */}
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={renderTask}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📝</Text>
            <Text style={styles.emptyText}>No tasks yet</Text>
            <Text style={styles.emptySubtext}>Tap the AI planner above to get started!</Text>
          </View>
        }
      />

      {/* AI Chat Modal */}
      <Modal visible={showAIChat} animationType="slide" transparent>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => {
              Keyboard.dismiss();
              setShowAIChat(false);
            }}
          />
          <View style={styles.aiChatModal}>
            <View style={styles.aiChatHeader}>
              <Text style={styles.aiChatTitle}>🤖 AI Study Planner</Text>
              <TouchableOpacity onPress={() => setShowAIChat(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.aiChatScroll}
              contentContainerStyle={styles.aiChatBody}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.aiChatMessage}>
                Hi! Tell me what you want to study today, and I'll create a personalized task list for you.
              </Text>
              
              <View style={styles.promptExamples}>
                <Text style={styles.examplesTitle}>Try saying:</Text>
                {[
                  "I have SSC exam next month",
                  "I'm weak in reasoning",
                  "Prepare me for current affairs",
                  "I have 2 hours to study today",
                ].map((example, i) => (
                  <TouchableOpacity 
                    key={i} 
                    style={styles.exampleChip}
                    onPress={() => setAiPrompt(example)}
                  >
                    <Text style={styles.exampleText}>{example}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.inputContainer}>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.aiInput}
                  placeholder="What do you want to study today?"
                  value={aiPrompt}
                  onChangeText={setAiPrompt}
                  multiline
                  returnKeyType="send"
                  blurOnSubmit={false}
                  onSubmitEditing={handleAIGenerate}
                />
                <TouchableOpacity 
                  style={[styles.sendBtn, aiLoading && styles.sendBtnDisabled]}
                  onPress={handleAIGenerate}
                  disabled={aiLoading}
                >
                  {aiLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Ionicons name="send" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Manual Add Modal */}
      <Modal visible={showManualAdd} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Task</Text>
            <TextInput
              style={styles.input}
              placeholder="What do you need to do?"
              value={newTask}
              onChangeText={setNewTask}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowManualAdd(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddManualTask}>
                <Text style={styles.saveText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  addBtn: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiCard: {
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  aiGradient: {
    padding: 20,
  },
  aiContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  aiTextContent: {
    flex: 1,
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  aiSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  suggestionsSection: {
    paddingLeft: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  suggestionCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 180,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  suggestionReason: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  addSuggestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addSuggestionText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  list: {
    padding: 24,
    paddingTop: 0,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  checkbox: {
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    color: colors.text,
    marginBottom: 4,
  },
  taskCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  taskMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  aiChatModal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: 400,
  },
  aiChatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
  },
  aiChatTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  aiChatScroll: {
    flex: 1,
  },
  aiChatBody: {
    padding: 20,
    paddingBottom: 10,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F5',
    padding: 16,
    paddingBottom: 30,
    backgroundColor: colors.surface,
  },
  aiChatMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 20,
  },
  promptExamples: {
    marginBottom: 20,
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  exampleChip: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 14,
    color: colors.primary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  aiInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: colors.ai,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.primary,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveText: {
    color: '#fff',
    fontWeight: '600',
  },
});
