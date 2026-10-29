import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase, isSupabaseConfigured } from '../src/services/supabase';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isSupabaseConfigured()) {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user?.email) {
          setEmail(data.session.user.email);
        }
      });
    }
  }, []);

  const handleVerifyAndReset = async () => {
    if (!email.trim() || !token.trim() || !password.trim()) {
      Alert.alert('Campos requeridos', 'Por favor ingresa tu correo, el código de verificación y la nueva contraseña.');
      return;
    }

    if (token.length < 6) {
      Alert.alert('Código inválido', 'El código de verificación debe tener 6 dígitos.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Contraseña débil', 'La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      setLoading(true);
      // Paso 2: Verificar OTP
      const { error: otpError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: token.trim(),
        type: 'recovery',
      });

      if (otpError) {
        Alert.alert('Error de verificación', otpError.message);
        return;
      }

      // Paso 3: Actualizar Contraseña
      const { error: updateError } = await supabase.auth.updateUser({
        password: password.trim(),
      });

      if (updateError) {
        Alert.alert('Error al actualizar', updateError.message);
        return;
      }

      Alert.alert('¡Éxito!', 'Tu contraseña ha sido actualizada correctamente.', [
        { text: 'Ir al Inicio', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Ionicons name="key" size={40} color="#4F46E5" />
        </View>
        <Text style={styles.title}>Recuperar Contraseña</Text>
        <Text style={styles.subtitle}>
          Ingresa el código de 6 dígitos que recibiste en tu correo y tu nueva contraseña.
        </Text>

        <Text style={styles.label}>Correo Electrónico</Text>
        <TextInput
          style={styles.input}
          placeholder="tu@correo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Código de Verificación (6 dígitos)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 123456"
          keyboardType="number-pad"
          maxLength={6}
          value={token}
          onChangeText={setToken}
        />

        <Text style={styles.label}>Nueva Contraseña (mínimo 6 caracteres)</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={handleVerifyAndReset}
          disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Verificando...' : 'Cambiar Contraseña'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  label: {
    alignSelf: 'flex-start',
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#111827',
    width: '100%',
    marginBottom: 14,
  },
  button: {
    backgroundColor: '#4F46E5',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
