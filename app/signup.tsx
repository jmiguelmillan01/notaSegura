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
import LegalModal from '../components/LegalModal';

export default function SignupScreen() {
  const router = useRouter();
  const fetchData = useAppStore((state) => state.fetchData);
  const syncLocalDataToUser = useAppStore((state) => state.syncLocalDataToUser);
  const clearStore = useAppStore((state) => state.clearStore);
  const colors = useThemeColors();
  const isDark = colors.isDark;

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [legalModalVisible, setLegalModalVisible] = useState(false);
  const [legalType, setLegalType] = useState<'privacy' | 'terms'>('privacy');

  const handleSignup = async () => {
    if (!fullName.trim() || !username.trim() || !password.trim()) {
      Alert.alert('Campos requeridos', 'Por favor completa todos los campos.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Contraseña débil', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (!acceptedTerms) {
      Alert.alert('Términos requeridos', 'Debes aceptar los Términos y Condiciones y la Política de Privacidad para registrarte.');
      return;
    }

    if (!isSupabaseConfigured()) {
      Alert.alert('Supabase no configurado', 'Configura tus variables de entorno en el archivo .env para registrarte.');
      return;
    }

    try {
      setLoading(true);

      // Normalizar el nombre de usuario a correo interno si no incluye @
      const cleanUser = username.trim().toLowerCase().replace(/\s+/g, '');
      const authEmail = cleanUser.includes('@') ? cleanUser : `${cleanUser}@notasegura.local`;

      // 1. Crear usuario en Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: authEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            username: cleanUser,
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('unique')) {
          Alert.alert('Usuario existente', 'Este usuario o correo ya está registrado. Intenta con otro nombre de usuario.');
        } else {
          Alert.alert('Error al registrarse', error.message);
        }
        return;
      }

      // Si no inició sesión automáticamente por confirmación de email, forzar inicio de sesión
      let session = data.session;
      if (!session) {
        const loginRes = await supabase.auth.signInWithPassword({
          email: authEmail,
          password,
        });
        session = loginRes.data.session;
      }

      clearStore();
      await syncLocalDataToUser();
      await fetchData();

      Alert.alert('¡Bienvenido!', 'Tu cuenta ha sido creada exitosamente.', [
        {
          text: 'Continuar',
          onPress: () => router.replace('/(tabs)'),
        },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Ocurrió un error inesperado al registrarse.');
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
            <Ionicons name="person-add" size={40} color="#4F46E5" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Crea tu cuenta</Text>
          <Text style={[styles.subtitle, { color: colors.subText }]}>
            Elige un usuario y contraseña para ingresar sin complicaciones
          </Text>
        </View>

        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.subText }]}>Nombre Completo *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.inputBorder }]}
            placeholder="Ej: Juan Pérez"
            placeholderTextColor={colors.mutedText}
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={[styles.label, { color: colors.subText }]}>Nombre de Usuario *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.inputBorder }]}
            placeholder="Ej: juan123 o tu_usuario"
            placeholderTextColor={colors.mutedText}
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
          />

          <Text style={[styles.label, { color: colors.subText }]}>Contraseña (mínimo 6 caracteres) *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.inputBorder }]}
            placeholder="••••••••"
            placeholderTextColor={colors.mutedText}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <View style={styles.termsRow}>
            <TouchableOpacity
              style={[styles.checkbox, acceptedTerms && styles.checkboxChecked, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }, acceptedTerms && styles.checkboxCheckedOverride]}
              onPress={() => setAcceptedTerms(!acceptedTerms)}>
              {acceptedTerms && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </TouchableOpacity>
            <Text style={[styles.termsText, { color: colors.subText }]}>
              Acepto los{' '}
              <Text
                style={styles.termsLink}
                onPress={() => {
                  setLegalType('terms');
                  setLegalModalVisible(true);
                }}>
                Términos y Condiciones
              </Text>{' '}
              y la{' '}
              <Text
                style={styles.termsLink}
                onPress={() => {
                  setLegalType('privacy');
                  setLegalModalVisible(true);
                }}>
                Política de Privacidad
              </Text>
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, (loading || !acceptedTerms) && { opacity: 0.7 }]}
            onPress={handleSignup}
            disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Creando cuenta...' : 'Crear Cuenta'}</Text>
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: colors.subText }]}>¿Ya tienes cuenta?</Text>
            <TouchableOpacity onPress={() => router.push('/login' as any)}>
              <Text style={styles.linkText}> Inicia Sesión</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/(tabs)')}>
            <Text style={[styles.backButtonText, { color: colors.subText }]}>Continuar sin registrarse (Modo Local)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <LegalModal
        visible={legalModalVisible}
        type={legalType}
        onClose={() => setLegalModalVisible(false)}
      />
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
    lineHeight: 20,
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
    color: '#4F46E5',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  checkboxCheckedOverride: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  termsText: {
    fontSize: 13,
    color: '#4F46E5',
    flex: 1,
    lineHeight: 18,
  },
  termsLink: {
    color: '#4F46E5',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
