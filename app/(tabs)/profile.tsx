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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/store/useAppStore';
import { supabase, isSupabaseConfigured } from '../../src/services/supabase';
import LegalModal from '../../components/LegalModal';
import { useColorScheme } from '../../components/useColorScheme';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, updateProfile, subjects, clearStore, theme, setTheme } = useAppStore();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const dynamicStyles = {
    container: { backgroundColor: isDark ? '#111827' : '#F9FAFB' },
    card: { backgroundColor: isDark ? '#1F2937' : '#FFFFFF', borderColor: isDark ? '#374151' : '#E5E7EB' },
    text: { color: isDark ? '#F9FAFB' : '#111827' },
    subText: { color: isDark ? '#9CA3AF' : '#6B7280' },
    input: { backgroundColor: isDark ? '#374151' : '#F9FAFB', color: isDark ? '#FFFFFF' : '#111827', borderColor: isDark ? '#4B5563' : '#D1D5DB' },
    label: { color: isDark ? '#D1D5DB' : '#374151' },
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

  useEffect(() => {
    if (isSupabaseConfigured()) {
      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session);
        if (data.session?.user?.email) {
          setUserEmail(data.session.user.email);
        }
      });

      supabase.auth.getUser().then(({ data }) => {
        if (data?.user?.email) {
          setUserEmail(data.user.email);
        }
      });

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, sess) => {
        setSession(sess);
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
      Alert.alert('Campo requerido', 'Por favor ingresa tu nombre.');
      return;
    }

    await updateProfile({
      full_name: fullName.trim(),
      institution: institution.trim() || undefined,
      major: major.trim() || undefined,
      bio: bio.trim() || undefined,
    });

    Alert.alert('Guardado', 'Tu información de perfil ha sido actualizada.');
  };

  const handleResetPassword = () => {
    if (!userEmail) {
      Alert.alert('No disponible', 'No hay un correo electrónico asociado a esta sesión.');
      return;
    }
    setNewPassword('');
    setConfirmPassword('');
    setPasswordModalVisible(true);
  };

  const handleUpdatePasswordDirect = async () => {
    if (!newPassword.trim() || newPassword.length < 6) {
      Alert.alert('Contraseña débil', 'La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('No coinciden', 'Las contraseñas no coinciden.');
      return;
    }

    try {
      setUpdatingPassword(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword.trim(),
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert('¡Éxito!', 'Tu contraseña ha sido actualizada correctamente.');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Ocurrió un error inesperado.');
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
          Alert.alert('Sesión cerrada', 'Has cerrado sesión correctamente.');
        },
      },
    ]);
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Eliminar Cuenta Definitivamente',
      '¿Estás seguro? Esta acción es irreversible y borrará permanentemente todas tus materias, tareas y notas registradas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isSupabaseConfigured() && session?.user?.id) {
                await supabase.from('profiles').delete().eq('id', session.user.id);
                await supabase.auth.signOut();
              }
              clearStore();
              Alert.alert('Cuenta eliminada', 'Tus datos han sido eliminados correctamente.');
              router.replace('/login' as any);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'No se pudo eliminar la cuenta.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, dynamicStyles.container]} contentContainerStyle={styles.contentContainer}>
      <View style={[styles.headerCard, dynamicStyles.card]}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={36} color="#4F46E5" />
        </View>
        <Text style={[styles.profileName, dynamicStyles.text]}>{fullName || 'Estudiante NotaSegura'}</Text>
        <Text style={[styles.profileEmail, dynamicStyles.subText]}>
          {userEmail ? `${userEmail} • ` : ''}{institution ? `${institution} • ` : ''}{major || 'Gestión Académica'}
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

        {isSupabaseConfigured() && !session ? (
          <View style={{ gap: 10, marginTop: 4 }}>
            <Text style={{ fontSize: 13, color: isDark ? '#9CA3AF' : '#6B7280', textAlign: 'center', marginBottom: 4 }}>
              Inicia sesión o regístrate para sincronizar tus datos en Supabase.
            </Text>
            <TouchableOpacity
              style={styles.signInBtn}
              onPress={() => router.push('/login' as any)}>
              <Ionicons name="log-in-outline" size={18} color="#FFFFFF" />
              <Text style={styles.signInText}>Iniciar Sesión</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.signUpBtn}
              onPress={() => router.push('/signup' as any)}>
              <Ionicons name="person-add-outline" size={18} color="#4F46E5" />
              <Text style={styles.signUpText}>Registrarse</Text>
            </TouchableOpacity>
          </View>
         ) : (
           <View style={{ gap: 10 }}>
             {isSupabaseConfigured() && (
               <>
                 <TouchableOpacity style={styles.resetPasswordBtn} onPress={handleResetPassword}>
                   <Ionicons name="key-outline" size={18} color="#4F46E5" />
                   <Text style={styles.resetPasswordText}>Cambiar Contraseña</Text>
                 </TouchableOpacity>
                 <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount}>
                   <Ionicons name="trash-outline" size={18} color="#DC2626" />
                   <Text style={styles.deleteAccountText}>Eliminar Cuenta Definitivamente</Text>
                 </TouchableOpacity>
               </>
             )}
             <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
               <Ionicons name="log-out-outline" size={18} color="#DC2626" />
               <Text style={styles.signOutText}>Cerrar Sesión</Text>
             </TouchableOpacity>
           </View>
         )}
       </View>

       <View style={[styles.actionsCard, dynamicStyles.card]}>
         <Text style={[styles.sectionTitle, dynamicStyles.text]}>Apariencia</Text>
         <View style={styles.themeRow}>
           <TouchableOpacity
             style={[styles.themeBtn, theme === 'light' && styles.themeBtnActive]}
             onPress={() => setTheme('light')}>
             <Ionicons name="sunny" size={18} color={theme === 'light' ? '#FFFFFF' : '#4F46E5'} />
             <Text style={[styles.themeBtnText, theme === 'light' && styles.themeBtnTextActive]}>Claro</Text>
           </TouchableOpacity>
           <TouchableOpacity
             style={[styles.themeBtn, theme === 'dark' && styles.themeBtnActive]}
             onPress={() => setTheme('dark')}>
             <Ionicons name="moon" size={18} color={theme === 'dark' ? '#FFFFFF' : '#4F46E5'} />
             <Text style={[styles.themeBtnText, theme === 'dark' && styles.themeBtnTextActive]}>Oscuro</Text>
           </TouchableOpacity>
           <TouchableOpacity
             style={[styles.themeBtn, theme === 'system' && styles.themeBtnActive]}
             onPress={() => setTheme('system')}>
             <Ionicons name="phone-portrait" size={18} color={theme === 'system' ? '#FFFFFF' : '#4F46E5'} />
             <Text style={[styles.themeBtnText, theme === 'system' && styles.themeBtnTextActive]}>Sistema</Text>
           </TouchableOpacity>
         </View>
       </View>

       <View style={[styles.actionsCard, dynamicStyles.card]}>
         <Text style={[styles.sectionTitle, dynamicStyles.text]}>Legal e Información</Text>
         <TouchableOpacity
           style={styles.legalButton}
           onPress={() => {
             setLegalType('privacy');
             setLegalModalVisible(true);
           }}>
           <Ionicons name="shield-checkmark-outline" size={18} color="#4F46E5" />
           <Text style={styles.legalButtonText}>Ver Política de Privacidad</Text>
         </TouchableOpacity>
         <TouchableOpacity
           style={styles.legalButton}
           onPress={() => {
             setLegalType('terms');
             setLegalModalVisible(true);
           }}>
           <Ionicons name="document-text-outline" size={18} color="#4F46E5" />
           <Text style={styles.legalButtonText}>Ver Términos y Condiciones</Text>
         </TouchableOpacity>
         <Text style={[styles.disclaimerText, dynamicStyles.subText]}>
           Nota: Los cálculos del semáforo académico son proyecciones de referencia. El usuario es responsable de verificar sus notas oficiales con la institución.
         </Text>
       </View>

      <Modal visible={passwordModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cambiar Contraseña</Text>
              <TouchableOpacity onPress={() => setPasswordModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Nueva Contraseña (mínimo 6 caracteres)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="••••••••"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <Text style={styles.inputLabel}>Confirmar Nueva Contraseña</Text>
            <TextInput
              style={styles.textInput}
              placeholder="••••••••"
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
      <LegalModal
        visible={legalModalVisible}
        type={legalType}
        onClose={() => setLegalModalVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
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
    color: '#111827',
  },
  profileEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#111827',
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 16,
  },
  actionRowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  actionSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  signInText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  signUpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  signUpText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4F46E5',
  },
  resetPasswordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  resetPasswordText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4F46E5',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
   modalTitle: {
     fontSize: 18,
     fontWeight: '700',
     color: '#111827',
   },
   deleteAccountButton: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'center',
     backgroundColor: '#FEE2E2',
     paddingVertical: 12,
     borderRadius: 12,
     gap: 8,
   },
   deleteAccountText: {
     fontSize: 14,
     fontWeight: '700',
     color: '#DC2626',
   },
   legalButton: {
     flexDirection: 'row',
     alignItems: 'center',
     backgroundColor: '#EEF2FF',
     paddingVertical: 12,
     paddingHorizontal: 16,
     borderRadius: 12,
     gap: 10,
     marginBottom: 10,
   },
   legalButtonText: {
     fontSize: 14,
     fontWeight: '600',
     color: '#4F46E5',
   },
    disclaimerText: {
      fontSize: 12,
      color: '#6B7280',
      lineHeight: 16,
      marginTop: 4,
    },
    themeRow: {
      flexDirection: 'row',
      gap: 10,
    },
    themeBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#EEF2FF',
      paddingVertical: 12,
      borderRadius: 12,
      gap: 6,
    },
    themeBtnActive: {
      backgroundColor: '#4F46E5',
    },
    themeBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#4F46E5',
    },
    themeBtnTextActive: {
      color: '#FFFFFF',
    },
  });
