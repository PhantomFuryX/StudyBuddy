import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

const getApiUrl = () => {
  // Prefer explicit env override if provided (works on native & web)
  const envUrl =
    process.env.EXPO_PUBLIC_API_URL ||
    Constants?.expoConfig?.extra?.API_URL ||
    Constants?.manifest?.extra?.API_URL;
  if (envUrl) return envUrl;

  // Web (Expo web/Browser): derive from current hostname
  if (Platform.OS === 'web') {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    return `http://${isLocal ? 'localhost' : host}:8001`;
  }

  if (__DEV__) {
    // Android emulator (Expo Go on emulator only)
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:8001';
    }
    // iOS simulator
    if (Platform.OS === 'ios') {
      return 'http://localhost:8001';
    }
    // Fallback: adjust to your machine LAN IP if using physical device
    return 'http://192.168.0.100:8001';
  }
  // Production placeholder
  return 'https://your-production-api.com';
};

const API_URL = getApiUrl();
try { console.log('API base URL:', API_URL); } catch {}

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// Token management
export const saveToken = async (token) => {
  await SecureStore.setItemAsync('auth_token', token);
};

export const getToken = async () => {
  return await SecureStore.getItemAsync('auth_token');
};

export const removeToken = async () => {
  await SecureStore.deleteItemAsync('auth_token');
};

export const saveUser = async (user) => {
  await SecureStore.setItemAsync('user_data', JSON.stringify(user));
};

export const getUser = async () => {
  const data = await SecureStore.getItemAsync('user_data');
  return data ? JSON.parse(data) : null;
};

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    try {
      console.log(
        'API error:',
        error?.config?.method?.toUpperCase?.(),
        error?.config?.url,
        'status:', error?.response?.status,
        'data:', error?.response?.data
      );
      const ez = error?.toJSON?.();
      if (ez) console.log('Axios error toJSON:', ez);
    } catch {}
    if (error.response?.status === 401) {
      removeToken();
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const register = async (email, name, password) => {
  const response = await api.post('/auth/register', { email, name, password });
  return response.data;
};

export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

// Dashboard & User APIs
export const getDashboard = async () => {
  const response = await api.get('/user/dashboard');
  return response.data;
};

export const getStats = async () => {
  const response = await api.get('/user/stats');
  return response.data;
};

export const getBadges = async () => {
  const response = await api.get('/user/badges');
  return response.data;
};

export const updatePreferences = async (preferences) => {
  const response = await api.put('/user/preferences', preferences);
  return response.data;
};

export const getPreferences = async () => {
  const response = await api.get('/user/preferences');
  return response.data;
};

// Question APIs
export const getDailyQuestions = async () => {
  const response = await api.get('/questions/daily');
  return response.data;
};

export const getCategoryQuestions = async (category, limit = 10) => {
  const response = await api.get(`/questions/category/${category}?limit=${limit}`);
  return response.data;
};

export const getReviewQuestions = async (limit = 10) => {
  const response = await api.get(`/questions/review?limit=${limit}`);
  return response.data;
};

export const submitAnswer = async (questionId, chosenIndex, timeMs) => {
  const response = await api.post('/questions/answer', {
    question_id: questionId,
    chosen_index: chosenIndex,
    time_ms: timeMs,
  });
  return response.data;
};

// Task APIs
export const createTask = async (task) => {
  const response = await api.post('/tasks', task);
  return response.data;
};

export const getTasks = async (status = null) => {
  const url = status ? `/tasks?status=${status}` : '/tasks';
  const response = await api.get(url);
  return response.data;
};

export const updateTask = async (taskId, updates) => {
  const response = await api.put(`/tasks/${taskId}`, updates);
  return response.data;
};

export const deleteTask = async (taskId) => {
  const response = await api.delete(`/tasks/${taskId}`);
  return response.data;
};

export const generateAITasks = async (prompt) => {
  const response = await api.post('/tasks/ai-generate', { prompt });
  return response.data;
};

export const getTaskSuggestions = async () => {
  const response = await api.get('/tasks/suggestions');
  return response.data;
};

// Exams APIs
export const addExam = async (name, date, notes = null) => {
  const response = await api.post('/exams', { name, date, notes });
  return response.data;
};

export const getExams = async () => {
  const response = await api.get('/exams');
  return response.data;
};

export const getUpcomingExam = async () => {
  const response = await api.get('/exams/upcoming');
  return response.data;
};

// Motivation APIs
export const getQuote = async (situation = null) => {
  const url = situation ? `/motivation/quote?situation=${situation}` : '/motivation/quote';
  const response = await api.get(url);
  return response.data;
};

export const getFact = async (category = null) => {
  const url = category ? `/motivation/fact?category=${category}` : '/motivation/fact';
  const response = await api.get(url);
  return response.data;
};

// Legacy API support (for backward compatibility)
export const getDailyQuestionsLegacy = async (userId) => {
  const response = await api.get(`/user/${userId}/daily_questions`);
  return response.data;
};

export const submitAnswerLegacy = async (userId, questionId, chosenIndex, timeMs) => {
  const response = await api.post('/user/answer', {
    user_id: userId,
    question_id: questionId,
    chosen_index: chosenIndex,
    time_ms: timeMs,
  });
  return response.data;
};

// PDF Upload & Custom Questions APIs
export const uploadPDF = async (fileUri, fileName, questionCount = 10, difficulty = 'medium') => {
  // Native: use Expo FileSystem for robust multipart upload
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    const token = await getToken();
    const url = API_URL.replace(/\/$/, '') + '/upload/pdf';
    const UploadType = (FileSystem && FileSystem.FileSystemUploadType) ? FileSystem.FileSystemUploadType : {};
    const uploadType = UploadType.MULTIPART || 'multipart';
    const uploadRes = await FileSystem.uploadAsync(url, fileUri, {
      httpMethod: 'POST',
      uploadType,
      fieldName: 'pdf',
      parameters: {
        question_count: String(questionCount),
        difficulty,
      },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (uploadRes.status >= 200 && uploadRes.status < 300) {
      try { return JSON.parse(uploadRes.body); } catch { return { success: true }; }
    }
    throw new Error(`Upload failed: ${uploadRes.status} ${uploadRes.body}`);
  }

  // Web: use FormData + Blob
  const formData = new FormData();
  const res = await fetch(fileUri);
  const blob = await res.blob();
  const name = fileName || 'upload.pdf';
  formData.append('pdf', blob, name);
  formData.append('file', blob, name);
  formData.append('question_count', String(questionCount));
  formData.append('difficulty', difficulty);
  const response = await api.post('/upload/pdf', formData);
  return response.data;
};

export const getCustomQuestions = async (count = 10, mixWithGeneral = false) => {
  const response = await api.get(`/questions/custom?count=${count}&mix_with_general=${mixWithGeneral}`);
  return response.data;
};

export const getCustomQuestionCount = async () => {
  const response = await api.get('/questions/custom/count');
  return response.data;
};

export const clearCustomQuestions = async () => {
  const response = await api.delete('/questions/custom');
  return response.data;
};

export const generateQuiz = async (config) => {
  const response = await api.post('/questions/quiz', config);
  return response.data;
};

export const getUploadStatus = async (jobId) => {
  // Use fetch to avoid axios transform/adapter quirks on RN for quick polling
  const token = await getToken();
  const url = API_URL.replace(/\/$/, '') + `/upload/status/${jobId}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Status ${res.status}: ${txt}`);
  }
  // Some environments may send text; parse carefully
  const text = await res.text();
  try { return JSON.parse(text); } catch { return {}; }
};

export default api;
