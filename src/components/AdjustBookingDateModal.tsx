import React, { useState, useEffect, useMemo } from 'react';
import { Booking, Lab, LAB_LIST, TIME_SLOTS, TimeSlotOption, ShiftType } from '../types';
import {
  formatDateBR,
  getWhatsAppSendUrl,
  generateDateAdjustmentWhatsAppMessage,
} from '../lib/whatsapp';
import { rescheduleBooking, checkBookingConflict } from '../lib/bookingService';
import { getLabMaintenanceStatus, formatMaintenancePeriod } from '../lib/maintenanceUtils';
import { useAuth } from '../lib/authContext';
import { EducationBadge } from './EducationBadge';
import {
  Calendar,
  CalendarClock,
  Clock,
  User,
  Phone,
  Shield,
  CheckCircle2,
  AlertTriangle,
  X,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Truck,
  Monitor,
  Info,
  ArrowRight,
  Send,
  Check,
  RotateCcw,
} from 'lucide-react';

interface AdjustBookingDateModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  existingBookings?: Booking[];
  labs?: Lab[];
  onSuccess?: (updatedBooking: Booking) => void;
}

export const AdjustBookingDateModal: React.FC<AdjustBookingDateModalProps> = ({
  booking,
  isOpen,
  onClose,
  existingBookings = [],
  labs = LAB_LIST,
  onSuccess,
}) => {
  const { user, isSuperAdmin } = useAuth();

  const [newDate, setNewDate] = useState('');
  const [newLabId, setNewLabId] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [customTimeSlot, setCustomTimeSlot] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [shift, setShift] = useState<ShiftType>('manha');
  const [roomNumber, setRoomNumber] = useState('');
  const [reason, setReason] = useState('');
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [customMessage, setCustomMessage] = useState('');
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Inicializa os dados quando o modal abre
  useEffect(() => {
    if (booking && isOpen) {
      setNewDate(booking.date);
      setNewLabId(booking.labId);
      setRoomNumber(booking.roomNumber || '');
      setReason('');
      setErrorMsg(null);
      setIsEditingMessage(false);
      setSendWhatsApp(true);

      // Encontra o slot correspondente em TIME_SLOTS
      const matchedSlot = TIME_SLOTS.find(
        (s) =>
          s.label === booking.timeSlot ||
          (booking.startTime && booking.endTime && s.startTime === booking.startTime && s.endTime === booking.endTime)
      );

      if (matchedSlot) {
        setSelectedSlotId(matchedSlot.id);
        setCustomTimeSlot(matchedSlot.label);
        setStartTime(matchedSlot.startTime);
        setEndTime(matchedSlot.endTime);
        setShift(matchedSlot.shift);
      } else {
        setSelectedSlotId('custom');
        setCustomTimeSlot(booking.timeSlot);
        setStartTime(booking.startTime || '');
        setEndTime(booking.endTime || '');
        setShift(booking.shift || 'manha');
      }
    }
  }, [booking, isOpen]);

  // Objeto do lab selecionado
  const selectedLab = useMemo(() => {
    return labs.find((l) => l.id === newLabId) || labs[0];
  }, [labs, newLabId]);

  // Identificação do responsável pelo ajuste
  const actorName = useMemo(() => {
    const roleTitle = isSuperAdmin ? 'Administrador Geral' : 'Técnico de Laboratório';
    const name = user?.name || (isSuperAdmin ? 'Coordenação TI' : 'Suporte TI');
    return `${name} (${roleTitle})`;
  }, [user, isSuperAdmin]);

  // Atualiza a prévia da mensagem de WhatsApp
  useEffect(() => {
    if (booking && newDate) {
      const defaultMsg = generateDateAdjustmentWhatsAppMessage(
        {
          ...booking,
          labName: selectedLab?.name || booking.labName,
          roomNumber: selectedLab?.isMobile ? roomNumber : undefined,
        },
        booking.date,
        newDate,
        customTimeSlot || booking.timeSlot,
        reason,
        actorName
      );
      if (!isEditingMessage) {
        setCustomMessage(defaultMsg);
      }
    }
  }, [booking, newDate, customTimeSlot, reason, selectedLab, roomNumber, actorName, isEditingMessage]);

  // Tratamento de troca de horário pré-configurado
  const handleSlotChange = (slotId: string) => {
    setSelectedSlotId(slotId);
    if (slotId === 'custom') return;

    const found = TIME_SLOTS.find((s) => s.id === slotId);
    if (found) {
      setCustomTimeSlot(found.label);
      setStartTime(found.startTime);
      setEndTime(found.endTime);
      setShift(found.shift);
    }
  };

  // Atalhos rápidos de data
  const handleQuickDate = (daysToAdd: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    const dateStr = d.toISOString().split('T')[0];
    setNewDate(dateStr);
  };

  // Verificação de conflito em tempo real
  const conflictBooking = useMemo(() => {
    if (!booking || !newDate || !newLabId) return null;
    return checkBookingConflict(
      existingBookings,
      newLabId,
      newDate,
      customTimeSlot,
      startTime,
      endTime,
      booking.id // ignora o próprio agendamento que está sendo editado
    );
  }, [existingBookings, newLabId, newDate, customTimeSlot, startTime, endTime, booking]);

  // Verificação de manutenção do laboratório na data selecionada
  const maintenanceStatus = useMemo(() => {
    if (!selectedLab || !newDate) return null;
    return getLabMaintenanceStatus(selectedLab, newDate, startTime, endTime);
  }, [selectedLab, newDate, startTime, endTime]);

  if (!isOpen || !booking) return null;

  const isDateChanged = newDate !== booking.date;
  const isSlotChanged = customTimeSlot !== booking.timeSlot;
  const isLabChanged = newLabId !== booking.labId;
  const hasAnyChange = isDateChanged || isSlotChanged || isLabChanged || roomNumber !== (booking.roomNumber || '');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate) {
      setErrorMsg('Por favor, informe a nova data do agendamento.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const updated = await rescheduleBooking(booking.id, {
        date: newDate,
        timeSlot: customTimeSlot || booking.timeSlot,
        startTime,
        endTime,
        shift,
        labId: selectedLab.id,
        labName: selectedLab.name,
        isMobileLab: selectedLab.isMobile,
        roomNumber: selectedLab.isMobile ? roomNumber : undefined,
        adminNotes: reason.trim()
          ? `${booking.adminNotes ? booking.adminNotes + ' | ' : ''}Data ajustada para ${formatDateBR(newDate)} por ${actorName}: ${reason.trim()}`
          : booking.adminNotes,
        adjustedByName: actorName,
      });

      if (sendWhatsApp && booking.whatsapp) {
        const textToSend = customMessage || generateDateAdjustmentWhatsAppMessage(
          updated || booking,
          booking.date,
          newDate,
          customTimeSlot,
          reason,
          actorName
        );
        const url = getWhatsAppSendUrl(booking.whatsapp, textToSend);
        window.open(url, '_blank', 'noopener,noreferrer');
      }

      if (updated && onSuccess) {
        onSuccess(updated);
      }

      onClose();
    } catch (err: any) {
      console.error('Erro ao ajustar data do agendamento:', err);
      setErrorMsg('Ocorreu um erro ao salvar o ajuste de data. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fade-in"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-popup-bounce">
        {/* Header do Modal */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0 mt-0.5 shadow-inner">
              <CalendarClock className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                  <Shield className="w-3 h-3 text-blue-200" />
                  Módulo de Ajuste Administrativo
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-900/50 text-blue-100 px-2 py-0.5 rounded-full border border-blue-400/30">
                  {actorName}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mt-1 leading-tight">
                Ajustar Data & Horário do Agendamento
              </h3>
              <p className="text-xs text-blue-100 mt-0.5">
                Altere o dia ou o horário da reserva com verificação imediata de conflitos e aviso via WhatsApp.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            title="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário Principal */}
        <form onSubmit={handleSave} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Card Resumo do Agendamento Atual */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-500" />
                <span className="font-bold text-slate-900 text-sm">{booking.teacherName}</span>
                {booking.educationLevel && <EducationBadge level={booking.educationLevel} size="xs" />}
              </div>
              <div className="flex items-center gap-1 text-emerald-700 font-mono text-[11px] font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <Phone className="w-3 h-3" />
                <span>{booking.whatsapp}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Laboratório & Turma:</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                  {booking.isMobileLab ? (
                    <Truck className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  ) : (
                    <Monitor className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  )}
                  {booking.labName} • Turma: {booking.classGroup}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Data & Horário Atual:</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  {formatDateBR(booking.date)} ({booking.timeSlot})
                </span>
              </div>
            </div>

            {booking.previousDate && (
              <div className="text-[11px] text-indigo-700 bg-indigo-50/70 p-2 rounded-lg border border-indigo-200/60 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Este agendamento já havia sido remarcado da data anterior: <strong>{formatDateBR(booking.previousDate)}</strong>
                  {booking.dateAdjustedBy ? ` por ${booking.dateAdjustedBy}` : ''}.
                </span>
              </div>
            )}
          </div>

          {/* Seção 1: Nova Data com Atalhos Rápidos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="adjust-new-date" className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Nova Data da Reserva:</span>
                <span className="text-rose-500">*</span>
              </label>
              {isDateChanged && (
                <span className="text-[11px] font-bold text-indigo-600 flex items-center gap-1">
                  <span>Alterada de {formatDateBR(booking.date)}</span>
                  <ArrowRight className="w-3 h-3" />
                  <span>{formatDateBR(newDate)}</span>
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                id="adjust-new-date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                required
                className="px-3 py-2 border-2 border-blue-200 focus:border-blue-500 rounded-xl font-semibold text-slate-900 text-xs outline-hidden shadow-2xs flex-1 bg-white"
              />

              {/* Botões de atalho rápido */}
              <div className="flex items-center gap-1 shrink-0 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => handleQuickDate(0)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors whitespace-nowrap cursor-pointer"
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDate(1)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors whitespace-nowrap cursor-pointer"
                >
                  Amanhã
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDate(7)}
                  className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] border border-blue-200 transition-colors whitespace-nowrap cursor-pointer"
                  title="Avançar 7 dias"
                >
                  +7 dias
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDate(14)}
                  className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] border border-blue-200 transition-colors whitespace-nowrap cursor-pointer"
                  title="Avançar 14 dias"
                >
                  +14 dias
                </button>
                {isDateChanged && (
                  <button
                    type="button"
                    onClick={() => setNewDate(booking.date)}
                    title="Restaurar data original"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Seção 2: Laboratório (Permite mudar de laboratório se necessário) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="adjust-lab-select" className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-slate-600" />
                <span>Laboratório Alocado:</span>
              </label>
              <select
                id="adjust-lab-select"
                value={newLabId}
                onChange={(e) => setNewLabId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-900 text-xs bg-white outline-hidden focus:border-blue-500"
              >
                {labs.map((lab) => (
                  <option key={lab.id} value={lab.id}>
                    {lab.name} ({lab.capacity} máq. {lab.isMobile ? '• Móvel' : '• Fixo'})
                  </option>
                ))}
              </select>
            </div>

            {selectedLab.isMobile && (
              <div className="space-y-1.5">
                <label htmlFor="adjust-room-input" className="font-bold text-rose-900 text-xs flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-rose-600" />
                  <span>Sala de Entrega do Carrinho Móvel:</span>
                </label>
                <input
                  id="adjust-room-input"
                  type="text"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="Ex: Sala 204, Bloco B"
                  className="w-full px-3 py-2 border border-rose-300 rounded-xl font-semibold text-rose-950 text-xs bg-rose-50/40 outline-hidden focus:border-rose-500"
                />
              </div>
            )}
          </div>

          {/* Seção 3: Horário / Aula */}
          <div className="space-y-2">
            <label htmlFor="adjust-slot-select" className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Horário da Aula / Turno:</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <select
                  id="adjust-slot-select"
                  value={selectedSlotId}
                  onChange={(e) => handleSlotChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-900 text-xs bg-white outline-hidden focus:border-blue-500"
                >
                  <optgroup label="Período Matutino (Manhã)">
                    {TIME_SLOTS.filter((s) => s.shift === 'manha').map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Período Vespertino (Tarde)">
                    {TIME_SLOTS.filter((s) => s.shift === 'tarde').map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Período Noturno (Noite)">
                    {TIME_SLOTS.filter((s) => s.shift === 'noite').map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </optgroup>
                  <option value="custom">Outro Horário Personalizado...</option>
                </select>
              </div>

              <div>
                <select
                  value={shift}
                  onChange={(e) => setShift(e.target.value as ShiftType)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-900 text-xs bg-white outline-hidden focus:border-blue-500 capitalize"
                >
                  <option value="manha">Turno Manhã</option>
                  <option value="tarde">Turno Tarde</option>
                  <option value="noite">Turno Noite</option>
                </select>
              </div>
            </div>

            {selectedSlotId === 'custom' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 animate-fade-in">
                <div className="sm:col-span-3">
                  <input
                    type="text"
                    value={customTimeSlot}
                    onChange={(e) => setCustomTimeSlot(e.target.value)}
                    placeholder="Descrição do horário (ex: 08:00 às 09:30)"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Início (HH:mm)</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-2.5 py-1 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Fim (HH:mm)</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-2.5 py-1 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Alertas de Conflito de Horário e Manutenção */}
          {conflictBooking && (
            <div className="p-3.5 rounded-xl bg-amber-50 border-2 border-amber-400 text-amber-950 flex items-start gap-2.5 animate-shake">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-xs text-amber-900 block">
                  Atenção: Conflito de Agendamento Detectado!
                </span>
                <p className="text-[11px] text-amber-900">
                  O <strong>{selectedLab.name}</strong> já possui um agendamento nesta data e horário:
                </p>
                <div className="bg-white/80 p-2 rounded-lg border border-amber-300 text-[11px] font-semibold text-slate-800">
                  Prof. {conflictBooking.teacherName} • Turma: {conflictBooking.classGroup} ({conflictBooking.timeSlot})
                </div>
                <p className="text-[10px] text-amber-800 italic">
                  Como administrador ou técnico, você pode confirmar mesmo assim ou escolher outro horário/laboratório.
                </p>
              </div>
            </div>
          )}

          {maintenanceStatus && maintenanceStatus.isUnderMaintenance && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-xs text-rose-900 block">
                  Aviso de Manutenção / Interdição na Data Escolhida:
                </span>
                <p className="text-[11px] text-rose-800 mt-0.5">
                  {maintenanceStatus.reason || 'Este laboratório está programado para manutenção técnica neste período.'}
                </p>
              </div>
            </div>
          )}

          {/* Seção 4: Motivo do Ajuste (Opcional / Registro Interno) */}
          <div className="space-y-1.5">
            <label htmlFor="adjust-reason-input" className="font-bold text-slate-900 text-xs flex items-center justify-between">
              <span>Motivo / Justificativa do Ajuste:</span>
              <span className="text-[10px] text-slate-400 font-normal">Ficará registrado no histórico</span>
            </label>
            <input
              id="adjust-reason-input"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Solicitado pelo professor; Troca de data de prova; Fechamento do lab..."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 text-xs outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Seção 5: Notificação do Professor via WhatsApp */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sendWhatsApp}
                  onChange={(e) => setSendWhatsApp(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <span className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  Abrir WhatsApp para notificar o professor
                </span>
              </label>

              {sendWhatsApp && (
                <button
                  type="button"
                  onClick={() => setIsEditingMessage((prev) => !prev)}
                  className="text-[11px] text-emerald-800 hover:text-emerald-950 font-semibold underline cursor-pointer"
                >
                  {isEditingMessage ? 'Fechar editor' : 'Editar mensagem'}
                </button>
              )}
            </div>

            {sendWhatsApp && (
              <div>
                {isEditingMessage ? (
                  <textarea
                    rows={6}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="w-full p-2.5 bg-white border border-emerald-300 rounded-xl font-mono text-[11px] text-slate-800 leading-relaxed outline-hidden focus:border-emerald-500"
                  />
                ) : (
                  <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-200/80 text-[11px] text-slate-700 whitespace-pre-line font-sans max-h-28 overflow-y-auto leading-snug">
                    {customMessage}
                  </div>
                )}
                <span className="text-[10px] text-emerald-700 mt-1 block">
                  Destinatário: <strong>{booking.teacherName}</strong> ({booking.whatsapp})
                </span>
              </div>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              id="confirm-adjust-date-btn"
              type="submit"
              disabled={isSaving || !newDate}
              className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer ${
                conflictBooking
                  ? 'bg-amber-600 hover:bg-amber-700 ring-2 ring-amber-400/30'
                  : 'bg-blue-600 hover:bg-blue-700'
              } disabled:opacity-50`}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Salvando Alteração...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>
                    {conflictBooking
                      ? 'Salvar Mesmo com Conflito'
                      : sendWhatsApp
                      ? 'Salvar e Abrir WhatsApp'
                      : 'Salvar Nova Data'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
