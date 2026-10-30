import { useColorScheme } from '../../components/useColorScheme';

export function useThemeColors() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return {
    isDark,
    background: isDark ? '#121212' : '#F9FAFB',
    card: isDark ? '#1E1E1E' : '#FFFFFF',
    cardElevated: isDark ? '#27272A' : '#FFFFFF',
    innerCard: isDark ? '#27272A' : '#F9FAFB',
    border: isDark ? '#3F3F46' : '#E5E7EB',
    text: isDark ? '#F3F4F6' : '#111827',
    subText: isDark ? '#F3F4F6' : '#6B7280',
    mutedText: isDark ? '#D1D5DB' : '#9CA3AF',
    inputBg: isDark ? '#27272A' : '#F9FAFB',
    inputText: isDark ? '#F3F4F6' : '#111827',
    inputBorder: isDark ? '#3F3F46' : '#D1D5DB',
    tint: '#4F46E5',
    tabBarBg: isDark ? '#18181B' : '#FFFFFF',
    headerBg: isDark ? '#18181B' : '#FFFFFF',
    badgePassBg: isDark ? '#064E3B' : '#DEF7EC',
    badgePassText: isDark ? '#34D399' : '#03543F',
    badgeRiskBg: isDark ? '#78350F' : '#FEF08A',
    badgeRiskText: isDark ? '#FCD34D' : '#854D0E',
    badgeCriticalBg: isDark ? '#7F1D1D' : '#FDE8E8',
    badgeCriticalText: isDark ? '#FCA5A5' : '#9B1C1C',
  };
}
