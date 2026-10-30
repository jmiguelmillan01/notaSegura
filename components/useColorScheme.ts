import { useColorScheme as useColorSchemeCore } from 'react-native';
import { useAppStore } from '../src/store/useAppStore';

export const useColorScheme = () => {
  const coreScheme = useColorSchemeCore();
  const theme = useAppStore((state) => state.theme);

  if (theme === 'dark') return 'dark';
  if (theme === 'light') return 'light';
  return coreScheme === 'dark' ? 'dark' : 'light';
};
