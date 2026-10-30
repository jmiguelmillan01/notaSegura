export type TaskPriority = 'high' | 'medium' | 'low';
export type MediaType = 'image' | 'audio';

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  institution?: string;
  major?: string;
  bio?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  user_id: string;
  name: string;
  code?: string;
  color: string;
  target_grade: number; // Nota meta, ej: 4.0
  min_passing_grade: number; // Nota mínima aprobatoria, ej: 3.0
  scale_max: number; // Escala máxima, ej: 5.0
  is_archived?: boolean; // Soft delete
  created_at?: string;
  updated_at?: string;
}

export interface Grade {
  id: string;
  user_id: string;
  subject_id: string;
  name: string; // Ej: "Parcial 1", "Taller 1"
  weight_percentage: number; // 0 a 100%
  grade: number | null; // Calificación obtenida (null si aún no se califica)
  is_evaluated: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MediaItem {
  id: string;
  user_id: string;
  task_id: string;
  file_url: string;
  file_path: string;
  type: MediaType;
  duration_seconds?: number;
  file_size_bytes?: number;
  created_at?: string;
}

export interface Task {
  id: string;
  user_id: string;
  subject_id?: string;
  title: string;
  notes?: string;
  due_date: string; // ISO String
  priority: TaskPriority;
  is_completed: boolean;
  is_class_log: boolean; // true si es una bitácora de clase
  media?: MediaItem[];
  notification_ids?: string[];
  created_at?: string;
  updated_at?: string;
}

// Resultado del cálculo y proyección de notas (CU-03)
export type GradeStatus = 'passed' | 'achievable' | 'at_risk' | 'impossible';

export interface SubjectGradeSimulation {
  subjectId: string;
  subjectName: string;
  minPassingGrade: number;
  targetGrade: number;
  scaleMax: number;
  totalEvaluatedWeight: number; // Suma de % ya evaluados (ej: 30%)
  remainingWeight: number; // % faltante por evaluar (ej: 70%)
  currentAccumulatedGrade: number; // Nota acumulada real actual (ej: 1.20)
  requiredAverageForMinPassing: number; // Nota promedio necesaria para pasar (ej: 2.57)
  requiredAverageForTarget: number; // Nota promedio necesaria para la meta
  status: GradeStatus;
  statusMessage: string;
}

