import { Lab } from '../types';

/**
 * Converte data YYYY-MM-DD para formato brasileiro DD/MM/YYYY
 */
export function formatDateBR(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Obtém a data local atual em formato YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Obtém a hora local atual em formato HH:mm
 */
export function getCurrentTimeString(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Verifica se dois intervalos de horário (HH:mm) se sobrepõem
 */
export function doTimesOverlap(
  startA?: string,
  endA?: string,
  startB?: string,
  endB?: string,
): boolean {
  if (!startA || !endA || !startB || !endB) return true; // Se não houver horário específico, assume sobreposição no dia
  return startA < endB && endA > startB;
}

/**
 * Retorna uma descrição formatada legível do período de manutenção
 */
export function formatMaintenancePeriod(lab: Lab): string {
  if (!lab.isUnderMaintenance) {
    return 'Nenhuma manutenção ativa ou agendada.';
  }

  const hasStartDate = Boolean(lab.maintenanceStartDate);
  const hasEndDate = Boolean(lab.maintenanceEndDate);
  const isAllDay = lab.maintenanceAllDay !== false; // Padrão é dia todo se não especificado
  const hasTime = Boolean(lab.maintenanceStartTime && lab.maintenanceEndTime);

  // Sem datas definidas -> Manutenção imediata/indeterminada
  if (!hasStartDate) {
    return 'Interdição Imediata (prazo indeterminado)';
  }

  const startBR = formatDateBR(lab.maintenanceStartDate);
  const endBR = hasEndDate ? formatDateBR(lab.maintenanceEndDate) : startBR;

  let dateText = '';
  if (startBR === endBR) {
    dateText = `Dia ${startBR}`;
  } else {
    dateText = `De ${startBR} até ${endBR}`;
  }

  let timeText = '';
  if (isAllDay || !hasTime) {
    timeText = 'em período integral (dia todo)';
  } else {
    timeText = `das ${lab.maintenanceStartTime} às ${lab.maintenanceEndTime}`;
  }

  return `${dateText}, ${timeText}`;
}

export interface LabMaintenanceCheckResult {
  isUnderMaintenance: boolean; // Se está bloqueado para o contexto consultado
  isScheduledFuture: boolean; // Se é uma manutenção agendada para data futura
  isCurrentlyActive: boolean; // Se a manutenção está em vigor neste momento real
  reason: string;
  formattedPeriod: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
}

/**
 * Avalia detalhadamente o status de manutenção de um laboratório para uma data e horário específicos,
 * ou para o momento atual caso os parâmetros não sejam passados.
 */
export function getLabMaintenanceStatus(
  lab: Lab,
  targetDate?: string, // YYYY-MM-DD
  targetStartTime?: string, // HH:mm
  targetEndTime?: string, // HH:mm
): LabMaintenanceCheckResult {
  const reason = lab.maintenanceReason || 'Em manutenção técnica e preventiva.';
  const formattedPeriod = formatMaintenancePeriod(lab);

  // Se o laboratório NÃO está marcado como em manutenção
  if (!lab.isUnderMaintenance) {
    return {
      isUnderMaintenance: false,
      isScheduledFuture: false,
      isCurrentlyActive: false,
      reason: '',
      formattedPeriod: '',
    };
  }

  const today = getTodayDateString();
  const currentTime = getCurrentTimeString();

  const startDate = lab.maintenanceStartDate;
  const endDate = lab.maintenanceEndDate || startDate;
  const isAllDay = lab.maintenanceAllDay !== false;
  const startTime = lab.maintenanceStartTime || '07:00';
  const endTime = lab.maintenanceEndTime || '22:30';

  // Caso 1: Manutenção ativada SEM data específica -> Bloqueado imediatamente para tudo
  if (!startDate) {
    return {
      isUnderMaintenance: true,
      isScheduledFuture: false,
      isCurrentlyActive: true,
      reason,
      formattedPeriod,
      allDay: true,
    };
  }

  // Verifica status no tempo real (para badges e painéis gerais)
  const isFuture = today < startDate;
  const isPast = endDate ? today > endDate : false;
  const isTodayInRange = today >= startDate && (!endDate || today <= endDate);
  
  let isCurrentlyActive = false;
  if (isTodayInRange) {
    if (isAllDay) {
      isCurrentlyActive = true;
    } else {
      isCurrentlyActive = currentTime >= startTime && currentTime <= endTime;
    }
  }

  // Se uma data de consulta (targetDate) foi fornecida (ex: professor agendando em data específica)
  if (targetDate) {
    const isTargetInRange = targetDate >= startDate && (!endDate || targetDate <= endDate);

    if (!isTargetInRange) {
      // A data solicitada está fora do período de manutenção agendado
      return {
        isUnderMaintenance: false,
        isScheduledFuture: targetDate < startDate,
        isCurrentlyActive,
        reason,
        formattedPeriod,
        startDate,
        endDate,
        startTime,
        endTime,
        allDay: isAllDay,
      };
    }

    // A data está dentro do período de manutenção!
    // Agora verifica o horário caso especificado:
    if (isAllDay || !targetStartTime || !targetEndTime) {
      // O dia todo está bloqueado, ou nenhum horário foi consultado
      return {
        isUnderMaintenance: true,
        isScheduledFuture: targetDate > today,
        isCurrentlyActive,
        reason,
        formattedPeriod,
        startDate,
        endDate,
        startTime,
        endTime,
        allDay: isAllDay,
      };
    }

    // Ambos horários (do agendamento e da manutenção) foram definidos
    const hasTimeOverlap = doTimesOverlap(targetStartTime, targetEndTime, startTime, endTime);

    return {
      isUnderMaintenance: hasTimeOverlap,
      isScheduledFuture: targetDate > today,
      isCurrentlyActive,
      reason,
      formattedPeriod,
      startDate,
      endDate,
      startTime,
      endTime,
      allDay: isAllDay,
    };
  }

  // Se NENHUMA targetDate foi fornecida: avalia para o momento atual
  return {
    isUnderMaintenance: isCurrentlyActive || isFuture, // Se há agendamento futuro ou ativo
    isScheduledFuture: isFuture,
    isCurrentlyActive,
    reason,
    formattedPeriod,
    startDate,
    endDate,
    startTime,
    endTime,
    allDay: isAllDay,
  };
}
