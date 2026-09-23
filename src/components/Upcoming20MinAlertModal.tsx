import React, { useState } from 'react';
import { UpcomingAlertItem } from '../lib/bookingAlertService';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  MessageCircle,
  Truck,
  Monitor,
  User,
  Users,
  Calendar,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { getWhatsAppSendUrl, generate20MinReminderWhatsAppMessage } from '../lib/whatsapp';

interface Upcoming20MinAlertModalProps {
  alerts: UpcomingAlertItem[];
  onAcknowledge: (alertKey: string) => void;
  onAcknowledgeAll: () => void;
  onNavigateToCalendar?: () => void;
  onNavigateToAdmin?: () => void;
}

export const Upcoming20MinAlertModal: React.FC<Upcoming20MinAlertModalProps> = ({
  alerts,
  onAcknowledge,
  onAcknowledgeAll,
  onNavigateToCalendar,
  onNavigateToAdmin,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (alerts.length === 0) return null;

  // Garante índice válido
  const activeIndex = Math.min(currentIndex, alerts.length - 1);
  const currentItem = alerts[activeIndex] || alerts[0];
  const { booking, minutesLeft } = currentItem;

  const isPending = booking.status === 'pending';

  const handleSendWhatsAppReminder = () => {
    if (!booking.whatsapp) return;
    const msg = generate20MinReminderWhatsAppMessage(booking, Math.max(1, minutesLeft));
    const url = getWhatsAppSendUrl(booking.whatsapp, msg);
    window.open(url, '_blank');
  };

  const handleDismissCurrent = () => {
    onAcknowledge(currentItem.alertKey);
    if (currentIndex >= alerts.length - 1) {
      setCurrentIndex(Math.max(0, alerts.length - 2));
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs transition-opacity duration-300"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border-2 border-blue-400 overflow-hidden flex flex-col max-h-[92vh] animate-popup-bounce">
        {/* Top Header com Tema de Urgência e Relógio */}
        <div
          className={`p-4 sm:p-5 text-white flex items-start justify-between gap-3 ${
            isPending
              ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-red-600'
              : 'bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0 mt-0.5 shadow-inner">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider bg-white/25 px-2.5 py-0.5 rounded-full">
                  ⏰ Alerta Preventivo de Início
                </span>
                {isPending && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-yellow-400 text-yellow-950 px-2 py-0.5 rounded-full">
                    <AlertTriangle className="w-3 h-3" /> Ainda Pendente!
                  </span>
                )}
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-white mt-1 leading-snug">
                {minutesLeft <= 1
                  ? 'Agendamento Inicia Agora!'
                  : `Agendamento em ~${minutesLeft} minutos`}
              </h3>
              <p className="text-xs text-white/90 mt-0.5">
                Prepare a liberação da sala, equipamentos e suporte técnico para a aula.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismissCurrent}
            title="Fechar / Estou ciente"
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paginação se houver múltiplos alertas simultâneos */}
        {alerts.length > 1 && (
          <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">
              Alerta <strong>{activeIndex + 1}</strong> de <strong>{alerts.length}</strong> acontecendo em breve
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={activeIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                className="p-1 rounded bg-white border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={activeIndex === alerts.length - 1}
                onClick={() => setCurrentIndex((prev) => Math.min(alerts.length - 1, prev + 1))}
                className="p-1 rounded bg-white border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Corpo dos Detalhes da Aula */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto">
          {/* Card Principal do Laboratório */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
              {booking.isMobileLab ? <Truck className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {booking.isMobileLab ? 'Laboratório Móvel (Carrinho)' : 'Laboratório Fixo'}
                </span>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                  ⏰ {booking.timeSlot}
                </span>
              </div>
              <h4 className="text-base font-bold text-slate-900 truncate mt-0.5">
                {booking.labName}
              </h4>
              {booking.isMobileLab && booking.roomNumber && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold rounded-lg shadow-2xs">
                  <Truck className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Levar carrinho até a: <strong>SALA {booking.roomNumber.toUpperCase()}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Dados do Docente e Turma */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
              <User className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase font-bold text-slate-500">Professor(a)</p>
                <p className="text-xs font-bold text-slate-900 truncate">{booking.teacherName}</p>
                {booking.whatsapp && (
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">{booking.whatsapp}</p>
                )}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
              <Users className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase font-bold text-slate-500">Turma / Componente</p>
                <p className="text-xs font-bold text-slate-900 truncate">{booking.classGroup}</p>
                <p className="text-[11px] text-slate-600 truncate mt-0.5">
                  {booking.subject || 'Aula Regular'}
                </p>
              </div>
            </div>
          </div>

          {/* Máquinas e Observações */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-600">
              <span>📅 Data da Aula:</span>
              <strong className="text-slate-900">{booking.date}</strong>
            </div>
            {booking.requestedMachines && (
              <div className="flex items-center justify-between text-slate-600">
                <span>💻 Máquinas Requisitadas:</span>
                <strong className="text-slate-900">{booking.requestedMachines} computadores</strong>
              </div>
            )}
            {booking.notes && (
              <div className="pt-1.5 border-t border-slate-200">
                <span className="text-slate-500 font-semibold block text-[11px]">Observações / Softwares:</span>
                <p className="text-slate-700 italic mt-0.5 text-xs bg-white p-2 rounded-lg border border-slate-200">
                  "{booking.notes}"
                </p>
              </div>
            )}
          </div>

          {/* Checklist de Preparação Rápida */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-xs text-blue-950 space-y-1">
            <span className="font-bold flex items-center gap-1.5 text-blue-900">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Checklist de Suporte Técnico (20min):
            </span>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-blue-800 ml-1">
              <li>Destrancar e ventilar o laboratório / ligar ar condicionado</li>
              <li>Ligar energia elétrica e checar sinal de rede/internet</li>
              {booking.isMobileLab && (
                <li className="font-semibold text-amber-900">
                  Transportar o carrinho até a sala <strong>{booking.roomNumber || 'informada'}</strong>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Footer com Ações */}
        <div className="bg-slate-50 border-t border-slate-200 p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {booking.whatsapp && (
              <button
                type="button"
                onClick={handleSendWhatsAppReminder}
                title="Abrir WhatsApp com lembrete para o professor"
                className="flex-1 sm:flex-initial px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Avisar Professor</span>
              </button>
            )}

            {isPending && onNavigateToAdmin && (
              <button
                type="button"
                onClick={() => {
                  handleDismissCurrent();
                  onNavigateToAdmin();
                }}
                className="flex-1 sm:flex-initial px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Revisar no Painel</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {alerts.length > 1 && (
              <button
                type="button"
                onClick={onAcknowledgeAll}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                Ciente de Todos ({alerts.length})
              </button>
            )}

            <button
              type="button"
              onClick={handleDismissCurrent}
              className="flex-1 sm:flex-initial px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Estou Ciente</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
