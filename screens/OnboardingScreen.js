import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../utils/theme';
import { register, login, saveToken, saveUser, updatePreferences } from '../utils/api';
import NotificationService from '../utils/NotificationService';

const { width, height } = Dimensions.get('window');

const ONBOARDING_STEPS = [
  {
    icon: '📚',
    title: 'Welcome, Future Topper!',
    subtitle: 'Your personal study companion for SSC, Railway, and State PSC exams',
  },
  {
    icon: '🎯',
    title: 'Daily Practice',
    subtitle: '30 handpicked questions daily - Reasoning, GK & Current Affairs',
  },
  {
    icon: '🔥',
    title: 'Build Streaks',
    subtitle: 'Stay consistent, earn badges, and watch your progress grow',
  },
  {
    icon: '🧠',
    title: 'Smart Learning',
    subtitle: 'Spaced repetition ensures you remember what you learn forever',
  },
];

export default function OnboardingScreen({ navigation }) {
  const [step, setStep] = useState(0);
  const [isLogin, setIsLogin] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [morningTime, setMorningTime] = useState('09:00');
  const [eveningTime, setEveningTime] = useState('19:00');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateTransition = (callback) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    setTimeout(callback, 150);
  };

  const handleNext = () => {
    if (step < ONBOARDING_STEPS.length - 1) {
      animateTransition(() => setStep(step + 1));
    } else {
      animateTransition(() => setStep('auth'));
    }
  };

  const handleAuth = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      let response;
      if (isLogin) {
        response = await login(email, password);
      } else {
        if (!name) {
          setError('Please enter your name');
          setLoading(false);
          return;
        }
        response = await register(email, name, password);
      }
      
      await saveToken(response.access_token);
      await saveUser(response.user);
      
      if (!isLogin) {
        animateTransition(() => setStep('preferences'));
      } else {
        navigation.replace('Main');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPreferences = async () => {
    setLoading(true);
    try {
      await updatePreferences({
        morning_time: morningTime,
        evening_time: eveningTime,
        daily_goal_questions: 30,
        notification_enabled: true,
      });
      
      await NotificationService.init();
      await NotificationService.scheduleStudyReminders(morningTime, eveningTime);
      
      navigation.replace('Main');
    } catch (err) {
      navigation.replace('Main');
    } finally {
      setLoading(false);
    }
  };

  const renderOnboardingStep = () => (
    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
      <Text style={styles.emoji}>{ONBOARDING_STEPS[step].icon}</Text>
      <Text style={styles.title}>{ONBOARDING_STEPS[step].title}</Text>
      <Text style={styles.subtitle}>{ONBOARDING_STEPS[step].subtitle}</Text>
      
      <View style={styles.dotsContainer}>
        {ONBOARDING_STEPS.map((_, index) => (
          <View
            key={index}
            style={[styles.dot, step === index && styles.dotActive]}
          />
        ))}
      </View>
      
      <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
        <Text style={styles.primaryButtonText}>
          {step === ONBOARDING_STEPS.length - 1 ? "Let's Start!" : 'Next'}
        </Text>
        <Ionicons name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => setStep('auth')}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderAuthStep = () => (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.authContainer}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.emoji}>🎓</Text>
          <Text style={styles.title}>{isLogin ? 'Welcome Back!' : 'Create Account'}</Text>
          <Text style={styles.subtitle}>
            {isLogin ? 'Continue your learning journey' : 'Start your success story today'}
          </Text>
          
          {!isLogin && (
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Your Name"
                placeholderTextColor={colors.textLight}
                value={name}
                onChangeText={setName}
              />
            </View>
          )}
          
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor={colors.textLight}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.textLight}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>
          
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleAuth}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Create Account')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
            <Text style={styles.switchText}>
              {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Login'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderPreferencesStep = () => (
    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
      <Text style={styles.emoji}>⏰</Text>
      <Text style={styles.title}>Set Your Study Times</Text>
      <Text style={styles.subtitle}>We'll remind you to practice at these times</Text>
      
      <View style={styles.timeCard}>
        <View style={styles.timeRow}>
          <View style={styles.timeIcon}>
            <Text style={styles.timeEmoji}>🌅</Text>
          </View>
          <View style={styles.timeInfo}>
            <Text style={styles.timeLabel}>Morning Session</Text>
            <Text style={styles.timeDesc}>Start your day sharp</Text>
          </View>
          <TextInput
            style={styles.timeInput}
            value={morningTime}
            onChangeText={setMorningTime}
            placeholder="09:00"
          />
        </View>
        
        <View style={styles.timeDivider} />
        
        <View style={styles.timeRow}>
          <View style={styles.timeIcon}>
            <Text style={styles.timeEmoji}>🌙</Text>
          </View>
          <View style={styles.timeInfo}>
            <Text style={styles.timeLabel}>Evening Review</Text>
            <Text style={styles.timeDesc}>Revise and remember</Text>
          </View>
          <TextInput
            style={styles.timeInput}
            value={eveningTime}
            onChangeText={setEveningTime}
            placeholder="19:00"
          />
        </View>
      </View>
      
      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleSetPreferences}
        disabled={loading}
      >
        <Text style={styles.primaryButtonText}>
          {loading ? 'Setting up...' : "Let's Go! 🚀"}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => navigation.replace('Main')}>
        <Text style={styles.skipText}>Skip for now</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <LinearGradient
      colors={['#6C63FF', '#8B85FF', '#A5A0FF']}
      style={styles.container}
    >
      <View style={styles.content}>
        {typeof step === 'number' && renderOnboardingStep()}
        {step === 'auth' && renderAuthStep()}
        {step === 'preferences' && renderPreferencesStep()}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  stepContainer: {
    alignItems: 'center',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 80,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  title: {
    ...typography.h1,
    color: '#fff',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  dotsContainer: {
    flexDirection: 'row',
    marginBottom: spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 24,
  },
  primaryButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    width: '100%',
    ...shadows.medium,
  },
  primaryButtonText: {
    ...typography.bodyBold,
    color: colors.primary,
    marginRight: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  skipText: {
    ...typography.body,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  switchText: {
    ...typography.body,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    ...typography.body,
    color: colors.text,
  },
  errorText: {
    ...typography.caption,
    color: '#FFE0E0',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  timeCard: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    marginBottom: spacing.xl,
    ...shadows.medium,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeEmoji: {
    fontSize: 24,
  },
  timeInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  timeLabel: {
    ...typography.bodyBold,
    color: colors.text,
  },
  timeDesc: {
    ...typography.caption,
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
    width: 80,
  },
  timeDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
});
