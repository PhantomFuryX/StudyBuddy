export const colors = {
  primary: '#6C63FF',
  primaryDark: '#5B52E0',
  primaryLight: '#8B85FF',
  
  secondary: '#FF6B6B',
  secondaryLight: '#FF8E8E',
  
  success: '#4CAF50',
  successLight: '#81C784',
  
  warning: '#FFC107',
  warningLight: '#FFD54F',
  
  error: '#F44336',
  errorLight: '#E57373',
  
  background: '#F8F9FE',
  surface: '#FFFFFF',
  surfaceLight: '#FAFBFF',
  
  text: '#1A1A2E',
  textSecondary: '#666687',
  textLight: '#9999B3',
  
  border: '#E8E8F0',
  divider: '#F0F0F5',
  
  streak: '#FF9500',
  points: '#34C759',
  level: '#AF52DE',
  
  reasoning: '#5856D6',
  gk: '#FF9500',
  current_affairs: '#34C759',
  
  gradientPrimary: ['#6C63FF', '#8B85FF'],
  gradientSuccess: ['#4CAF50', '#81C784'],
  gradientStreak: ['#FF9500', '#FFCC00'],
  gradientLevel: ['#AF52DE', '#DA70D6'],
};

export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 999,
};

export default { colors, shadows, typography, spacing, borderRadius };
