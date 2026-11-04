import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Task, TaskPriority } from '../types/database';

// Detectar de forma confiable si se ejecuta en Expo Go
function isExpoGoClient(): boolean {
  try {
    return (
      Constants.appOwnership === 'expo' ||
      Constants.executionEnvironment === ExecutionEnvironment.StoreClient
    );
  } catch {
    return false;
  }
}

// Carga perezosa (lazy) protegida de expo-notifications
let Notifications: typeof import('expo-notifications') | null = null;

try {
  if (Platform.OS !== 'web' && !(Platform.OS === 'android' && isExpoGoClient())) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Notifications = require('expo-notifications');
    if (Notifications && Notifications.setNotificationHandler) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    }
  }
} catch (e) {
  Notifications = null;
}

/**
 * Solicitar permisos para notificaciones locales y configurar canales según prioridad
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Notifications) return false;

  if (Platform.OS === 'web' || (Platform.OS === 'android' && isExpoGoClient())) {
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    if (Platform.OS === 'android' && Notifications.setNotificationChannelAsync) {
      try {
        await Notifications.setNotificationChannelAsync('high-priority', {
          name: 'Prioridad Alta',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#DC2626',
        });
        await Notifications.setNotificationChannelAsync('medium-priority', {
          name: 'Prioridad Media',
          importance: Notifications.AndroidImportance.DEFAULT,
          lightColor: '#4F46E5',
        });
        await Notifications.setNotificationChannelAsync('low-priority', {
          name: 'Prioridad Baja',
          importance: Notifications.AndroidImportance.LOW,
          lightColor: '#10B981',
        });
      } catch (channelErr) {
        // En algunos dispositivos/emuladores puede fallar sin afectar la ejecución
      }
    }

    return true;
  } catch (err) {
    return false;
  }
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
 * Programa las notificaciones automáticas para una tarea según su prioridad y fecha límite
 */
export async function scheduleTaskAlerts(task: Task, subjectName: string): Promise<string[]> {
  if (!Notifications || Platform.OS === 'web') return [];

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return [];

  const dueDate = new Date(task.due_date);
  const now = new Date();

  if (dueDate.getTime() <= now.getTime()) {
    return [];
  }

  const notificationIds: string[] = [];
  const daysOffsets = getAlertOffsetsDays(task.priority);

  const channelId =
    task.priority === 'high'
      ? 'high-priority'
      : task.priority === 'low'
      ? 'low-priority'
      : 'medium-priority';

  for (const daysBefore of daysOffsets) {
    const triggerDate = new Date(dueDate.getTime() - daysBefore * 24 * 60 * 60 * 1000);
    triggerDate.setHours(9, 0, 0, 0);

    if (triggerDate.getTime() > now.getTime()) {
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: `📌 Recordatorio (${task.priority.toUpperCase()}): ${task.title}`,
            body: `Materia: ${subjectName}. Vence en ${daysBefore} día${daysBefore > 1 ? 's' : ''}. ¡Organiza tu tiempo!`,
            data: { taskId: task.id, subjectId: task.subject_id },
            sound: task.priority !== 'low', // Silencioso si es prioridad baja
          },
          trigger: { date: triggerDate, channelId } as any,
        });
        notificationIds.push(id);
      } catch (err) {
        console.warn('Error al programar notificación:', err);
      }
    }
  }

  return notificationIds;
}

/**
 * Cancela las notificaciones asociadas a una tarea
 */
export async function cancelTaskAlerts(notificationIds: string[] = []): Promise<void> {
  if (!Notifications || Platform.OS === 'web' || !notificationIds.length) return;

  for (const id of notificationIds) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (err) {
      console.warn('Error cancelando notificación:', id, err);
    }
  }
}
