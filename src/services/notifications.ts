import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Task, TaskPriority } from '../types/database';

// Configurar cómo se comportan las notificaciones cuando la app está abierta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Solicitar permisos para notificaciones locales
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  if (Platform.OS === 'android') {
    try {
      if (Notifications.setNotificationChannelAsync) {
        await Notifications.setNotificationChannelAsync('academic-alerts', {
          name: 'Alertas Académicas NotaSegura',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4F46E5',
        });
      }
    } catch (e) {
      console.warn('Channel error:', e);
    }
  }

  return true;
}

/**
 * Reglas de alertas según el nivel de prioridad (CU-02)
 * - Alta: 7 días, 3 días y 1 día antes
 * - Media: 3 días y 1 día antes
 * - Baja: 1 día antes
 */
export function getAlertOffsetsDays(priority: TaskPriority): number[] {
  switch (priority) {
    case 'high':
      return [7, 3, 1];
    case 'medium':
      return [3, 1];
    case 'low':
      return [1];
    default:
      return [1];
  }
}

/**
 * Programa las alertas automáticas para una tarea según su prioridad y fecha límite
 */
export async function scheduleTaskAlerts(task: Task, subjectName: string): Promise<string[]> {
  if (Platform.OS === 'web') return [];

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return [];

  const dueDate = new Date(task.due_date);
  const now = new Date();

  // Si la fecha límite ya pasó, no programar
  if (dueDate.getTime() <= now.getTime()) {
    return [];
  }

  const notificationIds: string[] = [];
  const daysOffsets = getAlertOffsetsDays(task.priority);

  for (const daysBefore of daysOffsets) {
    const triggerDate = new Date(dueDate.getTime() - daysBefore * 24 * 60 * 60 * 1000);
    // Programar la alerta a las 09:00 AM del día correspondiente
    triggerDate.setHours(9, 0, 0, 0);

    // Solo programar si la fecha del recordatorio es en el futuro
    if (triggerDate.getTime() > now.getTime()) {
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: `⏰ Recordatorio (${task.priority.toUpperCase()}): ${task.title}`,
            body: `Materia: ${subjectName}. Vence en ${daysBefore} día${daysBefore > 1 ? 's' : ''}. ¡Organiza tu tiempo!`,
            data: { taskId: task.id, subjectId: task.subject_id },
            sound: true,
          },
          trigger: { date: triggerDate } as any,
        });
        notificationIds.push(id);
      } catch (err) {
        console.warn('Error al programar alerta:', err);
      }
    }
  }

  return notificationIds;
}

/**
 * Cancela las notificaciones asociadas a una tarea (ej. si se completa o elimina)
 */
export async function cancelTaskAlerts(notificationIds: string[] = []): Promise<void> {
  if (Platform.OS === 'web' || !notificationIds.length) return;

  for (const id of notificationIds) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (err) {
      console.warn('Error cancelando notificación:', id, err);
    }
  }
}
