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
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppStore } from '../../src/store/useAppStore';
import { TaskPriority, Task, MediaItem } from '../../src/types/database';
import { TaskCalendar } from '../../components/TaskCalendar';
import { useThemeColors } from '../../src/utils/theme';

export default function TasksScreen() {
  const { subjects, tasks, addTask, updateTask, toggleTaskCompleted, deleteTask } = useAppStore();
  const colors = useThemeColors();
  const isDark = colors.isDark;
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [filter, setFilter] = useState<'all' | 'pending' | 'logs' | 'completed'>('all');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Modal para nueva/editar tarea / bitácora
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState(
    subjects.length > 0 ? subjects[0].id : ''
  );
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [isClassLog, setIsClassLog] = useState(false);
  
  // Selector de Fecha (DatePicker) real
  const [dueDate, setDueDate] = useState<Date>(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const activeSubjects = subjects.filter((s) => !s.is_archived);
  const activeSubjectIds = new Set(activeSubjects.map((s) => s.id));
  const activeTasks = tasks.filter((t) => activeSubjectIds.has(t.subject_id));

  const displayedTasks = activeTasks.filter((t) => {
    if (viewMode === 'calendar') {
      if (!t.due_date) return false;
      const tDate = t.due_date.split('T')[0];
      return tDate === selectedCalendarDate;
    }
    if (filter === 'pending') return !t.is_completed;
    if (filter === 'completed') return t.is_completed;
    if (filter === 'logs') return t.is_class_log;
    return true;
  });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tus fotos para adjuntar el apunte.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a la cámara para fotografiar el pizarrón.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingTaskId(null);
    setTitle('');
    setNotes('');
    setSelectedSubjectId(subjects.length > 0 ? subjects[0].id : '');
    setPriority('medium');
    setIsClassLog(false);
    setDueDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000));
    setSelectedImage(null);
    setModalVisible(true);
  };

  const handleOpenEditModal = (task: Task) => {
    setEditingTaskId(task.id);
    setTitle(task.title);
    setNotes(task.notes || '');
    setSelectedSubjectId(task.subject_id);
    setPriority(task.priority);
    setIsClassLog(task.is_class_log);
    setDueDate(task.due_date ? new Date(task.due_date) : new Date());
    setSelectedImage(task.media && task.media.length > 0 ? task.media[0].file_url : null);
    setModalVisible(true);
  };

  const handleSaveTask = async () => {
    if (!title.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa un título para la tarea o bitácora.');
      return;
    }

    if (!selectedSubjectId) {
      Alert.alert('Materia requerida', 'Selecciona la materia correspondiente.');
      return;
    }

    const mediaList: MediaItem[] = [];
    if (selectedImage) {
      mediaList.push({
        id: `med-${Date.now()}`,
        user_id: 'user-local',
        task_id: editingTaskId || '',
        file_url: selectedImage,
        file_path: selectedImage,
        type: 'image',
      });
    }

    if (editingTaskId) {
      await updateTask(
        editingTaskId,
        {
          subject_id: selectedSubjectId,
          title: title.trim(),
          notes: notes.trim() || undefined,
          due_date: dueDate.toISOString(),
          priority,
          is_class_log: isClassLog,
        },
        mediaList
      );
      Alert.alert('Actualización exitosa', 'La tarea ha sido actualizada y sus alertas reprogramadas.');
    } else {
      await addTask(
        {
          subject_id: selectedSubjectId,
          title: title.trim(),
          notes: notes.trim() || undefined,
          due_date: dueDate.toISOString(),
          priority,
          is_class_log: isClassLog,
        },
        mediaList
      );
      Alert.alert(
        'Guardado exitoso',
        isClassLog
          ? 'Bitácora de clase guardada correctamente.'
          : `Tarea creada con prioridad ${priority.toUpperCase()}. Las alertas inteligentes se han programado automáticamente.`
      );
    }

    // Reset form
    setEditingTaskId(null);
    setTitle('');
    setNotes('');
    setSelectedImage(null);
    setIsClassLog(false);
    setPriority('medium');
    setModalVisible(false);
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'high':
        return { label: 'Alta', color: '#DC2626', bg: '#FEE2E2', alerts: 'Alertas: 7, 3 y 1d' };
      case 'medium':
        return { label: 'Media', color: '#D97706', bg: '#FEF3C7', alerts: 'Alertas: 3 y 1d' };
      case 'low':
      default:
        return { label: 'Baja', color: '#059669', bg: '#D1FAE5', alerts: 'Alerta: 1d' };
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Toggle de Vistas: Lista vs Calendario */}
      <View style={styles.viewToggleContainer}>
        <TouchableOpacity
          style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
          onPress={() => setViewMode('list')}>
          <Ionicons
            name="list-outline"
            size={18}
            color={viewMode === 'list' ? '#FFFFFF' : '#4B5563'}
          />
          <Text
            style={[styles.viewToggleText, viewMode === 'list' && styles.viewToggleTextActive]}>
            Vista de Lista
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewToggleBtn, viewMode === 'calendar' && styles.viewToggleBtnActive]}
          onPress={() => setViewMode('calendar')}>
          <Ionicons
            name="calendar-outline"
            size={18}
            color={viewMode === 'calendar' ? '#FFFFFF' : '#4B5563'}
          />
          <Text
            style={[
              styles.viewToggleText,
              viewMode === 'calendar' && styles.viewToggleTextActive,
            ]}>
            Vista de Calendario
          </Text>
        </TouchableOpacity>
      </View>

      {/* Barra de Filtros (Solo visible en Vista de Lista) */}
      {viewMode === 'list' && (
        <View style={styles.filterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(
              [
                { id: 'all', label: 'Todas' },
                { id: 'pending', label: 'Pendientes' },
                { id: 'logs', label: 'Bitácoras de Clase' },
                { id: 'completed', label: 'Completadas' },
              ] as const
            ).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.filterChip, filter === item.id && styles.filterChipActive]}
                onPress={() => setFilter(item.id)}>
                <Text
                  style={[
                    styles.filterChipText,
                    filter === item.id && styles.filterChipTextActive,
                  ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.listContent}>
        {/* Componente Calendario Interactivo (Solo visible en Vista de Calendario) */}
        {viewMode === 'calendar' && (
          <View style={{ marginBottom: 16 }}>
            <TaskCalendar
              tasks={activeTasks}
              selectedDate={selectedCalendarDate}
              onSelectDate={(date) => setSelectedCalendarDate(date)}
            />
            <View style={styles.selectedDateHeader}>
              <Text style={styles.selectedDateTitle}>
                Tareas para el {selectedCalendarDate}
              </Text>
            </View>
          </View>
        )}

        {displayedTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle-outline" size={54} color="#9CA3AF" />
            <Text style={styles.emptyStateTitle}>
              {viewMode === 'calendar' ? 'No hay tareas para esta fecha' : 'No hay tareas aquí'}
            </Text>
            <Text style={styles.emptyStateSubtitle}>
              {viewMode === 'calendar'
                ? 'Selecciona otro día en el calendario o crea una nueva tarea.'
                : 'Crea una nueva tarea o registra un apunte de clase para mantener el ritmo.'}
            </Text>
          </View>
        ) : (
          displayedTasks.map((task) => {
            const subject = subjects.find((s) => s.id === task.subject_id);
            const pBadge = getPriorityBadge(task.priority);
            const dueDateFormatted = new Date(task.due_date).toLocaleDateString('es-ES', {
              month: 'short',
              day: 'numeric',
            });

            return (
            <View
              key={task.id}
              style={[
                styles.taskCard,
                task.is_completed && styles.taskCardCompleted,
                { borderLeftColor: subject?.color || '#4F46E5' },
              ]}>
              <View style={styles.taskTopRow}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => toggleTaskCompleted(task.id)}>
                  <Ionicons
                    name={task.is_completed ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={task.is_completed ? '#10B981' : '#6B7280'}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.taskTitleCol}
                  onPress={() => handleOpenEditModal(task)}>
                  <View style={styles.tagsRow}>
                    {subject && (
                      <View style={[styles.subjectTag, { backgroundColor: subject.color }]}>
                        <Text style={styles.subjectTagText}>{subject.name}</Text>
                      </View>
                    )}
                    {task.is_class_log && (
                      <View style={styles.logTag}>
                        <Ionicons name="book-outline" size={12} color="#4F46E5" />
                        <Text style={styles.logTagText}>Bitácora</Text>
                      </View>
                    )}
                    <View style={[styles.priorityTag, { backgroundColor: pBadge.bg }]}>
                      <Text style={[styles.priorityTagText, { color: pBadge.color }]}>
                        {pBadge.label}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.taskTitle,
                      task.is_completed && styles.taskTitleCompleted,
                    ]}>
                    {task.title}
                  </Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <TouchableOpacity
                    onPress={() => handleOpenEditModal(task)}
                    style={styles.deleteButton}>
                    <Ionicons name="pencil-outline" size={18} color="#4F46E5" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => deleteTask(task.id)}
                    style={styles.deleteButton}>
                    <Ionicons name="trash-outline" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              </View>

                {task.notes ? <Text style={styles.taskNotes}>{task.notes}</Text> : null}

                {/* Mostrar foto adjunta si tiene */}
                {task.media && task.media.length > 0 && (
                  <View style={styles.mediaContainer}>
                    <Image
                      source={{ uri: task.media[0].file_url }}
                      style={styles.attachedImage}
                    />
                  </View>
                )}

                <View style={styles.taskFooter}>
                  <View style={styles.dueDateRow}>
                    <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                    <Text style={styles.dueDateText}>Entrega: {dueDateFormatted}</Text>
                  </View>

                  <View style={styles.alertNotice}>
                    <Ionicons name="notifications-outline" size={13} color="#4F46E5" />
                    <Text style={styles.alertNoticeText}>{pBadge.alerts}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Botón flotante para crear tarea o bitácora */}
      <TouchableOpacity style={styles.fab} onPress={handleOpenCreateModal}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Modal Nueva / Editar Tarea / Bitácora */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingTaskId ? 'Editar Tarea o Bitácora' : 'Nueva Tarea o Bitácora'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Opción Bitácora de Clase */}
              <TouchableOpacity
                style={[styles.classLogToggle, isClassLog && styles.classLogToggleActive]}
                onPress={() => setIsClassLog(!isClassLog)}>
                <Ionicons
                  name={isClassLog ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={isClassLog ? '#4F46E5' : '#6B7280'}
                />
                <Text
                  style={[
                    styles.classLogToggleText,
                    isClassLog && styles.classLogToggleTextActive,
                  ]}>
                  Es un apunte/bitácora de clase (CU-01)
                </Text>
              </TouchableOpacity>

              {/* Materia */}
              <Text style={styles.inputLabel}>Selecciona Materia</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {activeSubjects.map((sub) => {
                  const isSel = sub.id === selectedSubjectId;
                  return (
                    <TouchableOpacity
                      key={sub.id}
                      style={[
                        styles.subjectSelectChip,
                        isSel && { backgroundColor: sub.color, borderColor: sub.color },
                      ]}
                      onPress={() => setSelectedSubjectId(sub.id)}>
                      <Text
                        style={[
                          styles.subjectSelectText,
                          isSel && { color: '#FFFFFF', fontWeight: '700' },
                        ]}>
                        {sub.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Título */}
              <Text style={styles.inputLabel}>Título</Text>
              <TextInput
                style={styles.textInput}
                placeholder={
                  isClassLog
                    ? 'Ej: Derivadas e integrales (Clase del 27 Oct)'
                    : 'Ej: Taller 2 de Física Mecánica'
                }
                value={title}
                onChangeText={setTitle}
              />

              {/* Apuntes / Notas */}
              <Text style={styles.inputLabel}>Apuntes y Detalles</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Escribe lo visto en clase o notas importantes de la entrega..."
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
              />

              {/* Prioridad y Alertas (CU-02) */}
              <Text style={styles.inputLabel}>Nivel de Prioridad (Alertas Automáticas)</Text>
              <View style={styles.prioritySelector}>
                {(['high', 'medium', 'low'] as const).map((p) => {
                  const b = getPriorityBadge(p);
                  const isSel = priority === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.priorityOption,
                        isSel && { borderColor: b.color, backgroundColor: b.bg },
                      ]}
                      onPress={() => setPriority(p)}>
                      <Text
                        style={[
                          styles.priorityOptionText,
                          isSel && { color: b.color, fontWeight: '700' },
                        ]}>
                        {b.label}
                      </Text>
                      <Text style={styles.priorityOptionSub}>{b.alerts}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Selector de Fecha (DatePicker) */}
              <Text style={styles.inputLabel}>Fecha de Vencimiento / Entrega</Text>
              {Platform.OS === 'web' ? (
                <TextInput
                  style={styles.textInput}
                  placeholder="YYYY-MM-DD"
                  value={dueDate.toISOString().split('T')[0]}
                  onChangeText={(val) => {
                    const parsed = new Date(val);
                    if (!isNaN(parsed.getTime())) {
                      setDueDate(parsed);
                    }
                  }}
                />
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowDatePicker(true)}>
                    <Ionicons name="calendar" size={18} color="#4F46E5" />
                    <Text style={styles.datePickerButtonText}>
                      {dueDate.toLocaleDateString('es-ES', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={dueDate}
                      mode="date"
                      display="default"
                      onValueChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) {
                          setDueDate(selectedDate);
                        }
                      }}
                      onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) {
                          setDueDate(selectedDate);
                        }
                      }}
                    />
                  )}
                </>
              )}

              {/* Multimedia (Fotos de Pizarrón / Audios) */}
              <Text style={styles.inputLabel}>Adjuntar Evidencia (Pizarrón / Foto)</Text>
              <View style={styles.mediaActionsRow}>
                <TouchableOpacity style={styles.mediaBtn} onPress={takePhoto}>
                  <Ionicons name="camera" size={18} color="#4F46E5" />
                  <Text style={styles.mediaBtnText}>Tomar Foto</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.mediaBtn} onPress={pickImage}>
                  <Ionicons name="images" size={18} color="#4F46E5" />
                  <Text style={styles.mediaBtnText}>Galería</Text>
                </TouchableOpacity>
              </View>

              {selectedImage && (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => setSelectedImage(null)}>
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity style={styles.submitButton} onPress={handleSaveTask}>
                <Text style={styles.submitButtonText}>
                  {editingTaskId
                    ? 'Guardar Cambios'
                    : isClassLog
                    ? 'Guardar Bitácora'
                    : 'Crear Tarea con Alertas'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  filterBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#4F46E5',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  taskCardCompleted: {
    opacity: 0.65,
    backgroundColor: '#F9FAFB',
  },
  taskTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkboxContainer: {
    marginRight: 10,
    marginTop: 2,
  },
  taskTitleCol: {
    flex: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  subjectTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  subjectTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  logTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  logTagText: {
    fontSize: 11,
    color: '#4F46E5',
    fontWeight: '600',
    marginLeft: 3,
  },
  priorityTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 20,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  deleteButton: {
    padding: 4,
  },
  taskNotes: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginTop: 8,
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 8,
  },
  mediaContainer: {
    marginTop: 10,
  },
  attachedImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dueDateText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    fontWeight: '500',
  },
  alertNotice: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertNoticeText: {
    fontSize: 11,
    color: '#4F46E5',
    fontWeight: '600',
    marginLeft: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: '#4F46E5',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#374151',
    marginTop: 12,
  },
  emptyStateSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    maxHeight: '90%',
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
    color: '#111827',
  },
  classLogToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  classLogToggleActive: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  classLogToggleText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '600',
    marginLeft: 8,
  },
  classLogToggleTextActive: {
    color: '#4F46E5',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#111827',
    marginBottom: 8,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  subjectSelectChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  subjectSelectText: {
    fontSize: 12,
    color: '#4B5563',
  },
  prioritySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  priorityOptionText: {
    fontSize: 13,
    color: '#4B5563',
  },
  priorityOptionSub: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 2,
  },
  mediaActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  mediaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  mediaBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F46E5',
  },
  previewContainer: {
    position: 'relative',
    marginVertical: 10,
  },
  previewImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 8,
  },
  datePickerButtonText: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  viewToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 8,
  },
  viewToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  viewToggleBtnActive: {
    backgroundColor: '#4F46E5',
  },
  viewToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  viewToggleTextActive: {
    color: '#FFFFFF',
  },
  selectedDateHeader: {
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  selectedDateTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  submitButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

