import { Platform } from 'react-native';

export const colors = {
primary: '#3B82F6',
secondary: '#8B5CF6',
accent: '#EC4899',
success: '#10B981',
warning: '#F59E0B',
error: '#EF4444',
background: '#FFFFFF',
surface: '#F9FAFB',
surfaceDark: '#F3F4F6',
text: '#1F2937',
textSecondary: '#6B7280',
textTertiary: '#9CA3AF',
border: '#E5E7EB',
borderLight: '#F3F4F6',
};

export const spacing = {
xs: 4,
sm: 8,
md: 12,
lg: 16,
xl: 24,
xxl: 32,
};

export const radius = {
sm: 4,
md: 8,
lg: 12,
xl: 16,
full: 9999,
};

export const typography = {
h1: {
fontSize: 32,
fontWeight: '700',
lineHeight: 40,
},
h2: {
fontSize: 28,
fontWeight: '700',
lineHeight: 36,
},
h3: {
fontSize: 24,
fontWeight: '600',
lineHeight: 32,
},
h4: {
fontSize: 20,
fontWeight: '600',
lineHeight: 28,
},
body: {
fontSize: 16,
fontWeight: '400',
lineHeight: 24,
},
bodyMedium: {
fontSize: 14,
fontWeight: '500',
lineHeight: 20,
},
small: {
fontSize: 12,
fontWeight: '400',
lineHeight: 16,
},
caption: {
fontSize: 11,
fontWeight: '400',
lineHeight: 14,
},
};

export const shadows = {
sm: {
...Platform.select({
ios: {
shadowColor: '#000',
shadowOffset: { width: 0, height: 1 },
shadowOpacity: 0.1,
shadowRadius: 2,
},
android: {
elevation: 2,
},
}),
},
md: {
...Platform.select({
ios: {
shadowColor: '#000',
shadowOffset: { width: 0, height: 4 },
shadowOpacity: 0.15,
shadowRadius: 8,
},
android: {
elevation: 4,
},
}),
},
lg: {
...Platform.select({
ios: {
shadowColor: '#000',
shadowOffset: { width: 0, height: 8 },
shadowOpacity: 0.2,
shadowRadius: 12,
},
android: {
elevation: 8,
},
}),
},
};
