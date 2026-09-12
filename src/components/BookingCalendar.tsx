import React, { useState } from 'react';
import { Booking, LAB_LIST } from '../types';
import { formatDateBR } from '../lib/whatsapp';
import {
  Calendar as CalendarIcon,
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
} from 'lucide-react';

interface BookingCalendarProps {
  bookings: Booking[];
  onSelectBooking?: (booking: Booking) => void;
  onRequestNewBooking?: (date: string) => void;
}

type CalendarViewMode = 'day' | 'week' | 'month';

export const BookingCalendar: React.FC<BookingCalendarProps> = ({
  bookings,
  onSelectBooking,
  onRequestNewBooking,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [selectedLabId, setSelectedLabId] = useState<string>('all');
  const [selectedShift, setSelectedShift] = useState<string>('all');
  const [activeBookingModal, setActiveBookingModal] = useState<Booking | null>(null);

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

  return (
    <div className="space-y-4">
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
                  className={`min-h-[105px] sm:min-h-[125px] p-1.5 sm:p-2 transition-colors flex flex-col justify-between ${
                    dayObj.isCurrentMonth ? 'bg-white' : 'bg-slate-50/50 text-slate-400'
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
                        onClick={() => onRequestNewBooking(dayObj.dateStr)}
                        title="Agendar neste dia"
                        className="opacity-0 group-hover:opacity-100 hover:opacity-100 text-slate-400 hover:text-blue-600 p-0.5 rounded transition-opacity cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Agendamentos do dia */}
                  <div className="flex-1 space-y-1 overflow-y-auto max-h-[75px] sm:max-h-[95px] pr-0.5">
                    {dayBookings.slice(0, 3).map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
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
                        onClick={() => {
                          setCurrentDate(dayObj.date);
                          setViewMode('day');
                        }}
                        className="text-[10px] font-bold text-blue-600 hover:underline block text-center w-full"
                      >
                        +{dayBookings.length - 3} mais...
                      </button>
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
                    className={`py-3 px-2 ${isToday ? 'bg-blue-50/60' : ''}`}
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
                  </div>
                );
              })}
            </div>

            {/* Conteúdo das colunas da semana */}
            <div className="grid grid-cols-7 divide-x divide-slate-100 min-h-[380px]">
              {getWeekDays(currentDate).map((dayObj) => {
                const dayBookings = filteredBookings.filter((b) => b.date === dayObj.dateStr);

                return (
                  <div key={dayObj.dateStr} className="p-2 space-y-2 bg-slate-50/20">
                    {dayBookings.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-center p-3">
                        <span className="text-[11px] text-slate-400">Livre</span>
                      </div>
                    ) : (
                      dayBookings.map((b) => (
                        <div
                          key={b.id}
                          onClick={() => {
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
          <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Agendamentos em {formatDateBR(currentDateStr)}
              </span>
            </div>
            <span className="text-xs font-medium text-slate-500">
              {filteredBookings.filter((b) => b.date === currentDateStr).length} agendamento(s)
            </span>
          </div>

          <div className="p-4 sm:p-5">
            {filteredBookings.filter((b) => b.date === currentDateStr).length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <CalendarIcon className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800 mb-1">
                  Nenhum agendamento neste dia
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                  Todos os laboratórios estão disponíveis para uso nesta data.
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
                  .map((booking) => (
                    <div
                      key={booking.id}
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
    </div>
  );
};
