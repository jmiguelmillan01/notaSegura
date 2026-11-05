import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/store/useAppStore';
import { supabase, isSupabaseConfigured } from '../../src/services/supabase';
import LegalModal from '../../components/LegalModal';
import { useThemeColors } from '../../src/utils/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, updateProfile, subjects, clearStore, theme, setTheme, isOfflineMode } = useAppStore();
  const colors = useThemeColors();
  const isDark = colors.isDark;

  const dynamicStyles = {
    container: { backgroundColor: colors.background },
    card: { backgroundColor: colors.card, borderColor: colors.border },
    text: { color: colors.text },
    subText: { color: colors.subText },
    input: { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.inputBorder },
    label: { color: colors.subText },
  };

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [institution, setInstitution] = useState(profile?.institution || '');
  const [major, setMajor] = useState(profile?.major || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [session, setSession] = useState<any>(null);
  const [userEmail, setUserEmail] = useState('');
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [legalModalVisible, setLegalModalVisible] = useState(false);
  const [legalType, setLegalType] = useState<'privacy' | 'terms'>('privacy');

  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    if (isSupabaseConfigured()) {
      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session);
        setIsAnonymous(Boolean(data.session?.user?.is_anonymous));
        if (data.session?.user?.email) {
          setUserEmail(data.session.user.email);
        }
      });

      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) {
          setIsAnonymous(Boolean(data.user.is_anonymous));
          if (data.user.email) {
            setUserEmail(data.user.email);
          }
        }
      });

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, sess) => {
        setSession(sess);
        setIsAnonymous(Boolean(sess?.user?.is_anonymous));
        if (sess?.user?.email) {
          setUserEmail(sess.user.email);
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  const archivedSubjectsCount = subjects.filter((s) => s.is_archived).length;

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Campo requerido', 'El nombre completo es obligatorio.');
      return;
    }

    try {
      await updateProfile({
        full_name: fullName.trim(),
        institution: institution.trim(),
        major: major.trim(),
        bio: bio.trim(),
      });
      Alert.alert('Éxito', 'Perfil actualizado correctamente.');
    } catch (err) {
      Alert.alert('Error', 'No se pudo actualizar el perfil.');
    }
  };

  const handleResetPassword = () => {
    setPasswordModalVisible(true);
  };

  const handleUpdatePasswordDirect = async () => {
    if (!newPassword.trim() || newPassword.length < 6) {
      Alert.alert('Contraseña débil', 'La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }

    try {
      setUpdatingPassword(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword.trim(),
      });

      if (error) throw error;

      Alert.alert('¡Éxito!', 'Tu contraseña ha sido actualizada correctamente.');
      setPasswordModalVisible(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo actualizar la contraseña.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Cerrar Sesión', '¿Deseas cerrar sesión en NotaSegura?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar Sesión',
        style: 'destructive',
        onPress: async () => {
          if (isSupabaseConfigured()) {
            await supabase.auth.signOut();
            setSession(null);
            setUserEmail('');
          }
          clearStore();
          router.replace('/welcome' as any);
        },
      },
    ]);
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Eliminar Cuenta Definitivamente',
      '¿Estás seguro? Esta acción es irreversible y borrará permanentemente tu cuenta y todas tus materias, tareas y notas registradas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isSupabaseConfigured() && session?.user?.id) {
                const userId = session.user.id;
                
                // 1. Intentar eliminar cuenta de usuario via RPC de Supabase (borra auth.users y cascada)
                const { error: rpcError } = await supabase.rpc('delete_user_account');
                
                if (rpcError) {
                  console.warn('RPC delete_user_account no disponible o falló:', rpcError.message);
                  // Respaldo manual: Borrar datos de las tablas públicas
                  await Promise.all([
                    supabase.from('grades').delete().eq('user_id', userId),
                    supabase.from('tasks').delete().eq('user_id', userId),
                    supabase.from('subjects').delete().eq('user_id', userId),
                    supabase.from('profiles').delete().eq('id', userId),
                  ]);
                }

                // 2. Cerrar la sesión del cliente
                await supabase.auth.signOut();
              }
              setSession(null);
              setUserEmail('');
              clearStore();
              Alert.alert('Cuenta eliminada', 'Tus datos y tu cuenta han sido eliminados correctamente.');
              router.replace('/login' as any);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'No se pudo eliminar la cuenta.');
            }
          },
        },
      ]
    );
  };

  const isOfflineUser = isAnonymous || isOfflineMode || (!session && !userEmail);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
      <ScrollView style={[styles.container, dynamicStyles.container]} contentContainerStyle={styles.contentContainer}>
        <View style={[styles.headerCard, dynamicStyles.card]}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={36} color="#4F46E5" />
          </View>
          <Text style={[styles.profileName, dynamicStyles.text]}>{fullName || 'Estudiante NotaSegura'}</Text>
          {isOfflineUser ? (
            <View style={{ marginTop: 6, backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#D97706' }}>
                ⚡ Modo temporal / offline
              </Text>
            </View>
          ) : userEmail ? (
            <Text style={[styles.profileEmail, dynamicStyles.subText]}>
              {userEmail.endsWith('@notasegura.local') ? `@${userEmail.split('@')[0]}` : userEmail}
            </Text>
          ) : null}
          {institution ? (
            <Text style={[styles.profileDetail, dynamicStyles.subText]}>{institution}</Text>
          ) : null}
          <Text style={[styles.profileDetail, dynamicStyles.subText]}>
            {major || 'Gestión Académica'}
          </Text>
        </View>

        <View style={[styles.formCard, dynamicStyles.card]}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Información Personal</Text>

          <Text style={[styles.inputLabel, dynamicStyles.label]}>Nombre Completo *</Text>
          <TextInput
            style={[styles.textInput, dynamicStyles.input]}
            placeholder="Tu nombre"
            placeholderTextColor={isDark ? '#9CA3AF' : '#9CA3AF'}
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={[styles.inputLabel, dynamicStyles.label]}>Institución Educativa / Universidad</Text>
          <TextInput
            style={[styles.textInput, dynamicStyles.input]}
            placeholder="Ej: Universidad Nacional"
            placeholderTextColor={isDark ? '#9CA3AF' : '#9CA3AF'}
            value={institution}
            onChangeText={setInstitution}
          />

          <Text style={[styles.inputLabel, dynamicStyles.label]}>Carrera / Grado</Text>
          <TextInput
            style={[styles.textInput, dynamicStyles.input]}
            placeholder="Ej: Ingeniería de Sistemas"
            placeholderTextColor={isDark ? '#9CA3AF' : '#9CA3AF'}
            value={major}
            onChangeText={setMajor}
          />

          <Text style={[styles.inputLabel, dynamicStyles.label]}>Biografía / Metas Académicas</Text>
          <TextInput
            style={[styles.textInput, styles.textArea, dynamicStyles.input]}
            placeholder="Ej: Mantener promedio superior a 4.0 este semestre..."
            placeholderTextColor={isDark ? '#9CA3AF' : '#9CA3AF'}
            multiline
            numberOfLines={3}
            value={bio}
            onChangeText={setBio}
          />

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Guardar Cambios</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.actionsCard, dynamicStyles.card]}>
          <View style={styles.actionRowInfo}>
            <Ionicons name="archive-outline" size={20} color={isDark ? '#9CA3AF' : '#4B5563'} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={[styles.actionTitle, dynamicStyles.text]}>Historial de Materias</Text>
              <Text style={[styles.actionSub, dynamicStyles.subText]}>
                {archivedSubjectsCount} materia(s) archivada(s) en la papelera
              </Text>
            </View>
          </View>

          {isOfflineUser ? (
            <View style={{ gap: 10, marginTop: 4 }}>
              <View style={{ backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF', padding: 14, borderRadius: 12, marginBottom: 4, borderWidth: 1, borderColor: '#C7D2FE' }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#A5B4FC' : '#4338CA', marginBottom: 4 }}>
                  Estás usando una cuenta temporal/offline
                </Text>
                <Text style={{ fontSize: 13, color: isDark ? '#D1D5DB' : '#4B5563', lineHeight: 18 }}>
                  Crea tu cuenta permanente para proteger tus materias y notas en la nube y no perder nada.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.signUpBtn}
                onPress={() => router.push('/signup' as any)}>
                <Ionicons name="person-add-outline" size={18} color="#4F46E5" />
                <Text style={styles.signUpText}>Crear cuenta permanente</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.signInBtn}
                onPress={() => router.push('/login' as any)}>
                <Ionicons name="log-in-outline" size={18} color="#FFFFFF" />
                <Text style={styles.signInText}>Iniciar Sesión</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.signOutButton, { backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2', borderColor: isDark ? '#DC2626' : 'transparent', borderWidth: isDark ? 1 : 0, marginTop: 6 }]}
                onPress={handleSignOut}>
                <Ionicons name="log-out-outline" size={18} color={isDark ? '#FFFFFF' : '#DC2626'} />
                <Text style={[styles.signOutText, isDark && { color: '#FFFFFF' }]}>Salir de Modo Temporal</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {isSupabaseConfigured() && (
                <>
                  <TouchableOpacity style={[styles.resetPasswordBtn, { backgroundColor: isDark ? '#3F3F46' : '#EEF2FF', borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]} onPress={handleResetPassword}>
                    <Ionicons name="key-outline" size={18} color={isDark ? '#F3F4F6' : '#4F46E5'} />
                    <Text style={[styles.resetPasswordText, { color: isDark ? '#F3F4F6' : '#4F46E5' }]}>Cambiar Contraseña</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.deleteAccountButton, { backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2', borderColor: isDark ? '#DC2626' : 'transparent', borderWidth: isDark ? 1 : 0 }]} onPress={handleDeleteAccount}>
                    <Ionicons name="trash-outline" size={18} color={isDark ? '#FFFFFF' : '#DC2626'} />
                    <Text style={[styles.deleteAccountText, isDark && { color: '#FFFFFF' }]}>Eliminar Cuenta Definitivamente</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity style={[styles.signOutButton, { backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2', borderColor: isDark ? '#DC2626' : 'transparent', borderWidth: isDark ? 1 : 0 }]} onPress={handleSignOut}>
                <Ionicons name="log-out-outline" size={18} color={isDark ? '#FFFFFF' : '#DC2626'} />
                <Text style={[styles.signOutText, isDark && { color: '#FFFFFF' }]}>Cerrar Sesión</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={[styles.actionsCard, dynamicStyles.card]}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Apariencia</Text>
          <View style={styles.themeRow}>
            <TouchableOpacity
              style={[styles.themeBtn, { backgroundColor: isDark ? '#3F3F46' : '#EEF2FF', borderColor: colors.border, borderWidth: isDark ? 1 : 0 }, theme === 'light' && styles.themeBtnActive]}
              onPress={() => setTheme('light')}>
              <Ionicons name="sunny" size={18} color={theme === 'light' ? '#FFFFFF' : (isDark ? '#F3F4F6' : '#4F46E5')} />
              <Text style={[styles.themeBtnText, { color: isDark ? '#F3F4F6' : '#4F46E5' }, theme === 'light' && styles.themeBtnTextActive]}>Claro</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.themeBtn, { backgroundColor: isDark ? '#3F3F46' : '#EEF2FF', borderColor: colors.border, borderWidth: isDark ? 1 : 0 }, theme === 'dark' && styles.themeBtnActive]}
              onPress={() => setTheme('dark')}>
              <Ionicons name="moon" size={18} color={theme === 'dark' ? '#FFFFFF' : (isDark ? '#F3F4F6' : '#4F46E5')} />
              <Text style={[styles.themeBtnText, { color: isDark ? '#F3F4F6' : '#4F46E5' }, theme === 'dark' && styles.themeBtnTextActive]}>Oscuro</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.themeBtn, { backgroundColor: isDark ? '#3F3F46' : '#EEF2FF', borderColor: colors.border, borderWidth: isDark ? 1 : 0 }, theme === 'system' && styles.themeBtnActive]}
              onPress={() => setTheme('system')}>
              <Ionicons name="phone-portrait" size={18} color={theme === 'system' ? '#FFFFFF' : (isDark ? '#F3F4F6' : '#4F46E5')} />
              <Text style={[styles.themeBtnText, { color: isDark ? '#F3F4F6' : '#4F46E5' }, theme === 'system' && styles.themeBtnTextActive]}>Sistema</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.actionsCard, dynamicStyles.card, { marginBottom: 40 }]}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Acerca de</Text>
          <TouchableOpacity style={styles.aboutRow} onPress={() => { setLegalType('terms'); setLegalModalVisible(true); }}>
            <Ionicons name="document-text-outline" size={20} color={isDark ? '#9CA3AF' : '#4B5563'} />
            <Text style={[styles.aboutText, dynamicStyles.text]}>Términos y Condiciones</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.aboutRow} onPress={() => { setLegalType('privacy'); setLegalModalVisible(true); }}>
            <Ionicons name="shield-checkmark-outline" size={20} color={isDark ? '#9CA3AF' : '#4B5563'} />
            <Text style={[styles.aboutText, dynamicStyles.text]}>Política de Privacidad</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
          </TouchableOpacity>
          <View style={styles.versionContainer}>
            <Text style={styles.versionText}>NotaSegura v1.0.0</Text>
          </View>
        </View>
      </ScrollView>

      <Modal visible={passwordModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, dynamicStyles.card]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, dynamicStyles.text]}>Cambiar Contraseña</Text>
              <TouchableOpacity onPress={() => setPasswordModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.subText} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, dynamicStyles.label]}>Nueva Contraseña (mínimo 6 caracteres)</Text>
            <TextInput
              style={[styles.textInput, dynamicStyles.input]}
              placeholder="••••••••"
              placeholderTextColor={colors.mutedText}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <Text style={[styles.inputLabel, dynamicStyles.label]}>Confirmar Nueva Contraseña</Text>
            <TextInput
              style={[styles.textInput, dynamicStyles.input]}
              placeholder="••••••••"
              placeholderTextColor={colors.mutedText}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <TouchableOpacity
              style={[styles.saveButton, updatingPassword && { opacity: 0.7 }]}
              onPress={handleUpdatePasswordDirect}
              disabled={updatingPassword}>
              <Text style={styles.saveButtonText}>
                {updatingPassword ? 'Actualizando...' : 'Guardar Nueva Contraseña'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  headerCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    marginBottom: 4,
  },
  profileDetail: {
    fontSize: 13,
    opacity: 0.8,
  },
  formCard: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#4F46E5',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  actionsCard: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
  },
  actionRowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  actionSub: {
    fontSize: 12,
  },
  signUpBtn: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  signUpText: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  signInBtn: {
    flexDirection: 'row',
    backgroundColor: '#4F46E5',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  signInText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  signOutButton: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  signOutText: {
    color: '#DC2626',
    fontWeight: '700',
  },
  resetPasswordBtn: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  resetPasswordText: {
    fontWeight: '700',
  },
  deleteAccountButton: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteAccountText: {
    color: '#DC2626',
    fontWeight: '700',
  },
  themeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  themeBtn: {
    flex: 1,
    flexDirection: 'row',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  themeBtnActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  themeBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  themeBtnTextActive: {
    color: '#FFFFFF',
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  aboutText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  versionContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
});
