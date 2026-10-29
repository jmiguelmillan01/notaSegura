import { Grade, Subject, SubjectGradeSimulation, GradeStatus } from '../types/database';

/**
 * CU-03: Simulación y Proyección de Notas
 * Procesa las calificaciones registradas de una materia y calcula:
 * - Nota acumulada actual
 * - Porcentaje faltante por evaluar
 * - Nota promedio requerida en el resto del semestre para aprobar (min_passing_grade) y para meta (target_grade)
 * - Estado semafórico (Aprobado, En camino, En riesgo, Imposible)
 */
export function calculateSubjectGrades(
  subject: Subject,
  grades: Grade[]
): SubjectGradeSimulation {
  const evaluatedGrades = grades.filter(
    (g) => g.is_evaluated && g.grade !== null && typeof g.grade === 'number'
  );

  let totalEvaluatedWeight = 0;
  let currentAccumulatedGrade = 0;

  for (const item of evaluatedGrades) {
    const weight = Number(item.weight_percentage) || 0;
    const grade = Number(item.grade) || 0;
    totalEvaluatedWeight += weight;
    currentAccumulatedGrade += grade * (weight / 100);
  }

  // Redondear a 2 decimales para evitar problemas de precisión flotante
  totalEvaluatedWeight = Math.min(100, Math.round(totalEvaluatedWeight * 100) / 100);
  currentAccumulatedGrade = Math.round(currentAccumulatedGrade * 100) / 100;

  const remainingWeight = Math.max(0, Math.round((100 - totalEvaluatedWeight) * 100) / 100);
  const minPassing = subject.min_passing_grade || 3.0;
  const target = subject.target_grade || minPassing;
  const scaleMax = subject.scale_max || 5.0;

  let requiredAverageForMinPassing = 0;
  let requiredAverageForTarget = 0;
  let status: GradeStatus = 'achievable';
  let statusMessage = '';

  // Caso 1: Semestre 100% evaluado
  if (remainingWeight === 0) {
    if (currentAccumulatedGrade >= minPassing) {
      status = 'passed';
      statusMessage = `¡Materia aprobada! Calificación final definitiva: ${currentAccumulatedGrade.toFixed(2)}`;
    } else {
      status = 'impossible';
      statusMessage = `Semestre concluido. Calificación final: ${currentAccumulatedGrade.toFixed(2)}. No se alcanzó la nota mínima (${minPassing.toFixed(2)}).`;
    }
    return {
      subjectId: subject.id,
      subjectName: subject.name,
      minPassingGrade: minPassing,
      targetGrade: target,
      scaleMax,
      totalEvaluatedWeight,
      remainingWeight,
      currentAccumulatedGrade,
      requiredAverageForMinPassing: 0,
      requiredAverageForTarget: 0,
      status,
      statusMessage,
    };
  }

  // Caso 2: Falta porcentaje por evaluar
  const pointsNeededForMinPassing = minPassing - currentAccumulatedGrade;
  const pointsNeededForTarget = target - currentAccumulatedGrade;

  // Si ya tiene los puntos suficientes para pasar sin necesidad de evaluar lo que falta
  if (pointsNeededForMinPassing <= 0) {
    status = 'passed';
    requiredAverageForMinPassing = 0;
    statusMessage = `¡Aprobación asegurada! Llevas ${currentAccumulatedGrade.toFixed(2)} acumulado, superando la nota mínima (${minPassing.toFixed(2)}).`;
  } else {
    // Nota promedio necesaria en el porcentaje restante
    const reqMin = pointsNeededForMinPassing / (remainingWeight / 100);
    requiredAverageForMinPassing = Math.round(reqMin * 100) / 100;

    if (requiredAverageForMinPassing > scaleMax) {
      status = 'impossible';
      statusMessage = `Llevas ${currentAccumulatedGrade.toFixed(2)} acumulado (${totalEvaluatedWeight}% evaluado). Necesitarías ${requiredAverageForMinPassing.toFixed(2)} sobre ${scaleMax.toFixed(2)} en el ${remainingWeight}% restante, lo cual excede el límite máximo.`;
    } else if (requiredAverageForMinPassing >= scaleMax * 0.75) {
      status = 'at_risk';
      statusMessage = `Llevas ${currentAccumulatedGrade.toFixed(2)} acumulado. Falta ${remainingWeight}% por evaluar. Necesitas un promedio de ${requiredAverageForMinPassing.toFixed(2)} en lo restante para pasar. ¡Exige máximo esfuerzo!`;
    } else {
      status = 'achievable';
      statusMessage = `Llevas ${currentAccumulatedGrade.toFixed(2)} acumulado. Falta ${remainingWeight}% por evaluar. Necesitas un promedio de ${requiredAverageForMinPassing.toFixed(2)} en el resto del semestre para pasar.`;
    }
  }

  // Cálculo para meta (target)
  if (pointsNeededForTarget <= 0) {
    requiredAverageForTarget = 0;
  } else {
    const reqTarget = pointsNeededForTarget / (remainingWeight / 100);
    requiredAverageForTarget = Math.round(reqTarget * 100) / 100;
  }

  return {
    subjectId: subject.id,
    subjectName: subject.name,
    minPassingGrade: minPassing,
    targetGrade: target,
    scaleMax,
    totalEvaluatedWeight,
    remainingWeight,
    currentAccumulatedGrade,
    requiredAverageForMinPassing,
    requiredAverageForTarget,
    status,
    statusMessage,
  };
}

