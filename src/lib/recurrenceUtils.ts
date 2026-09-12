import { RecurrenceType } from '../types';

/**
 * Adiciona dias a uma data em formato YYYY-MM-DD
 */
export function addDaysToDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Pula finais de semana para agendamentos diários (opção comum escolar: seg a sex)
 */
export function addWorkingDays(dateStr: string, daysToAdd: number): string {
  let [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  let added = 0;
  while (added < daysToAdd) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++;
    }
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Gera lista de datas futuras baseado no tipo de recorrência e quantidade de ocorrências
 */
export function generateRecurrenceDates(
  startDateStr: string,
  frequency: RecurrenceType,
  count: number,
  skipWeekends = true,
): string[] {
  if (frequency === 'none' || count <= 1) {
    return [startDateStr];
  }

  const dates: string[] = [startDateStr];

  for (let i = 1; i < count; i++) {
    if (frequency === 'daily') {
      if (skipWeekends) {
        dates.push(addWorkingDays(dates[dates.length - 1], 1));
      } else {
        dates.push(addDaysToDate(dates[dates.length - 1], 1));
      }
    } else if (frequency === 'weekly') {
      dates.push(addDaysToDate(startDateStr, i * 7));
    } else if (frequency === 'biweekly') {
      dates.push(addDaysToDate(startDateStr, i * 14));
    }
  }

  return dates;
}
