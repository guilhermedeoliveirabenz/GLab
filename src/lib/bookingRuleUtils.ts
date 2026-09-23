/**
 * Regras Oficiais de Agendamento Escolar de Laboratórios
 * - Antecedência mínima: Pelo menos 3 dias úteis.
 * - Prazo máximo: No máximo 20 dias úteis para frente.
 * - Finais de semana: Agendamentos aos sábados e domingos são permitidos.
 * - Contagem de dias úteis para prazos: Segunda a Sexta-feira.
 */

export const MIN_BOOKING_ADVANCE_WORKING_DAYS = 3;
export const MAX_BOOKING_ADVANCE_WORKING_DAYS = 20;

/**
 * Retorna a data local de hoje no formato YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Verifica se uma data YYYY-MM-DD cai em um final de semana (sábado ou domingo)
 */
export function isWeekend(dateStr: string): boolean {
  if (!dateStr) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Domingo, 6 = Sábado
}

/**
 * Verifica se uma data YYYY-MM-DD é um dia útil (segunda a sexta)
 */
export function isWorkingDay(dateStr: string): boolean {
  return !isWeekend(dateStr);
}

/**
 * Adiciona uma quantidade específica de dias úteis a uma data YYYY-MM-DD
 * Pula sábados (6) e domingos (0)
 */
export function addWorkingDaysToDate(startDateStr: string, workingDaysToAdd: number): string {
  if (!startDateStr || workingDaysToAdd <= 0) return startDateStr;
  const [y, m, d] = startDateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);

  let added = 0;
  while (added < workingDaysToAdd) {
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
 * Conta quantos dias úteis existem entre a data de início e a data alvo.
 * A contagem começa a partir do primeiro dia útil seguinte ao baseDate.
 * Se targetDate <= baseDate, retorna <= 0.
 */
export function countWorkingDaysBetween(baseDateStr: string, targetDateStr: string): number {
  if (!baseDateStr || !targetDateStr) return 0;
  if (targetDateStr === baseDateStr) return 0;
  if (targetDateStr < baseDateStr) return -1;

  const [by, bm, bd] = baseDateStr.split('-').map(Number);
  const [ty, tm, td] = targetDateStr.split('-').map(Number);

  const current = new Date(by, bm - 1, bd);
  const target = new Date(ty, tm - 1, td);

  let count = 0;
  while (current < target) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
  }

  return count;
}

/**
 * Formata YYYY-MM-DD para DD/MM/AAAA
 */
export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Formata YYYY-MM-DD para "DD/MM/AAAA (Dia-da-semana)"
 */
export function formatDateWithWeekdayBR(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' });
  const formatted = formatDateBR(dateStr);
  return `${formatted} (${weekday})`;
}

/**
 * Retorna os limites válidos de agendamento a partir de uma data de referência (hoje)
 */
export function getBookingDateLimits(referenceDateStr = getTodayDateString()): {
  todayStr: string;
  todayFormatted: string;
  minDate: string;
  maxDate: string;
  minDateFormatted: string;
  maxDateFormatted: string;
  minDateFull: string;
  maxDateFull: string;
} {
  const todayStr = referenceDateStr;
  const minDate = addWorkingDaysToDate(todayStr, MIN_BOOKING_ADVANCE_WORKING_DAYS);
  let maxDate = addWorkingDaysToDate(todayStr, MAX_BOOKING_ADVANCE_WORKING_DAYS);

  // Se a data limite máxima cair em uma sexta-feira, estende até domingo
  // para permitir o agendamento de sábado e domingo daquela mesma semana
  const [my, mm, md] = maxDate.split('-').map(Number);
  const maxObj = new Date(my, mm - 1, md);
  if (maxObj.getDay() === 5) { // Sexta-feira
    maxObj.setDate(maxObj.getDate() + 2); // Estende até domingo
    const yr = maxObj.getFullYear();
    const mo = String(maxObj.getMonth() + 1).padStart(2, '0');
    const da = String(maxObj.getDate()).padStart(2, '0');
    maxDate = `${yr}-${mo}-${da}`;
  }

  return {
    todayStr,
    todayFormatted: formatDateBR(todayStr),
    minDate,
    maxDate,
    minDateFormatted: formatDateBR(minDate),
    maxDateFormatted: formatDateBR(maxDate),
    minDateFull: formatDateWithWeekdayBR(minDate),
    maxDateFull: formatDateWithWeekdayBR(maxDate),
  };
}

export interface BookingDateValidationResult {
  isValid: boolean;
  isWeekend: boolean;
  workingDaysAhead: number;
  errorReason: string | null;
  warningMessage: string | null;
  minAllowedDate: string;
  maxAllowedDate: string;
}

/**
 * Valida se uma data respeita as regras de agendamento:
 * - Pelo menos 3 dias úteis de antecedência
 * - No máximo 20 dias úteis para frente
 * - Permite agendamentos em dias de semana E em finais de semana (sábados e domingos)
 */
export function validateBookingLeadTime(
  dateStr: string,
  referenceDateStr = getTodayDateString(),
): BookingDateValidationResult {
  const limits = getBookingDateLimits(referenceDateStr);
  const weekend = isWeekend(dateStr);

  if (!dateStr) {
    return {
      isValid: false,
      isWeekend: false,
      workingDaysAhead: 0,
      errorReason: 'Por favor selecione a data do agendamento.',
      warningMessage: null,
      minAllowedDate: limits.minDate,
      maxAllowedDate: limits.maxDate,
    };
  }

  const workingDaysAhead = countWorkingDaysBetween(referenceDateStr, dateStr);

  // 1. Data no passado ou hoje
  if (dateStr < limits.todayStr) {
    return {
      isValid: false,
      isWeekend: weekend,
      workingDaysAhead,
      errorReason: 'Não é permitido realizar agendamento em datas passadas.',
      warningMessage: null,
      minAllowedDate: limits.minDate,
      maxAllowedDate: limits.maxDate,
    };
  }

  if (dateStr === limits.todayStr) {
    return {
      isValid: false,
      isWeekend: weekend,
      workingDaysAhead: 0,
      errorReason: `O agendamento exige no mínimo ${MIN_BOOKING_ADVANCE_WORKING_DAYS} dias úteis de antecedência. Não é permitido agendar para o mesmo dia.`,
      warningMessage: null,
      minAllowedDate: limits.minDate,
      maxAllowedDate: limits.maxDate,
    };
  }

  // 2. Finais de semana (Sábado e Domingo): Totalmente liberados!
  // Apenas devem obedecer ao prazo de antecedência em dias úteis.

  // 3. Menos de 3 dias úteis de antecedência
  if (dateStr < limits.minDate || workingDaysAhead < MIN_BOOKING_ADVANCE_WORKING_DAYS) {
    return {
      isValid: false,
      isWeekend: weekend,
      workingDaysAhead,
      errorReason: `Antecedência insuficiente: o agendamento deve ser realizado com pelo menos ${MIN_BOOKING_ADVANCE_WORKING_DAYS} dias úteis de antecedência. A data mais próxima permitida é ${limits.minDateFull}.`,
      warningMessage: null,
      minAllowedDate: limits.minDate,
      maxAllowedDate: limits.maxDate,
    };
  }

  // 4. Mais de 20 dias úteis para frente
  if (dateStr > limits.maxDate || workingDaysAhead > MAX_BOOKING_ADVANCE_WORKING_DAYS) {
    return {
      isValid: false,
      isWeekend: weekend,
      workingDaysAhead,
      errorReason: `Prazo limite excedido: o agendamento pode ser feito no máximo ${MAX_BOOKING_ADVANCE_WORKING_DAYS} dias úteis para frente. A data limite máxima é ${limits.maxDateFull}.`,
      warningMessage: null,
      minAllowedDate: limits.minDate,
      maxAllowedDate: limits.maxDate,
    };
  }

  // Data válida e dentro das regras!
  return {
    isValid: true,
    isWeekend: weekend,
    workingDaysAhead,
    errorReason: null,
    warningMessage: `Data válida${weekend ? ' (Fim de semana liberado - Sábado/Domingo)' : ''}: ${workingDaysAhead} dia(s) útil(eis) de antecedência (janela permitida de ${MIN_BOOKING_ADVANCE_WORKING_DAYS} a ${MAX_BOOKING_ADVANCE_WORKING_DAYS} dias úteis).`,
    minAllowedDate: limits.minDate,
    maxAllowedDate: limits.maxDate,
  };
}
