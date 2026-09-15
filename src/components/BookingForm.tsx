import React, { useState, useEffect } from 'react';
import { Booking, LAB_LIST, Lab, RecurrenceType } from '../types';
import { checkBookingConflict, createBooking, createRecurringBookings } from '../lib/bookingService';
import {
  generateRecurrenceDates,
  generateRecurrenceDatesUntilEndDate,
  calculateEndDateFromCount,
} from '../lib/recurrenceUtils';
import { formatDateBR } from '../lib/whatsapp';
import { getLabMaintenanceStatus } from '../lib/maintenanceUtils';
import { useAuth } from '../lib/authContext';
import {
  getBookingDateLimits,
  validateBookingLeadTime,
  MIN_BOOKING_ADVANCE_WORKING_DAYS,
  MAX_BOOKING_ADVANCE_WORKING_DAYS,
} from '../lib/bookingRuleUtils';
import {
  Calendar,
  Clock,
  User,
  Users,
  Phone,
  Monitor,
  Truck,
  MapPin,
  BookOpen,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Laptop,
  Code,
  Wrench,
  Bell,
  Repeat,
  Info,
  CalendarDays,
  CalendarClock,
  Shield,
  Check,
  X,
} from 'lucide-react';
import { playBookingSuccessSound } from '../lib/soundUtils';

interface BookingFormProps {
  existingBookings: Booking[];
  labs?: Lab[];
  preselectedLabId?: string;
  preselectedDate?: string;
  onBookingCreated?: (booking: Booking) => void;
}

export const BookingForm: React.FC<BookingFormProps> = ({
  existingBookings,
  labs = LAB_LIST,
  preselectedLabId,
  preselectedDate,
  onBookingCreated,
}) => {
  const { teacherSession, loginTeacher, isAdmin } = useAuth();
  const [allowUrgentBypass, setAllowUrgentBypass] = useState(false);

  // Regras de Agendamento: Mínimo 3 dias úteis e Máximo 20 dias úteis
  const dateLimits = getBookingDateLimits();
  const { minDate, maxDate, minDateFormatted, maxDateFormatted, minDateFull, maxDateFull } = dateLimits;

  // Se houver data pré-selecionada, utilize-a; caso contrário, use minDate (1ª data permitida)
  const defaultDate = preselectedDate || minDate;

  const [teacherName, setTeacherName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [classGroup, setClassGroup] = useState('');
  const [subject, setSubject] = useState('');
  const [labId, setLabId] = useState(preselectedLabId || labs[0]?.id || 'lab-1');
  const selectedLab = labs.find((l) => l.id === labId) || labs[0] || LAB_LIST[0];
  const [requestedMachines, setRequestedMachines] = useState<number>(selectedLab.capacity);
  const [roomNumber, setRoomNumber] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState('07:30');
  const [endTime, setEndTime] = useState('09:10');
  const [scheduleLabel, setScheduleLabel] = useState('');
  const [notes, setNotes] = useState('');

  // Recurring Booking State
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceType>('weekly');
  const [recurrenceCount, setRecurrenceCount] = useState<number>(4);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>(() => {
    return calculateEndDateFromCount(defaultDate, 'weekly', 4, true);
  });
  const [skipWeekends, setSkipWeekends] = useState(true);
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  const [calculatedDates, setCalculatedDates] = useState<string[]>([]);
  const [recurrenceConflicts, setRecurrenceConflicts] = useState<{ date: string; conflict: Booking }[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [successBooking, setSuccessBooking] = useState<Booking | null>(null);
  const [recurringSuccessCount, setRecurringSuccessCount] = useState<number | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Validação em tempo real da regra de antecedência de 3 a 20 dias úteis
  const dateValidation = validateBookingLeadTime(date);

  // Sync session if teacher is logged in
  useEffect(() => {
    if (teacherSession) {
      if (teacherSession.phone && !whatsapp) {
        setWhatsapp(teacherSession.phone);
      }
      if (teacherSession.name && !teacherName) {
        setTeacherName(teacherSession.name);
      }
    }
  }, [teacherSession]);

  // Sincroniza quando o usuário clica em uma data no calendário
  useEffect(() => {
    if (preselectedDate) {
      setDate(preselectedDate);
      setRecurrenceEndDate(calculateEndDateFromCount(preselectedDate, recurrenceFrequency, recurrenceCount, skipWeekends));
    }
  }, [preselectedDate, recurrenceFrequency, recurrenceCount, skipWeekends]);

  // Sincroniza quando um lab pré-selecionado é fornecido
  useEffect(() => {
    if (preselectedLabId) {
      setLabId(preselectedLabId);
      const lab = labs.find((l) => l.id === preselectedLabId);
      if (lab) {
        setRequestedMachines(lab.capacity);
      }
    }
  }, [preselectedLabId, labs]);

  // Adjust machines when selected lab changes
  const handleLabChange = (newLabId: string) => {
    setLabId(newLabId);
    setConflictError(null);
    const lab = labs.find((l) => l.id === newLabId);
    if (lab) {
      setRequestedMachines(lab.capacity);
    }
  };

  const isMobileLab = selectedLab?.isMobile || false;
  const labMaintenanceInfo = getLabMaintenanceStatus(selectedLab, date, startTime, endTime);
  const isLabUnderMaintenance = labMaintenanceInfo.isUnderMaintenance;
  const hasLabBroadcastMessage = Boolean(selectedLab?.broadcastMessage?.trim());

  // Helper to check conflict across dates
  const prepareRecurrenceDates = (
    customStart?: string,
    customEnd?: string,
    customFreq?: RecurrenceType,
  ) => {
    const sDate = customStart || date;
    const eDate = customEnd !== undefined ? customEnd : recurrenceEndDate;
    const freq = customFreq || recurrenceFrequency;

    let dates: string[] = [];
    if (eDate && eDate >= sDate) {
      dates = generateRecurrenceDatesUntilEndDate(sDate, eDate, freq, skipWeekends);
    } else {
      dates = generateRecurrenceDates(sDate, freq, recurrenceCount, skipWeekends);
    }

    setCalculatedDates(dates);

    const cleanLabel = scheduleLabel.trim();
    const formattedTimeSlot = `${startTime} às ${endTime}${cleanLabel ? ` (${cleanLabel})` : ''}`;

    const conflictsFound: { date: string; conflict: Booking }[] = [];
    dates.forEach((d) => {
      // Verifica regras de antecedência de 3 a 20 dias úteis
      if (!(isAdmin && allowUrgentBypass)) {
        const leadTimeCheck = validateBookingLeadTime(d);
        if (!leadTimeCheck.isValid) {
          conflictsFound.push({
            date: d,
            conflict: {
              id: `rule-${d}`,
              labId,
              labName: selectedLab?.name || 'Laboratório',
              isMobileLab: Boolean(selectedLab?.isMobile),
              shift: 'manha',
              whatsappSent: false,
              date: d,
              timeSlot: formattedTimeSlot,
              teacherName: 'REGRA DE AGENDAMENTO (BLOQUEIO)',
              whatsapp: '',
              classGroup: 'Fora do Prazo Permitido',
              subject: leadTimeCheck.errorReason || 'Fora do intervalo de 3 a 20 dias úteis',
              status: 'cancelled',
              createdAt: Date.now(),
            },
          });
          return;
        }
      }

      const conf = checkBookingConflict(existingBookings, labId, d, formattedTimeSlot, startTime, endTime);
      if (conf) {
        conflictsFound.push({ date: d, conflict: conf });
      } else {
        // Verifica se a data colide com manutenção agendada no laboratório
        const maintOnDate = getLabMaintenanceStatus(selectedLab, d, startTime, endTime);
        if (maintOnDate.isUnderMaintenance) {
          conflictsFound.push({
            date: d,
            conflict: {
              id: `maint-${d}`,
              labId,
              labName: selectedLab?.name || 'Laboratório',
              isMobileLab: Boolean(selectedLab?.isMobile),
              shift: 'manha',
              whatsappSent: false,
              date: d,
              timeSlot: formattedTimeSlot,
              teacherName: 'MANUTENÇÃO AGENDADA',
              whatsapp: '',
              classGroup: 'Interdição Técnica',
              subject: maintOnDate.reason || 'Manutenção programada',
              status: 'confirmed',
              createdAt: Date.now(),
            },
          });
        }
      }
    });

    setRecurrenceConflicts(conflictsFound);
    return { dates, conflictsFound, formattedTimeSlot };
  };

  const handleOpenRecurrenceConfirmation = () => {
    // Basic validations first
    if (!teacherName.trim()) {
      setConflictError('Por favor informe o Nome do Professor(a).');
      return;
    }
    const rawPhone = whatsapp.replace(/\D/g, '');
    if (rawPhone.length < 10) {
      setConflictError('Por favor informe um número de WhatsApp válido com DDD (mínimo 10 dígitos).');
      return;
    }
    if (!classGroup.trim()) {
      setConflictError('Por favor informe a Turma ou Ano.');
      return;
    }
    if (isLabUnderMaintenance) {
      setConflictError(
        `O ${selectedLab.name} possui manutenção agendada para este dia/horário (${labMaintenanceInfo.formattedPeriod} - Motivo: ${labMaintenanceInfo.reason}). Não é possível agendar neste período.`,
      );
      return;
    }
    if (isMobileLab && !roomNumber.trim()) {
      setConflictError('Para Laboratórios Móveis, é obrigatório informar o Número da Sala.');
      return;
    }
    if (!startTime || !endTime || startTime >= endTime) {
      setConflictError('Verifique os horários de início e término.');
      return;
    }
    if (isRecurring && recurrenceEndDate && recurrenceEndDate < date) {
      setConflictError('A Data Final da Recorrência não pode ser anterior à Data Inicial.');
      return;
    }

    // Regra de antecedência e limite máximo
    if (!(isAdmin && allowUrgentBypass)) {
      const startCheck = validateBookingLeadTime(date);
      if (!startCheck.isValid) {
        setConflictError(`Data Inicial inválida: ${startCheck.errorReason}`);
        return;
      }
      if (recurrenceEndDate && recurrenceEndDate > maxDate) {
        setConflictError(
          `A Data Final (${formatDateBR(recurrenceEndDate)}) ultrapassa o limite de ${MAX_BOOKING_ADVANCE_WORKING_DAYS} dias úteis permitidos (limite: ${maxDateFormatted}). Ajuste a data final ou a quantidade de repetições.`,
        );
        return;
      }
    }

    setConflictError(null);
    prepareRecurrenceDates();
    setShowRecurrenceModal(true);
  };

  const executeRecurringBooking = async () => {
    const { dates, conflictsFound, formattedTimeSlot } = prepareRecurrenceDates();

    if (conflictsFound.length > 0) {
      setConflictError(
        `Não é possível confirmar a recorrência pois há conflito(s) em ${conflictsFound.length} data(s). Veja a lista e ajuste o horário ou período.`,
      );
      setShowRecurrenceModal(false);
      return;
    }

    const startHour = parseInt(startTime.split(':')[0] || '7', 10);
    const shift = startHour < 12 ? 'manha' : startHour < 18 ? 'tarde' : 'noite';

    setSubmitting(true);
    setShowRecurrenceModal(false);
    try {
      const createdList = await createRecurringBookings(
        {
          teacherName: teacherName.trim(),
          whatsapp: whatsapp.trim(),
          classGroup: classGroup.trim(),
          subject: subject.trim() || undefined,
          labId,
          labName: selectedLab.name,
          isMobileLab,
          requestedMachines: Number(requestedMachines),
          roomNumber: isMobileLab ? roomNumber.trim() : undefined,
          timeSlot: formattedTimeSlot,
          startTime,
          endTime,
          shift,
          notes: notes.trim() || undefined,
          recurrenceFrequency,
          recurrenceTotalCount: dates.length,
        },
        dates,
        recurrenceFrequency,
      );

      if (createdList.length > 0) {
        playBookingSuccessSound();
        loginTeacher(whatsapp.trim(), teacherName.trim());
        setSuccessBooking(createdList[0]);
        setRecurringSuccessCount(createdList.length);
        onBookingCreated?.(createdList[0]);
      }
    } catch (e) {
      console.error('Erro ao agendar com recorrência:', e);
      setConflictError('Ocorreu um erro ao salvar o agendamento recorrente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError(null);

    // Validação da regra de antecedência (mínimo 3 dias úteis) e prazo limite (máximo 20 dias úteis)
    if (!(isAdmin && allowUrgentBypass)) {
      const leadTimeCheck = validateBookingLeadTime(date);
      if (!leadTimeCheck.isValid) {
        setConflictError(leadTimeCheck.errorReason);
        return;
      }
    }

    // Validação de bloqueio por manutenção
    if (isLabUnderMaintenance) {
      setConflictError(
        `O ${selectedLab.name} possui manutenção agendada (${labMaintenanceInfo.formattedPeriod} - Motivo: ${labMaintenanceInfo.reason}). Por favor, escolha outro laboratório ou outro horário.`,
      );
      return;
    }

    // Se estiver com recorrência ativada, aciona o modal de confirmação com visualização de todas as datas
    if (isRecurring && recurrenceFrequency !== 'none') {
      handleOpenRecurrenceConfirmation();
      return;
    }

    // Validações normais de agendamento único
    if (!teacherName.trim()) {
      setConflictError('Por favor informe o Nome do Professor(a).');
      return;
    }
    if (!classGroup.trim()) {
      setConflictError('Por favor informe a Turma ou Ano.');
      return;
    }

    const rawPhone = whatsapp.replace(/\D/g, '');
    if (rawPhone.length < 10) {
      setConflictError('Por favor informe um número de WhatsApp válido com DDD (mínimo 10 dígitos).');
      return;
    }

    const numMachines = Number(requestedMachines);
    if (isNaN(numMachines) || numMachines <= 0) {
      setConflictError('Por favor informe uma quantidade válida de máquinas a serem agendadas (mínimo 1).');
      return;
    }
    if (numMachines > selectedLab.capacity) {
      setConflictError(
        `A quantidade informada (${numMachines} máquinas) excede a capacidade máxima do ${selectedLab.name} (${selectedLab.capacity} máquinas).`,
      );
      return;
    }

    if (isMobileLab && !roomNumber.trim()) {
      setConflictError(
        'Para os Laboratórios Móveis (carrinho de notebooks), é obrigatório informar o Número da Sala para a entrega!',
      );
      return;
    }

    if (!startTime || !endTime) {
      setConflictError('Por favor informe os horários de início e término desejados para a aula.');
      return;
    }
    if (startTime >= endTime) {
      setConflictError('O horário de término da aula deve ser posterior ao horário de início.');
      return;
    }

    const cleanLabel = scheduleLabel.trim();
    const formattedTimeSlot = `${startTime} às ${endTime}${cleanLabel ? ` (${cleanLabel})` : ''}`;

    const startHour = parseInt(startTime.split(':')[0] || '7', 10);
    const shift = startHour < 12 ? 'manha' : startHour < 18 ? 'tarde' : 'noite';

    const conflict = checkBookingConflict(
      existingBookings,
      labId,
      date,
      formattedTimeSlot,
      startTime,
      endTime,
    );
    if (conflict) {
      setConflictError(
        `O ${selectedLab.name} já está reservado no dia ${date} no horário "${conflict.timeSlot}" pelo professor(a) ${conflict.teacherName} (Turma: ${conflict.classGroup}). Escolha outro horário ou outro laboratório.`,
      );
      return;
    }

    setSubmitting(true);
    try {
      const created = await createBooking({
        teacherName: teacherName.trim(),
        whatsapp: whatsapp.trim(),
        classGroup: classGroup.trim(),
        subject: subject.trim() || undefined,
        labId,
        labName: selectedLab.name,
        isMobileLab,
        requestedMachines: numMachines,
        roomNumber: isMobileLab ? roomNumber.trim() : undefined,
        date,
        timeSlot: formattedTimeSlot,
        startTime,
        endTime,
        shift,
        notes: notes.trim() || undefined,
      });

      playBookingSuccessSound();
      loginTeacher(whatsapp.trim(), teacherName.trim());
      setSuccessBooking(created);
      setRecurringSuccessCount(null);
      onBookingCreated?.(created);
      setNotes('');
    } catch (err) {
      console.error('Erro ao agendar:', err);
      setConflictError('Ocorreu um erro ao gravar o agendamento. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewBooking = () => {
    setSuccessBooking(null);
    setRecurringSuccessCount(null);
    setConflictError(null);
    setClassGroup('');
    setSubject('');
    setRoomNumber('');
    setNotes('');
    setIsRecurring(false);
    setDate(minDate);
    setRecurrenceEndDate(calculateEndDateFromCount(minDate, recurrenceFrequency, recurrenceCount, skipWeekends));
  };

  if (successBooking) {
    return (
      <div
        id="booking-success-card"
        className="w-full max-w-2xl mx-auto bg-white rounded-2xl border border-emerald-200 shadow-xl overflow-hidden p-6 sm:p-8 text-center animate-fade-in"
      >
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <h3 className="text-2xl font-bold text-slate-900 mb-1">
          {recurringSuccessCount
            ? `Pedido Enviado (${recurringSuccessCount} aulas)!`
            : 'Pedido Enviado com Sucesso!'}
        </h3>
        <p className="text-sm text-slate-600 mb-6">
          {recurringSuccessCount
            ? `Seu pedido de agendamento recorrente (${recurringSuccessCount} datas) foi enviado e está registrado no sistema.`
            : 'Seu pedido de agendamento foi enviado com sucesso e está registrado no sistema.'}
        </p>

        {/* Resumo do Agendamento */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-left text-sm space-y-2 mb-6">
          <div className="flex justify-between border-b border-slate-200 pb-2">
            <span className="text-slate-500">Laboratório:</span>
            <span className="font-semibold text-slate-800">
              {successBooking.labName}{' '}
              {successBooking.requestedMachines
                ? `(${successBooking.requestedMachines} máquinas solicitadas)`
                : ''}
            </span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-2">
            <span className="text-slate-500">Professor(a):</span>
            <span className="font-semibold text-slate-800">{successBooking.teacherName}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-2">
            <span className="text-slate-500">WhatsApp:</span>
            <span className="font-semibold text-slate-800">{successBooking.whatsapp}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-2">
            <span className="text-slate-500">Turma:</span>
            <span className="font-semibold text-slate-800">{successBooking.classGroup}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-2">
            <span className="text-slate-500">
              {recurringSuccessCount ? 'Primeira Data e Horário:' : 'Data e Horário:'}
            </span>
            <span className="font-semibold text-slate-800">
              {successBooking.date} • {successBooking.timeSlot}
            </span>
          </div>
          {recurringSuccessCount && (
            <div className="flex justify-between border-b border-slate-200 pb-2 bg-blue-50/70 px-2 py-1 rounded-sm">
              <span className="text-blue-800 font-medium">Recorrência:</span>
              <span className="font-bold text-blue-900">
                {recurringSuccessCount} aulas ({recurrenceFrequency === 'weekly' ? 'Semanal' : recurrenceFrequency === 'biweekly' ? 'Quinzenal' : 'Diária'})
              </span>
            </div>
          )}
          {successBooking.isMobileLab && (
            <div className="flex justify-between border-b border-slate-200 pb-2 bg-amber-50 px-2 py-1 rounded-sm">
              <span className="text-amber-800 font-medium">Entrega do Carrinho na Sala:</span>
              <span className="font-bold text-amber-900">{successBooking.roomNumber}</span>
            </div>
          )}
          <div className="flex justify-between pt-1">
            <span className="text-slate-500">Status do pedido:</span>
            <span className="inline-flex items-center gap-1 font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-xs border border-amber-200">
              Aguardando Confirmação
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleNewBooking}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-colors shadow-xs cursor-pointer"
        >
          Fazer Outro Agendamento
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header Banner */}
      <div className="px-6 py-5 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-800 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Solicitar Agendamento de Laboratório</h2>
            <p className="text-xs text-blue-100">
              Preencha os dados da sua aula para reservar o laboratório ou carrinho móvel
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
        {/* AVISO IMPORTANTE: REGRAS E PRAZOS DE ANTECEDÊNCIA */}
        <div
          id="booking-rule-notice-banner"
          className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50/95 via-indigo-50/80 to-blue-50/95 border border-blue-200/90 shadow-2xs"
        >
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0 mt-0.5 shadow-xs">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                <h3 className="font-bold text-sm text-blue-950 flex items-center gap-2">
                  <span>Aviso Importante: Regras de Antecedência e Prazos</span>
                </h3>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-white/90 px-2.5 py-0.5 rounded-full border border-blue-200 shrink-0 self-start sm:self-auto shadow-2xs">
                  Janela Permitida Hoje
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs text-slate-700">
                <div className="flex items-start gap-2.5 bg-white/85 p-3 rounded-xl border border-blue-100 shadow-2xs">
                  <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-slate-900 font-semibold block mb-0.5">Antecedência Mínima:</strong>
                    <span className="text-slate-600 leading-relaxed">
                      O agendamento deve ser realizado com pelo menos <strong>{MIN_BOOKING_ADVANCE_WORKING_DAYS} dias úteis de antecedência</strong>.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-white/85 p-3 rounded-xl border border-blue-100 shadow-2xs">
                  <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-slate-900 font-semibold block mb-0.5">Prazo Máximo:</strong>
                    <span className="text-slate-600 leading-relaxed">
                      Permitido no máximo até <strong>{MAX_BOOKING_ADVANCE_WORKING_DAYS} dias úteis para frente</strong>.
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-blue-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-600 font-medium text-[11px]">Datas liberadas para reserva hoje:</span>
                  <span className="font-bold text-blue-900 bg-white px-2.5 py-1 rounded-lg border border-blue-300 shadow-2xs text-[11px]">
                    {minDateFormatted} até {maxDateFormatted}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    ({minDateFull.split(',')[0]} até {maxDateFull.split(',')[0]})
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Sábados e domingos não contam como dias úteis.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {conflictError && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-3 animate-fade-in">
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800">Atenção</p>
              <p className="text-xs mt-0.5">{conflictError}</p>
            </div>
          </div>
        )}

        {/* 1. Seleção do Laboratório */}
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-blue-600" />
            <span>Selecione o Laboratório</span>
            <span className="text-xs font-normal text-slate-600">({labs.length} opções disponíveis)</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {labs.map((lab) => {
              const isSelected = lab.id === labId;
              const labMaintStatus = getLabMaintenanceStatus(lab, date, startTime, endTime);
              const isMaintActive = labMaintStatus.isUnderMaintenance;
              const isMaintFuture = !isMaintActive && labMaintStatus.isScheduledFuture;

              return (
                <button
                  key={lab.id}
                  type="button"
                  id={`select-lab-${lab.id}`}
                  onClick={() => handleLabChange(lab.id)}
                  className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/20 shadow-xs'
                      : isMaintActive
                        ? 'border-rose-300 bg-rose-50/50 hover:bg-rose-50/80'
                        : isMaintFuture
                          ? 'border-amber-200 bg-amber-50/40 hover:bg-amber-50/70'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                  title={
                    isMaintActive
                      ? `Fechado para manutenção (${labMaintStatus.formattedPeriod})`
                      : isMaintFuture
                        ? `Manutenção programada para ${labMaintStatus.formattedPeriod}`
                        : undefined
                  }
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-bold text-xs text-slate-900 truncate">{lab.name}</span>
                    {isMaintActive ? (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-rose-600 text-white shrink-0">
                        Manutenção
                      </span>
                    ) : isMaintFuture ? (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-amber-500 text-white shrink-0">
                        Agendada
                      </span>
                    ) : lab.isMobile ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-amber-100 text-amber-800 shrink-0">
                        Móvel
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-600 shrink-0">Fixo</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium flex items-center gap-1">
                    <span>🖥️ {lab.capacity} máq.</span>
                    {lab.broadcastMessage && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" title="Possui aviso especial" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* ALERTA DE MANUTENÇÃO (Se o lab selecionado estiver fechado no horário escolhido) */}
          {isLabUnderMaintenance && (
            <div className="mt-3 p-4 bg-rose-50 border-2 border-rose-300 rounded-xl text-rose-900 flex items-start gap-3 animate-fade-in shadow-2xs">
              <Wrench className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-bold text-rose-900">
                  {selectedLab.name} ESTÁ EM MANUTENÇÃO NO PERÍODO SELECIONADO
                </h4>
                <p className="text-xs text-rose-800 mt-1">
                  📅 <strong>Período Interditado:</strong> {labMaintenanceInfo.formattedPeriod}
                </p>
                <p className="text-xs text-rose-700 mt-0.5">
                  🛠️ <strong>Motivo:</strong> {labMaintenanceInfo.reason || 'Em reparos técnicos agendados.'}
                </p>
                <p className="text-[11px] text-rose-600 mt-1">
                  Não é permitido realizar reservas para este laboratório no período interditado. Por gentileza, altere a data, horário ou selecione outro laboratório da lista.
                </p>
              </div>
            </div>
          )}

          {/* AVISO DE MANUTENÇÃO FUTURA (Se o lab estiver livre na data atual mas tiver manutenção próxima) */}
          {!isLabUnderMaintenance && labMaintenanceInfo.isScheduledFuture && (
            <div className="mt-3 p-3.5 bg-amber-50/90 border border-amber-300 rounded-xl text-amber-950 flex items-start gap-3 animate-fade-in text-xs">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900">
                  Aviso: Manutenção Técnica Programada neste Laboratório
                </p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  O {selectedLab.name} está disponível para o horário selecionado ({formatDateBR(date)}), mas possui manutenção programada para:{' '}
                  <strong>{labMaintenanceInfo.formattedPeriod}</strong> ({labMaintenanceInfo.reason || 'Manutenção programada'}).
                </p>
              </div>
            </div>
          )}

          {/* MENSAGEM / AVISO DO LABORATÓRIO PARA O PROFESSOR */}
          {hasLabBroadcastMessage && (
            <div className="mt-3 p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 flex items-start gap-3 animate-fade-in shadow-2xs">
              <Bell className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-sm">
                    Aviso do Laboratório ({selectedLab.name})
                  </span>
                </div>
                <p className="text-xs text-amber-900 mt-1.5 font-medium leading-relaxed">
                  {selectedLab.broadcastMessage}
                </p>
              </div>
            </div>
          )}

          {/* Destaque do Laboratório Selecionado com Softwares Disponíveis */}
          <div
            className={`mt-3 p-3.5 rounded-xl border text-xs space-y-2 ${
              selectedLab.isMobile
                ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {selectedLab.isMobile ? (
                  <Truck className="w-4 h-4 text-rose-600 shrink-0" />
                ) : (
                  <Monitor className="w-4 h-4 text-blue-600 shrink-0" />
                )}
                <span>
                  <strong>{selectedLab.name}</strong>: {selectedLab.description} (Capacidade total:{' '}
                  {selectedLab.capacity} computadores)
                </span>
              </div>
              {selectedLab.isMobile && (
                <span className="font-semibold text-rose-700 shrink-0 bg-rose-100 px-2 py-0.5 rounded-md text-[11px]">
                  Requer indicação de sala!
                </span>
              )}
            </div>

            {/* Observações deste Lab */}
            {selectedLab.notes && selectedLab.notes.trim() && (
              <div className="pt-2 border-t border-slate-200/60 flex items-start gap-2 text-xs">
                <div className="flex items-center gap-1 font-bold text-[11px] text-blue-800 shrink-0 mt-0.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>Observações:</span>
                </div>
                <div className="text-[11px] text-slate-700 flex-1 whitespace-pre-wrap leading-relaxed">
                  {selectedLab.notes}
                </div>
              </div>
            )}

            {/* Softwares Disponíveis neste Lab */}
            <div className="pt-2 border-t border-slate-200/60 flex items-start gap-2">
              <div className="flex items-center gap-1 font-bold text-[11px] text-slate-700 shrink-0 mt-0.5">
                <Code className="w-3.5 h-3.5 text-blue-600" />
                <span>Softwares disponíveis:</span>
              </div>
              <div className="flex flex-wrap gap-1 flex-1">
                {selectedLab.softwares && selectedLab.softwares.length > 0 ? (
                  selectedLab.softwares.map((sw) => (
                    <span
                      key={sw}
                      className="px-2 py-0.5 text-[10px] font-semibold bg-white border border-slate-200 text-slate-700 rounded-md shadow-2xs"
                    >
                      {sw}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-slate-500 italic">
                    Nenhum software específico cadastrado ainda.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Campo de Quantidade de Máquinas Desejadas */}
          <div className="mt-3 p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label
                  htmlFor="requested-machines-input"
                  className="block text-xs font-bold text-blue-950 flex items-center gap-1.5"
                >
                  <Laptop className="w-4 h-4 text-blue-700" />
                  <span>Quantas máquinas você vai querer agendar? *</span>
                </label>
                <p className="text-[11px] text-blue-800 mt-0.5">
                  Informe o número exato de computadores/notebooks que sua turma irá utilizar neste laboratório (Máx: {selectedLab.capacity}).
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <input
                  id="requested-machines-input"
                  type="number"
                  min={1}
                  max={selectedLab.capacity}
                  value={requestedMachines}
                  onChange={(e) => setRequestedMachines(Number(e.target.value))}
                  className="w-24 px-3 py-1.5 text-sm font-bold text-center bg-white border border-blue-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-900"
                />
                <span className="text-xs text-slate-600 font-semibold">de {selectedLab.capacity}</span>
              </div>
            </div>
          </div>

          {/* Caso seja Lab Móvel, exigir número da sala */}
          {isMobileLab && (
            <div className="mt-3 p-4 bg-amber-50 border border-amber-300 rounded-xl animate-fade-in">
              <label
                htmlFor="room-number-input"
                className="block text-xs font-bold text-amber-900 mb-1 flex items-center gap-1.5"
              >
                <MapPin className="w-4 h-4 text-amber-700" />
                <span>Número / Nome da Sala para Entrega do Carrinho Móvel *</span>
              </label>
              <p className="text-[11px] text-amber-800 mb-2">
                O carrinho de notebooks precisa ser transportado pelos técnicos até a sua sala de aula.
              </p>
              <input
                id="room-number-input"
                type="text"
                required
                placeholder="Ex: Sala 204 - Bloco B, Auditório 1, Sala de Artes..."
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-amber-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>
          )}
        </div>

        {/* 2. Dados do Professor e Contato */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="teacher-name-input"
              className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Nome Completo do Professor(a) *</span>
            </label>
            <input
              id="teacher-name-input"
              type="text"
              required
              placeholder="Ex: Prof. Carlos Eduardo Silva"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>

          <div>
            <label
              htmlFor="whatsapp-input"
              className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>WhatsApp do Professor (com DDD) *</span>
            </label>
            <input
              id="whatsapp-input"
              type="tel"
              required
              placeholder="(11) 98765-4321"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
            <p className="text-[11px] text-slate-600 mt-1">
              Você receberá a confirmação da sua reserva por este número.
            </p>
          </div>
        </div>

        {/* 3. Turma e Assunto */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="class-group-input"
              className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>Turma / Série / Grupo *</span>
            </label>
            <input
              id="class-group-input"
              type="text"
              required
              placeholder="Ex: 9º Ano A, 3º Ensino Médio B, Turma de Informática..."
              value={classGroup}
              onChange={(e) => setClassGroup(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>

          <div>
            <label
              htmlFor="subject-input"
              className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-slate-500" />
              <span>Disciplina / Assunto (opcional)</span>
            </label>
            <input
              id="subject-input"
              type="text"
              placeholder="Ex: Robótica, Pesquisa de História, Redação..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>
        </div>

        {/* 4. Data e Horários Inseridos pelo Professor */}
        <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Data e Horários da Aula
              </span>
            </div>
            <span className="text-[11px] text-slate-500">
              Personalize o horário exato da sua aula
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Data Inicial */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="booking-date-input"
                  className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>{isRecurring ? 'Data da 1ª Aula *' : 'Data da Reserva *'}</span>
                </label>
                <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-sm border border-blue-100">
                  3 a 20 dias úteis
                </span>
              </div>
              <input
                id="booking-date-input"
                type="date"
                required
                min={isAdmin && allowUrgentBypass ? undefined : minDate}
                max={isAdmin && allowUrgentBypass ? undefined : maxDate}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-xl focus:outline-hidden focus:ring-2 font-medium transition-colors ${
                  !dateValidation.isValid && !(isAdmin && allowUrgentBypass)
                    ? 'border-red-400 bg-red-50/20 focus:ring-red-500 focus:border-red-500'
                    : 'border-slate-300 focus:ring-blue-600 focus:border-blue-600'
                }`}
              />

              {/* Feedback e validação em tempo real */}
              <div>
                {dateValidation.isValid ? (
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>{dateValidation.warningMessage}</span>
                  </div>
                ) : isAdmin && allowUrgentBypass ? (
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                    <span>Bypass ativo (Administrador/Emergência)</span>
                  </div>
                ) : (
                  <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Aviso de Regra: </span>
                      <span>{dateValidation.errorReason}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Horário de Início */}
            <div>
              <label
                htmlFor="booking-start-time"
                className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Horário de Início *</span>
              </label>
              <input
                id="booking-start-time"
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-blue-600 font-mono text-slate-900"
              />
            </div>

            {/* Horário de Término */}
            <div>
              <label
                htmlFor="booking-end-time"
                className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5 text-rose-600" />
                <span>Horário de Término *</span>
              </label>
              <input
                id="booking-end-time"
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-blue-600 font-mono text-slate-900"
              />
            </div>
          </div>

          {/* Opção de Bypass para Administrador */}
          {isAdmin && (
            <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-amber-900">
                <Shield className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Acesso Técnico / Admin:</strong> Permitir agendamento excepcional fora do prazo de 3 a 20 dias úteis?
                </span>
              </div>
              <label className="inline-flex items-center gap-1.5 font-bold text-amber-900 cursor-pointer self-end sm:self-auto">
                <input
                  type="checkbox"
                  checked={allowUrgentBypass}
                  onChange={(e) => setAllowUrgentBypass(e.target.checked)}
                  className="rounded-sm border-amber-300 text-amber-600 focus:ring-amber-500"
                />
                <span>Liberar Bypass</span>
              </label>
            </div>
          )}

          {/* Rótulo / Turno */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <label
                htmlFor="booking-schedule-label"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Identificação / Aulas (Opcional)
              </label>
              <input
                id="booking-schedule-label"
                type="text"
                placeholder="Ex: 1ª e 2ª Aula, Aula Prática, Projeto Integrador..."
                value={scheduleLabel}
                onChange={(e) => setScheduleLabel(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="sm:self-end">
              <div className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs flex items-center gap-2">
                <span className="text-slate-500 font-medium">Horário Final:</span>
                <span className="font-bold text-blue-700 font-mono">
                  {startTime} às {endTime}
                </span>
                {scheduleLabel && (
                  <span className="text-slate-600">({scheduleLabel})</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 5. AGENDAMENTO COM RECORRÊNCIA (Repetição de aulas com confirmação) */}
        <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Repeat className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Agendamento com Recorrência
                </h4>
                <p className="text-[11px] text-slate-600">
                  Repita esta aula semanalmente, quinzenalmente ou diariamente com etapa de confirmação prévia
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {isRecurring && (
            <div className="pt-3 border-t border-indigo-200/60 space-y-3 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Data Inicial */}
                <div>
                  <label htmlFor="recurrence-start-date-input" className="block text-xs font-semibold text-indigo-950 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Data Inicial da Recorrência: *</span>
                  </label>
                  <input
                    id="recurrence-start-date-input"
                    type="date"
                    required
                    min={isAdmin && allowUrgentBypass ? undefined : minDate}
                    max={isAdmin && allowUrgentBypass ? undefined : maxDate}
                    value={date}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setDate(newStart);
                      if (!recurrenceEndDate || recurrenceEndDate <= newStart) {
                        setRecurrenceEndDate(calculateEndDateFromCount(newStart, recurrenceFrequency, recurrenceCount, skipWeekends));
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-white border border-indigo-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-600 font-medium"
                  />
                </div>

                {/* 2. Data Final da Recorrência */}
                <div>
                  <label htmlFor="recurrence-end-date-input" className="block text-xs font-semibold text-indigo-950 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Data Final da Recorrência: *</span>
                  </label>
                  <input
                    id="recurrence-end-date-input"
                    type="date"
                    required
                    min={date || minDate}
                    max={isAdmin && allowUrgentBypass ? undefined : maxDate}
                    value={recurrenceEndDate}
                    onChange={(e) => {
                      const newEnd = e.target.value;
                      setRecurrenceEndDate(newEnd);
                      if (newEnd && date && newEnd >= date) {
                        const calculated = generateRecurrenceDatesUntilEndDate(date, newEnd, recurrenceFrequency, skipWeekends);
                        setRecurrenceCount(calculated.length);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-white border border-indigo-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-600 font-medium"
                  />
                </div>

                {/* 3. Frequência */}
                <div>
                  <label htmlFor="recurrence-frequency-select" className="block text-xs font-semibold text-indigo-950 mb-1">
                    Frequência da Repetição:
                  </label>
                  <select
                    id="recurrence-frequency-select"
                    value={recurrenceFrequency}
                    onChange={(e) => {
                      const newFreq = e.target.value as RecurrenceType;
                      setRecurrenceFrequency(newFreq);
                      setRecurrenceEndDate(calculateEndDateFromCount(date, newFreq, recurrenceCount, skipWeekends));
                    }}
                    className="w-full px-3 py-2 text-xs bg-white border border-indigo-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-600 font-medium"
                  >
                    <option value="weekly">Semanal (mesmo dia da semana)</option>
                    <option value="biweekly">Quinzenal (a cada 2 semanas)</option>
                    <option value="daily">Diária (dias úteis seg-sex)</option>
                  </select>
                </div>

                {/* 4. Quantidade de Aulas / Ocorrências */}
                <div>
                  <label htmlFor="recurrence-count-select" className="block text-xs font-semibold text-indigo-950 mb-1">
                    Quantidade de Aulas / Ocorrências:
                  </label>
                  <select
                    id="recurrence-count-select"
                    value={recurrenceCount}
                    onChange={(e) => {
                      const newCount = Number(e.target.value);
                      setRecurrenceCount(newCount);
                      setRecurrenceEndDate(calculateEndDateFromCount(date, recurrenceFrequency, newCount, skipWeekends));
                    }}
                    className="w-full px-3 py-2 text-xs bg-white border border-indigo-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-600 font-medium"
                  >
                    <option value={2}>2 aulas</option>
                    <option value={3}>3 aulas</option>
                    <option value={4}>4 aulas (aprox. 1 mês)</option>
                    <option value={6}>6 aulas</option>
                    <option value={8}>8 aulas (aprox. 2 meses)</option>
                    <option value={12}>12 aulas (1 trimestre)</option>
                  </select>
                </div>
              </div>

              {/* Barra de resumo e botão de conferência */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-indigo-100/80">
                <div className="flex items-center gap-2 text-xs text-indigo-900">
                  <Repeat className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="text-[11px] text-slate-600">
                    {recurrenceEndDate && date ? (
                      <>
                        Período: <strong>{formatDateBR(date)}</strong> até <strong>{formatDateBR(recurrenceEndDate)}</strong>
                      </>
                    ) : (
                      'Informe a data inicial e final da recorrência'
                    )}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleOpenRecurrenceConfirmation}
                  className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Verificar & Confirmar Datas</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 6. Observações */}
        <div>
          <label
            htmlFor="booking-notes-input"
            className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Observações ou necessidades especiais (opcional)</span>
          </label>
          <textarea
            id="booking-notes-input"
            rows={2}
            placeholder="Observações ou necessidades especiais para a sua aula..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-blue-600 resize-none"
          />
        </div>

        {/* Botão de Envio */}
        <div className="pt-2">
          <button
            id="submit-booking-btn"
            type="submit"
            disabled={submitting || isLabUnderMaintenance}
            className={`w-full py-3.5 px-6 text-sm font-bold text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isLabUnderMaintenance
                ? 'bg-slate-400 cursor-not-allowed opacity-60'
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
            }`}
          >
            {isRecurring ? <Repeat className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
            <span>
              {submitting
                ? 'Processando Agendamento...'
                : isLabUnderMaintenance
                  ? 'Laboratório em Manutenção (Indisponível)'
                  : isRecurring
                    ? `Confirmar Agendamento Recorrente (${recurrenceCount} aulas)`
                    : 'Confirmar e Solicitar Agendamento'}
            </span>
          </button>
          <p className="text-center text-[11px] text-slate-600 mt-2">
            Sua solicitação de agendamento será enviada para análise e confirmação da coordenação via WhatsApp.
          </p>
        </div>
      </form>

      {/* MODAL DE CONFIRMAÇÃO DE RECORRÊNCIA */}
      {showRecurrenceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-in">
            <div className="p-5 bg-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Repeat className="w-5 h-5 text-white" />
                <div>
                  <h3 className="text-base font-bold">Confirmação de Agendamento com Recorrência</h3>
                  <p className="text-xs text-indigo-100">
                    Confira todas as datas e horários antes de enviar a solicitação
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRecurrenceModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-2.5 border-b border-slate-200">
                  <div>
                    <label htmlFor="modal-recurrence-start-date" className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Data Inicial:</span>
                    </label>
                    <input
                      id="modal-recurrence-start-date"
                      type="date"
                      min={isAdmin && allowUrgentBypass ? undefined : minDate}
                      max={isAdmin && allowUrgentBypass ? undefined : maxDate}
                      value={date}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        setDate(newStart);
                        let newEnd = recurrenceEndDate;
                        if (!newEnd || newEnd < newStart) {
                          newEnd = calculateEndDateFromCount(newStart, recurrenceFrequency, recurrenceCount, skipWeekends);
                          setRecurrenceEndDate(newEnd);
                        }
                        prepareRecurrenceDates(newStart, newEnd, recurrenceFrequency);
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-indigo-300 rounded-lg font-bold text-indigo-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="modal-recurrence-end-date" className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Data Final (Repetir até):</span>
                    </label>
                    <input
                      id="modal-recurrence-end-date"
                      type="date"
                      min={date || minDate}
                      max={isAdmin && allowUrgentBypass ? undefined : maxDate}
                      value={recurrenceEndDate}
                      onChange={(e) => {
                        const newEnd = e.target.value;
                        setRecurrenceEndDate(newEnd);
                        prepareRecurrenceDates(date, newEnd, recurrenceFrequency);
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-indigo-300 rounded-lg font-bold text-indigo-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Laboratório:</span>
                  <span className="font-bold text-slate-900">{selectedLab.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Professor(a):</span>
                  <span className="font-bold text-slate-900">{teacherName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Turma:</span>
                  <span className="font-bold text-slate-900">{classGroup}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Horário:</span>
                  <span className="font-bold text-blue-700 font-mono">
                    {startTime} às {endTime}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-500">Frequência:</span>
                  <select
                    value={recurrenceFrequency}
                    onChange={(e) => {
                      const newFreq = e.target.value as RecurrenceType;
                      setRecurrenceFrequency(newFreq);
                      prepareRecurrenceDates(date, recurrenceEndDate, newFreq);
                    }}
                    className="px-2 py-1 text-xs bg-white border border-indigo-200 rounded-lg font-bold text-indigo-700 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="weekly">Semanal ({calculatedDates.length} aulas)</option>
                    <option value="biweekly">Quinzenal ({calculatedDates.length} aulas)</option>
                    <option value="daily">Diária ({calculatedDates.length} aulas)</option>
                  </select>
                </div>
              </div>

              {recurrenceConflicts.length > 0 && (
                <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Conflitos detectados ({recurrenceConflicts.length}):</span>
                  </div>
                  <ul className="space-y-1 list-disc list-inside">
                    {recurrenceConflicts.map(({ date: d, conflict: c }) => (
                      <li key={d}>
                        Data <strong>{d}</strong>: já reservado por {c.teacherName} ({c.classGroup}) às {c.timeSlot}.
                      </li>
                    ))}
                  </ul>
                  <p className="font-medium text-[11px] text-rose-700">
                    Para prosseguir, ajuste o horário ou selecione outro laboratório.
                  </p>
                </div>
              )}

              <div>
                <span className="text-xs font-bold text-slate-800 block mb-2">
                  Datas que serão agendadas ({calculatedDates.length}):
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {calculatedDates.map((d, idx) => {
                    const hasConflict = recurrenceConflicts.some((c) => c.date === d);
                    const [y, m, day] = d.split('-');
                    const dateObj = new Date(Number(y), Number(m) - 1, Number(day));
                    const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' });

                    return (
                      <div
                        key={d}
                        className={`px-3 py-2 rounded-lg border text-xs flex items-center justify-between ${
                          hasConflict
                            ? 'bg-rose-50 border-rose-300 text-rose-900 font-semibold'
                            : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="capitalize">{weekday}, {d}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-slate-600">
                            {startTime} - {endTime}
                          </span>
                          {hasConflict ? (
                            <span className="text-[10px] bg-rose-600 text-white px-1.5 py-0.5 rounded-sm font-bold">
                              Conflito
                            </span>
                          ) : (
                            <Check className="w-4 h-4 text-emerald-600" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRecurrenceModal(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Voltar e Editar
              </button>
              <button
                type="button"
                disabled={submitting || recurrenceConflicts.length > 0}
                onClick={executeRecurringBooking}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar Todos os Agendamentos</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
