import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/store/useAppStore';
import { calculateSubjectGrades } from '../../src/services/gradesCalculator';
import { useThemeColors } from '../../src/utils/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { subjects, grades, tasks, profile, toggleTaskCompleted } = useAppStore();
  const colors = useThemeColors();
  const isDark = colors.isDark;

  const userName = profile?.full_name?.split(' ')[0] || 'Estudiante';

  const activeSubjects = subjects.filter((s) => !s.is_archived);

  // Calcular métricas globales
  const pendingTasks = tasks.filter((t) => !t.is_completed);
  const urgentTasks = pendingTasks
    .filter((t) => t.priority === 'high' || t.priority === 'medium')
    .slice(0, 3);

  // Calcular simulaciones para cada materia
  const subjectSimulations = activeSubjects.map((sub) => {
    const subGrades = grades.filter((g) => g.subject_id === sub.id);
    return {
      subject: sub,
      sim: calculateSubjectGrades(sub, subGrades),
    };
  });

  const subjectsAtRisk = subjectSimulations.filter(
    (item) => item.sim.status === 'at_risk' || item.sim.status === 'impossible'
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.contentContainer}>
      {/* Saludo y Encabezado */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greetingTitle, { color: colors.text }]}>¡Hola, {userName}! 👋</Text>
          <Text style={[styles.greetingSubtitle, { color: colors.subText }]}>Tu semestre bajo control en NotaSegura</Text>
        </View>
      </View>

      {/* Tarjeta Resumen General */}
      <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{activeSubjects.length}</Text>
          <Text style={[styles.summaryLabel, { color: colors.subText }]}>Materias</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#D97706' }]}>
            {pendingTasks.length}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.subText }]}>Pendientes</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <Text
            style={[
              styles.summaryValue,
              subjectsAtRisk.length > 0 ? { color: '#DC2626' } : { color: '#059669' },
            ]}>
            {subjectsAtRisk.length}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.subText }]}>En Riesgo</Text>
        </View>
      </View>

      {/* Acciones Rápidas */}
      <View style={styles.quickActionsRow}>
        <TouchableOpacity
          style={[styles.quickActionBtn, { backgroundColor: '#4F46E5' }]}
          onPress={() => router.push('/(tabs)/tasks')}>
          <Ionicons name="create-outline" size={20} color="#FFFFFF" />
          <Text style={styles.quickActionText}>Nueva Bitácora</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickActionBtn, { backgroundColor: '#0284C7' }]}
          onPress={() => router.push('/(tabs)/subjects')}>
          <Ionicons name="calculator-outline" size={20} color="#FFFFFF" />
          <Text style={styles.quickActionText}>Calcular Notas</Text>
        </TouchableOpacity>
      </View>

      {/* Alerta de materias que requieren atención (CU-03) */}
      {subjectsAtRisk.length > 0 && (
        <View style={[styles.alertBanner, {
          backgroundColor: isDark ? colors.card : '#FEF3C7',
          borderColor: isDark ? '#D97706' : '#FDE68A',
          borderLeftWidth: isDark ? 4 : 1,
        }]}>
          <Ionicons name="warning" size={20} color={isDark ? '#FCD34D' : '#B45309'} style={{ marginRight: 8 }} />
          <Text style={[styles.alertBannerText, { color: isDark ? '#FDE68A' : '#92400E' }]}>
            Tienes {subjectsAtRisk.length} materia(s) que requieren mayor atención para asegurar la nota mínima aprobatoria.
          </Text>
        </View>
      )}

      {/* Tareas Urgentes y Próximas (CU-02) */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Entregas y Alertas Próximas</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/tasks')}>
          <Text style={styles.seeAllText}>Ver todas ({pendingTasks.length})</Text>
        </TouchableOpacity>
      </View>

      {urgentTasks.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="checkmark-done" size={28} color="#10B981" />
          <Text style={[styles.emptyCardText, { color: colors.subText }]}>¡Estás al día! No tienes tareas urgentes pendientes.</Text>
        </View>
      ) : (
        urgentTasks.map((t) => {
          const sub = subjects.find((s) => s.id === t.subject_id);
          const dueDateFormatted = new Date(t.due_date).toLocaleDateString('es-ES', {
            month: 'short',
            day: 'numeric',
          });
          return (
            <View key={t.id} style={[styles.urgentTaskCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity
                style={styles.checkBtn}
                onPress={() => toggleTaskCompleted(t.id)}>
                <Ionicons name="square-outline" size={20} color={colors.subText} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {sub && (
                    <Text style={[styles.taskSubName, { color: sub.color }]}>
                      {sub.name}
                    </Text>
                  )}
                  <View
                    style={[
                      styles.priorityPill,
                      t.priority === 'high' ? styles.priorityHigh : styles.priorityMed,
                    ]}>
                    <Text
                      style={[
                        styles.priorityPillText,
                        t.priority === 'high'
                          ? { color: '#DC2626' }
                          : { color: '#D97706' },
                      ]}>
                      {t.priority === 'high' ? 'Alta' : 'Media'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.urgentTaskTitle, { color: colors.text }]}>{t.title}</Text>
                <Text style={[styles.urgentTaskDue, { color: colors.subText }]}>Vence: {dueDateFormatted}</Text>
              </View>
            </View>
          );
        })
      )}

      {/* Semáforo de Materias (CU-03) */}
      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Semáforo Académico</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/subjects')}>
          <Text style={styles.seeAllText}>Ir a calculadora</Text>
        </TouchableOpacity>
      </View>

      {subjectSimulations.map(({ subject, sim }) => {
        return (
          <TouchableOpacity
            key={subject.id}
            style={[styles.subjectOverviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/(tabs)/subjects')}>
            <View style={styles.subjectOverviewLeft}>
              <View style={[styles.colorBar, { backgroundColor: subject.color }]} />
              <View>
                <Text style={[styles.subjectOverviewName, { color: colors.text }]}>{subject.name}</Text>
                <Text style={[styles.subjectOverviewSub, { color: colors.subText }]}>
                  {sim.totalEvaluatedWeight}% evaluado | Acumulado:{' '}
                  <Text style={{ fontWeight: '700', color: subject.color }}>
                    {sim.currentAccumulatedGrade.toFixed(2)}
                  </Text>
                </Text>
              </View>
            </View>

            <View style={styles.subjectOverviewRight}>
              <Text style={[styles.reqAverageLabel, { color: colors.mutedText }]}>Falta para pasar:</Text>
              <Text
                style={[
                  styles.reqAverageValue,
                  sim.status === 'at_risk' || sim.status === 'impossible'
                    ? { color: '#DC2626' }
                    : { color: '#059669' },
                ]}>
                {sim.status === 'passed' ? 'Aprobada' : `${sim.requiredAverageForMinPassing.toFixed(2)}`}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
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
  header: {
    marginBottom: 16,
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  greetingSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#4F46E5',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E5E7EB',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  quickActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  alertBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
    lineHeight: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  seeAllText: {
    fontSize: 13,
    color: '#4F46E5',
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  emptyCardText: {
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'center',
  },
  urgentTaskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  checkBtn: {
    marginRight: 10,
  },
  taskSubName: {
    fontSize: 11,
    fontWeight: '700',
  },
  priorityPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  priorityHigh: {
    backgroundColor: '#FEE2E2',
  },
  priorityMed: {
    backgroundColor: '#FEF3C7',
  },
  priorityPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  urgentTaskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 2,
  },
  urgentTaskDue: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  subjectOverviewCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  subjectOverviewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorBar: {
    width: 4,
    height: 38,
    borderRadius: 2,
    marginRight: 12,
  },
  subjectOverviewName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  subjectOverviewSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  subjectOverviewRight: {
    alignItems: 'flex-end',
  },
  reqAverageLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  reqAverageValue: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
});
