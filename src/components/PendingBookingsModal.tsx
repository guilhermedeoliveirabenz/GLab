import React, { useState } from 'react';
import { Booking } from '../types';
import {
  Bell,
  Clock,
  CheckCircle2,
  X,
  ExternalLink,
  User,
  Monitor,
  Truck,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Volume2,
} from 'lucide-react';
import { playPendingAlertSound } from '../lib/soundUtils';

interface PendingBookingsModalProps {
  pendingBookings: Booking[];
  onClose: () => void;
  onReviewInAdmin: () => void;
  onSelectBooking?: (booking: Booking) => void;
}

export const PendingBookingsModal: React.FC<PendingBookingsModalProps> = ({
  pendingBookings,
  onClose,
  onReviewInAdmin,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlayingSound, setIsPlayingSound] = useState(false);

  if (pendingBookings.length === 0) return null;

  const handleReplaySound = () => {
    setIsPlayingSound(true);
    playPendingAlertSound();
    setTimeout(() => {
      setIsPlayingSound(false);
    }, 3100);
  };

  const activeIndex = Math.min(currentIndex, pendingBookings.length - 1);
  const currentBooking = pendingBookings[activeIndex] || pendingBookings[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs transition-opacity duration-300"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border-2 border-amber-400 overflow-hidden flex flex-col max-h-[92vh] animate-popup-bounce">
        {/* Top Header estilo Pop-up Alerta de Notificação */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white flex items-start justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0 mt-0.5 shadow-inner">
              <Bell className="w-6 h-6 animate-swing" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider bg-white/25 px-2.5 py-0.5 rounded-full">
                  ⚠️ Notificação de Agendamento
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-900/40 text-amber-100 px-2 py-0.5 rounded-full">
                  Pendente de Aprovação
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-white mt-1 leading-snug">
                {pendingBookings.length === 1
                  ? 'Existe 1 novo agendamento pendente!'
                  : `Existem ${pendingBookings.length} agendamentos pendentes!`}
              </h3>
              <p className="text-xs text-amber-100 mt-0.5">
                Revise os detalhes abaixo para liberar ou organizar os laboratórios escolares.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleReplaySound}
              title="Ouvir som da notificação (3 segundos)"
              className={`text-white/90 hover:text-white p-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer text-xs font-bold ${
                isPlayingSound ? 'bg-white/30 ring-2 ring-white/60 animate-pulse' : 'bg-white/15 hover:bg-white/25'
              }`}
            >
              <Volume2 className={`w-4 h-4 ${isPlayingSound ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">{isPlayingSound ? 'Ouvindo (3s)...' : 'Som (3s)'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Fechar Notificação"
              className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/15 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paginação se houver mais de uma pendência */}
        {pendingBookings.length > 1 && (
          <div className="bg-amber-50 border-b border-amber-200/60 px-4 py-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-amber-900">
              Solicitação <strong>{activeIndex + 1}</strong> de <strong>{pendingBookings.length}</strong> pendentes
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={activeIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                className="p-1 rounded bg-white border border-amber-200 text-amber-900 disabled:opacity-40 hover:bg-amber-100/50 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={activeIndex === pendingBookings.length - 1}
                onClick={() => setCurrentIndex((prev) => Math.min(pendingBookings.length - 1, prev + 1))}
                className="p-1 rounded bg-white border border-amber-200 text-amber-900 disabled:opacity-40 hover:bg-amber-100/50 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Detalhes do Agendamento */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto">
          {/* Card do Laboratório */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
              {currentBooking.isMobileLab ? <Truck className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {currentBooking.isMobileLab ? 'Laboratório Móvel (Carrinho)' : 'Laboratório Fixo'}
                </span>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {currentBooking.timeSlot}
                </span>
              </div>
              <h4 className="text-base font-bold text-slate-900 truncate mt-0.5">
                {currentBooking.labName}
              </h4>
              {currentBooking.isMobileLab && currentBooking.roomNumber && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold rounded-lg shadow-2xs">
                  <Truck className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Entrega na: <strong>SALA {currentBooking.roomNumber.toUpperCase()}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Dados do Docente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
              <User className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase font-bold text-slate-500">Professor(a)</p>
                <p className="text-xs font-bold text-slate-900 truncate">{currentBooking.teacherName}</p>
                {currentBooking.whatsapp && (
                  <p className="text-[11px] text-slate-600 font-mono mt-0.5">{currentBooking.whatsapp}</p>
                )}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase font-bold text-slate-500">Data & Turma</p>
                <p className="text-xs font-bold text-slate-900 truncate">{currentBooking.date}</p>
                <p className="text-[11px] text-slate-600 truncate mt-0.5">
                  Turma: {currentBooking.classGroup || 'Não especificada'}
                </p>
              </div>
            </div>
          </div>

          {/* Informações Complementares */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1.5">
            {currentBooking.subject && (
              <div className="flex items-center justify-between text-slate-600">
                <span>Disciplina / Conteúdo:</span>
                <strong className="text-slate-900">{currentBooking.subject}</strong>
              </div>
            )}
            {currentBooking.requestedMachines && (
              <div className="flex items-center justify-between text-slate-600">
                <span>Máquinas Requisitadas:</span>
                <strong className="text-slate-900">{currentBooking.requestedMachines} computadores</strong>
              </div>
            )}
            {currentBooking.notes && (
              <div className="pt-1.5 border-t border-slate-200">
                <span className="text-slate-500 font-semibold block text-[11px]">Observações do Pedido:</span>
                <p className="text-slate-700 italic mt-0.5 text-xs bg-white p-2 rounded-lg border border-slate-200">
                  "{currentBooking.notes}"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer com Ações */}
        <div className="bg-slate-50 border-t border-slate-200 p-3 sm:p-4 flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Lembrar Mais Tarde
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onReviewInAdmin();
            }}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Abrir e Aprovar no Painel</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
