import React, { useState } from 'react';
import { Booking } from '../types';
import { AdminUser } from '../lib/authContext';
import {
  Bell,
  Clock,
  Shield,
  ChevronRight,
  X,
  AlertCircle,
  Eye,
  Check,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import { formatDateBR } from '../lib/whatsapp';

interface PendingBookingsNotificationProps {
  user: AdminUser | null;
  pendingBookings: Booking[];
  onOpenPendingTab: () => void;
}

export const PendingBookingsNotification: React.FC<PendingBookingsNotificationProps> = ({
  user,
  pendingBookings,
  onOpenPendingTab,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isTemporarilyDismissed, setIsTemporarilyDismissed] = useState(false);

  const pendingCount = pendingBookings.length;
  if (pendingCount === 0 || isTemporarilyDismissed) {
    return null;
  }

  const isTechnician = user?.role === 'technician';
  const roleLabel = isTechnician ? 'Técnico de TI' : 'Administrador';

  // Se minimizado, mostra um selo flutuante elegante no canto
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 left-6 z-40 animate-bounce-short">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-2xl shadow-xl border border-amber-300 transition-all transform hover:scale-105 cursor-pointer font-bold text-xs"
          title="Clique para expandir o aviso de agendamentos pendentes"
        >
          <div className="relative">
            <Bell className="w-4 h-4 animate-swing" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-600 rounded-full animate-ping" />
          </div>
          <span>
            {pendingCount} Pendente{pendingCount > 1 ? 's' : ''}
          </span>
          <Maximize2 className="w-3.5 h-3.5 opacity-80" />
        </button>
      </div>
    );
  }

  // Banner completo
  return (
    <aside
      aria-label="Aviso de Agendamentos Pendentes"
      className="mb-4 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 rounded-2xl shadow-md text-white p-3.5 sm:p-4 border border-amber-400/40 relative overflow-hidden transition-all"
    >
      {/* Detalhes de fundo sutil */}
      <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5 relative z-10">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0 mt-0.5 shadow-inner">
            <Bell className="w-5 h-5 animate-pulse" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider bg-white/25 px-2.5 py-0.5 rounded-full text-white">
                <Shield className="w-3 h-3 text-amber-200" />
                {roleLabel} Conectado
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-100">
                ● {pendingCount} {pendingCount === 1 ? 'solicitação aguardando sua revisão' : 'solicitações aguardando sua revisão'}
              </span>
            </div>

            <h3 className="text-sm sm:text-base font-extrabold text-white mt-1">
              Existem {pendingCount} agendamento{pendingCount > 1 ? 's' : ''} pendente{pendingCount > 1 ? 's' : ''} de laboratório no sistema
            </h3>

            <p className="text-xs text-amber-100/90 mt-0.5 max-w-2xl">
              Professores enviaram solicitações de reservas que precisam ser aprovadas ou ajustadas pela equipe de suporte técnico.
            </p>

            {/* Prévia dos últimos pedidos pendentes */}
            <div className="mt-2.5 flex items-center gap-2 overflow-x-auto pb-1 max-w-full text-[11px]">
              {pendingBookings.slice(0, 3).map((b) => (
                <div
                  key={b.id}
                  onClick={onOpenPendingTab}
                  className="bg-black/20 hover:bg-black/30 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-white/20 shrink-0 cursor-pointer transition-colors flex items-center gap-1.5"
                  title="Clique para ir diretamente a este agendamento"
                >
                  <Clock className="w-3 h-3 text-amber-200" />
                  <span className="font-semibold text-white">{b.teacherName}</span>
                  <span className="text-amber-200">•</span>
                  <span className="text-amber-100">{b.labName}</span>
                  <span className="text-white/60">({b.timeSlot})</span>
                </div>
              ))}
              {pendingBookings.length > 3 && (
                <span className="text-amber-200 text-xs font-semibold shrink-0">
                  +{pendingBookings.length - 3} mais...
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/20">
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            title="Minimizar aviso"
            className="p-2 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-colors cursor-pointer"
          >
            <Minimize2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsTemporarilyDismissed(true)}
            title="Ocultar aviso nesta sessão"
            className="p-2 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenPendingTab}
            className="flex-1 md:flex-initial px-4 py-2 bg-white hover:bg-slate-100 active:bg-slate-200 text-amber-900 text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <span>Revisar Agendamentos Pendentes</span>
            <ChevronRight className="w-4 h-4 text-amber-700" />
          </button>
        </div>
      </div>
    </aside>
  );
};
