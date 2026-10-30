import { useColorScheme } from '../../components/useColorScheme';

export function useThemeColors() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return {
    isDark,
    background: isDark ? '#000000' : '#F9FAFB',
    card: isDark ? '#121212' : '#FFFFFF',
    cardElevated: isDark ? '#1E1E1E' : '#FFFFFF',
    innerCard: isDark ? '#18181B' : '#F9FAFB',
    border: isDark ? '#27272A' : '#E5E7EB',
    text: isDark ? '#FFFFFF' : '#111827',
    subText: isDark ? '#A1A1AA' : '#6B7280',
    mutedText: isDark ? '#71717A' : '#9CA3AF',
    inputBg: isDark ? '#18181B' : '#F9FAFB',
    inputText: isDark ? '#FFFFFF' : '#111827',
    inputBorder: isDark ? '#27272A' : '#D1D5DB',
    tint: '#4F46E5',
    tabBarBg: isDark ? '#121212' : '#FFFFFF',
    headerBg: isDark ? '#121212' : '#FFFFFF',
  };
}
