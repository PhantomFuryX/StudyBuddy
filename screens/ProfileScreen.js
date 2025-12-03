import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../utils/theme';
import { getUser, getPreferences, updatePreferences, removeToken } from '../utils/api';
import NotificationService from '../utils/NotificationService';

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [preferences, setPreferences] = useState({
    morning_time: '09:00',
    evening_time: '19:00',
    daily_goal_questions: 30,
    notification_enabled: true,
    focus_session_minutes: 25,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [userData, prefsData] = await Promise.all([
        getUser(),
        getPreferences(),
      ]);
      setUser(userData);
      if (prefsData) {
        setPreferences(prev => ({ ...prev, ...prefsData }));
      }
    } catch (error) {
      console.log('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      await updatePreferences(preferences);
      
      if (preferences.notification_enabled) {
        await NotificationService.scheduleStudyReminders(
          preferences.morning_time,
          preferences.evening_time
        );
      } else {
        await NotificationService.cancelAllNotifications();
      }
      
      Alert.alert('Success', 'Preferences saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await removeToken();
            await NotificationService.cancelAllNotifications();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Onboarding' }],
            });
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingEmoji}>⚙️</Text>
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView scrollEnabled={true} showsVerticalScrollIndicator={true}>
        <Text style={styles.headerTitle}>Settings</Text>

        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name || 'User'}</Text>
              <Text style={styles.profileEmail}>{user?.email || ''}</Text>
            </View>
          </View>
        </View>

        {/* Study Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Study Preferences</Text>
          
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="notifications-outline" size={24} color={colors.primary} />
                <Text style={styles.settingLabel}>Notifications</Text>
              </View>
              <Switch
                value={preferences.notification_enabled}
                onValueChange={(value) => 
                  setPreferences({ ...preferences, notification_enabled: value })
                }
                trackColor={{ false: colors.divider, true: colors.primary + '50' }}
                thumbColor={preferences.notification_enabled ? colors.primary : colors.textLight}
              />
            </View>
          </View>

          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="sunny-outline" size={24} color={colors.warning} />
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>Morning Reminder</Text>
                  <Text style={styles.settingHint}>Best time for reasoning</Text>
                </View>
              </View>
              <TextInput
                style={styles.timeInput}
                value={preferences.morning_time}
                onChangeText={(text) => 
                  setPreferences({ ...preferences, morning_time: text })
                }
                placeholder="09:00"
              />
            </View>
          </View>

          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="moon-outline" size={24} color={colors.level} />
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>Evening Reminder</Text>
                  <Text style={styles.settingHint}>Review time</Text>
                </View>
              </View>
              <TextInput
                style={styles.timeInput}
                value={preferences.evening_time}
                onChangeText={(text) => 
                  setPreferences({ ...preferences, evening_time: text })
                }
                placeholder="19:00"
              />
            </View>
          </View>

          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="flag-outline" size={24} color={colors.success} />
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>Daily Goal</Text>
                  <Text style={styles.settingHint}>Questions per day</Text>
                </View>
              </View>
              <TextInput
                style={styles.timeInput}
                value={String(preferences.daily_goal_questions)}
                onChangeText={(text) => 
                  setPreferences({ ...preferences, daily_goal_questions: parseInt(text) || 30 })
                }
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="timer-outline" size={24} color={colors.secondary} />
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>Focus Session</Text>
                  <Text style={styles.settingHint}>Minutes per session</Text>
                </View>
              </View>
              <TextInput
                style={styles.timeInput}
                value={String(preferences.focus_session_minutes)}
                onChangeText={(text) => 
                  setPreferences({ ...preferences, focus_session_minutes: parseInt(text) || 25 })
                }
                keyboardType="numeric"
              />
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSavePreferences}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save Preferences'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Exams')}>
            <Ionicons name="calendar-outline" size={24} color={colors.textSecondary} />
            <Text style={styles.menuText}>Exam Profile</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="information-circle-outline" size={24} color={colors.textSecondary} />
            <Text style={styles.menuText}>About Study Buddy</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="help-circle-outline" size={24} color={colors.textSecondary} />
            <Text style={styles.menuText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="shield-checkmark-outline" size={24} color={colors.textSecondary} />
            <Text style={styles.menuText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color={colors.error} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Version */}
        <Text style={styles.versionText}>Study Buddy v2.0.0</Text>
        <Text style={styles.loveText}>Made with ❤️ for your success</Text>

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
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.small,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...typography.h2,
    color: '#fff',
  },
  profileInfo: {
    marginLeft: spacing.md,
  },
  profileName: {
    ...typography.h3,
    color: colors.text,
  },
  profileEmail: {
    ...typography.body,
    color: colors.textSecondary,
  },
  settingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    ...shadows.small,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTextContainer: {
    marginLeft: spacing.md,
  },
  settingLabel: {
    ...typography.body,
    color: colors.text,
    marginLeft: spacing.md,
  },
  settingHint: {
    ...typography.small,
    color: colors.textSecondary,
  },
  timeInput: {
    ...typography.bodyBold,
    color: colors.primary,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    textAlign: 'center',
    width: 70,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    ...typography.bodyBold,
    color: '#fff',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.small,
  },
  menuText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    marginLeft: spacing.md,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error + '10',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  logoutText: {
    ...typography.bodyBold,
    color: colors.error,
    marginLeft: spacing.sm,
  },
  versionText: {
    ...typography.caption,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  loveText: {
    ...typography.small,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
