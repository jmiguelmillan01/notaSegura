import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Subject, Grade, Task, MediaItem, TaskPriority } from '../types/database';
import { scheduleTaskAlerts, cancelTaskAlerts } from '../services/notifications';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import * as FileSystem from 'expo-file-system';

interface AppState {
  subjects: Subject[];
  grades: Grade[];
  tasks: Task[];
  profile: { full_name?: string; institution?: string; major?: string; bio?: string } | null;
  theme: 'light' | 'dark' | 'system';
  isOfflineMode: boolean;
  isLoading: boolean;

  setOfflineMode: (enabled: boolean) => void;
  fetchData: () => Promise<void>;
  syncLocalDataToUser: () => Promise<void>;
  updateProfile: (profile: { full_name?: string; institution?: string; major?: string; bio?: string }) => Promise<void>;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  clearStore: () => void;

  addSubject: (subject: Omit<Subject, 'id' | 'user_id' | 'created_at'>) => Promise<Subject>;
  updateSubject: (id: string, updates: Partial<Subject>) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;

  addGrade: (grade: Omit<Grade, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  updateGrade: (id: string, updates: Partial<Grade>) => Promise<void>;
  deleteGrade: (id: string) => Promise<void>;

  addTask: (
    task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'is_completed' | 'notification_ids'>,
    media?: MediaItem[]
  ) => Promise<Task>;
  updateTask: (
    id: string,
    updates: Partial<Task>,
    media?: MediaItem[]
  ) => Promise<Task | null>;
  toggleTaskCompleted: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  getGradesForSubject: (subjectId: string) => Grade[];
  getTasksForSubject: (subjectId: string) => Task[];
}

const INITIAL_SUBJECTS: Subject[] = [];

const INITIAL_GRADES: Grade[] = [];

const INITIAL_TASKS: Task[] = [];

// Helper para generar UUID v4 válido
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function base64ToArrayBuffer(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

async function uploadMediaToSupabase(userId: string, taskId: string, mediaItems: MediaItem[]): Promise<MediaItem[]> {
  const uploadedMedia: MediaItem[] = [];
  for (const item of mediaItems) {
    if (item.file_url.startsWith('http://') || item.file_url.startsWith('https://')) {
      uploadedMedia.push(item);
      continue;
    }

    try {
      const fileUri = item.file_url;
      const fileName = `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;
      const filePath = `${userId}/${taskId}/${fileName}`;

      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const arrayBuffer = base64ToArrayBuffer(base64);

      const { error: uploadError } = await supabase.storage
        .from('task-media')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        console.warn('Error uploading media to storage:', uploadError.message);
        uploadedMedia.push(item);
        continue;
      }

      const { data: publicUrlData } = supabase.storage
        .from('task-media')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      const { data: mediaRow, error: dbError } = await supabase
        .from('media')
        .insert({
          user_id: userId,
          task_id: taskId,
          file_url: publicUrl,
          file_path: filePath,
          type: 'image',
        })
        .select()
        .single();

      if (dbError) {
        console.warn('Error inserting media record into DB:', dbError.message);
      }

      uploadedMedia.push({
        id: mediaRow?.id || item.id,
        user_id: userId,
        task_id: taskId,
        file_url: publicUrl,
        file_path: filePath,
        type: 'image',
      });
    } catch (err) {
      console.warn('Error processing media upload:', err);
      uploadedMedia.push(item);
    }
  }
  return uploadedMedia;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
  subjects: INITIAL_SUBJECTS,
  grades: INITIAL_GRADES,
  tasks: INITIAL_TASKS,
  profile: null,
  theme: 'system',
  isOfflineMode: false,
  isLoading: false,

  setTheme: (theme) => set({ theme }),
  setOfflineMode: (enabled) => set({ isOfflineMode: enabled }),

  clearStore: () => {
    set({
      subjects: [],
      grades: [],
      tasks: [],
      profile: null,
      isOfflineMode: false,
    });
  },

  fetchData: async () => {
    if (!isSupabaseConfigured()) return;
    try {
      set({ isLoading: true });
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      // Si no hay usuario autenticado, no sobrescribir con Supabase (mantener lo local o dejarlo vacío según corresponda)
      if (!userId) {
        set({ isLoading: false });
        return;
      }

      const [subsRes, gradesRes, tasksRes, mediaRes, profileRes] = await Promise.all([
        supabase.from('subjects').select('*').eq('user_id', userId),
        supabase.from('grades').select('*').eq('user_id', userId),
        supabase.from('tasks').select('*').eq('user_id', userId),
        supabase.from('media').select('*').eq('user_id', userId),
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      ]);

      if (subsRes.error) console.error("Error Supabase fetching subjects:", subsRes.error.message);
      if (gradesRes.error) console.error("Error Supabase fetching grades:", gradesRes.error.message);
      if (tasksRes.error) console.error("Error Supabase fetching tasks:", tasksRes.error.message);
      if (mediaRes.error) console.error("Error Supabase fetching media:", mediaRes.error.message);
      if ('error' in profileRes && profileRes.error) console.error("Error Supabase fetching profile:", profileRes.error.message);

      const tasksWithMedia = (tasksRes.data || []).map((t: Task) => ({
        ...t,
        media: (mediaRes.data || []).filter((m: any) => m.task_id === t.id),
      }));

      // Asignar los datos del usuario actual (si no tiene, debe quedar vacío, no con los datos del usuario anterior)
      set({
        subjects: subsRes.data || [],
        grades: gradesRes.data || [],
        tasks: tasksWithMedia,
        profile: profileRes.data || null,
      });
    } catch (err) {
      console.warn('Error fetching from Supabase:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  syncLocalDataToUser: async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;

      const state = get();
      // Si tenemos materias locales que no tienen user_id o tienen el id anterior, sincronizarlas
      for (const subject of state.subjects) {
        if (!subject.user_id || subject.user_id !== userId) {
          await supabase.from('subjects').upsert({
            id: subject.id,
            user_id: userId,
            name: subject.name,
            code: subject.code,
            color: subject.color,
            target_grade: subject.target_grade,
            min_passing_grade: subject.min_passing_grade,
            scale_max: subject.scale_max,
            is_archived: subject.is_archived,
          });
        }
      }

      for (const grade of state.grades) {
        if (!grade.user_id || grade.user_id !== userId) {
          await supabase.from('grades').upsert({
            id: grade.id,
            user_id: userId,
            subject_id: grade.subject_id,
            name: grade.name,
            weight_percentage: grade.weight_percentage,
            grade: grade.grade,
            is_evaluated: grade.is_evaluated,
          });
        }
      }

      for (const task of state.tasks) {
        if (!task.user_id || task.user_id !== userId) {
          await supabase.from('tasks').upsert({
            id: task.id,
            user_id: userId,
            subject_id: task.subject_id,
            title: task.title,
            notes: task.notes,
            due_date: task.due_date,
            priority: task.priority,
            is_completed: task.is_completed,
            is_class_log: task.is_class_log,
          });
        }
      }
      
      // Actualizar user_id en el store local
      set((s) => ({
        isOfflineMode: false,
        subjects: s.subjects.map((sub) => ({ ...sub, user_id: userId })),
        grades: s.grades.map((g) => ({ ...g, user_id: userId })),
        tasks: s.tasks.map((t) => ({ ...t, user_id: userId })),
      }));
    } catch (e) {
      console.warn('Error sincronizando datos locales a usuario permanente:', e);
    }
  },

  updateProfile: async (profileUpdates) => {
    set((state) => ({
      profile: { ...(state.profile || {}), ...profileUpdates },
    }));

    if (isSupabaseConfigured()) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: session.user.id,
            email: session.user.email,
            ...profileUpdates,
          });
        if (error) console.error("Error Supabase profiles upsert:", error.message);
      }
    }
  },

  addSubject: async (data) => {
    let userId = '';
    let sessionUser = null;
    if (isSupabaseConfigured()) {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        sessionUser = sessionData.session.user;
        userId = sessionUser.id;
      }
    }

    const createdSubject: Subject = {
      ...data,
      id: generateUUID(),
      user_id: userId,
      is_archived: false,
      created_at: new Date().toISOString(),
    };

    set((state) => ({ subjects: [...state.subjects, createdSubject] }));

    if (isSupabaseConfigured() && sessionUser) {
      const newSubPayload = {
        user_id: userId,
        name: data.name,
        code: data.code,
        color: data.color,
        target_grade: data.target_grade,
        min_passing_grade: data.min_passing_grade,
        scale_max: data.scale_max,
        is_archived: false,
      };

      try {
        const { data: inserted, error } = await supabase
          .from('subjects')
          .insert([newSubPayload])
          .select()
          .single();

        if (error) {
          console.warn('Supabase offline/sync subject error (saved locally):', error.message);
        } else if (inserted) {
          // Actualizar con el ID real o confirmado de Supabase si es necesario
          set((state) => ({
            subjects: state.subjects.map((s) => (s.id === createdSubject.id ? inserted : s)),
          }));
          return inserted;
        }
      } catch (err) {
        console.warn('Network error saving subject to Supabase (saved locally):', err);
      }
    }

    return createdSubject;
  },

  updateSubject: async (id, updates) => {
    set((state) => ({
      subjects: state.subjects.map((sub) => (sub.id === id ? { ...sub, ...updates } : sub)),
    }));

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('subjects').update(updates).eq('id', id);
      if (error) console.error("Supabase update subject error:", error.message);
    }
  },

  deleteSubject: async (id) => {
    set((state) => ({
      subjects: state.subjects.filter((sub) => sub.id !== id),
      grades: state.grades.filter((g) => g.subject_id !== id),
      tasks: state.tasks.filter((t) => t.subject_id !== id),
    }));

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('subjects').delete().eq('id', id);
      if (error) console.error("Supabase delete subject error:", error.message);
    }
  },

  addGrade: async (data) => {
    let userId = '';
    let sessionUser = null;
    if (isSupabaseConfigured()) {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        sessionUser = sessionData.session.user;
        userId = sessionUser.id;
      }
    }

    const newGrade: Grade = {
      ...data,
      id: generateUUID(),
      user_id: userId,
      created_at: new Date().toISOString(),
    };

    set((state) => ({ grades: [...state.grades, newGrade] }));

    if (isSupabaseConfigured() && sessionUser) {
      const payload = {
        user_id: userId,
        subject_id: data.subject_id,
        name: data.name,
        weight_percentage: data.weight_percentage,
        grade: data.grade,
        is_evaluated: data.is_evaluated,
      };

      try {
        const { data: inserted, error } = await supabase
          .from('grades')
          .insert([payload])
          .select()
          .single();

        if (error) {
          console.warn('Supabase offline/sync grade error (saved locally):', error.message);
        } else if (inserted) {
          set((state) => ({
            grades: state.grades.map((g) => (g.id === newGrade.id ? inserted : g)),
          }));
        }
      } catch (err) {
        console.warn('Network error saving grade to Supabase (saved locally):', err);
      }
    }
  },

  updateGrade: async (id, updates) => {
    set((state) => ({
      grades: state.grades.map((gr) => (gr.id === id ? { ...gr, ...updates } : gr)),
    }));

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('grades').update(updates).eq('id', id);
      if (error) console.error("Supabase update grade error:", error.message);
    }
  },

  deleteGrade: async (id) => {
    set((state) => ({
      grades: state.grades.filter((gr) => gr.id !== id),
    }));

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('grades').delete().eq('id', id);
      if (error) console.error("Supabase delete grade error:", error.message);
    }
  },

  addTask: async (data, media = []) => {
    let userId = '';
    let sessionUser = null;
    if (isSupabaseConfigured()) {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        sessionUser = sessionData.session.user;
        userId = sessionUser.id;
      }
    }

    let newTask: Task = {
      ...data,
      id: generateUUID(),
      user_id: userId,
      is_completed: false,
      media,
      notification_ids: [],
      created_at: new Date().toISOString(),
    };

    const subject = get().subjects.find((s) => s.id === data.subject_id);
    const subjectName = subject ? subject.name : 'Materia';

    if (data.due_date) {
      try {
        const notifIds = await scheduleTaskAlerts(newTask, subjectName);
        newTask.notification_ids = notifIds;
      } catch (err) {
        console.warn('Error programando alertas:', err);
      }
    }

    set((state) => ({ tasks: [newTask, ...state.tasks] }));

    if (isSupabaseConfigured() && sessionUser) {
      const payload = {
        user_id: userId,
        subject_id: data.subject_id,
        title: data.title,
        notes: data.notes,
        due_date: data.due_date,
        priority: data.priority,
        is_completed: false,
        is_class_log: data.is_class_log,
      };

      try {
        const { data: inserted, error } = await supabase
          .from('tasks')
          .insert([payload])
          .select()
          .single();

        if (error) {
          console.warn('Supabase offline/sync task error (saved locally):', error.message);
        } else if (inserted) {
          const uploadedMedia = await uploadMediaToSupabase(userId, inserted.id, media);
          const syncedTask = { ...inserted, media: uploadedMedia, notification_ids: newTask.notification_ids };
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === newTask.id ? syncedTask : t)),
          }));
          newTask = syncedTask;
        }
      } catch (err) {
        console.warn('Network error saving task to Supabase (saved locally):', err);
      }
    }

    return newTask;
  },

  updateTask: async (id, updates, media) => {
    const existingTask = get().tasks.find((t) => t.id === id);
    if (!existingTask) return null;

    const subjectId = updates.subject_id || existingTask.subject_id;
    const subject = get().subjects.find((s) => s.id === subjectId);
    const subjectName = subject ? subject.name : 'Materia';

    if (existingTask.notification_ids?.length) {
      try {
        await cancelTaskAlerts(existingTask.notification_ids);
      } catch (err) {
        console.warn('Error cancelando alertas anteriores:', err);
      }
    }

    let newNotificationIds: string[] = [];
    const updatedDueDate = updates.due_date !== undefined ? updates.due_date : existingTask.due_date;
    const updatedPriority = updates.priority !== undefined ? updates.priority : existingTask.priority;
    const isCompleted = updates.is_completed !== undefined ? updates.is_completed : existingTask.is_completed;

    const updatedTask: Task = {
      ...existingTask,
      ...updates,
      due_date: updatedDueDate,
      priority: updatedPriority,
      media: media !== undefined ? media : existingTask.media,
      updated_at: new Date().toISOString(),
    };

    if (!isCompleted && updatedDueDate) {
      try {
        newNotificationIds = await scheduleTaskAlerts(updatedTask, subjectName);
      } catch (err) {
        console.warn('Error reprogramando alertas:', err);
      }
    }

    updatedTask.notification_ids = newNotificationIds;

    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
    }));

    if (isSupabaseConfigured()) {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (userId && media !== undefined) {
        const uploadedMedia = await uploadMediaToSupabase(userId, id, media);
        updatedTask.media = uploadedMedia;
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
        }));
      }

      const { error } = await supabase.from('tasks').update(updates).eq('id', id);
      if (error) console.error("Supabase update task error:", error.message);
    }

    return updatedTask;
  },

  toggleTaskCompleted: async (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;

    const nextCompleted = !task.is_completed;

    if (nextCompleted && task.notification_ids?.length) {
      await cancelTaskAlerts(task.notification_ids);
    }

    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, is_completed: nextCompleted } : t
      ),
    }));

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('tasks').update({ is_completed: nextCompleted }).eq('id', id);
      if (error) console.error("Supabase toggle task error:", error.message);
    }
  },

  deleteTask: async (id) => {
    const task = get().tasks.find((t) => t.id === id);
    const notifs = task?.notification_ids || [];
    if (notifs.length) {
      await cancelTaskAlerts(notifs);
    }
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    }));

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) console.error("Supabase delete task error:", error.message);
    }
  },

  getGradesForSubject: (subjectId) => {
    return get().grades.filter((g) => g.subject_id === subjectId);
  },

  getTasksForSubject: (subjectId) => {
    return get().tasks.filter((t) => t.subject_id === subjectId);
  },
}),
  {
    name: 'notasegura-storage',
    storage: createJSONStorage(() => AsyncStorage),
  }
));
