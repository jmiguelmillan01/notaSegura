import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LegalModalProps {
  visible: boolean;
  type: 'privacy' | 'terms';
  onClose: () => void;
}

export default function LegalModal({ visible, type, onClose }: LegalModalProps) {
  const isPrivacy = type === 'privacy';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isPrivacy ? 'Política de Privacidad' : 'Términos y Condiciones'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {isPrivacy ? (
              <>
                <Text style={styles.updateDate}>Última actualización: Octubre 2026</Text>
                
                <Text style={styles.heading}>1. Información que Recopilamos</Text>
                <Text style={styles.paragraph}>
                  NotaSegura recopila información proporcionada voluntariamente por el usuario, como su nombre, correo electrónico, institución educativa, carrera, así como los datos académicos ingresados (materias, notas, tareas, calificaciones y archivos multimedia de bitácoras).
                </Text>

                <Text style={styles.heading}>2. Uso de la Información (Habeas Data)</Text>
                <Text style={styles.paragraph}>
                  Los datos recolectados se utilizan exclusivamente para la gestión académica personal del usuario, el cálculo de promedios, el funcionamiento del semáforo académico y la sincronización segura con nuestros servidores (Supabase). No compartimos ni comercializamos tu información con terceros.
                </Text>

                <Text style={styles.heading}>3. Almacenamiento y Seguridad</Text>
                <Text style={styles.paragraph}>
                  La aplicación almacena información de manera local en el dispositivo (mediante almacenamiento cifrado/seguro) y en la nube a través de Supabase con protocolos de seguridad y Row Level Security (RLS) para garantizar que solo tú accedas a tus datos.
                </Text>

                <Text style={styles.heading}>4. Eliminación de Datos</Text>
                <Text style={styles.paragraph}>
                  De conformidad con las políticas de Google Play y App Store, tienes derecho a solicitar la eliminación definitiva de tu cuenta y todos tus datos asociados en cualquier momento desde la sección de Configuración/Perfil en la aplicación.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.updateDate}>Última actualización: Octubre 2026</Text>

                <Text style={styles.heading}>1. Aceptación de los Términos</Text>
                <Text style={styles.paragraph}>
                  Al registrarte y utilizar la aplicación NotaSegura, aceptas cumplir con los presentes Términos y Condiciones. Si no estás de acuerdo con alguno de ellos, debes abstenerse de utilizar la aplicación.
                </Text>

                <Text style={styles.heading}>2. Propósito Académico</Text>
                <Text style={styles.paragraph}>
                  NotaSegura es una herramienta digital de apoyo y organización estudiantil. Los cálculos de promedios, notas requeridas y semáforos académicos son proyecciones de referencia basadas en la información ingresada por el usuario.
                </Text>

                <Text style={styles.heading}>3. Responsabilidad del Usuario</Text>
                <Text style={styles.paragraph}>
                  El usuario es responsable de la veracidad y exactitud de los datos que ingresa, así como de verificar sus calificaciones oficiales directamente con su institución educativa. NotaSegura no sustituye los registros oficiales de ninguna institución.
                </Text>

                <Text style={styles.heading}>4. Propiedad Intelectual</Text>
                <Text style={styles.paragraph}>
                  Todo el diseño, código fuente, logotipos y características de NotaSegura están protegidos por las leyes de propiedad intelectual y pertenecen a sus creadores.
                </Text>
              </>
            )}
            <View style={{ height: 20 }} />
          </ScrollView>

          <TouchableOpacity style={styles.actionButton} onPress={onClose}>
            <Text style={styles.actionButtonText}>Entendido</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    maxHeight: 450,
  },
  updateDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  heading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 14,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 8,
  },
  actionButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
