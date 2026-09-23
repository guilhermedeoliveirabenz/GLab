import { Booking } from '../types';

/**
 * Utilitários e serviços de alertas de agendamentos:
 * 1. Monitoramento de agendamentos pendentes para Administradores e Técnicos de TI
 * 2. Alertas preventivos de 20 minutos antes do início do agendamento
 */

export interface UpcomingAlertItem {
  booking: Booking;
  minutesLeft: number;
  alertKey: string;
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

const ACKNOWLEDGED_20MIN_KEY_PREFIX = 'gestlab_notified_20min_';

/**
 * Gera uma chave unívoca para o alerta de 20 minutos de um agendamento
 */
export function get20MinAlertKey(booking: Booking): string {
  const startTime = extractBookingStartTime(booking) || '00:00';
  return `${booking.id}_${booking.date}_${startTime}`;
}

/**
 * Verifica se o alerta de 20min já foi disparado/confirmado pelo usuário
 */
export function is20MinAlertAcknowledged(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(ACKNOWLEDGED_20MIN_KEY_PREFIX + key) === 'true';
  } catch {
    return false;
  }
}

/**
 * Marca o alerta de 20min como notificado/ciente para esta sessão
 */
export function mark20MinAlertAcknowledged(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(ACKNOWLEDGED_20MIN_KEY_PREFIX + key, 'true');
  } catch (e) {
    console.warn('Erro ao salvar acknowledged no sessionStorage:', e);
  }
}

/**
 * Localiza todos os agendamentos de hoje que iniciam em 20 minutos ou menos (até 0 min)
 * e que ainda não foram dispensados/reconhecidos
 */
export function findUpcoming20MinAlerts(
  bookings: Booking[],
  now: Date = new Date()
): UpcomingAlertItem[] {
  const todayStr = getLocalDateStr(now);
  const results: UpcomingAlertItem[] = [];

  for (const b of bookings) {
    // Ignora agendamentos cancelados ou rejeitados
    if (b.status === 'cancelled' || b.status === 'rejected') continue;
    if (b.date !== todayStr) continue;

    const minutesLeft = getMinutesUntilBooking(b, now);
    if (minutesLeft === null) continue;

    // Janela de 20 minutos antes do início (entre 0 e 20 minutos)
    if (minutesLeft >= 0 && minutesLeft <= 20) {
      const alertKey = get20MinAlertKey(b);
      results.push({
        booking: b,
        minutesLeft,
        alertKey,
      });
    }
  }

  // Ordena pelos que iniciam mais rápido
  return results.sort((a, b) => a.minutesLeft - b.minutesLeft);
}

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
