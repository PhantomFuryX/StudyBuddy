import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const NotificationService = {
  async init() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Notification permission not granted');
      return false;
    }
    
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('study-reminders', {
        name: 'Study Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6C63FF',
      });
    }
    
    return true;
  },

  async scheduleDailyReminder(hour, minute, title, body) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title || "📚 Time to Study!",
        body: body || "Your daily questions are waiting. Let's keep the streak going!",
        data: { screen: 'Quiz' },
        sound: true,
      },
      trigger: {
        hour: hour,
        minute: minute,
        repeats: true,
      },
    });
  },

  async scheduleStudyReminders(morningTime, eveningTime) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    const [mHour, mMinute] = morningTime.split(':').map(Number);
    const [eHour, eMinute] = eveningTime.split(':').map(Number);
    
    // Morning reminder
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🌅 Good Morning, Champion!",
        body: "Start your day with a quick quiz. Your brain is sharpest now!",
        data: { screen: 'Quiz', type: 'morning' },
        sound: true,
      },
      trigger: {
        hour: mHour,
        minute: mMinute,
        repeats: true,
      },
    });
    
    // Evening reminder
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🌙 Evening Review Time",
        body: "Let's revise what you learned today. Just 15 minutes!",
        data: { screen: 'Quiz', type: 'evening' },
        sound: true,
      },
      trigger: {
        hour: eHour,
        minute: eMinute,
        repeats: true,
      },
    });
  },

  async sendMotivationalNotification() {
    const messages = [
      { title: "💪 You're doing great!", body: "Every question you answer brings you closer to success!" },
      { title: "🔥 Keep the streak alive!", body: "Don't break your streak today. Just 5 minutes!" },
      { title: "🎯 Focus time!", body: "Put your phone on study mode and crush those questions!" },
      { title: "📈 Progress check!", body: "You've improved so much. Keep going!" },
      { title: "🌟 You're a star!", body: "Your dedication is inspiring. Time to shine!" },
    ];
    
    const msg = messages[Math.floor(Math.random() * messages.length)];
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: msg.title,
        body: msg.body,
        data: { screen: 'Dashboard' },
      },
      trigger: null, // Send immediately
    });
  },

  async sendStreakReminder(currentStreak) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🔥 ${currentStreak} Day Streak!`,
        body: "Don't lose it! Complete today's questions to keep your streak.",
        data: { screen: 'Quiz' },
        sound: true,
      },
      trigger: null,
    });
  },

  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  addNotificationListener(callback) {
    return Notifications.addNotificationReceivedListener(callback);
  },

  addResponseListener(callback) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  },
};

export default NotificationService;
