import React, { useState } from 'react';
import { Booking, LAB_LIST, Lab } from '../types';
import { formatDateBR } from '../lib/whatsapp';
import {
  getBookingDateLimits,
  MIN_BOOKING_ADVANCE_WORKING_DAYS,
  MAX_BOOKING_ADVANCE_WORKING_DAYS,
} from '../lib/bookingRuleUtils';
import {
  getLabMaintenanceStatus,
  formatMaintenancePeriod,
  doTimesOverlap,
  LabMaintenanceCheckResult,
} from '../lib/maintenanceUtils';
import {
  Calendar as CalendarIcon,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock,
  Laptop,
  Truck,
  User,
  CheckCircle2,
  Clock3,
  XCircle,
  Filter,
  Plus,
  Repeat,
  Wrench,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface BookingCalendarProps {
  bookings: Booking[];
  labs?: Lab[];
  onSelectBooking?: (booking: Booking) => void;
  onRequestNewBooking?: (date: string) => void;
}

type CalendarViewMode = 'day' | 'week' | 'month';

export const BookingCalendar: React.FC<BookingCalendarProps> = ({
  bookings,
  labs = LAB_LIST,
  onSelectBooking,
  onRequestNewBooking,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [selectedLabId, setSelectedLabId] = useState<string>('all');
  const [selectedShift, setSelectedShift] = useState<string>('all');
  const [activeBookingModal, setActiveBookingModal] = useState<Booking | null>(null);
  const [selectedMaintenanceLabModal, setSelectedMaintenanceLabModal] = useState<Lab | null>(null);

  // Laboratórios com manutenção cadastrada
  const maintenanceLabs = labs.filter((l) => l.isUnderMaintenance);
  const activeMaintenanceLabs = maintenanceLabs.filter(
    (l) => selectedLabId === 'all' || l.id === selectedLabId,
  );

  // Verifica se o horário da manutenção colide com o turno selecionado no filtro
  const doesMaintenanceOverlapShift = (status: LabMaintenanceCheckResult, shift: string): boolean => {
    if (shift === 'all') return true;
    if (status.allDay) return true;
    const shiftTimes: Record<string, [string, string]> = {
      manha: ['07:00', '12:00'],
      tarde: ['13:00', '18:00'],
      noite: ['18:30', '22:30'],
    };
    const [shiftStart, shiftEnd] = shiftTimes[shift] || ['00:00', '23:59'];
    return doTimesOverlap(status.startTime, status.endTime, shiftStart, shiftEnd);
  };

  // Retorna os laboratórios em manutenção especificamente para a data fornecida
  const getMaintenanceForDate = (dateStr: string) => {
    return labs
      .filter((l) => selectedLabId === 'all' || l.id === selectedLabId)
      .map((l) => ({
        lab: l,
        status: getLabMaintenanceStatus(l, dateStr),
      }))
      .filter(
        ({ status }) => status.isUnderMaintenance && doesMaintenanceOverlapShift(status, selectedShift),
      );
  };

  // Filtragem dos agendamentos
  const filteredBookings = bookings.filter((b) => {
    if (selectedLabId !== 'all' && b.labId !== selectedLabId) return false;
    if (selectedShift !== 'all' && b.shift !== selectedShift) return false;
    return true;
  });

  // Helpers de Navegação
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'day') {
      d.setDate(d.getDate() - 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setMonth(d.getMonth() - 1);
    }
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'day') {
      d.setDate(d.getDate() + 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Funções para cálculo do Mês
  const getMonthDays = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: { date: Date; isCurrentMonth: boolean; dateStr: string }[] = [];

    // Dias do mês anterior para preencher a primeira semana
    const startDayOfWeek = firstDay.getDay(); // 0 = Domingo
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      const dateStr = prevDate.toISOString().split('T')[0];
      days.push({ date: prevDate, isCurrentMonth: false, dateStr });
    }

    // Dias do mês atual
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const currDate = new Date(year, month, i);
      const dateStr = `${currDate.getFullYear()}-${String(currDate.getMonth() + 1).padStart(2, '0')}-${String(currDate.getDate()).padStart(2, '0')}`;
      days.push({ date: currDate, isCurrentMonth: true, dateStr });
    }

    // Dias do próximo mês para completar 35 ou 42 células
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const nextDate = new Date(year, month + 1, i);
      const dateStr = nextDate.toISOString().split('T')[0];
      days.push({ date: nextDate, isCurrentMonth: false, dateStr });
    }

    return days;
  };

  // Funções para cálculo da Semana
  const getWeekDays = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // ajusta para segunda-feira como primeiro dia útil
    const monday = new Date(d.setDate(diff));

    const weekDays: { date: Date; dateStr: string; dayName: string }[] = [];
    const dayNames = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

    for (let i = 0; i < 7; i++) {
      const curr = new Date(monday);
      curr.setDate(monday.getDate() + i);
      const dateStr = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`;
      weekDays.push({
        date: curr,
        dateStr,
        dayName: dayNames[i],
      });
    }

    return weekDays;
  };

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const todayStr = new Date().toISOString().split('T')[0];
  const currentDateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  const getStatusBadge = (status: Booking['status']) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-2.5 h-2.5" /> Confirmado
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800">
            <XCircle className="w-2.5 h-2.5" /> Cancelado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
            <Clock3 className="w-2.5 h-2.5" /> Pendente
          </span>
        );
    }
  };

  const { minDateFormatted, maxDateFormatted } = getBookingDateLimits();

  return (
    <div className="space-y-4">
      {/* Barra Informativa de Regras de Agendamento */}
      <div
        id="calendar-booking-rules-info"
        className="bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-blue-50/90 border border-blue-200/80 rounded-2xl p-3 sm:px-4 sm:py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-slate-800 shadow-2xs"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <CalendarClock className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900">Regras Oficiais de Agendamento:</span>{' '}
            <span className="text-slate-600">
              Antecedência mínima de <strong>{MIN_BOOKING_ADVANCE_WORKING_DAYS} dias úteis</strong> e no máximo <strong>{MAX_BOOKING_ADVANCE_WORKING_DAYS} dias úteis</strong> para frente.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 self-end sm:self-center">
          <span className="text-[11px] text-slate-500 font-medium">Janela liberada hoje:</span>
          <span className="font-bold text-blue-900 bg-white px-2 py-0.5 rounded-md border border-blue-200 text-[11px] shadow-2xs">
            {minDateFormatted} a {maxDateFormatted}
          </span>
        </div>
      </div>

      {/* Calendar Top Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Navigation buttons and Title */}
        <div className="flex items-center justify-between md:justify-start gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              id="calendar-prev-btn"
              type="button"
              onClick={handlePrev}
              className="p-1.5 hover:bg-white text-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              id="calendar-today-btn"
              type="button"
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
            >
              Hoje
            </button>
            <button
              id="calendar-next-btn"
              type="button"
              onClick={handleNext}
              className="p-1.5 hover:bg-white text-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Próximo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            <span>
              {viewMode === 'month' && `${monthNames[currentMonth]} de ${currentYear}`}
              {viewMode === 'day' &&
                `${currentDate.toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}`}
              {viewMode === 'week' && `Semana de ${formatDateBR(getWeekDays(currentDate)[0].dateStr)} a ${formatDateBR(getWeekDays(currentDate)[6].dateStr)}`}
            </span>
          </h2>
        </div>

        {/* View Mode Toggle & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Tabs */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold">
            <button
              id="calendar-view-day-btn"
              type="button"
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'day'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dia
            </button>
            <button
              id="calendar-view-week-btn"
              type="button"
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'week'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semana
            </button>
            <button
              id="calendar-view-month-btn"
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mês
            </button>
          </div>

          {/* Lab Filter */}
          <select
            id="calendar-filter-lab"
            value={selectedLabId}
            onChange={(e) => setSelectedLabId(e.target.value)}
            className="text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-700 font-medium"
          >
            <option value="all">Todos os Laboratórios</option>
            {LAB_LIST.map((lab) => (
              <option key={lab.id} value={lab.id}>
                {lab.name}
              </option>
            ))}
          </select>

          {/* Shift Filter */}
          <select
            id="calendar-filter-shift"
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            className="text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-700 font-medium"
          >
            <option value="all">Todos os Turnos</option>
            <option value="manha">Manhã</option>
            <option value="tarde">Tarde</option>
            <option value="noite">Noite</option>
          </select>
        </div>
      </div>

      {/* Banner de Laboratórios em Manutenção */}
      {maintenanceLabs.length > 0 && (
        <div className="bg-amber-50/95 border border-amber-300/80 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-950 shadow-2xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0 mt-0.5 sm:mt-0">
              <Wrench className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <span className="font-bold block sm:inline text-amber-950">
                {maintenanceLabs.length} {maintenanceLabs.length === 1 ? 'Laboratório com Manutenção Programada' : 'Laboratórios com Manutenção Programada'}
              </span>
              <div className="text-[11px] text-amber-800 mt-0.5 space-y-0.5">
                {maintenanceLabs.map((l) => (
                  <div key={l.id} className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-amber-950">{l.name}:</span>
                    <span>{formatMaintenancePeriod(l)}</span>
                    {l.maintenanceReason && <span className="text-amber-700 italic">({l.maintenanceReason})</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <span className="text-[11px] bg-amber-200/80 text-amber-950 px-2.5 py-1 rounded-lg font-bold border border-amber-300">
              Bloqueado nos dias/turnos definidos
            </span>
          </div>
        </div>
      )}

      {/* Dica amigável de clique para agendar */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span className="flex items-center gap-1.5 text-blue-700 font-medium">
          <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
          Dica: clique diretamente em qualquer dia do calendário para iniciar um novo agendamento naquela data.
        </span>
      </div>

      {/* ========================================================= */}
      {/* 1. MODO MÊS (MONTH VIEW)                                 */}
      {/* ========================================================= */}
      {viewMode === 'month' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
            <span>Dom</span>
            <span>Seg</span>
            <span>Ter</span>
            <span>Qua</span>
            <span>Qui</span>
            <span>Sex</span>
            <span>Sáb</span>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
            {getMonthDays(currentYear, currentMonth).map((dayObj, index) => {
              const dayBookings = filteredBookings.filter((b) => b.date === dayObj.dateStr);
              const isToday = dayObj.dateStr === todayStr;

              return (
                <div
                  key={index}
                  onClick={() => {
                    if (dayObj.isCurrentMonth && onRequestNewBooking) {
                      onRequestNewBooking(dayObj.dateStr);
                    }
                  }}
                  title={dayObj.isCurrentMonth ? `Clique para agendar aula no dia ${formatDateBR(dayObj.dateStr)}` : undefined}
                  className={`min-h-[110px] sm:min-h-[130px] p-1.5 sm:p-2 transition-all flex flex-col justify-between group ${
                    dayObj.isCurrentMonth
                      ? 'bg-white hover:bg-blue-50/40 hover:border-blue-300 cursor-pointer'
                      : 'bg-slate-50/50 text-slate-400'
                  } ${isToday ? 'ring-2 ring-blue-500 ring-inset bg-blue-50/20' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center ${
                        isToday
                          ? 'bg-blue-600 text-white'
                          : dayObj.isCurrentMonth
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {dayObj.date.getDate()}
                    </span>

                    {onRequestNewBooking && dayObj.isCurrentMonth && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRequestNewBooking(dayObj.dateStr);
                        }}
                        title="Agendar neste dia"
                        className="opacity-0 group-hover:opacity-100 hover:opacity-100 flex items-center gap-1 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded transition-all cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-3 h-3" />
                        <span className="hidden sm:inline">Agendar</span>
                      </button>
                    )}
                  </div>

                  {/* Eventos e Manutenções do dia */}
                  <div className="flex-1 space-y-1 overflow-y-auto max-h-[85px] sm:max-h-[105px] pr-0.5">
                    {/* Laboratórios em manutenção específicos deste dia */}
                    {dayObj.isCurrentMonth &&
                      getMaintenanceForDate(dayObj.dateStr).map(({ lab: mLab, status: mStatus }) => (
                        <div
                          key={`maint-${mLab.id}-${dayObj.dateStr}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMaintenanceLabModal(mLab);
                          }}
                          className={`w-full text-left px-1.5 py-0.5 text-[10px] sm:text-[11px] rounded font-bold border truncate flex items-center gap-1 shadow-2xs transition-all cursor-pointer ${
                            mStatus.allDay
                              ? 'bg-rose-100 text-rose-950 border-rose-300 hover:bg-rose-200'
                              : 'bg-amber-100 text-amber-950 border-amber-300 hover:bg-amber-200'
                          }`}
                          title={`🛠️ Interdição Técnica: ${mLab.name} (${mStatus.allDay ? 'Dia todo' : `${mStatus.startTime} às ${mStatus.endTime}`}) - Motivo: ${mStatus.reason}`}
                        >
                          <Wrench className={`w-2.5 h-2.5 shrink-0 ${mStatus.allDay ? 'text-rose-700' : 'text-amber-700'}`} />
                          <span className="truncate">
                            {mStatus.allDay ? `${mLab.name} (Dia todo)` : `${mStatus.startTime}-${mStatus.endTime} ${mLab.name}`}
                          </span>
                        </div>
                      ))}

                    {/* Agendamentos do dia */}
                    {dayBookings.slice(0, 3).map((b, bIdx) => (
                      <button
                        key={`${b.id}-${bIdx}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveBookingModal(b);
                          onSelectBooking?.(b);
                        }}
                        className={`w-full text-left px-1.5 py-0.5 text-[11px] rounded font-medium border truncate flex items-center gap-1 transition-transform hover:scale-[1.02] cursor-pointer ${
                          b.isMobileLab
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : b.status === 'confirmed'
                            ? 'bg-blue-50 text-blue-900 border-blue-200'
                            : 'bg-slate-50 text-slate-800 border-slate-200'
                        }`}
                        title={`${b.timeSlot} - ${b.labName} (${b.teacherName})`}
                      >
                        {b.isMobileLab ? (
                          <Truck className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                        ) : (
                          <Laptop className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                        )}
                        {b.recurrenceGroupId && (
                          <Repeat className="w-2.5 h-2.5 text-indigo-600 shrink-0" title="Agendamento Recorrente" />
                        )}
                        <span className="truncate">{b.startTime ? `${b.startTime} ` : ''}{b.labName}</span>
                      </button>
                    ))}

                    {dayBookings.length > 3 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentDate(dayObj.date);
                          setViewMode('day');
                        }}
                        className="text-[10px] font-bold text-blue-600 hover:underline block text-center w-full"
                      >
                        +{dayBookings.length - 3} mais...
                      </button>
                    )}

                    {dayBookings.length === 0 && getMaintenanceForDate(dayObj.dateStr).length === 0 && dayObj.isCurrentMonth && (
                      <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity py-2">
                        <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                          <Plus className="w-3 h-3" /> Clique p/ Agendar
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. MODO SEMANA (WEEK VIEW)                               */}
      {/* ========================================================= */}
      {viewMode === 'week' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Headers da semana */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center divide-x divide-slate-200">
              {getWeekDays(currentDate).map((dayObj) => {
                const isToday = dayObj.dateStr === todayStr;
                return (
                  <div
                    key={dayObj.dateStr}
                    onClick={() => onRequestNewBooking?.(dayObj.dateStr)}
                    className={`py-3 px-2 transition-colors cursor-pointer hover:bg-blue-50/70 group ${isToday ? 'bg-blue-50/60' : ''}`}
                    title="Clique para agendar aula nesta data"
                  >
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                      {dayObj.dayName}
                    </span>
                    <span
                      className={`inline-block mt-1 text-sm font-bold w-7 h-7 rounded-full leading-7 ${
                        isToday ? 'bg-blue-600 text-white' : 'text-slate-800'
                      }`}
                    >
                      {dayObj.date.getDate()}
                    </span>
                    <span className="text-[10px] text-blue-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity block mt-0.5">
                      + Agendar
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Conteúdo das colunas da semana */}
            <div className="grid grid-cols-7 divide-x divide-slate-100 min-h-[380px]">
              {getWeekDays(currentDate).map((dayObj) => {
                const dayBookings = filteredBookings.filter((b) => b.date === dayObj.dateStr);

                return (
                  <div
                    key={dayObj.dateStr}
                    onClick={() => onRequestNewBooking?.(dayObj.dateStr)}
                    className="p-2 space-y-2 bg-slate-50/20 hover:bg-blue-50/20 transition-colors cursor-pointer flex flex-col justify-start"
                    title={`Clique para agendar aula em ${formatDateBR(dayObj.dateStr)}`}
                  >
                    {/* Laboratórios em manutenção nesta data específica */}
                    {getMaintenanceForDate(dayObj.dateStr).map(({ lab: mLab, status: mStatus }) => (
                      <div
                        key={`week-maint-${mLab.id}-${dayObj.dateStr}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMaintenanceLabModal(mLab);
                        }}
                        className={`p-2 rounded-xl border text-xs space-y-1 shadow-2xs transition-colors cursor-pointer ${
                          mStatus.allDay
                            ? 'border-rose-300 bg-rose-50 text-rose-950 hover:bg-rose-100'
                            : 'border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100'
                        }`}
                        title={`Clique para ver detalhes da manutenção`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className={`font-bold truncate text-[11px] flex items-center gap-1 ${mStatus.allDay ? 'text-rose-900' : 'text-amber-900'}`}>
                            <Wrench className={`w-3 h-3 shrink-0 ${mStatus.allDay ? 'text-rose-600' : 'text-amber-600'}`} />
                            {mLab.name}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            mStatus.allDay ? 'bg-rose-200 text-rose-900' : 'bg-amber-200 text-amber-900'
                          }`}>
                            {mStatus.allDay ? 'Dia Todo' : `${mStatus.startTime} - ${mStatus.endTime}`}
                          </span>
                        </div>
                        <div className="text-[10px] flex items-center gap-1 text-slate-700 font-medium">
                          <Clock className="w-2.5 h-2.5 text-slate-400" />
                          <span>{mStatus.allDay ? 'Interdição em todos os turnos' : `Das ${mStatus.startTime} às ${mStatus.endTime}`}</span>
                        </div>
                        <p className="text-[10px] text-slate-600 line-clamp-2">
                          {mStatus.reason || 'Em reparos técnicos'}
                        </p>
                      </div>
                    ))}

                    {dayBookings.length === 0 && getMaintenanceForDate(dayObj.dateStr).length === 0 ? (
                      <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-3 rounded-xl border border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-colors">
                        <Plus className="w-4 h-4 text-slate-300 group-hover:text-blue-600 mb-1" />
                        <span className="text-[11px] text-slate-400 group-hover:text-blue-700 font-medium">
                          Livre • Clique p/ Agendar
                        </span>
                      </div>
                    ) : (
                      dayBookings.map((b, bIdx) => (
                        <div
                          key={`${b.id}-${bIdx}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveBookingModal(b);
                            onSelectBooking?.(b);
                          }}
                          className={`p-2.5 rounded-xl border text-xs space-y-1.5 shadow-2xs hover:shadow-xs transition-shadow cursor-pointer ${
                            b.isMobileLab
                              ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                              : 'bg-white border-slate-200 text-slate-900'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold truncate text-[11px]">
                              {b.labName}
                            </span>
                            {getStatusBadge(b.status)}
                          </div>

                          <div className="flex items-center gap-1 text-[11px] text-slate-600 font-mono">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{b.timeSlot}</span>
                          </div>

                          <div className="text-[11px] font-medium text-slate-800 truncate">
                            {b.teacherName}
                          </div>

                          <div className="text-[10px] text-slate-500 truncate">
                            Turma: {b.classGroup}
                          </div>

                          {b.isMobileLab && b.roomNumber && (
                            <div className="text-[10px] font-semibold text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <Truck className="w-3 h-3" />
                              <span className="truncate">{b.roomNumber}</span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. MODO DIA (DAY VIEW)                                   */}
      {/* ========================================================= */}
      {viewMode === 'day' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Agendamentos em {formatDateBR(currentDateStr)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-500">
                {filteredBookings.filter((b) => b.date === currentDateStr).length} agendamento(s)
              </span>
              {onRequestNewBooking && (
                <button
                  type="button"
                  onClick={() => onRequestNewBooking(currentDateStr)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Agendar neste dia</span>
                </button>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-5">
            {/* Laboratórios em manutenção no dia selecionado */}
            {(() => {
              const currentDayMaintenance = getMaintenanceForDate(currentDateStr);
              if (currentDayMaintenance.length === 0) return null;

              return (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-rose-600" />
                    <span>Interdição para Manutenção neste Dia ({currentDayMaintenance.length}):</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {currentDayMaintenance.map(({ lab: mLab, status: mStatus }) => (
                      <div
                        key={`day-maint-${mLab.id}`}
                        onClick={() => setSelectedMaintenanceLabModal(mLab)}
                        className={`p-3.5 rounded-xl border transition-colors cursor-pointer flex items-start gap-3 ${
                          mStatus.allDay
                            ? 'border-rose-300 bg-rose-50/90 hover:bg-rose-100 text-rose-950'
                            : 'border-amber-300 bg-amber-50/90 hover:bg-amber-100 text-amber-950'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          mStatus.allDay ? 'bg-rose-200 text-rose-900' : 'bg-amber-200 text-amber-900'
                        }`}>
                          <Wrench className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0 text-xs">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <strong className="text-slate-900 text-sm">{mLab.name}</strong>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              mStatus.allDay ? 'bg-rose-200 text-rose-900' : 'bg-amber-200 text-amber-900'
                            }`}>
                              {mStatus.allDay ? 'Dia Todo' : `${mStatus.startTime} às ${mStatus.endTime}`}
                            </span>
                          </div>
                          <p className="text-slate-700 text-[11px] font-medium flex items-center gap-1 mb-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              <strong>Horário interditado:</strong> {mStatus.allDay ? 'Dia Inteiro (Todos os turnos)' : `Das ${mStatus.startTime} às ${mStatus.endTime}`}
                            </span>
                          </p>
                          <p className="text-slate-800 text-[11px]">
                            <strong>Motivo:</strong> {mStatus.reason || 'Em reparos técnicos pela equipe de suporte'}
                          </p>
                          <p className="text-slate-500 text-[10px] mt-1">
                            Período total agendado: {mStatus.formattedPeriod}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {filteredBookings.filter((b) => b.date === currentDateStr).length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <CalendarIcon className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800 mb-1">
                  Nenhum agendamento neste dia
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                  {getMaintenanceForDate(currentDateStr).length > 0
                    ? 'Os demais laboratórios estão disponíveis para uso nesta data.'
                    : 'Todos os laboratórios estão disponíveis para uso nesta data.'}
                </p>
                {onRequestNewBooking && (
                  <button
                    type="button"
                    onClick={() => onRequestNewBooking(currentDateStr)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-xl transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Realizar Agendamento para este dia</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredBookings
                  .filter((b) => b.date === currentDateStr)
                  .sort((a, b) => (a.startTime || a.timeSlot).localeCompare(b.startTime || b.timeSlot))
                  .map((booking, bIdx) => (
                    <div
                      key={`${booking.id}-${bIdx}`}
                      onClick={() => {
                        setActiveBookingModal(booking);
                        onSelectBooking?.(booking);
                      }}
                      className={`p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer ${
                        booking.isMobileLab
                          ? 'bg-amber-50/70 border-amber-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900">
                          {booking.isMobileLab ? (
                            <Truck className="w-4 h-4 text-amber-600" />
                          ) : (
                            <Laptop className="w-4 h-4 text-blue-600" />
                          )}
                          <span>{booking.labName}</span>
                        </div>
                        {getStatusBadge(booking.status)}
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5 font-mono text-blue-700 font-semibold">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{booking.timeSlot}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            <strong>Prof:</strong> {booking.teacherName}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500">
                          <strong>Turma:</strong> {booking.classGroup}
                        </div>

                        {booking.requestedMachines && (
                          <div className="text-[11px] text-slate-500">
                            <strong>Máquinas:</strong> {booking.requestedMachines} unidades
                          </div>
                        )}

                        {booking.isMobileLab && booking.roomNumber && (
                          <div className="mt-2 bg-amber-100/90 text-amber-900 px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1">
                            <Truck className="w-3.5 h-3.5 shrink-0" />
                            <span>Entregar na {booking.roomNumber}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Booking Detail Quick Modal */}
      {activeBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                {activeBookingModal.isMobileLab ? (
                  <Truck className="w-4 h-4 text-amber-400" />
                ) : (
                  <Laptop className="w-4 h-4 text-blue-400" />
                )}
                <h3 className="text-sm font-bold">Detalhes da Reserva</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveBookingModal(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="font-bold text-sm text-slate-900">
                  {activeBookingModal.labName}
                </span>
                {getStatusBadge(activeBookingModal.status)}
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div>
                  <span className="text-[11px] text-slate-400 block">Data</span>
                  <span className="font-semibold">{formatDateBR(activeBookingModal.date)}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Horário</span>
                  <span className="font-semibold font-mono">{activeBookingModal.timeSlot}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-1.5 text-slate-700">
                <div>
                  <span className="text-slate-400">Professor: </span>
                  <strong className="text-slate-900">{activeBookingModal.teacherName}</strong>
                </div>
                <div>
                  <span className="text-slate-400">WhatsApp: </span>
                  <span className="font-mono">{activeBookingModal.whatsapp}</span>
                </div>
                <div>
                  <span className="text-slate-400">Turma: </span>
                  <span>{activeBookingModal.classGroup}</span>
                </div>
                {activeBookingModal.subject && (
                  <div>
                    <span className="text-slate-400">Disciplina: </span>
                    <span>{activeBookingModal.subject}</span>
                  </div>
                )}
                {activeBookingModal.requestedMachines && (
                  <div>
                    <span className="text-slate-400">Máquinas solicitadas: </span>
                    <strong className="text-blue-700">{activeBookingModal.requestedMachines} máquinas</strong>
                  </div>
                )}
                {activeBookingModal.recurrenceGroupId && (
                  <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-950 flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Repeat className="w-3.5 h-3.5 text-indigo-600" />
                      Série Recorrente ({activeBookingModal.recurrenceFrequency === 'weekly' ? 'Semanal' : activeBookingModal.recurrenceFrequency === 'biweekly' ? 'Quinzenal' : 'Diária'})
                    </span>
                    {activeBookingModal.recurrenceIndex && activeBookingModal.recurrenceTotalCount && (
                      <span className="font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded-sm">
                        Aula {activeBookingModal.recurrenceIndex} de {activeBookingModal.recurrenceTotalCount}
                      </span>
                    )}
                  </div>
                )}
                {activeBookingModal.isMobileLab && activeBookingModal.roomNumber && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 font-semibold flex items-center gap-2">
                    <Truck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Local de Entrega: {activeBookingModal.roomNumber}</span>
                  </div>
                )}
                {activeBookingModal.notes && (
                  <div className="p-2 bg-slate-50 rounded-lg text-slate-600">
                    <span className="font-semibold block mb-0.5 text-[11px]">Observações:</span>
                    {activeBookingModal.notes}
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveBookingModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes de Laboratório em Manutenção */}
      {selectedMaintenanceLabModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-amber-200 overflow-hidden animate-fade-in">
            <div className="p-4 bg-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                <h3 className="text-sm font-bold">Laboratório em Manutenção</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMaintenanceLabModal(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <h4 className="font-bold text-base text-slate-900">
                    {selectedMaintenanceLabModal.name}
                  </h4>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    {selectedMaintenanceLabModal.description}
                  </p>
                </div>
                <span className="text-xs bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
                  <Wrench className="w-3 h-3 text-amber-700" />
                  Interditado
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-[11px] text-slate-400 block font-medium">Capacidade</span>
                  <span className="font-bold text-slate-800">{selectedMaintenanceLabModal.capacity} alunos</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-[11px] text-slate-400 block font-medium">Tipo</span>
                  <span className="font-bold text-slate-800 capitalize">
                    {selectedMaintenanceLabModal.type === 'mobile' ? 'Carrinho Móvel' : 'Laboratório Fixo'}
                  </span>
                </div>
              </div>

              {/* Período e Horário Programados */}
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5 text-rose-950">
                <div className="flex items-center gap-1.5 font-bold text-xs text-rose-900">
                  <CalendarIcon className="w-3.5 h-3.5 text-rose-600" />
                  <span>Período da Interdição:</span>
                </div>
                <p className="text-xs font-semibold text-rose-950">
                  {formatMaintenancePeriod(selectedMaintenanceLabModal)}
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-rose-800 font-medium pt-0.5">
                  <Clock className="w-3 h-3 text-rose-600" />
                  <span>
                    Horário: {selectedMaintenanceLabModal.maintenanceAllDay !== false
                      ? 'Dia inteiro (todos os turnos)'
                      : `Das ${selectedMaintenanceLabModal.maintenanceStartTime || '07:30'} às ${selectedMaintenanceLabModal.maintenanceEndTime || '17:40'}`}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-amber-950">
                <span className="font-bold block text-xs flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                  Motivo da Manutenção (Equipe Técnica):
                </span>
                <p className="text-xs text-amber-900 font-medium leading-relaxed">
                  {selectedMaintenanceLabModal.maintenanceReason || 'Em reparos técnicos e preventivos pela equipe de TI'}
                </p>
              </div>

              {selectedMaintenanceLabModal.broadcastMessage && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1 text-blue-950">
                  <span className="font-bold block text-xs flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                    Comunicado da TI:
                  </span>
                  <p className="text-xs text-blue-900">{selectedMaintenanceLabModal.broadcastMessage}</p>
                </div>
              )}

              <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                ℹ️ Novas reservas para este laboratório estão temporariamente bloqueadas no sistema até que o técnico finalize a manutenção e libere o espaço.
              </p>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedMaintenanceLabModal(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors cursor-pointer text-xs"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
