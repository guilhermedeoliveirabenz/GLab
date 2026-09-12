import React, { useState } from 'react';
import { Booking } from '../types';
import { formatDateBR } from '../lib/whatsapp';
import { useAuth } from '../lib/authContext';
import {
  Search,
  Calendar,
  Phone,
  CheckCircle,
  Clock,
  XCircle,
  Truck,
  Monitor,
  FileText,
  UserCheck,
  LogOut,
  Laptop,
  Sparkles,
  Repeat,
} from 'lucide-react';

interface TeacherMyBookingsProps {
  bookings: Booking[];
  onNewBookingClick: () => void;
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

  // Formatação de telefone
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
      setPhoneError('Por favor digite um número de WhatsApp/celular válido (com DDD, mínimo 10 dígitos).');
      return;
    }
    loginTeacher(raw, nameInput.trim() || undefined);
  };

  // Se professor está logado por telefone, filtra estritamente por suas reservas ou complementa com busca
  const loggedPhone = teacherSession ? teacherSession.phone : null;
  const cleanSearch = query.replace(/\D/g, '');

  const matchingBookings = bookings.filter((b) => {
    const rawBookingPhone = b.whatsapp.replace(/\D/g, '');

    // Se o professor estiver autenticado pelo celular
    if (loggedPhone) {
      const matchPhone = rawBookingPhone.includes(loggedPhone) || loggedPhone.includes(rawBookingPhone);
      if (!matchPhone) return false;
      if (!query.trim()) return true;
      const matchLab = b.labName.toLowerCase().includes(query.toLowerCase());
      const matchClass = b.classGroup.toLowerCase().includes(query.toLowerCase());
      const matchDate = b.date.includes(query);
      return matchLab || matchClass || matchDate;
    }

    // Se não estiver logado, busca aberta geral
    if (!query.trim()) return true;
    const matchName = b.teacherName.toLowerCase().includes(query.toLowerCase());
    const matchClass = b.classGroup.toLowerCase().includes(query.toLowerCase());
    const matchPhone = cleanSearch ? rawBookingPhone.includes(cleanSearch) : false;
    return matchName || matchClass || matchPhone;
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Teacher Phone Identification Banner */}
      {!teacherSession ? (
        <div
          id="teacher-phone-login-card"
          className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 shadow-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Phone className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Acesse com seu WhatsApp / Celular
                </h2>
                <p className="text-xs text-slate-600">
                  Informe seu número para carregar automaticamente o histórico completo de todas as suas solicitações.
                </p>
              </div>
            </div>
          </div>

          {phoneError && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              {phoneError}
            </div>
          )}

          <form onSubmit={handleTeacherLoginSubmit} className="flex flex-col sm:flex-row gap-2.5">
            <div className="flex-1">
              <input
                id="teacher-phone-input"
                type="tel"
                required
                placeholder="Seu WhatsApp: (XX) XXXXX-XXXX"
                value={phoneInput}
                onChange={(e) => handlePhoneInputChange(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-white border border-blue-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-mono text-slate-900 placeholder:text-slate-400"
              />
            </div>
            <div className="sm:w-48">
              <input
                id="teacher-name-optional-input"
                type="text"
                placeholder="Seu Nome (Opcional)"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-white border border-blue-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-900 placeholder:text-slate-400"
              />
            </div>
            <button
              id="submit-teacher-phone-btn"
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shrink-0 shadow-xs cursor-pointer"
            >
              Consultar Histórico
            </button>
          </form>
        </div>
      ) : (
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
                  {teacherSession.name || 'Professor(a) Conectado(a)'}
                </span>
                <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                  Filtro Ativo
                </span>
              </div>
              <p className="text-xs text-emerald-800 font-mono mt-0.5">
                WhatsApp: {teacherSession.phone} • Visualizando apenas seus agendamentos ({matchingBookings.length} encontrados)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              id="teacher-new-booking-btn"
              onClick={onNewBookingClick}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
            >
              + Nova Reserva
            </button>
            <button
              id="teacher-logout-btn"
              onClick={logoutTeacher}
              title="Trocar de número ou sair"
              className="px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Trocar Celular</span>
            </button>
          </div>
        </div>
      )}

      {/* Search Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {teacherSession ? 'Filtrar em Minhas Reservas' : 'Consultar Agendamentos Escolares'}
            </h2>
            <p className="text-xs text-slate-500">
              {teacherSession
                ? 'Pesquise por data, turma ou laboratório entre seus agendamentos.'
                : 'Você também pode pesquisar digitando qualquer nome de professor ou número de WhatsApp abaixo.'}
            </p>
          </div>
          {!teacherSession && (
            <button
              id="teacher-new-booking-btn-secondary"
              onClick={onNewBookingClick}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shrink-0 shadow-xs"
            >
              + Nova Reserva
            </button>
          )}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            id="search-teacher-bookings-input"
            type="text"
            placeholder={
              teacherSession
                ? 'Filtrar por turma, laboratório ou data...'
                : 'Buscar por nome do professor, telefone WhatsApp ou turma...'
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
          />
        </div>
      </div>

      {/* Bookings List */}
      <div className="space-y-3">
        {matchingBookings.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700 text-sm">Nenhum agendamento encontrado</p>
            <p className="text-xs text-slate-600 mt-1">
              {teacherSession
                ? 'Você ainda não possui agendamentos cadastrados com este número de celular.'
                : 'Verifique o número informado ou realize um novo agendamento.'}
            </p>
            <button
              onClick={onNewBookingClick}
              className="mt-4 px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors inline-flex items-center gap-1.5"
            >
              Solicitar Reserva de Laboratório Agora
            </button>
          </div>
        ) : (
          matchingBookings.map((b) => {
            const isConfirmed = b.status === 'confirmed';
            const isPending = b.status === 'pending';
            const isRejected = b.status === 'rejected' || b.status === 'cancelled';

            return (
              <div
                key={b.id}
                id={`teacher-booking-${b.id}`}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-base">{b.labName}</span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
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
                    {b.whatsappSent && (
                      <span className="text-[10px] font-medium bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        WhatsApp Enviado
                      </span>
                    )}
                    {b.recurrenceGroupId && (
                      <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <Repeat className="w-2.5 h-2.5" />
                        {b.recurrenceIndex && b.recurrenceTotalCount
                          ? `Recorrente (${b.recurrenceIndex}/${b.recurrenceTotalCount})`
                          : 'Recorrente'}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-700">
                    <span className="font-semibold">{b.teacherName}</span> • Turma:{' '}
                    <span className="font-semibold text-slate-900">{b.classGroup}</span>
                    {b.subject ? ` • ${b.subject}` : ''}
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
                      {b.whatsapp}
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
                  <span className="text-[11px] text-slate-600 block">Solicitado em:</span>
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

