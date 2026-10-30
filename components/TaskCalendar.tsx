import React, { useMemo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Task } from '../src/types/database';
import { useThemeColors } from '../src/utils/theme';

// Configurar calendario en español
LocaleConfig.locales['es'] = {
  monthNames: [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ],
  monthNamesShort: ['Ene.', 'Feb.', 'Mar.', 'Abr.', 'May.', 'Jun.', 'Jul.', 'Ago.', 'Sep.', 'Oct.', 'Nov.', 'Dic.'],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['Dom.', 'Lun.', 'Mar.', 'Mié.', 'Jue.', 'Vie.', 'Sáb.'],
  today: 'Hoy',
};
LocaleConfig.defaultLocale = 'es';

interface TaskCalendarProps {
  tasks: Task[];
  selectedDate: string; // formato 'YYYY-MM-DD'
  onSelectDate: (dateString: string) => void;
}

export function TaskCalendar({ tasks, selectedDate, onSelectDate }: TaskCalendarProps) {
  const colors = useThemeColors();

  // Transformar las tareas al formato requerido por react-native-calendars
  const markedDates = useMemo(() => {
    const marks: { [key: string]: any } = {};

    tasks.forEach((task) => {
      if (!task.due_date) return;
      const dateKey = task.due_date.split('T')[0]; // Formato YYYY-MM-DD

      if (!marks[dateKey]) {
        marks[dateKey] = {
          marked: true,
          dots: [{ key: task.id, color: task.is_completed ? '#10B981' : '#4F46E5' }],
        };
      } else {
        // Añadir punto si hay varias tareas
        if (marks[dateKey].dots.length < 3) {
          marks[dateKey].dots.push({ key: task.id, color: task.is_completed ? '#10B981' : '#4F46E5' });
        }
      }
    });

    // Marcar la fecha seleccionada actualmente
    if (selectedDate) {
      marks[selectedDate] = {
        ...(marks[selectedDate] || {}),
        selected: true,
        selectedColor: '#4F46E5',
      };
    }

    return marks;
  }, [tasks, selectedDate]);

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Calendar
        current={selectedDate || undefined}
        onDayPress={(day) => {
          onSelectDate(day.dateString);
        }}
        markedDates={markedDates}
        markingType={'multi-dot'}
        theme={{
          backgroundColor: colors.card,
          calendarBackground: colors.card,
          textSectionTitleColor: colors.subText,
          selectedDayBackgroundColor: '#4F46E5',
          selectedDayTextColor: '#ffffff',
          todayTextColor: '#4F46E5',
          dayTextColor: colors.text,
          textDisabledColor: colors.mutedText,
          dotColor: '#4F46E5',
          selectedDotColor: '#ffffff',
          arrowColor: '#4F46E5',
          monthTextColor: colors.text,
          indicatorColor: '#4F46E5',
          textDayFontWeight: '500',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '600',
          textDayFontSize: 15,
          textMonthFontSize: 16,
          textDayHeaderFontSize: 13,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});
