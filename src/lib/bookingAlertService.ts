import { Booking } from '../types';

/**
 * Utilitários e serviços de alertas e lembretes de agendamentos:
 * 1. Lembrete preventivo de 1 dia antes do evento (Véspera)
 * 2. Alerta preventivo de 20 minutos antes do início do evento
 * 3. Monitoramento de agendamentos pendentes para Administradores e Técnicos de TI
 */

export type AlertReminderTiming = '1_day_before' | '20_min_before';

export interface UpcomingAlertItem {
  booking: Booking;
  minutesLeft: number;
  alertKey: string;
  timing: AlertReminderTiming;
  timingLabel: string;
}

/**
 * Retorna a data local formatada como YYYY-MM-DD (fuso horário do navegador/dispositivo)
 */
export function getLocalDateStr(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Extrai o horário de início em formato HH:mm a partir de booking.startTime ou booking.timeSlot
 */
export function extractBookingStartTime(booking: Booking): string | null {
  if (booking.startTime && /^\d{1,2}:\d{2}$/.test(booking.startTime.trim())) {
    const [h, m] = booking.startTime.trim().split(':');
    return `${h.padStart(2, '0')}:${m}`;
  }

  // Tenta extrair do timeSlot (ex: "07:30 às 09:10", "08:00 - 09:30", "13h30 - 15h00", "07h às 08h30")
  if (booking.timeSlot) {
    const match = booking.timeSlot.match(/(\d{1,2})[:hH](\d{2})?/);
    if (match) {
      const h = match[1].padStart(2, '0');
      const m = match[2] || '00';
      return `${h}:${m}`;
    }
  }

  return null;
}

/**
 * Calcula a diferença em minutos entre o momento atual e o início do agendamento
 * Retorna null se não for para a mesma data ou se o horário for inválido
 */
export function getMinutesUntilBooking(booking: Booking, now: Date = new Date()): number | null {
  const todayStr = getLocalDateStr(now);
  if (booking.date !== todayStr) {
    return null;
  }

  const startTimeStr = extractBookingStartTime(booking);
  if (!startTimeStr) return null;

  const [hours, minutes] = startTimeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;

  const bookingStartDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hours,
    minutes,
    0,
    0
  );

  const diffMs = bookingStartDate.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  return diffMinutes;
}

const ACKNOWLEDGED_ALERT_PREFIX = 'gestlab_notified_reminder_';
const ACKNOWLEDGED_20MIN_KEY_PREFIX = 'gestlab_notified_20min_';

/**
 * Gera chave única para o lembrete de 1 dia antes (véspera)
 */
export function get1DayAlertKey(booking: Booking): string {
  return `${booking.id}_1day_${booking.date}`;
}

/**
 * Gera chave única para o alerta de 20 minutos de um agendamento
 */
export function get20MinAlertKey(booking: Booking): string {
  const startTime = extractBookingStartTime(booking) || '00:00';
  return `${booking.id}_20min_${booking.date}_${startTime}`;
}

/**
 * Verifica se um alerta/lembrete já foi dispensado ou visualizado
 */
export function isReminderAcknowledged(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return (
      sessionStorage.getItem(ACKNOWLEDGED_ALERT_PREFIX + key) === 'true' ||
      localStorage.getItem(ACKNOWLEDGED_ALERT_PREFIX + key) === 'true' ||
      sessionStorage.getItem(ACKNOWLEDGED_20MIN_KEY_PREFIX + key) === 'true'
    );
  } catch {
    return false;
  }
}

/**
 * Marca um lembrete como notificado/ciente
 */
export function markReminderAcknowledged(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(ACKNOWLEDGED_ALERT_PREFIX + key, 'true');
    localStorage.setItem(ACKNOWLEDGED_ALERT_PREFIX + key, 'true');
    sessionStorage.setItem(ACKNOWLEDGED_20MIN_KEY_PREFIX + key, 'true');
  } catch (e) {
    console.warn('Erro ao salvar acknowledged:', e);
  }
}

export const is20MinAlertAcknowledged = isReminderAcknowledged;
export const mark20MinAlertAcknowledged = markReminderAcknowledged;

/**
 * Localiza todos os lembretes preventivos agendados:
 * 1. Disparado 1 DIA ANTES do evento (véspera do agendamento)
 * 2. Disparado 20 MINUTOS ANTES do início do evento (no dia do agendamento)
 */
export function findScheduledBookingReminders(
  bookings: Booking[],
  now: Date = new Date()
): UpcomingAlertItem[] {
  const todayStr = getLocalDateStr(now);

  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrowStr = getLocalDateStr(tomorrow);

  const results: UpcomingAlertItem[] = [];

  for (const b of bookings) {
    // Ignora agendamentos cancelados ou rejeitados
    if (b.status === 'cancelled' || b.status === 'rejected') continue;

    // 1. DISPARO DE 1 DIA ANTES (Véspera do evento)
    if (b.date === tomorrowStr) {
      const startTimeStr = extractBookingStartTime(b) || '07:30';
      const [h, m] = startTimeStr.split(':').map(Number);
      const eventStart = new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate(),
        h || 7,
        m || 0,
        0,
        0
      );
      const diffMinutes = Math.max(1, Math.floor((eventStart.getTime() - now.getTime()) / 60000));
      const alertKey = get1DayAlertKey(b);

      results.push({
        booking: b,
        timing: '1_day_before',
        timingLabel: '1 dia antes (Amanhã)',
        minutesLeft: diffMinutes,
        alertKey,
      });
      continue;
    }

    // 2. DISPARO DE 20 MINUTOS ANTES (No dia do evento)
    if (b.date === todayStr) {
      const minutesLeft = getMinutesUntilBooking(b, now);
      if (minutesLeft !== null && minutesLeft >= 0 && minutesLeft <= 20) {
        const alertKey = get20MinAlertKey(b);
        results.push({
          booking: b,
          timing: '20_min_before',
          timingLabel: '20 minutos antes',
          minutesLeft,
          alertKey,
        });
      }
    }
  }

  // Ordenação: 20 minutos antes têm prioridade mais urgente (menor minutesLeft), depois os de 1 dia antes
  return results.sort((a, b) => {
    if (a.timing === '20_min_before' && b.timing === '1_day_before') return -1;
    if (a.timing === '1_day_before' && b.timing === '20_min_before') return 1;
    return a.minutesLeft - b.minutesLeft;
  });
}

/**
 * Mantém compatibilidade com chamadas anteriores de findUpcoming20MinAlerts
 */
export const findUpcoming20MinAlerts = findScheduledBookingReminders;

/**
 * Filtra agendamentos pendentes relevantes para o perfil do usuário
 * (se for técnico com laboratórios atribuídos, destaca os seus)
 */
export function getPendingBookingsForUser(
  bookings: Booking[],
  assignedLabIds?: string[]
): {
  allPending: Booking[];
  assignedPending: Booking[];
} {
  const allPending = bookings.filter((b) => b.status === 'pending');

  if (!assignedLabIds || assignedLabIds.length === 0 || assignedLabIds.includes('all')) {
    return {
      allPending,
      assignedPending: allPending,
    };
  }

  const assignedSet = new Set(assignedLabIds);
  const assignedPending = allPending.filter((b) => assignedSet.has(b.labId));

  return {
    allPending,
    assignedPending,
  };
}
