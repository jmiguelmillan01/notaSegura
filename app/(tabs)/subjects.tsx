import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/store/useAppStore';
import { calculateSubjectGrades } from '../../src/services/gradesCalculator';
import { Subject, Grade } from '../../src/types/database';
import { useThemeColors } from '../../src/utils/theme';

export default function SubjectsScreen() {
  const { subjects, grades, addGrade, updateGrade, deleteGrade, addSubject, updateSubject } = useAppStore();
  const colors = useThemeColors();
  const isDark = colors.isDark;
  
  // Filtrar materias activas (no archivadas)
  const activeSubjects = subjects.filter((s) => !s.is_archived);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    activeSubjects.length > 0 ? activeSubjects[0].id : ''
  );

  // Estados para modal de nuevo/editar corte
  const [gradeModalVisible, setGradeModalVisible] = useState(false);
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null);
  const [newGradeName, setNewGradeName] = useState('');
  const [newGradeWeight, setNewGradeWeight] = useState('');
  const [newGradeValue, setNewGradeValue] = useState('');
  const [isEvaluated, setIsEvaluated] = useState(true);

  // Estados para modal de nueva materia
  const [subjectModalVisible, setSubjectModalVisible] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubMinPassing, setNewSubMinPassing] = useState('3.0');
  const [newSubTarget, setNewSubTarget] = useState('4.0');

  // Estado para modal de Historial / Papelera
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  // Estados para modal de editar materia
  const [editSubjectModalVisible, setEditSubjectModalVisible] = useState(false);
  const [editingSubName, setEditingSubName] = useState('');
  const [editingSubCode, setEditingSubCode] = useState('');

  const handleOpenEditSubjectModal = (sub: Subject) => {
    setEditingSubName(sub.name);
    setEditingSubCode(sub.code || '');
    setEditSubjectModalVisible(true);
  };

  const handleUpdateSubject = async () => {
    if (!editingSubName.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa el nombre de la materia.');
      return;
    }
    if (currentSubject) {
      await updateSubject(currentSubject.id, {
        name: editingSubName.trim(),
        code: editingSubCode.trim() || undefined,
      });
      Alert.alert('Actualizado', 'La materia ha sido modificada con éxito.');
    }
    setEditSubjectModalVisible(false);
  };

  const currentSubject =
    activeSubjects.find((s) => s.id === selectedSubjectId) || activeSubjects[0];
  const subjectGrades = currentSubject
    ? grades.filter((g) => g.subject_id === currentSubject.id)
    : [];

  const simulation = currentSubject
    ? calculateSubjectGrades(currentSubject, subjectGrades)
    : null;

  const handleOpenAddGradeModal = () => {
    setEditingGradeId(null);
    setNewGradeName('');
    setNewGradeWeight('');
    setNewGradeValue('');
    setIsEvaluated(true);
    setGradeModalVisible(false);
    setTimeout(() => setGradeModalVisible(true), 10);
  };

  const handleOpenEditGradeModal = (grade: Grade) => {
    setEditingGradeId(grade.id);
    setNewGradeName(grade.name);
    setNewGradeWeight(grade.weight_percentage.toString());
    setIsEvaluated(grade.is_evaluated);
    setNewGradeValue(
      grade.grade !== null && grade.grade !== undefined ? grade.grade.toString() : ''
    );
    setGradeModalVisible(true);
  };

  const handleSaveGrade = () => {
    if (!newGradeName.trim()) {
      Alert.alert('Campo requerido', 'Ingresa el nombre del corte o evaluación.');
      return;
    }
    const weight = parseFloat(newGradeWeight);
    if (isNaN(weight) || weight <= 0 || weight > 100) {
      Alert.alert('Porcentaje inválido', 'El porcentaje debe ser un número entre 1 y 100.');
      return;
    }

    // Validación PRD: El nuevo porcentaje sumado a las demás notas no supera el 100%
    const otherGradesWeightSum = subjectGrades
      .filter((g) => g.id !== editingGradeId)
      .reduce((acc, g) => acc + (Number(g.weight_percentage) || 0), 0);

    if (otherGradesWeightSum + weight > 100) {
      const maxAllowed = Math.max(0, 100 - otherGradesWeightSum);
      Alert.alert(
        'Porcentaje Excedido',
        `La suma de porcentajes no puede superar el 100% para la materia. Suma actual de las demás evaluaciones: ${otherGradesWeightSum}%. Máximo asignable: ${maxAllowed}%.`
      );
      return;
    }

    let gradeVal: number | null = null;
    if (isEvaluated) {
      gradeVal = parseFloat(newGradeValue);
      if (isNaN(gradeVal) || gradeVal < 0 || gradeVal > (currentSubject?.scale_max || 5.0)) {
        Alert.alert(
          'Nota inválida',
          `La calificación debe estar entre 0.0 y ${currentSubject?.scale_max || 5.0}.`
        );
        return;
      }
    }

    if (editingGradeId) {
      updateGrade(editingGradeId, {
        name: newGradeName.trim(),
        weight_percentage: weight,
        grade: gradeVal,
        is_evaluated: isEvaluated,
      });
    } else {
      addGrade({
        subject_id: currentSubject.id,
        name: newGradeName.trim(),
        weight_percentage: weight,
        grade: gradeVal,
        is_evaluated: isEvaluated,
      });
    }

    setEditingGradeId(null);
    setNewGradeName('');
    setNewGradeWeight('');
    setNewGradeValue('');
    setGradeModalVisible(false);
  };

  const handleSaveSubject = async () => {
    if (!newSubName.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa el nombre de la materia.');
      return;
    }

    const minPass = parseFloat(newSubMinPassing) || 3.0;
    const target = parseFloat(newSubTarget) || 4.0;

    const colors = ['#6366F1', '#0EA5E9', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const created = await addSubject({
      name: newSubName.trim(),
      code: newSubCode.trim() || undefined,
      color: randomColor,
      min_passing_grade: minPass,
      target_grade: target,
      scale_max: 5.0,
    });

    if (created && created.id) {
      setSelectedSubjectId(created.id);
    }
    setNewSubName('');
    setNewSubCode('');
    setSubjectModalVisible(false);
  };

  const getStatusBadge = () => {
    if (!simulation) return null;

    switch (simulation.status) {
      case 'passed':
        return {
          bg: colors.badgePassBg,
          text: colors.badgePassText,
          icon: 'checkmark-circle',
          label: 'Aprobando / Aprobada',
        };
      case 'at_risk':
        return {
          bg: colors.badgeRiskBg,
          text: colors.badgeRiskText,
          icon: 'warning',
          label: 'En Riesgo',
        };
      case 'impossible':
        return {
          bg: colors.badgeCriticalBg,
          text: colors.badgeCriticalText,
          icon: 'alert-circle',
          label: 'Atención Crítica',
        };
      case 'achievable':
      default:
        return {
          bg: isDark ? '#312E81' : '#E0E7FF',
          text: isDark ? '#A5B4FC' : '#3730A3',
          icon: 'trending-up',
          label: 'En Camino',
        };
    }
  };

  const badge = getStatusBadge();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.contentContainer}>
      {/* Selector de Materias Horizontal */}
      <View style={styles.subjectsHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Tus Materias</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={[styles.historyIconButton, { backgroundColor: isDark ? colors.cardElevated : '#EEF2FF', borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}
            onPress={() => setHistoryModalVisible(true)}>
            <Ionicons name="archive-outline" size={18} color={colors.tint} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addSubjectButton, { backgroundColor: isDark ? colors.cardElevated : '#EEF2FF', borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}
            onPress={() => setSubjectModalVisible(true)}>
            <Ionicons name="add" size={18} color={colors.tint} />
            <Text style={[styles.addSubjectText, { color: colors.tint }]}>Nueva</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectTabs}>
        {activeSubjects.map((sub) => {
          const isSelected = sub.id === currentSubject?.id;
          return (
            <TouchableOpacity
              key={sub.id}
              style={[
                styles.subjectChip,
                { backgroundColor: isDark ? colors.card : '#FFFFFF', borderColor: colors.border },
                isSelected && { backgroundColor: sub.color, borderColor: sub.color },
              ]}
              onPress={() => setSelectedSubjectId(sub.id)}>
              <Text
                style={[
                  styles.subjectChipText,
                  { color: colors.subText },
                  isSelected && { color: '#FFFFFF', fontWeight: '700' },
                ]}>
                {sub.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Botones de Editar y Archivar Materia actual */}
      {currentSubject && (
        <View style={styles.subjectActionsBar}>
          <TouchableOpacity
            style={[styles.editSubActionBtn, { backgroundColor: isDark ? colors.cardElevated : '#EEF2FF', borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}
            onPress={() => handleOpenEditSubjectModal(currentSubject)}>
            <Ionicons name="pencil-outline" size={14} color={colors.tint} />
            <Text style={[styles.editSubActionText, { color: colors.tint }]}>Editar Materia</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.archiveBtn, { backgroundColor: isDark ? colors.cardElevated : '#F3F4F6', borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}
            onPress={() => {
              Alert.alert(
                'Enviar al Historial',
                `¿Deseas enviar "${currentSubject.name}" al historial de materias archivadas?`,
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Sí, archivar',
                    style: 'destructive',
                    onPress: async () => {
                      await updateSubject(currentSubject.id, { is_archived: true });
                      const remaining = activeSubjects.filter((s) => s.id !== currentSubject.id);
                      if (remaining.length > 0) {
                        setSelectedSubjectId(remaining[0].id);
                      }
                      Alert.alert('Archivada', 'La materia fue enviada al historial.');
                    },
                  },
                ]
              );
            }}>
            <Ionicons name="archive-outline" size={14} color={colors.subText} />
            <Text style={[styles.archiveBtnText, { color: colors.subText }]}>Archivar Materia</Text>
          </TouchableOpacity>
        </View>
      )}

      {currentSubject && simulation && (
        <>
          {/* Tarjeta Dashboard de Proyección (CU-03) */}
          <View style={[styles.dashboardCard, { backgroundColor: colors.card, borderColor: colors.border, borderTopColor: currentSubject.color }]}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.dashboardSubjectTitle, { color: colors.text }]}>{currentSubject.name}</Text>
                <Text style={[styles.dashboardSubtitle, { color: colors.subText, textAlign: 'center' }]}>
                  Meta: {currentSubject.target_grade.toFixed(1)} | Mínima: {currentSubject.min_passing_grade.toFixed(1)}
                </Text>
              </View>
              {badge && (
                <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                  <Ionicons name={badge.icon as any} size={14} color={badge.text} />
                  <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                    {badge.label}
                  </Text>
                </View>
              )}
            </View>

            {/* Métricas Principales */}
            <View style={[styles.metricsRow, { backgroundColor: isDark ? colors.innerCard : '#F9FAFB', borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: colors.subText }]}>Nota{'\n'}Acumulada</Text>
                <Text style={[styles.metricValue, { color: currentSubject.color }]}>
                  {simulation.currentAccumulatedGrade.toFixed(2)}
                </Text>
                <Text style={[styles.metricSub, { color: colors.mutedText }]}>{simulation.totalEvaluatedWeight}% evaluado</Text>
              </View>

              <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />

              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: colors.subText }]}>Falta por{'\n'}Evaluar</Text>
                <Text style={[styles.metricValue, { color: colors.text }]}>{simulation.remainingWeight}%</Text>
                <Text style={[styles.metricSub, { color: colors.mutedText }]}>del semestre</Text>
              </View>

              <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />

              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: colors.subText }]}>Necesitas{'\n'}Promedio</Text>
                <Text
                  style={[
                    styles.metricValue,
                    simulation.requiredAverageForMinPassing > 4.0
                      ? { color: '#DC2626' }
                      : { color: '#059669' },
                  ]}>
                  {simulation.status === 'passed'
                    ? '0.0'
                    : simulation.requiredAverageForMinPassing.toFixed(2)}
                </Text>
                <Text style={[styles.metricSub, { color: colors.mutedText }]}>para pasar ({currentSubject.min_passing_grade})</Text>
              </View>
            </View>

            {/* Barra de progreso de porcentajes */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressBarBackground, { backgroundColor: isDark ? colors.border : '#F3F4F6' }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, simulation.totalEvaluatedWeight)}%`,
                      backgroundColor: currentSubject.color,
                    },
                  ]}
                />
              </View>
              <View style={styles.progressLabels}>
                <Text style={[styles.progressText, { color: colors.subText }]}>
                  {simulation.totalEvaluatedWeight}% completado
                </Text>
                <Text style={[styles.progressText, { color: colors.subText }]}>{simulation.remainingWeight}% restante</Text>
              </View>
            </View>

            {/* Mensaje descriptivo amigable del simulador */}
            <View style={[styles.messageBox, { backgroundColor: isDark ? colors.cardElevated : '#EEF2FF', borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
              <Ionicons name="bulb-outline" size={20} color={colors.tint} style={{ marginRight: 8 }} />
              <Text style={[styles.messageText, { color: isDark ? colors.text : '#3730A3' }]}>{simulation.statusMessage}</Text>
            </View>
          </View>

          {/* Desglose de Cortes / Evaluaciones */}
          <View style={styles.gradesHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Cortes y Evaluaciones</Text>
            <TouchableOpacity
              style={[styles.addGradeButton, { backgroundColor: colors.tint }]}
              onPress={handleOpenAddGradeModal}>
              <Ionicons name="add-circle" size={20} color="#FFFFFF" />
              <Text style={styles.addGradeButtonText}>Agregar Corte</Text>
            </TouchableOpacity>
          </View>

          {subjectGrades.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="document-text-outline" size={40} color={colors.mutedText} />
              <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No hay notas registradas</Text>
              <Text style={[styles.emptyStateSubtitle, { color: colors.subText }]}>
                Agrega los parciales, talleres y quices para proyectar tu promedio.
              </Text>
            </View>
          ) : (
            subjectGrades.map((grade) => (
              <View key={grade.id} style={[styles.gradeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={styles.gradeInfo}
                  onPress={() => handleOpenEditGradeModal(grade)}>
                  <Text style={[styles.gradeName, { color: colors.text }]}>{grade.name}</Text>
                  <Text style={[styles.gradeWeight, { color: colors.subText }]}>Peso: {grade.weight_percentage}%</Text>
                </TouchableOpacity>
                <View style={styles.gradeRight}>
                  {grade.is_evaluated && grade.grade !== null ? (
                    <View style={[styles.gradePill, { backgroundColor: isDark ? colors.innerCard : '#EEF2FF' }]}>
                      <Text style={[styles.gradeValue, { color: colors.tint }]}>{Number(grade.grade).toFixed(1)}</Text>
                    </View>
                  ) : (
                    <View style={[styles.gradePill, { backgroundColor: isDark ? colors.innerCard : '#F3F4F6' }]}>
                      <Text style={[styles.gradeValue, { color: colors.subText, fontSize: 13 }]}>
                        Pendiente
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => handleOpenEditGradeModal(grade)}
                    style={styles.actionGradeBtn}>
                    <Ionicons name="pencil-outline" size={18} color={colors.tint} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => deleteGrade(grade.id)}
                    style={styles.actionGradeBtn}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </>
      )}

      {/* Modal Agregar Corte */}
      <Modal visible={gradeModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingGradeId ? 'Editar Corte / Examen' : 'Nuevo Corte / Examen'}
              </Text>
              <TouchableOpacity onPress={() => setGradeModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.subText} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.subText }]}>Nombre de la Evaluación</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.inputBorder }]}
              placeholder="Ej: Parcial 1, Taller 2..."
              placeholderTextColor={isDark ? '#9CA3AF' : '#9CA3AF'}
              value={newGradeName}
              onChangeText={setNewGradeName}
            />

            <Text style={[styles.inputLabel, { color: colors.subText }]}>Porcentaje (%)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.inputBorder }]}
              placeholder="Ej: 30"
              placeholderTextColor={isDark ? '#9CA3AF' : '#9CA3AF'}
              keyboardType="numeric"
              value={newGradeWeight}
              onChangeText={setNewGradeWeight}
            />

            <View style={styles.toggleRow}>
              <Text style={[styles.inputLabel, { color: colors.subText, marginTop: 0 }]}>¿Ya fue calificado?</Text>
              <TouchableOpacity
                style={[styles.toggleBtn, { backgroundColor: isDark ? colors.innerCard : '#F3F4F6' }, isEvaluated && { backgroundColor: colors.tint }]}
                onPress={() => setIsEvaluated(!isEvaluated)}>
                <Text
                  style={[styles.toggleBtnText, { color: colors.subText }, isEvaluated && { color: '#FFFFFF' }]}>
                  {isEvaluated ? 'Sí' : 'No'}
                </Text>
              </TouchableOpacity>
            </View>

            {isEvaluated && (
              <>
                <Text style={[styles.inputLabel, { color: colors.subText }]}>Calificación Obtenida (0.0 - 5.0)</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.inputBorder }]}
                  placeholder="Ej: 4.0"
                  placeholderTextColor={isDark ? '#9CA3AF' : '#9CA3AF'}
                  keyboardType="numeric"
                  value={newGradeValue}
                  onChangeText={setNewGradeValue}
                />
              </>
            )}

            <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.tint }]} onPress={handleSaveGrade}>
              <Text style={styles.submitButtonText}>
                {editingGradeId ? 'Guardar Cambios' : 'Guardar Calificación'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Historial / Papelera de Materias */}
      <Modal visible={historyModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border, maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Historial de Materias</Text>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.subText} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {subjects.filter((s) => s.is_archived).length === 0 ? (
                <View style={{ alignItems: 'center', padding: 30 }}>
                  <Ionicons name="archive-outline" size={40} color={colors.mutedText} />
                  <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No hay materias en el historial</Text>
                  <Text style={[styles.emptyStateSubtitle, { color: colors.subText }]}>
                    Las materias que archives aparecerán aquí para que puedas restaurarlas cuando desees.
                  </Text>
                </View>
              ) : (
                subjects
                  .filter((s) => s.is_archived)
                  .map((sub) => (
                    <View key={sub.id} style={[styles.gradeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <View style={styles.gradeInfo}>
                        <Text style={[styles.gradeName, { color: colors.text }]}>{sub.name}</Text>
                        <Text style={[styles.gradeWeight, { color: colors.subText }]}>Código: {sub.code || 'N/A'}</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.restoreButton, { backgroundColor: isDark ? colors.cardElevated : '#EEF2FF', borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}
                        onPress={async () => {
                          await updateSubject(sub.id, { is_archived: false });
                          setSelectedSubjectId(sub.id);
                          Alert.alert('Restaurada', `La materia "${sub.name}" ha sido restaurada.`);
                        }}>
                        <Ionicons name="refresh-outline" size={16} color={colors.tint} />
                        <Text style={[styles.restoreButtonText, { color: colors.tint }]}>Restaurar</Text>
                      </TouchableOpacity>
                    </View>
                  ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal visible={subjectModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Agregar Nueva Materia</Text>
              <TouchableOpacity onPress={() => setSubjectModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.subText} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.subText }]}>Nombre de la Asignatura</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.inputBorder }]}
              placeholder="Ej: Álgebra Lineal, Base de Datos..."
              placeholderTextColor={isDark ? '#9CA3AF' : '#9CA3AF'}
              value={newSubName}
              onChangeText={setNewSubName}
            />

            <Text style={[styles.inputLabel, { color: colors.subText }]}>Código (Opcional)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.inputBorder }]}
              placeholder="Ej: MAT-202"
              placeholderTextColor={isDark ? '#9CA3AF' : '#9CA3AF'}
              value={newSubCode}
              onChangeText={setNewSubCode}
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.inputLabel, { color: colors.subText }]}>Nota Mínima</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.inputBorder }]}
                  placeholder="3.0"
                  placeholderTextColor={isDark ? '#9CA3AF' : '#9CA3AF'}
                  keyboardType="numeric"
                  value={newSubMinPassing}
                  onChangeText={setNewSubMinPassing}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.inputLabel, { color: colors.subText }]}>Nota Meta</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.inputBorder }]}
                  placeholder="4.0"
                  placeholderTextColor={isDark ? '#9CA3AF' : '#9CA3AF'}
                  keyboardType="numeric"
                  value={newSubTarget}
                  onChangeText={setNewSubTarget}
                />
              </View>
            </View>

            <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.tint }]} onPress={handleSaveSubject}>
              <Text style={styles.submitButtonText}>Crear Materia</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Editar Materia */}
      <Modal visible={editSubjectModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Editar Materia</Text>
              <TouchableOpacity onPress={() => setEditSubjectModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.subText} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.subText }]}>Nombre de la Asignatura</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.inputBorder }]}
              placeholder="Ej: Álgebra Lineal..."
              placeholderTextColor={isDark ? '#9CA3AF' : '#9CA3AF'}
              value={editingSubName}
              onChangeText={setEditingSubName}
            />

            <Text style={[styles.inputLabel, { color: colors.subText }]}>Código (Opcional)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.inputBorder }]}
              placeholder="Ej: MAT-202"
              placeholderTextColor={isDark ? '#9CA3AF' : '#9CA3AF'}
              value={editingSubCode}
              onChangeText={setEditingSubCode}
            />

            <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.tint }]} onPress={handleUpdateSubject}>
              <Text style={styles.submitButtonText}>Guardar Cambios</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  subjectsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  addSubjectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  addSubjectText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F46E5',
    marginLeft: 4,
  },
  subjectTabs: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  subjectChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  subjectChipText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  dashboardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderTopWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  dashboardSubjectTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  dashboardSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  metricSub: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
    textAlign: 'center',
  },
  metricDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  progressContainer: {
    marginBottom: 14,
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressText: {
    fontSize: 11,
    color: '#6B7280',
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 10,
  },
  messageText: {
    flex: 1,
    fontSize: 13,
    color: '#3730A3',
    lineHeight: 18,
    fontWeight: '500',
  },
  gradesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addGradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  addGradeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  gradeCard: {
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
  gradeInfo: {
    flex: 1,
  },
  gradeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  gradeWeight: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  gradeRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gradePill: {
    backgroundColor: '#EEF2FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 10,
  },
  gradeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4F46E5',
  },
  actionGradeBtn: {
    padding: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 10,
  },
  emptyStateSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
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
  row: {
    flexDirection: 'row',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  toggleBtnActive: {
    backgroundColor: '#4F46E5',
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  archiveBar: {
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  archiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 4,
  },
  archiveBtnText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 4,
  },
  restoreButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
  },
  historyIconButton: {
    backgroundColor: '#EEF2FF',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectActionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 10,
  },
  editSubActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
  },
  editSubActionText: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '600',
  },
});

