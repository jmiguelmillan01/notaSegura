import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase, isSupabaseConfigured } from '../src/services/supabase';
import { useAppStore } from '../src/store/useAppStore';
import { useThemeColors } from '../src/utils/theme';

export default function LoginScreen() {
  const router = useRouter();
  const fetchData = useAppStore((state) => state.fetchData);
  const clearStore = useAppStore((state) => state.clearStore);
  const colors = useThemeColors();
  const isDark = colors.isDark;

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!usernameOrEmail.trim() || !password.trim()) {
      Alert.alert('Campos requeridos', 'Por favor ingresa tu usuario y contraseña.');
      return;
    }

    if (!isSupabaseConfigured()) {
      Alert.alert('Supabase no configurado', 'Configura tus variables de entorno en el archivo .env para iniciar sesión.');
      return;
    }

    try {
      setLoading(true);

      const cleanInput = usernameOrEmail.trim().toLowerCase().replace(/\s+/g, '');
      const authEmail = cleanInput.includes('@') ? cleanInput : `${cleanInput}@notasegura.local`;

      const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          Alert.alert('Error de inicio de sesión', 'Usuario o contraseña incorrectos. Verifica tus datos.');
        } else {
          Alert.alert('Error al iniciar sesión', error.message);
        }
        return;
      }

      if (data.session) {
        clearStore();
        await fetchData();
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <View style={[styles.iconContainer, isDark && { backgroundColor: '#1E1B4B' }]}>
            <Ionicons name="school" size={40} color="#4F46E5" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>¡Bienvenido de nuevo!</Text>
          <Text style={[styles.subtitle, { color: colors.subText }]}>
            Inicia sesión con tu usuario y contraseña para sincronizar tu progreso
          </Text>
        </View>

        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.subText }]}>Usuario o Correo Electrónico</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.inputBorder }]}
            placeholder="Ej: juan123 o tu@correo.com"
            placeholderTextColor={colors.mutedText}
            autoCapitalize="none"
            autoCorrect={false}
            value={usernameOrEmail}
            onChangeText={setUsernameOrEmail}
          />

          <Text style={[styles.label, { color: colors.subText }]}>Contraseña</Text>
          <View style={[styles.passwordContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
            <TextInput
              style={[styles.passwordInput, { color: colors.inputText }]}
              placeholder="••••••••"
              placeholderTextColor={colors.mutedText}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.subText} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}</Text>
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: colors.subText }]}>¿No tienes una cuenta?</Text>
            <TouchableOpacity onPress={() => router.push('/signup' as any)}>
              <Text style={styles.linkText}> Regístrate</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/(tabs)')}>
            <Text style={[styles.backButtonText, { color: colors.subText }]}>Continuar sin iniciar sesión (Modo Local)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#111827',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
  },
  eyeBtn: {
    padding: 6,
  },
  button: {
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  linkText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4F46E5',
  },
  backButton: {
    alignItems: 'center',
    marginTop: 16,
    padding: 8,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
});
