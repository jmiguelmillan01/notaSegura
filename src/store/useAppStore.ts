import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Subject, Grade, Task, MediaItem, TaskPriority } from '../types/database';
import { scheduleTaskAlerts, cancelTaskAlerts } from '../services/notifications';
import { supabase, isSupabaseConfigured } from '../services/supabase';

interface AppState {
  subjects: Subject[];
  grades: Grade[];
  tasks: Task[];
  profile: { full_name?: string; institution?: string; major?: string; bio?: string } | null;
  isLoading: boolean;

  fetchData: () => Promise<void>;
  updateProfile: (profile: { full_name?: string; institution?: string; major?: string; bio?: string }) => Promise<void>;
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

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
  subjects: INITIAL_SUBJECTS,
  grades: INITIAL_GRADES,
  tasks: INITIAL_TASKS,
  profile: null,
  isLoading: false,

  clearStore: () => {
    set({
      subjects: [],
      grades: [],
      tasks: [],
      profile: null,
    });
  },

  fetchData: async () => {
    if (!isSupabaseConfigured()) return;
    try {
      set({ isLoading: true });
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      const [subsRes, gradesRes, tasksRes, profileRes] = await Promise.all([
        supabase.from('subjects').select('*'),
        supabase.from('grades').select('*'),
        supabase.from('tasks').select('*'),
        userId ? supabase.from('profiles').select('*').eq('id', userId).maybeSingle() : Promise.resolve({ data: null }),
      ]);

      if (subsRes.error) console.error("Error Supabase fetching subjects:", subsRes.error.message);
      if (gradesRes.error) console.error("Error Supabase fetching grades:", gradesRes.error.message);
      if (tasksRes.error) console.error("Error Supabase fetching tasks:", tasksRes.error.message);
      if ('error' in profileRes && profileRes.error) console.error("Error Supabase fetching profile:", profileRes.error.message);

      if (subsRes.data && subsRes.data.length > 0) {
        set({ subjects: subsRes.data });
      }
      if (gradesRes.data && gradesRes.data.length > 0) {
        set({ grades: gradesRes.data });
      }
      if (tasksRes.data && tasksRes.data.length > 0) {
        set({ tasks: tasksRes.data });
      }
      if (profileRes.data) {
        set({ profile: profileRes.data });
      }
    } catch (err) {
      console.warn('Error fetching from Supabase:', err);
    } finally {
      set({ isLoading: false });
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
    let userId = '00000000-0000-0000-0000-000000000000';
    if (isSupabaseConfigured()) {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        userId = sessionData.session.user.id;
      }
    }

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

    let createdSubject: Subject;

    if (isSupabaseConfigured()) {
      const { data: inserted, error } = await supabase
        .from('subjects')
        .insert([newSubPayload])
        .select()
        .single();

      if (error) {
        console.error('Supabase insert subject error:', error.message, error.details, error.hint);
        // Generar ID local para que la app no se rompa si falla Supabase (fallback)
        createdSubject = {
          ...data,
          id: generateUUID(),
          user_id: userId,
          is_archived: false,
          created_at: new Date().toISOString(),
        };
      } else {
        createdSubject = inserted;
      }
    } else {
      createdSubject = {
        ...data,
        id: generateUUID(),
        user_id: userId,
        is_archived: false,
        created_at: new Date().toISOString(),
      };
    }

    set((state) => ({ subjects: [...state.subjects, createdSubject] }));
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
    let userId = '00000000-0000-0000-0000-000000000000';
    if (isSupabaseConfigured()) {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        userId = sessionData.session.user.id;
      }
    }

    const payload = {
      user_id: userId,
      subject_id: data.subject_id,
      name: data.name,
      weight_percentage: data.weight_percentage,
      grade: data.grade,
      is_evaluated: data.is_evaluated,
    };

    let newGrade: Grade;

    if (isSupabaseConfigured()) {
      const { data: inserted, error } = await supabase
        .from('grades')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('Supabase insert grade error:', error.message);
      }
      if (inserted) {
        newGrade = inserted;
      } else {
        newGrade = {
          ...data,
          id: generateUUID(),
          user_id: userId,
          created_at: new Date().toISOString(),
        };
      }
    } else {
      newGrade = {
        ...data,
        id: generateUUID(),
        user_id: userId,
        created_at: new Date().toISOString(),
      };
    }

    set((state) => ({ grades: [...state.grades, newGrade] }));
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
    let userId = '00000000-0000-0000-0000-000000000000';
    if (isSupabaseConfigured()) {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        userId = sessionData.session.user.id;
      }
    }

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

    let newTask: Task;

    if (isSupabaseConfigured()) {
      const { data: inserted, error } = await supabase
        .from('tasks')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('Supabase insert task error:', error.message);
      }
      if (inserted) {
        newTask = {
          ...inserted,
          media,
          notification_ids: [],
        };
      } else {
        newTask = {
          ...data,
          id: generateUUID(),
          user_id: userId,
          is_completed: false,
          media,
          notification_ids: [],
          created_at: new Date().toISOString(),
        };
      }
    } else {
      newTask = {
        ...data,
        id: generateUUID(),
        user_id: userId,
        is_completed: false,
        media,
        notification_ids: [],
        created_at: new Date().toISOString(),
      };
    }

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
