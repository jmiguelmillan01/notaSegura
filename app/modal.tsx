import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { isSupabaseConfigured } from '../src/services/supabase';

export default function ModalScreen() {
  const isCloudConnected = isSupabaseConfigured();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Ionicons name="school" size={48} color="#4F46E5" />
        <Text style={styles.title}>NotaSegura (MVP)</Text>
        <Text style={styles.subtitle}>Gestor Académico Inteligente</Text>
      </View>

      {/* Estado del Backend */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Conexión Supabase</Text>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isCloudConnected ? '#10B981' : '#F59E0B' },
            ]}
          />
          <Text style={styles.statusText}>
            {isCloudConnected
              ? 'Conectado a la nube de Supabase'
              : 'Modo Local / Demo activo (Sin conexión Supabase configurada aún)'}
          </Text>
        </View>
        <Text style={styles.cardHelp}>
          Para enlazar tu base de datos Supabase, copia tus claves del proyecto en un archivo{' '}
          <Text style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>.env</Text> con:{'\n'}
          EXPO_PUBLIC_SUPABASE_URL=...{'\n'}
          EXPO_PUBLIC_SUPABASE_ANON_KEY=...
        </Text>
      </View>

      {/* Casos de Uso Implementados */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Módulos Activos</Text>

        <View style={styles.moduleItem}>
          <Ionicons name="document-text" size={20} color="#4F46E5" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.moduleName}>CU-01: Bitácora de Clase</Text>
            <Text style={styles.moduleDesc}>
              Registro de apuntes rápidos al terminar la clase y adjuntos multimedia (foto del pizarrón).
            </Text>
          </View>
        </View>

        <View style={styles.moduleItem}>
          <Ionicons name="notifications" size={20} color="#D97706" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.moduleName}>CU-02: Alertas Inteligentes</Text>
            <Text style={styles.moduleDesc}>
              Cálculo de recordatorios automáticos según prioridad (Alta: 7, 3 y 1d; Media: 3 y 1d; Baja: 1d).
            </Text>
          </View>
        </View>

        <View style={styles.moduleItem}>
          <Ionicons name="calculator" size={20} color="#059669" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.moduleName}>CU-03: Calculadora y Proyección de Notas</Text>
            <Text style={styles.moduleDesc}>
              Cálculo en tiempo real de la nota promedio requerida en lo restante para aprobar el semestre.
            </Text>
          </View>
        </View>
      </View>

      <StatusBar style="auto" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginVertical: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  cardHelp: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    marginTop: 6,
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 8,
  },
  moduleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
  },
  moduleName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  moduleDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 16,
  },
});
