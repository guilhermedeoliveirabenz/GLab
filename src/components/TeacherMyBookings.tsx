import React, { useState } from 'react';
import { Booking } from '../types';
import { formatDateBR } from '../lib/whatsapp';
import { useAuth } from '../lib/authContext';
import { EducationBadge } from './EducationBadge';
import {
  Search,
  Calendar,
  Phone,
  Clock,
  Truck,
  UserCheck,
  LogOut,
  Laptop,
  Repeat,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface TeacherMyBookingsProps {
  bookings: Booking[];
  onNewBookingClick: () => void;
}

function formatDisplayPhone(val: string): string {
  const digits = val.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return val;
}

export const TeacherMyBookings: React.FC<TeacherMyBookingsProps> = ({
  bookings,
  onNewBookingClick,
}) => {
  const { teacherSession, loginTeacher, logoutTeacher } = useAuth();
  const [phoneInput, setPhoneInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [query, setQuery] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Formatação de telefone em tempo de digitação
  const handlePhoneInputChange = (val: string) => {
    const raw = val.replace(/\D/g, '');
    let formatted = raw;
    if (raw.length <= 2) {
      formatted = raw.length > 0 ? `(${raw}` : '';
    } else if (raw.length <= 7) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    } else if (raw.length <= 11) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
    } else {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
    }
    setPhoneInput(formatted);
  };

  const handleTeacherLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(null);
    const raw = phoneInput.replace(/\D/g, '');
    if (raw.length < 10) {
      setPhoneError('Por favor digite um número de WhatsApp válido (com DDD, mínimo 10 dígitos).');
      return;
    }
    loginTeacher(raw, nameInput.trim() || undefined);
  };

  // CASO 1: SE A PESSOA AINDA NÃO COLOCOU O NÚMERO DO WHATSAPP, NÃO MOSTRA NENHUM AGENDAMENTO
  if (!teacherSession) {
    return (
      <div className="max-w-xl mx-auto py-4">
        <div
          id="teacher-phone-required-card"
          className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-2xs">
            <Phone className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Meus Agendamentos
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
            Para consultar e acompanhar o status das suas reservas, digite o número do WhatsApp informado no agendamento.
          </p>

          {phoneError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium text-left">
              {phoneError}
            </div>
          )}

          <form onSubmit={handleTeacherLoginSubmit} className="space-y-3.5 text-left">
            <div>
              <label htmlFor="teacher-phone-input" className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Número do seu WhatsApp: *</span>
              </label>
              <input
                id="teacher-phone-input"
                type="tel"
                required
                autoFocus
                placeholder="(XX) XXXXX-XXXX"
                value={phoneInput}
                onChange={(e) => handlePhoneInputChange(e.target.value)}
                className="w-full px-4 py-3 text-base bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 font-mono text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <div>
              <label htmlFor="teacher-name-optional-input" className="block text-xs font-medium text-slate-600 mb-1.5">
                Seu Nome (Opcional):
              </label>
              <input
                id="teacher-name-optional-input"
                type="text"
                placeholder="Ex: Prof. João Silva"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <button
              id="submit-teacher-phone-btn"
              type="submit"
              className="w-full py-3 px-5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              <span>Ver Meus Agendamentos</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              Acesso seguro às suas solicitações
            </span>
            <button
              type="button"
              onClick={onNewBookingClick}
              className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
            >
              + Fazer Novo Agendamento
            </button>
          </div>
        </div>
      </div>
    );
  }

  // CASO 2: O PROFESSOR INFORMOU O WHATSAPP - MOSTRA APENAS OS AGENDAMENTOS DELE
  const loggedPhoneDigits = teacherSession.phone.replace(/\D/g, '');

  const userBookings = bookings.filter((b) => {
    const bookingDigits = b.whatsapp.replace(/\D/g, '');
    if (!bookingDigits || !loggedPhoneDigits) return false;

    // Comparação exata ou tolerante com código de país
    return (
      bookingDigits === loggedPhoneDigits ||
      (bookingDigits.endsWith(loggedPhoneDigits) && loggedPhoneDigits.length >= 8) ||
      (loggedPhoneDigits.endsWith(bookingDigits) && bookingDigits.length >= 8)
    );
  });

  const matchingBookings = userBookings
    .filter((b) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase().trim();
      return (
        b.labName.toLowerCase().includes(q) ||
        b.classGroup.toLowerCase().includes(q) ||
        (b.subject && b.subject.toLowerCase().includes(q)) ||
        b.date.includes(q)
      );
    })
    .sort((a, b) => {
      const dateDiff = a.date.localeCompare(b.date);
      if (dateDiff !== 0) return dateDiff;
      const timeA = a.startTime || a.timeSlot || '';
      const timeB = b.startTime || b.timeSlot || '';
      return timeA.localeCompare(timeB);
    });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Banner de Identificação Ativa */}
      <div
        id="teacher-authenticated-banner"
        className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">
                {teacherSession.name ? `Prof. ${teacherSession.name}` : 'Meus Agendamentos'}
              </span>
              <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                WhatsApp Identificado
              </span>
            </div>
            <p className="text-xs text-emerald-800 font-mono mt-0.5">
              WhatsApp: <strong>{formatDisplayPhone(teacherSession.phone)}</strong> • {userBookings.length} agendamento(s) registrado(s)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            id="teacher-new-booking-btn"
            onClick={onNewBookingClick}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            + Nova Reserva
          </button>
          <button
            id="teacher-logout-btn"
            onClick={logoutTeacher}
            title="Trocar de número de WhatsApp ou sair"
            className="px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Trocar WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Busca rápida entre os próprios agendamentos */}
      {userBookings.length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              id="search-teacher-bookings-input"
              type="text"
              placeholder="Filtrar por turma, laboratório, data ou matéria..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
            />
          </div>
        </div>
      )}

      {/* Lista de Agendamentos */}
      <div className="space-y-3">
        {userBookings.length === 0 ? (
          <div className="bg-white p-10 sm:p-12 rounded-3xl border border-slate-200 text-center text-slate-500">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-bold text-slate-800 text-base">Nenhum agendamento encontrado</p>
            <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
              Não encontramos nenhuma solicitação registrada para o número de WhatsApp{' '}
              <strong className="font-mono text-slate-800">{formatDisplayPhone(teacherSession.phone)}</strong>.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={logoutTeacher}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Informar Outro Número
              </button>
              <button
                type="button"
                onClick={onNewBookingClick}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                + Fazer Nova Reserva
              </button>
            </div>
          </div>
        ) : matchingBookings.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500">
            <p className="font-semibold text-slate-700 text-sm">Nenhum agendamento corresponde à sua pesquisa "{query}"</p>
            <button
              type="button"
              onClick={() => setQuery('')}
              className="mt-3 px-3 py-1.5 text-xs text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 font-medium cursor-pointer"
            >
              Limpar Filtro
            </button>
          </div>
        ) : (
          matchingBookings.map((b, index) => {
            const isConfirmed = b.status === 'confirmed';
            const isPending = b.status === 'pending';

            return (
              <div
                key={`${b.id}-${index}`}
                id={`teacher-booking-${b.id}`}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-base">{b.labName}</span>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        isConfirmed
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : isPending
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                      }`}
                    >
                      {isConfirmed
                        ? '✅ Confirmado'
                        : isPending
                          ? '⏳ Aguardando Aprovação'
                          : '❌ Recusado/Cancelado'}
                    </span>
                    {b.recurrenceGroupId && (
                      <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <Repeat className="w-2.5 h-2.5" />
                        {b.recurrenceIndex && b.recurrenceTotalCount
                          ? `Recorrente (${b.recurrenceIndex}/${b.recurrenceTotalCount})`
                          : 'Recorrente'}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-700 flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold">{b.teacherName}</span>
                    <span>• Turma: <span className="font-semibold text-slate-900">{b.classGroup}</span></span>
                    {b.educationLevel && <EducationBadge level={b.educationLevel} size="xs" />}
                    {b.subject ? <span>• {b.subject}</span> : null}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      {formatDateBR(b.date)}
                    </span>
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      {b.timeSlot}
                    </span>
                    <span className="flex items-center gap-1 font-mono text-emerald-700">
                      <Phone className="w-3.5 h-3.5" />
                      {formatDisplayPhone(b.whatsapp)}
                    </span>
                    {b.requestedMachines && (
                      <span className="flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        <Laptop className="w-3 h-3 text-blue-600" />
                        {b.requestedMachines} máquinas solicitadas
                      </span>
                    )}
                  </div>

                  {b.isMobileLab && (
                    <div className="mt-2 text-xs bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-amber-900 inline-flex items-center gap-2">
                      <Truck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span>
                        Carrinho Móvel: Será entregue na sala{' '}
                        <strong className="font-bold text-amber-950">
                          {b.roomNumber || 'A definir'}
                        </strong>
                      </span>
                    </div>
                  )}

                  {b.notes && (
                    <p className="text-[11px] text-slate-600 italic bg-slate-50 p-2 rounded-md">
                      "{b.notes}"
                    </p>
                  )}
                </div>

                <div className="text-right sm:border-l sm:border-slate-100 sm:pl-4 self-stretch sm:self-center flex flex-col justify-center">
                  <span className="text-[11px] text-slate-400 block">Solicitado em:</span>
                  <span className="text-xs font-mono text-slate-600">
                    {new Date(b.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
