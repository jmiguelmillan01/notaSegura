import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase, isSupabaseConfigured } from '../src/services/supabase';
import { useAppStore } from '../src/store/useAppStore';
import { useThemeColors } from '../src/utils/theme';

export default function WelcomeScreen() {
  const router = useRouter();
  const fetchData = useAppStore((state) => state.fetchData);
  const setOfflineMode = useAppStore((state) => state.setOfflineMode);
  const colors = useThemeColors();
  const isDark = colors.isDark;

  const [loadingAnonymous, setLoadingAnonymous] = useState(false);

  const handleAnonymousAccess = async () => {
    try {
      setLoadingAnonymous(true);
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase.auth.signInAnonymously();
          if (!error && data?.session) {
            setOfflineMode(false);
            await fetchData();
            router.replace('/(tabs)');
            return;
          }
        } catch {
          // Continuar al modo offline local sin lanzar error
        }
      }
      // Si el acceso anónimo está deshabilitado en Supabase o estamos sin red:
      setOfflineMode(true);
      router.replace('/(tabs)');
    } catch (err: any) {
      setOfflineMode(true);
      router.replace('/(tabs)');
    } finally {
      setLoadingAnonymous(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.content}>
        {/* Logo / Branding */}
        <View style={styles.brandContainer}>
          <View style={[styles.iconCircle, isDark && { backgroundColor: '#1E1B4B' }]}>
            <Ionicons name="school" size={56} color="#4F46E5" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>NotaSegura</Text>
          <Text style={[styles.tagline, { color: colors.subText }]}>
            Tu vida académica, bajo control
          </Text>
          <Text style={[styles.description, { color: colors.mutedText }]}>
            Gestiona tus materias, calcula tus proyecciones de notas y no dejes pasar ninguna tarea o entrega importante.
          </Text>
        </View>

        {/* Acciones de Entrada */}
        <View style={styles.actionsContainer}>
          {/* Botón Iniciar Sesión */}
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={() => router.push('/login' as any)}>
            <Ionicons name="log-in-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.primaryButtonText}>Iniciar Sesión</Text>
          </TouchableOpacity>

          {/* Botón Registrarse */}
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              { backgroundColor: isDark ? '#312E81' : '#EEF2FF', borderColor: '#C7D2FE' },
            ]}
            activeOpacity={0.85}
            onPress={() => router.push('/signup' as any)}>
            <Ionicons name="person-add-outline" size={20} color="#4F46E5" style={{ marginRight: 8 }} />
            <Text style={[styles.secondaryButtonText, isDark && { color: '#A5B4FC' }]}>
              Registrarse
            </Text>
          </TouchableOpacity>

          {/* Botón Modo Offline / Anónimo */}
          <TouchableOpacity
            style={styles.anonymousButton}
            activeOpacity={0.7}
            disabled={loadingAnonymous}
            onPress={handleAnonymousAccess}>
            {loadingAnonymous ? (
              <ActivityIndicator size="small" color="#6B7280" />
            ) : (
              <Text style={[styles.anonymousText, { color: colors.subText }]}>
                Usar la app offline (Sin cuenta)
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer Info */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.mutedText }]}>
          Tus datos se guardarán de forma segura en tu teléfono y se sincronizarán al iniciar sesión.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 32,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 44,
  },
  iconCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 14,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  actionsContainer: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 15,
    borderRadius: 14,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryButtonText: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '700',
  },
  anonymousButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  anonymousText: {
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});

