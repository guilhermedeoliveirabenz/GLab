import React, { useState, useMemo } from 'react';
import { Booking, LAB_LIST, Lab, EducationLevel, ShiftType } from '../types';
import { EducationBadge } from './EducationBadge';
import { AdjustBookingDateModal } from './AdjustBookingDateModal';
import { formatDateBR } from '../lib/whatsapp';
import { useAuth } from '../lib/authContext';
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
  FileSpreadsheet,
  Sun,
  Sunset,
  Moon,
  Timer,
  Layers,
  Hourglass,
  Search,
  X,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  Eye,
  ArrowLeftRight,
  Lock,
} from 'lucide-react';

export interface AcademicPeriod {
  id: ShiftType;
  label: string;
  name: string;
  timeRange: string;
  defaultStartTime: string;
  defaultEndTime: string;
  totalDurationMinutes: number;
  totalDurationHours: string;
  classesCountText: string;
  icon: React.ComponentType<{ className?: string }>;
  headerColor: string;
  lightBg: string;
  badgeBg: string;
  borderClass: string;
  accentColor: string;
}

export const ACADEMIC_PERIODS: AcademicPeriod[] = [
  {
    id: 'manha',
    label: 'Manhã',
    name: 'Período Matutino',
    timeRange: '07:30 às 11:55',
    defaultStartTime: '07:30',
    defaultEndTime: '11:55',
    totalDurationMinutes: 265,
    totalDurationHours: '4h 25min',
    classesCountText: '1ª a 5ª Aula',
    icon: Sun,
    headerColor: 'bg-amber-50/90 text-amber-950 border-amber-200',
    lightBg: 'bg-amber-50/20',
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-200',
    borderClass: 'border-amber-200',
    accentColor: 'text-amber-600',
  },
  {
    id: 'tarde',
    label: 'Tarde',
    name: 'Período Vespertino',
    timeRange: '13:15 às 17:40',
    defaultStartTime: '13:15',
    defaultEndTime: '17:40',
    totalDurationMinutes: 265,
    totalDurationHours: '4h 25min',
    classesCountText: '6ª a 10ª Aula',
    icon: Sunset,
    headerColor: 'bg-orange-50/90 text-orange-950 border-orange-200',
    lightBg: 'bg-orange-50/20',
    badgeBg: 'bg-orange-100 text-orange-900 border-orange-200',
    borderClass: 'border-orange-200',
    accentColor: 'text-orange-600',
  },
  {
    id: 'noite',
    label: 'Noite',
    name: 'Período Noturno',
    timeRange: '19:00 às 22:15',
    defaultStartTime: '19:00',
    defaultEndTime: '22:15',
    totalDurationMinutes: 195,
    totalDurationHours: '3h 15min',
    classesCountText: '1º e 2º Horário Noturno',
    icon: Moon,
    headerColor: 'bg-indigo-50/90 text-indigo-950 border-indigo-200',
    lightBg: 'bg-indigo-50/20',
    badgeBg: 'bg-indigo-100 text-indigo-900 border-indigo-200',
    borderClass: 'border-indigo-200',
    accentColor: 'text-indigo-600',
  },
];

export interface BookingPeriodDetails {
  startTime: string;
  endTime: string;
  shift: ShiftType;
  durationMinutes: number;
  durationLabel: string;
  periodCoveragePercent: number;
  isFullPeriod: boolean;
  periodName: string;
}

export function getBookingPeriodDetails(booking: Booking): BookingPeriodDetails {
  let startTime = booking.startTime || '';
  let endTime = booking.endTime || '';

  if (!startTime || !endTime) {
    const match = (booking.timeSlot || '').match(/(\d{1,2}:\d{2})\s*(?:-|–|a|à|às)\s*(\d{1,2}:\d{2})/i);
    if (match) {
      startTime = startTime || match[1];
      endTime = endTime || match[2];
    }
  }

  const shift: ShiftType = booking.shift || (
    startTime ? (
      parseInt(startTime.split(':')[0], 10) < 13 ? 'manha' : parseInt(startTime.split(':')[0], 10) < 18 ? 'tarde' : 'noite'
    ) : 'manha'
  );

  if (!startTime) {
    startTime = shift === 'manha' ? '07:30' : shift === 'tarde' ? '13:15' : '19:00';
  }
  if (!endTime) {
    endTime = shift === 'manha' ? '11:55' : shift === 'tarde' ? '17:40' : '22:15';
  }

  const [sH, sM] = startTime.split(':').map(Number);
  const [eH, eM] = endTime.split(':').map(Number);
  const startMinutes = (sH || 0) * 60 + (sM || 0);
  const endMinutes = (eH || 0) * 60 + (eM || 0);
  const durationMinutes = Math.max(endMinutes - startMinutes, 30);

  const hours = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;
  const durationLabel = hours > 0 ? (mins > 0 ? `${hours}h ${mins}min` : `${hours}h`) : `${mins}min`;

  const totalPeriodMinutes = shift === 'noite' ? 195 : 265;
  const periodCoveragePercent = Math.min(Math.round((durationMinutes / totalPeriodMinutes) * 100), 100);
  const isFullPeriod = durationMinutes >= (shift === 'noite' ? 170 : 210);

  const periodName = shift === 'manha' ? 'Período Matutino' : shift === 'tarde' ? 'Período Vespertino' : 'Período Noturno';

  return {
    startTime,
    endTime,
    shift,
    durationMinutes,
    durationLabel,
    periodCoveragePercent,
    isFullPeriod,
    periodName,
  };
}

interface BookingCalendarProps {
  bookings: Booking[];
  labs?: Lab[];
  isAdmin?: boolean;
  onSelectBooking?: (booking: Booking) => void;
  onRequestNewBooking?: (date: string, shift?: ShiftType, labId?: string) => void;
  onOpenBatchImport?: () => void;
  onAdjustBookingDate?: (booking: Booking) => void;
}

type CalendarViewMode = 'day' | 'week' | 'month';

export const BookingCalendar: React.FC<BookingCalendarProps> = ({
  bookings,
  labs = LAB_LIST,
  isAdmin: propIsAdmin,
  onSelectBooking,
  onRequestNewBooking,
  onOpenBatchImport,
  onAdjustBookingDate,
}) => {
  const { isAdmin: authIsAdmin } = useAuth();
  const isAdmin = propIsAdmin !== undefined ? propIsAdmin : authIsAdmin;
  const availableLabs = useMemo(() => {
    const filtered = labs.filter((l) => isAdmin || l.visibleForBooking !== false);
    return filtered.length > 0 ? filtered : labs;
  }, [labs, isAdmin]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [selectedLabId, setSelectedLabId] = useState<string>('all');
  const [selectedShift, setSelectedShift] = useState<string>('all');
  const [selectedEduLevel, setSelectedEduLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewDensity, setViewDensity] = useState<'detailed' | 'compact'>('detailed');
  const [showRulesBanner, setShowRulesBanner] = useState<boolean>(false);
  const [dayExpandedModal, setDayExpandedModal] = useState<{ dateStr: string; dayName: string } | null>(null);
  const [activeBookingModal, setActiveBookingModal] = useState<Booking | null>(null);
  const [selectedMaintenanceLabModal, setSelectedMaintenanceLabModal] = useState<Lab | null>(null);
  const [bookingToAdjust, setBookingToAdjust] = useState<Booking | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isMobileFilterExpanded, setIsMobileFilterExpanded] = useState<boolean>(false);
  const [selectedMobileDate, setSelectedMobileDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Laboratórios com manutenção cadastrada (restrito aos visíveis para professores)
  const maintenanceLabs = availableLabs.filter((l) => l.isUnderMaintenance);
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
    return availableLabs
      .filter((l) => selectedLabId === 'all' || l.id === selectedLabId)
      .map((l) => ({
        lab: l,
        status: getLabMaintenanceStatus(l, dateStr),
      }))
      .filter(
        ({ status }) => status.isUnderMaintenance && doesMaintenanceOverlapShift(status, selectedShift),
      );
  };

  // Filtragem dos agendamentos por Lab, Turno, Nível e Busca Textual
  const filteredBookings = bookings.filter((b) => {
    if (!isAdmin) {
      const bLab = labs.find((l) => l.id === b.labId);
      if (bLab && bLab.visibleForBooking === false) return false;
    }
    if (selectedLabId !== 'all' && b.labId !== selectedLabId) return false;
    if (selectedShift !== 'all' && b.shift !== selectedShift) return false;
    if (selectedEduLevel !== 'all' && (b.educationLevel || 'outros') !== selectedEduLevel) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTeacher = b.teacherName?.toLowerCase().includes(q);
      const matchSubject = b.subject?.toLowerCase().includes(q);
      const matchClass = b.classGroup?.toLowerCase().includes(q);
      const matchLab = b.labName?.toLowerCase().includes(q);
      const matchNotes = b.notes?.toLowerCase().includes(q);
      if (!matchTeacher && !matchSubject && !matchClass && !matchLab && !matchNotes) return false;
    }
    return true;
  });

  const isAnyFilterActive =
    selectedLabId !== 'all' ||
    selectedShift !== 'all' ||
    selectedEduLevel !== 'all' ||
    searchQuery.trim().length > 0;

  const handleClearFilters = () => {
    setSelectedLabId('all');
    setSelectedShift('all');
    setSelectedEduLevel('all');
    setSearchQuery('');
  };

  const periodsToShow = selectedShift === 'all'
    ? ACADEMIC_PERIODS
    : ACADEMIC_PERIODS.filter((p) => p.id === selectedShift);

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
    <div className="space-y-3.5">
      {/* Barra Informativa de Regras de Agendamento (Colapsável para economizar espaço) */}
      <div
        id="calendar-booking-rules-info"
        className="bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-blue-50/90 border border-blue-200/80 rounded-2xl p-2.5 sm:px-4 sm:py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-800 shadow-2xs"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <CalendarClock className="w-3.5 h-3.5" />
          </div>
          <div className="leading-tight">
            <span className="font-bold text-slate-900">Janela de Reserva:</span>{' '}
            <span className="text-slate-600">
              {MIN_BOOKING_ADVANCE_WORKING_DAYS} a {MAX_BOOKING_ADVANCE_WORKING_DAYS} dias úteis de antecedência.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 font-medium">Liberado hoje:</span>
            <span className="font-bold text-blue-900 bg-white px-2 py-0.5 rounded-md border border-blue-200 text-[11px] shadow-2xs">
              {minDateFormatted} a {maxDateFormatted}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowRulesBanner(!showRulesBanner)}
            className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-0.5 cursor-pointer ml-1"
          >
            {showRulesBanner ? (
              <>
                <span>Menos</span>
                <ChevronUp className="w-3 h-3" />
              </>
            ) : (
              <>
                <span>Mais detalhes</span>
                <ChevronDown className="w-3 h-3" />
              </>
            )}
          </button>
        </div>
      </div>

      {showRulesBanner && (
        <div className="bg-white border border-blue-100 rounded-xl p-3 text-xs text-slate-600 space-y-1 animate-fade-in shadow-2xs">
          <p className="font-semibold text-slate-800">
            📌 Como funciona a tolerância de agendamento:
          </p>
          <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px] text-slate-600">
            <li>Os agendamentos precisam respeitar o mínimo de <strong>{MIN_BOOKING_ADVANCE_WORKING_DAYS} dias úteis</strong> para preparação do laboratório pela equipe de TI.</li>
            <li>O limite máximo de abertura da agenda para frente é de <strong>{MAX_BOOKING_ADVANCE_WORKING_DAYS} dias úteis</strong>.</li>
            <li>Finais de semana (Sábados e Domingos) e feriados não contam como dias úteis.</li>
          </ul>
        </div>
      )}

      {/* Calendar Top Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-xs space-y-3">
        {/* Navigation buttons, Title, and View Mode Tabs */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Date Navigation */}
          <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-2.5">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl shadow-2xs shrink-0">
              <button
                id="calendar-prev-btn"
                type="button"
                onClick={handlePrev}
                className="p-2 sm:p-1.5 hover:bg-white text-slate-700 rounded-lg transition-colors cursor-pointer min-h-[38px] min-w-[38px] sm:min-h-auto sm:min-w-auto flex items-center justify-center"
                title="Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                id="calendar-today-btn"
                type="button"
                onClick={handleToday}
                className="px-2.5 sm:px-2.5 py-1.5 sm:py-1 text-xs font-semibold text-slate-700 hover:bg-white rounded-lg transition-colors cursor-pointer min-h-[38px] sm:min-h-auto flex items-center justify-center"
              >
                Hoje
              </button>
              <button
                id="calendar-next-btn"
                type="button"
                onClick={handleNext}
                className="p-2 sm:p-1.5 hover:bg-white text-slate-700 rounded-lg transition-colors cursor-pointer min-h-[38px] min-w-[38px] sm:min-h-auto sm:min-w-auto flex items-center justify-center"
                title="Próximo"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 flex items-center gap-1.5 sm:gap-2 truncate">
              <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 shrink-0" />
              <span className="capitalize truncate">
                {viewMode === 'month' && `${monthNames[currentMonth]} de ${currentYear}`}
                {viewMode === 'day' &&
                  `${currentDate.toLocaleDateString('pt-BR', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}`}
                {viewMode === 'week' && `Semana: ${formatDateBR(getWeekDays(currentDate)[0].dateStr)} a ${formatDateBR(getWeekDays(currentDate)[6].dateStr)}`}
              </span>
            </h2>
          </div>

          {/* View Mode Toggle & Batch Import */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* View Mode Tabs */}
            <div className="bg-slate-100 p-1 rounded-xl grid grid-cols-3 sm:flex items-center text-xs font-semibold shadow-2xs w-full sm:w-auto">
              <button
                id="calendar-view-month-btn"
                type="button"
                onClick={() => setViewMode('month')}
                className={`px-3 py-2 sm:py-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 min-h-[38px] sm:min-h-auto ${
                  viewMode === 'month'
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Mês</span>
              </button>
              <button
                id="calendar-view-week-btn"
                type="button"
                onClick={() => setViewMode('week')}
                className={`px-3 py-2 sm:py-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 min-h-[38px] sm:min-h-auto ${
                  viewMode === 'week'
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Semana</span>
              </button>
              <button
                id="calendar-view-day-btn"
                type="button"
                onClick={() => setViewMode('day')}
                className={`px-3 py-2 sm:py-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 min-h-[38px] sm:min-h-auto ${
                  viewMode === 'day'
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Timer className="w-3.5 h-3.5" />
                <span>Dia</span>
              </button>
            </div>

            {/* Botão de Importação por Lote */}
            {onOpenBatchImport && (
              <button
                id="calendar-open-batch-import-btn"
                type="button"
                onClick={onOpenBatchImport}
                className="text-xs py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs shrink-0 min-h-[38px]"
                title="Importar agendamentos em lote por planilha Excel ou grade semanal"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Importar Lote</span>
              </button>
            )}
          </div>
        </div>

        {/* Barra de Busca e Filtros Rápidos */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-1">
            {/* Campo de Busca Rápida */}
            <div className="relative flex-1 min-w-[160px] sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="calendar-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar professor, disciplina..."
                className="w-full pl-8 pr-7 py-2 sm:py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-800 placeholder-slate-400 min-h-[38px] sm:min-h-auto"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Botão de Expansão de Filtros no Celular */}
            <button
              type="button"
              id="calendar-toggle-mobile-filters-btn"
              onClick={() => setIsMobileFilterExpanded(!isMobileFilterExpanded)}
              className={`sm:hidden text-xs py-2 px-3 rounded-xl border flex items-center gap-1.5 font-bold transition-colors shrink-0 min-h-[38px] ${
                isMobileFilterExpanded || (selectedLabId !== 'all' || selectedShift !== 'all' || selectedEduLevel !== 'all')
                  ? 'bg-blue-50 border-blue-300 text-blue-800 shadow-2xs'
                  : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
              <span>Filtros</span>
              {(selectedLabId !== 'all' || selectedShift !== 'all' || selectedEduLevel !== 'all') && (
                <span className="w-2 h-2 rounded-full bg-blue-600" />
              )}
              {isMobileFilterExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Menus Suspensos de Filtro (Sempre visíveis no Desktop, recolhíveis no celular) */}
          <div className={`${isMobileFilterExpanded ? 'grid grid-cols-1 sm:flex' : 'hidden sm:flex'} flex-wrap items-center gap-2 w-full sm:w-auto`}>
            {/* Lab Filter */}
            <select
              id="calendar-filter-lab"
              value={selectedLabId}
              onChange={(e) => setSelectedLabId(e.target.value)}
              className="w-full sm:w-auto text-xs py-2 sm:py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-700 font-medium cursor-pointer min-h-[44px] sm:min-h-[38px]"
            >
              <option value="all">Todos os Laboratórios ({availableLabs.length})</option>
              {availableLabs.map((lab) => (
                <option key={lab.id} value={lab.id}>
                  {lab.name} {lab.isBlocked ? '🚫 [BLOQUEADO]' : ''} {isAdmin && lab.visibleForBooking === false ? ' (Oculto)' : ''}
                </option>
              ))}
            </select>

            {/* Shift Filter */}
            <select
              id="calendar-filter-shift"
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="w-full sm:w-auto text-xs py-2 sm:py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-700 font-medium cursor-pointer min-h-[44px] sm:min-h-[38px]"
            >
              <option value="all">Todos os Turnos</option>
              <option value="manha">Manhã (07:30 - 11:55)</option>
              <option value="tarde">Tarde (13:15 - 17:40)</option>
              <option value="noite">Noite (19:00 - 22:15)</option>
            </select>

            {/* Education Level Filter */}
            <select
              id="calendar-filter-edu-level"
              value={selectedEduLevel}
              onChange={(e) => setSelectedEduLevel(e.target.value)}
              className="w-full sm:w-auto text-xs py-2 sm:py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-700 font-medium cursor-pointer min-h-[38px] sm:min-h-auto"
            >
              <option value="all">Todos os Segmentos</option>
              <option value="basico">Ensino Básico</option>
              <option value="superior">Ensino Superior</option>
              <option value="ead">EAD</option>
              <option value="outros">Outros</option>
            </select>
          </div>

          {/* Opções de Exibição & Limpar Filtros */}
          <div className={`${isMobileFilterExpanded ? 'flex' : 'hidden sm:flex'} items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-1 sm:pt-0`}>
            {viewMode === 'month' && (
              <button
                type="button"
                onClick={() => setViewDensity(viewDensity === 'detailed' ? 'compact' : 'detailed')}
                className="text-xs py-2 sm:py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold flex items-center gap-1.5 transition-colors cursor-pointer min-h-[38px] sm:min-h-auto"
                title="Alternar entre modo de cards detalhados ou compactos no mês"
              >
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>{viewDensity === 'detailed' ? 'Modo Detalhado' : 'Modo Compacto'}</span>
              </button>
            )}

            {isAnyFilterActive && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs py-2 sm:py-1.5 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold flex items-center gap-1 transition-colors cursor-pointer min-h-[38px] sm:min-h-auto"
                title="Redefinir busca e filtros"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpar Filtros</span>
              </button>
            )}
          </div>
        </div>

        {/* Indicador de Filtro Ativo */}
        {isAnyFilterActive && (
          <div className="flex items-center justify-between text-xs bg-blue-50/70 border border-blue-200 rounded-xl px-3 py-1.5 text-blue-900">
            <span className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
              <span>Filtro ativo: Exibindo <strong>{filteredBookings.length}</strong> de <strong>{bookings.length}</strong> reservas.</span>
            </span>
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-blue-700 hover:underline font-bold text-[11px] cursor-pointer"
            >
              Exibir todas
            </button>
          </div>
        )}
      </div>

      {/* Banner de Laboratórios em Manutenção */}
      {maintenanceLabs.length > 0 && (
        <div className="bg-amber-50/95 border border-amber-300/80 rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-950 shadow-2xs">
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
              Bloqueado nos horários definidos
            </span>
          </div>
        </div>
      )}

      {/* Banner de Laboratórios Bloqueados */}
      {availableLabs.some((l) => l.isBlocked) && (
        <div className="bg-red-50/95 border border-red-300 rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-red-950 shadow-2xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-100 border border-red-300 flex items-center justify-center text-red-700 shrink-0 mt-0.5 sm:mt-0">
              <Lock className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <span className="font-bold block sm:inline text-red-950">
                Laboratório(s) Bloqueado(s) para Agendamento:
              </span>
              <div className="text-[11px] text-red-800 mt-0.5 space-y-0.5">
                {availableLabs
                  .filter((l) => l.isBlocked)
                  .map((l) => (
                    <div key={l.id} className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-red-950">{l.name}:</span>
                      <span>{l.blockedReason || 'Bloqueado temporariamente pela coordenação'}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <span className="text-[11px] bg-red-200/90 text-red-950 px-2.5 py-1 rounded-lg font-bold border border-red-300">
              🚫 Agendamentos Suspensos
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
      {/* 1. MODO MÊS (MONTH VIEW OTIMIZADO PARA ALTA VISIBILIDADE)  */}
      {/* ========================================================= */}
      {viewMode === 'month' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          {/* Cabeçalho dos dias da semana com destaque de Dias Úteis */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center py-2 sm:py-2.5 text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider">
            <span className="text-slate-400 bg-slate-100/50 py-1 rounded-l-md">
              <span className="hidden sm:inline">Dom</span>
              <span className="sm:hidden">D</span>
            </span>
            <span className="text-blue-900 py-1 font-extrabold">
              <span className="hidden sm:inline">Seg</span>
              <span className="sm:hidden">S</span>
            </span>
            <span className="text-blue-900 py-1 font-extrabold">
              <span className="hidden sm:inline">Ter</span>
              <span className="sm:hidden">T</span>
            </span>
            <span className="text-blue-900 py-1 font-extrabold">
              <span className="hidden sm:inline">Qua</span>
              <span className="sm:hidden">Q</span>
            </span>
            <span className="text-blue-900 py-1 font-extrabold">
              <span className="hidden sm:inline">Qui</span>
              <span className="sm:hidden">Q</span>
            </span>
            <span className="text-blue-900 py-1 font-extrabold">
              <span className="hidden sm:inline">Sex</span>
              <span className="sm:hidden">S</span>
            </span>
            <span className="text-slate-400 bg-slate-100/50 py-1 rounded-r-md">
              <span className="hidden sm:inline">Sáb</span>
              <span className="sm:hidden">S</span>
            </span>
          </div>

          {/* Grid de Dias do Mês */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
            {getMonthDays(currentYear, currentMonth).map((dayObj, index) => {
              const dayBookings = filteredBookings.filter((b) => b.date === dayObj.dateStr);
              const isToday = dayObj.dateStr === todayStr;
              const isSelectedMobile = dayObj.dateStr === selectedMobileDate;
              const dayOfWeek = dayObj.date.getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              const dayMaintenances = dayObj.isCurrentMonth ? getMaintenanceForDate(dayObj.dateStr) : [];
              const maxVisible = viewDensity === 'compact' ? 4 : 3;

              return (
                <div
                  key={index}
                  onClick={() => {
                    setSelectedMobileDate(dayObj.dateStr);
                    if (!dayObj.isCurrentMonth) return;
                    if (window.innerWidth < 640) {
                      if (dayBookings.length > 0 || dayMaintenances.length > 0) {
                        setDayExpandedModal({
                          dateStr: dayObj.dateStr,
                          dayName: dayObj.date.toLocaleDateString('pt-BR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                          }),
                        });
                      } else if (onRequestNewBooking) {
                        onRequestNewBooking(dayObj.dateStr, undefined, selectedLabId !== 'all' ? selectedLabId : undefined);
                      }
                      return;
                    }
                    if (onRequestNewBooking) {
                      onRequestNewBooking(dayObj.dateStr, undefined, selectedLabId !== 'all' ? selectedLabId : undefined);
                    }
                  }}
                  title={dayObj.isCurrentMonth ? `Dia ${formatDateBR(dayObj.dateStr)} - Toque para ver ou agendar` : undefined}
                  className={`min-h-[64px] sm:min-h-[145px] md:min-h-[155px] p-1 sm:p-2 transition-all flex flex-col justify-between group select-none ${
                    dayObj.isCurrentMonth
                      ? isWeekend
                        ? 'bg-slate-50/40 hover:bg-blue-50/40 cursor-pointer'
                        : 'bg-white hover:bg-blue-50/40 cursor-pointer'
                      : 'bg-slate-50/80 text-slate-400 opacity-60'
                  } ${isToday ? 'ring-2 ring-blue-600 ring-inset bg-blue-50/30' : ''} ${
                    isSelectedMobile ? 'bg-blue-50/50 ring-1 ring-blue-400 sm:ring-0' : ''
                  }`}
                >
                  {/* Top Header da Célula de Dia */}
                  <div className="flex items-center justify-between mb-0.5 sm:mb-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        if (dayBookings.length > 0 || dayMaintenances.length > 0) {
                          e.stopPropagation();
                          setSelectedMobileDate(dayObj.dateStr);
                          setDayExpandedModal({
                            dateStr: dayObj.dateStr,
                            dayName: dayObj.date.toLocaleDateString('pt-BR', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                            }),
                          });
                        }
                      }}
                      className={`text-[11px] sm:text-xs font-bold rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center transition-transform ${
                        isToday
                          ? 'bg-blue-600 text-white shadow-xs scale-105'
                          : dayObj.isCurrentMonth
                          ? dayBookings.length > 0
                            ? 'text-slate-900 font-extrabold hover:bg-blue-100 cursor-pointer'
                            : 'text-slate-700'
                          : 'text-slate-400'
                      }`}
                      title={dayBookings.length > 0 ? `Ver todas as ${dayBookings.length} reservas deste dia` : undefined}
                    >
                      {dayObj.date.getDate()}
                    </button>

                    {dayObj.isCurrentMonth && (
                      <div className="hidden sm:flex items-center gap-1">
                        {dayBookings.length > 0 && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setDayExpandedModal({
                                dateStr: dayObj.dateStr,
                                dayName: dayObj.date.toLocaleDateString('pt-BR', {
                                  weekday: 'long',
                                  day: 'numeric',
                                  month: 'long',
                                }),
                              });
                            }}
                            className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 hover:bg-blue-100 hover:text-blue-800 transition-colors cursor-pointer"
                            title="Total de reservas neste dia (clique para abrir resumo)"
                          >
                            {dayBookings.length}
                          </span>
                        )}

                        {onRequestNewBooking && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRequestNewBooking(dayObj.dateStr, undefined, selectedLabId !== 'all' ? selectedLabId : undefined);
                            }}
                            title="Agendar aula nesta data"
                            className="opacity-0 group-hover:opacity-100 hover:opacity-100 flex items-center gap-0.5 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded transition-all cursor-pointer shadow-2xs"
                          >
                            <Plus className="w-3 h-3" />
                            <span className="hidden xl:inline">Agendar</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* =============================================================== */}
                  {/* VERSÃO MOBILE (< SM): INDICADORES VISUAIS PARA TELAS PEQUENAS  */}
                  {/* =============================================================== */}
                  <div className="sm:hidden flex-1 flex flex-col justify-center items-center gap-0.5 py-0.5 pointer-events-none">
                    {dayMaintenances.length > 0 && (
                      <div className="flex items-center gap-0.5" title="Laboratório em manutenção">
                        <Wrench className="w-2.5 h-2.5 text-rose-600 animate-pulse" />
                      </div>
                    )}
                    {dayBookings.length > 0 && (
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="flex items-center gap-0.5">
                          {dayBookings.slice(0, 3).map((b, dotIdx) => {
                            const shift = getBookingPeriodDetails(b).shift;
                            const dotColor =
                              shift === 'manha'
                                ? 'bg-amber-500'
                                : shift === 'tarde'
                                ? 'bg-orange-500'
                                : 'bg-indigo-500';
                            return <span key={dotIdx} className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />;
                          })}
                          {dayBookings.length > 3 && <span className="text-[7px] text-slate-500 font-bold leading-none">+</span>}
                        </div>
                        <span className="text-[9px] font-bold text-slate-700 bg-slate-100 px-1 py-0.2 rounded-full leading-none">
                          {dayBookings.length}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* =============================================================== */}
                  {/* VERSÃO DESKTOP / TABLET (>= SM): CARDS DETALHADOS COMPLETOS     */}
                  {/* =============================================================== */}
                  <div className="hidden sm:block flex-1 space-y-1 overflow-y-auto max-h-[95px] sm:max-h-[115px] pr-0.5">
                    {/* Laboratórios em manutenção específicos deste dia */}
                    {dayMaintenances.map(({ lab: mLab, status: mStatus }) => (
                      <div
                        key={`maint-${mLab.id}-${dayObj.dateStr}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMaintenanceLabModal(mLab);
                        }}
                        className={`w-full text-left px-1.5 py-0.5 text-[10px] rounded font-bold border truncate flex items-center gap-1 shadow-2xs transition-all cursor-pointer ${
                          mStatus.allDay
                            ? 'bg-rose-100 text-rose-950 border-rose-300 hover:bg-rose-200'
                            : 'bg-amber-100 text-amber-950 border-amber-300 hover:bg-amber-200'
                        }`}
                        title={`🛠️ Interdição Técnica: ${mLab.name} (${mStatus.allDay ? 'Dia todo' : `${mStatus.startTime} às ${mStatus.endTime}`}) - Motivo: ${mStatus.reason}`}
                      >
                        <Wrench className={`w-2.5 h-2.5 shrink-0 ${mStatus.allDay ? 'text-rose-700' : 'text-amber-700'}`} />
                        <span className="truncate">
                          {mStatus.allDay ? `${mLab.name} (Interditado)` : `${mStatus.startTime}-${mStatus.endTime} ${mLab.name}`}
                        </span>
                      </div>
                    ))}

                    {/* Agendamentos do dia formatados para alta legibilidade */}
                    {dayBookings.slice(0, maxVisible).map((b, bIdx) => {
                      const pDetails = getBookingPeriodDetails(b);

                      // Estilização por turno com borda lateral colorida
                      const shiftStyles =
                        pDetails.shift === 'manha'
                          ? 'border-l-amber-500 bg-amber-50/90 text-amber-950 hover:bg-amber-100/90'
                          : pDetails.shift === 'tarde'
                          ? 'border-l-orange-500 bg-orange-50/90 text-orange-950 hover:bg-orange-100/90'
                          : 'border-l-indigo-500 bg-indigo-50/90 text-indigo-950 hover:bg-indigo-100/90';

                      return (
                        <button
                          key={`${b.id}-${bIdx}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveBookingModal(b);
                            onSelectBooking?.(b);
                          }}
                          className={`w-full text-left px-1.5 py-1 text-[11px] rounded-md border-l-[3px] border border-slate-200/80 shadow-2xs transition-transform hover:scale-[1.015] cursor-pointer ${shiftStyles}`}
                          title={`${pDetails.periodName} (${pDetails.startTime} às ${pDetails.endTime}) - ${b.labName} • Prof. ${b.teacherName}${b.subject ? ` (${b.subject})` : ''}`}
                        >
                          {/* Linha 1: Horário, Ícone e Nome do Lab */}
                          <div className="flex items-center justify-between gap-1 leading-tight">
                            <div className="flex items-center gap-1 truncate min-w-0">
                              <span className="font-mono text-[10px] font-bold text-slate-800 shrink-0">
                                {pDetails.startTime}
                              </span>

                              {b.isMobileLab ? (
                                <Truck className="w-2.5 h-2.5 text-amber-700 shrink-0" title="Carrinho Móvel" />
                              ) : (
                                <Laptop className="w-2.5 h-2.5 text-blue-700 shrink-0" title="Laboratório Fixo" />
                              )}

                              <span className="font-bold truncate text-[10.5px]">
                                {b.labName}
                              </span>
                            </div>

                            {/* Ponto indicador de status */}
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                b.status === 'confirmed'
                                  ? 'bg-emerald-500 ring-1 ring-emerald-300'
                                  : b.status === 'cancelled'
                                  ? 'bg-rose-500'
                                  : 'bg-amber-500'
                              }`}
                              title={`Status: ${b.status === 'confirmed' ? 'Confirmado' : b.status === 'cancelled' ? 'Cancelado' : 'Pendente'}`}
                            />
                          </div>

                          {/* Linha 2 (Modo Detalhado): Professor e Disciplina */}
                          {viewDensity === 'detailed' && (
                            <div className="text-[10px] text-slate-700 truncate mt-0.5 flex items-center gap-1 font-medium">
                              <span className="truncate">{b.teacherName}</span>
                              {b.subject && (
                                <span className="text-slate-500 truncate text-[9.5px]">
                                  • {b.subject}
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}

                    {/* Botão para abrir todos os agendamentos do dia */}
                    {dayBookings.length > maxVisible && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDayExpandedModal({
                            dateStr: dayObj.dateStr,
                            dayName: dayObj.date.toLocaleDateString('pt-BR', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                            }),
                          });
                        }}
                        className="text-[10px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50/80 hover:bg-blue-100 py-0.5 rounded text-center w-full transition-colors cursor-pointer block shadow-2xs"
                      >
                        +{dayBookings.length - maxVisible} mais reservas...
                      </button>
                    )}

                    {dayBookings.length === 0 && dayMaintenances.length === 0 && dayObj.isCurrentMonth && (
                      <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity py-2">
                        <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                          <Plus className="w-3 h-3" /> Agendar
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* =============================================================== */}
          {/* PAINEL DE AGENDA DO DIA SELECIONADO PARA DISPOSITIVOS MÓVEIS    */}
          {/* =============================================================== */}
          <div className="sm:hidden border-t border-slate-200 bg-slate-50/90 p-3 space-y-2.5">
            {(() => {
              const selectedDateObj = new Date(selectedMobileDate + 'T12:00:00');
              const dayBookings = filteredBookings
                .filter((b) => b.date === selectedMobileDate)
                .sort((a, b) => (a.startTime || a.timeSlot).localeCompare(b.startTime || b.timeSlot));
              const dayMaintenances = getMaintenanceForDate(selectedMobileDate);

              return (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <CalendarIcon className="w-4 h-4 text-blue-600" />
                      <h4 className="text-xs font-bold text-slate-900 capitalize">
                        {selectedDateObj.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })} • {dayBookings.length} {dayBookings.length === 1 ? 'reserva' : 'reservas'}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {dayBookings.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setDayExpandedModal({
                              dateStr: selectedMobileDate,
                              dayName: selectedDateObj.toLocaleDateString('pt-BR', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                              }),
                            });
                          }}
                          className="text-[11px] font-bold text-blue-700 bg-white px-2 py-1 rounded-lg border border-blue-200 shadow-2xs cursor-pointer"
                        >
                          Ver Completo
                        </button>
                      )}

                      {onRequestNewBooking && (
                        <button
                          type="button"
                          onClick={() => onRequestNewBooking(selectedMobileDate, undefined, selectedLabId !== 'all' ? selectedLabId : undefined)}
                          className="text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1 rounded-lg shadow-2xs flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Agendar</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Lista de Aulas e Manutenções do Dia */}
                  {dayMaintenances.length === 0 && dayBookings.length === 0 ? (
                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                      Nenhum agendamento para este dia. Laboratórios 100% disponíveis.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {dayMaintenances.map(({ lab: mLab, status: mStatus }) => (
                        <div
                          key={`mobile-maint-${mLab.id}`}
                          onClick={() => setSelectedMaintenanceLabModal(mLab)}
                          className="p-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-950 text-xs flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Wrench className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <div>
                              <strong className="block text-[11px]">{mLab.name} (Interditado)</strong>
                              <span className="text-[10px] text-rose-700">{mStatus.reason}</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold bg-white/80 px-2 py-0.5 rounded border border-rose-200">
                            {mStatus.allDay ? 'Dia Todo' : `${mStatus.startTime}-${mStatus.endTime}`}
                          </span>
                        </div>
                      ))}

                      {dayBookings.map((b) => {
                        const p = getBookingPeriodDetails(b);
                        const shiftBg =
                          p.shift === 'manha'
                            ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                            : p.shift === 'tarde'
                            ? 'bg-orange-50/90 border-orange-200 text-orange-950'
                            : 'bg-indigo-50/90 border-indigo-200 text-indigo-950';

                        return (
                          <div
                            key={`mobile-agenda-item-${b.id}`}
                            onClick={() => {
                              setActiveBookingModal(b);
                              onSelectBooking?.(b);
                            }}
                            className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-transform active:scale-[0.99] ${shiftBg}`}
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10.5px] font-bold bg-white/90 px-1.5 py-0.2 rounded border border-slate-200/60 shadow-2xs">
                                  {p.startTime}-{p.endTime}
                                </span>
                                <strong className="truncate text-[11px]">{b.labName}</strong>
                              </div>
                              <p className="text-[11px] opacity-90 truncate mt-0.5">
                                Prof. {b.teacherName} • {b.subject} {b.classGroup ? `(${b.classGroup})` : ''}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 opacity-40 shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. MODO SEMANA (WEEK VIEW POR PERÍODOS E DURAÇÃO)        */}
      {/* ========================================================= */}
      {viewMode === 'week' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-x-auto smooth-horizontal-scroll">
          {/* Banner de navegação horizontal para telas pequenas */}
          <div className="sm:hidden px-3 py-1.5 bg-blue-50/90 border-b border-blue-100 flex items-center justify-between text-[11px] text-blue-800 font-medium sticky left-0 right-0">
            <span className="flex items-center gap-1.5">
              <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
              Deslize para os lados para ver a semana inteira
            </span>
            <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-blue-200 font-bold">
              Grade Semanal
            </span>
          </div>

          <div className="min-w-[920px] sm:min-w-[980px]">
            {/* Barra explicativa dos períodos */}
            <div className="px-4 py-2.5 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  Grade Semanal por Período de Agendamento:
                </span>
                <span className="text-[11px] text-slate-500">
                  O espaço visual reflete exatamente o turno e a duração das aulas reservadas.
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1 font-medium text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  <Sun className="w-3 h-3 text-amber-600" /> Manhã: 07:30 - 11:55
                </span>
                <span className="flex items-center gap-1 font-medium text-orange-900 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                  <Sunset className="w-3 h-3 text-orange-600" /> Tarde: 13:15 - 17:40
                </span>
                <span className="flex items-center gap-1 font-medium text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                  <Moon className="w-3 h-3 text-indigo-600" /> Noite: 19:00 - 22:15
                </span>
              </div>
            </div>

            {/* Cabeçalho da Semana: Coluna de Período + 7 Dias */}
            <div className="grid grid-cols-[140px_repeat(7,1fr)] border-b border-slate-200 bg-slate-100/70 text-center divide-x divide-slate-200">
              <div className="p-3 flex flex-col items-center justify-center bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider">
                <Timer className="w-4 h-4 text-slate-500 mb-1" />
                <span>Turno / Período</span>
              </div>

              {getWeekDays(currentDate).map((dayObj) => {
                const isToday = dayObj.dateStr === todayStr;
                const dayBookings = filteredBookings.filter((b) => b.date === dayObj.dateStr);
                const dayOfWeek = dayObj.date.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                return (
                  <div
                    key={dayObj.dateStr}
                    onClick={() => onRequestNewBooking?.(dayObj.dateStr, undefined, selectedLabId !== 'all' ? selectedLabId : undefined)}
                    className={`py-2.5 px-2 transition-colors cursor-pointer hover:bg-blue-50/80 group ${
                      isToday
                        ? 'bg-blue-50/80 ring-2 ring-blue-500 ring-inset'
                        : isWeekend
                        ? 'bg-slate-100/50'
                        : 'bg-slate-50/70'
                    }`}
                    title="Clique para agendar aula nesta data"
                  >
                    <span className={`text-[11px] font-bold uppercase tracking-wider block ${
                      isWeekend ? 'text-slate-400' : 'text-slate-700'
                    }`}>
                      {dayObj.dayName}
                    </span>
                    <span
                      className={`inline-block mt-0.5 text-sm font-extrabold w-7 h-7 rounded-full leading-7 ${
                        isToday ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-900'
                      }`}
                    >
                      {dayObj.date.getDate()}
                    </span>

                    <div className="mt-1 flex items-center justify-center">
                      {dayBookings.length > 0 ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800">
                          {dayBookings.length} {dayBookings.length === 1 ? 'reserva' : 'reservas'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 opacity-70 group-hover:opacity-100 group-hover:text-blue-600 font-medium">
                          + Agendar
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Linhas de Períodos: Manhã, Tarde, Noite */}
            {periodsToShow.map((period, pIdx) => {
              const PeriodIcon = period.icon;
              return (
                <div
                  key={period.id}
                  className={`grid grid-cols-[140px_repeat(7,1fr)] divide-x divide-slate-200 border-b ${
                    pIdx === periodsToShow.length - 1 ? 'border-b-0' : 'border-b-slate-200'
                  }`}
                >
                  {/* Coluna fixa do período */}
                  <div className={`p-3 flex flex-col justify-between ${period.headerColor} select-none border-r border-slate-200`}>
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <PeriodIcon className={`w-4 h-4 shrink-0 ${period.accentColor}`} />
                        <span>{period.label}</span>
                      </div>
                      <div className="text-[11px] font-mono mt-1 font-semibold opacity-90">
                        {period.timeRange}
                      </div>
                      <div className="text-[10px] opacity-75 mt-0.5 font-medium">
                        {period.classesCountText}
                      </div>
                    </div>
                    <div className="text-[9px] font-medium opacity-70 mt-2 bg-white/60 px-1.5 py-0.5 rounded text-center">
                      Espaço: {period.totalDurationHours}
                    </div>
                  </div>

                  {/* 7 Células de dias para este período */}
                  {getWeekDays(currentDate).map((dayObj) => {
                    const dayBookings = filteredBookings.filter((b) => b.date === dayObj.dateStr);
                    const periodBookings = dayBookings.filter(
                      (b) => b.shift === period.id || getBookingPeriodDetails(b).shift === period.id
                    );

                    // Manutenções que colidem com este período e este dia
                    const periodMaintenances = getMaintenanceForDate(dayObj.dateStr).filter(({ status: mStatus }) => {
                      if (mStatus.allDay) return true;
                      return doTimesOverlap(mStatus.startTime, mStatus.endTime, period.defaultStartTime, period.defaultEndTime);
                    });

                    const totalBookedMinutes = periodBookings.reduce((acc, b) => {
                      return acc + getBookingPeriodDetails(b).durationMinutes;
                    }, 0);

                    const hasBookings = periodBookings.length > 0;
                    const hasMaintenance = periodMaintenances.length > 0;

                    return (
                      <div
                        key={`${dayObj.dateStr}-${period.id}`}
                        onClick={() => onRequestNewBooking?.(dayObj.dateStr, period.id, selectedLabId !== 'all' ? selectedLabId : undefined)}
                        className={`p-2 space-y-2 transition-colors cursor-pointer flex flex-col justify-start min-h-[160px] ${
                          dayObj.dateStr === todayStr ? 'bg-blue-50/15' : period.lightBg
                        } hover:bg-blue-50/30 group`}
                        title={`Clique para agendar aula no ${period.name} em ${formatDateBR(dayObj.dateStr)}`}
                      >
                        {/* Manutenções no período */}
                        {periodMaintenances.map(({ lab: mLab, status: mStatus }) => (
                          <div
                            key={`week-maint-${mLab.id}-${dayObj.dateStr}-${period.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMaintenanceLabModal(mLab);
                            }}
                            className={`p-2 rounded-xl border text-xs space-y-1 shadow-2xs transition-colors cursor-pointer ${
                              mStatus.allDay
                                ? 'border-rose-300 bg-rose-50 text-rose-950 hover:bg-rose-100'
                                : 'border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100'
                            }`}
                            title="Interdição Técnica neste período"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold truncate text-[11px] flex items-center gap-1 text-rose-900">
                                <Wrench className="w-3 h-3 text-rose-600 shrink-0" />
                                {mLab.name}
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-200 text-rose-900">
                                {mStatus.allDay ? 'Dia Todo' : `${mStatus.startTime}-${mStatus.endTime}`}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-600 line-clamp-1">
                              {mStatus.reason || 'Manutenção técnica'}
                            </p>
                          </div>
                        ))}

                        {/* Agendamentos neste período */}
                        {periodBookings.map((b, bIdx) => {
                          const pDetails = getBookingPeriodDetails(b);
                          return (
                            <div
                              key={`${b.id}-${bIdx}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveBookingModal(b);
                                onSelectBooking?.(b);
                              }}
                              className={`p-2.5 rounded-xl border text-xs space-y-1.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between ${
                                pDetails.isFullPeriod ? 'min-h-[115px]' : 'min-h-[75px]'
                              } ${
                                b.isMobileLab
                                  ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                                  : 'bg-white border-slate-200/90 text-slate-900'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <span className="font-bold truncate text-[11px] flex items-center gap-1">
                                    {b.isMobileLab ? (
                                      <Truck className="w-3 h-3 text-amber-600 shrink-0" />
                                    ) : (
                                      <Laptop className="w-3 h-3 text-blue-600 shrink-0" />
                                    )}
                                    <span className="truncate">{b.labName}</span>
                                  </span>
                                  {getStatusBadge(b.status)}
                                </div>

                                <div className="flex items-center gap-1 text-[10px] text-blue-700 font-mono font-bold bg-blue-50/80 px-1.5 py-0.5 rounded-md">
                                  <Clock className="w-3 h-3 text-blue-500 shrink-0" />
                                  <span className="truncate">{pDetails.startTime} às {pDetails.endTime}</span>
                                  <span className="text-[9px] font-semibold text-slate-500 ml-auto shrink-0">
                                    {pDetails.durationLabel}
                                  </span>
                                </div>

                                <div className="text-[11px] font-medium text-slate-800 truncate mt-1">
                                  {b.teacherName}
                                </div>
                              </div>

                              <div className="space-y-1 pt-1 border-t border-slate-100">
                                <div className="flex items-center justify-between gap-1 text-[10px] text-slate-500">
                                  <span className="truncate">Turma: {b.classGroup}</span>
                                  {b.educationLevel && (
                                    <EducationBadge level={b.educationLevel} size="xs" />
                                  )}
                                </div>

                                {pDetails.isFullPeriod ? (
                                  <div className="flex items-center gap-1 text-[9px] font-bold text-indigo-700 bg-indigo-50/90 px-1.5 py-0.5 rounded">
                                    <Timer className="w-2.5 h-2.5" />
                                    <span>Período Integral ({pDetails.durationLabel})</span>
                                  </div>
                                ) : (
                                  <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden" title={`Ocupa ${pDetails.periodCoveragePercent}% deste período`}>
                                    <div
                                      className="bg-blue-500 h-full rounded-full"
                                      style={{ width: `${pDetails.periodCoveragePercent}%` }}
                                    />
                                  </div>
                                )}

                                {b.isMobileLab && b.roomNumber && (
                                  <div className="text-[10px] font-semibold text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <Truck className="w-2.5 h-2.5" />
                                    <span className="truncate">{b.roomNumber}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* Espaço livre restante no período se for parcial */}
                        {hasBookings && !hasMaintenance && totalBookedMinutes < 180 && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              onRequestNewBooking?.(dayObj.dateStr, period.id, selectedLabId !== 'all' ? selectedLabId : undefined);
                            }}
                            className="p-1.5 rounded-lg border border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 text-center transition-colors cursor-pointer"
                            title={`Período parcialmente ocupado (${Math.round((totalBookedMinutes / period.totalDurationMinutes) * 100)}%). Clique para agendar no restante do período.`}
                          >
                            <span className="text-[10px] text-slate-500 hover:text-blue-700 font-medium flex items-center justify-center gap-1">
                              <Plus className="w-2.5 h-2.5" /> Restante Livre p/ Agendar
                            </span>
                          </div>
                        )}

                        {/* Período totalmente livre */}
                        {!hasBookings && !hasMaintenance && (
                          <div className="h-full min-h-[125px] flex flex-col items-center justify-center text-center p-2 rounded-xl border border-dashed border-slate-200/90 hover:border-blue-400 hover:bg-white/80 transition-all">
                            <Plus className="w-4 h-4 text-slate-300 group-hover:text-blue-600 mb-1 transition-colors" />
                            <span className="text-[11px] font-semibold text-slate-400 group-hover:text-blue-700 block transition-colors">
                              Livre na {period.label}
                            </span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">
                              {period.timeRange}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. MODO DIA (DAY VIEW ESTRUTURADO POR PERÍODO E DURAÇÃO) */}
      {/* ========================================================= */}
      {viewMode === 'day' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-6 p-4 sm:p-6">
          {/* Cabeçalho do Dia */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 via-blue-50/40 to-slate-50 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Visão Diária por Períodos • {formatDateBR(currentDateStr)}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Os blocos visuais e horários consideram o turno letivo completo e o tempo de cada reserva.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-slate-700 shadow-2xs">
                Total: {filteredBookings.filter((b) => b.date === currentDateStr).length} reserva(s)
              </span>
              {onRequestNewBooking && (
                <button
                  type="button"
                  onClick={() => onRequestNewBooking(currentDateStr, undefined, selectedLabId !== 'all' ? selectedLabId : undefined)}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Novo Agendamento</span>
                </button>
              )}
            </div>
          </div>

          {/* Cards Resumo dos 3 Períodos do Dia */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {ACADEMIC_PERIODS.map((period) => {
              const PeriodIcon = period.icon;
              const periodBookings = filteredBookings.filter(
                (b) => b.date === currentDateStr && (b.shift === period.id || getBookingPeriodDetails(b).shift === period.id)
              );
              const isOccupied = periodBookings.length > 0;
              const periodMaintenances = getMaintenanceForDate(currentDateStr).filter(({ status: mStatus }) => {
                if (mStatus.allDay) return true;
                return doTimesOverlap(mStatus.startTime, mStatus.endTime, period.defaultStartTime, period.defaultEndTime);
              });

              return (
                <div
                  key={`day-summary-${period.id}`}
                  onClick={() => {
                    if (onRequestNewBooking) onRequestNewBooking(currentDateStr, period.id, selectedLabId !== 'all' ? selectedLabId : undefined);
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer hover:shadow-xs ${
                    period.borderClass
                  } ${period.headerColor}`}
                  title={`Clique para agendar no ${period.name}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <PeriodIcon className={`w-4 h-4 ${period.accentColor}`} />
                      <span>{period.name}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${period.badgeBg}`}>
                      {period.label}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono font-semibold opacity-90 mb-2 flex items-center justify-between">
                    <span>{period.timeRange}</span>
                    <span className="text-[10px] opacity-75 font-sans font-medium">{period.totalDurationHours}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/60">
                    <span className="text-[11px] font-medium">
                      {periodMaintenances.length > 0 ? (
                        <span className="text-rose-700 font-bold flex items-center gap-1">
                          <Wrench className="w-3 h-3" /> Interdição Parcial
                        </span>
                      ) : isOccupied ? (
                        <span className="text-blue-700 font-bold">
                          {periodBookings.length} agendamento(s)
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-bold">
                          Disponível
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] text-blue-600 font-semibold group-hover:underline">
                      + Agendar
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interdições do Dia Inteiro */}
          {(() => {
            const currentDayMaintenance = getMaintenanceForDate(currentDateStr);
            if (currentDayMaintenance.length === 0) return null;

            return (
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-rose-600" />
                  <span>Laboratórios Interditados para Manutenção neste Dia ({currentDayMaintenance.length}):</span>
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

          {/* Seções por Período Acadêmico: Manhã, Tarde, Noite */}
          <div className="space-y-6">
            {periodsToShow.map((period) => {
              const PeriodIcon = period.icon;
              const periodBookings = filteredBookings
                .filter((b) => b.date === currentDateStr && (b.shift === period.id || getBookingPeriodDetails(b).shift === period.id))
                .sort((a, b) => (a.startTime || a.timeSlot).localeCompare(b.startTime || b.timeSlot));

              const periodMaintenances = getMaintenanceForDate(currentDateStr).filter(({ status: mStatus }) => {
                if (mStatus.allDay) return true;
                return doTimesOverlap(mStatus.startTime, mStatus.endTime, period.defaultStartTime, period.defaultEndTime);
              });

              const totalBookedMinutes = periodBookings.reduce((acc, b) => {
                return acc + getBookingPeriodDetails(b).durationMinutes;
              }, 0);

              const coveragePercent = Math.min(Math.round((totalBookedMinutes / period.totalDurationMinutes) * 100), 100);

              return (
                <div
                  key={`day-period-section-${period.id}`}
                  className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-2xs"
                >
                  {/* Cabeçalho do Período */}
                  <div className={`p-4 ${period.headerColor} border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/80 border border-slate-200/80 flex items-center justify-center shadow-2xs">
                        <PeriodIcon className={`w-5 h-5 ${period.accentColor}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{period.name}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${period.badgeBg}`}>
                            {period.timeRange}
                          </span>
                        </div>
                        <p className="text-[11px] opacity-80 mt-0.5">
                          {period.classesCountText} • Espaço Total do Período: <strong>{period.totalDurationHours}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {periodBookings.length > 0 ? (
                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-900">
                            {periodBookings.length} reserva(s) ({coveragePercent}% do período)
                          </span>
                          <div className="w-32 bg-white/80 rounded-full h-1.5 overflow-hidden mt-1 border border-slate-200">
                            <div
                              className="bg-blue-600 h-full rounded-full"
                              style={{ width: `${coveragePercent}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg">
                          Período 100% Livre
                        </span>
                      )}

                      {onRequestNewBooking && (
                        <button
                          type="button"
                          onClick={() => onRequestNewBooking(currentDateStr, period.id, selectedLabId !== 'all' ? selectedLabId : undefined)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Agendar na {period.label}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Conteúdo do Período */}
                  <div className="p-4 sm:p-5">
                    {periodBookings.length === 0 ? (
                      <div
                        onClick={() => onRequestNewBooking?.(currentDateStr, period.id, selectedLabId !== 'all' ? selectedLabId : undefined)}
                        className="py-10 px-4 text-center rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group"
                      >
                        <PeriodIcon className={`w-8 h-8 ${period.accentColor} mx-auto mb-2 opacity-60 group-hover:scale-110 transition-transform`} />
                        <h5 className="text-sm font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                          Período {period.name} Inteiramente Livre para Agendamento
                        </h5>
                        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-3">
                          Horário: {period.timeRange} ({period.totalDurationHours}). Todos os laboratórios de informática estão disponíveis.
                        </p>
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-2xs group-hover:bg-blue-700 transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                          Realizar Agendamento neste Período
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                          {periodBookings.map((booking, bIdx) => {
                            const pDetails = getBookingPeriodDetails(booking);
                            return (
                              <div
                                key={`${booking.id}-${bIdx}`}
                                onClick={() => {
                                  setActiveBookingModal(booking);
                                  onSelectBooking?.(booking);
                                }}
                                className={`rounded-xl border transition-all hover:shadow-md cursor-pointer flex flex-col justify-between ${
                                  pDetails.isFullPeriod ? 'p-4 min-h-[160px]' : 'p-3.5 min-h-[130px]'
                                } ${
                                  booking.isMobileLab
                                    ? 'bg-amber-50/70 border-amber-300'
                                    : 'bg-white border-slate-200'
                                }`}
                              >
                                <div>
                                  {/* Cabeçalho do Card */}
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900">
                                      {booking.isMobileLab ? (
                                        <Truck className="w-4 h-4 text-amber-600 shrink-0" />
                                      ) : (
                                        <Laptop className="w-4 h-4 text-blue-600 shrink-0" />
                                      )}
                                      <span className="truncate">{booking.labName}</span>
                                    </div>
                                    {getStatusBadge(booking.status)}
                                  </div>

                                  {/* Trilho Visual de Tempo e Duração Proporcional */}
                                  <div className="p-2 bg-blue-50/80 border border-blue-200/80 rounded-lg mb-2.5 space-y-1.5">
                                    <div className="flex items-center justify-between text-xs font-mono font-bold text-blue-900">
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                                        {pDetails.startTime} às {pDetails.endTime}
                                      </span>
                                      <span className="text-[11px] px-1.5 py-0.2 bg-blue-200/70 text-blue-900 rounded font-sans">
                                        {pDetails.durationLabel}
                                      </span>
                                    </div>

                                    {/* Indicador de Período Integral vs Parcial */}
                                    <div className="flex items-center justify-between text-[10px] text-slate-600">
                                      <span className="font-semibold text-indigo-900 flex items-center gap-1">
                                        <Timer className="w-3 h-3 text-indigo-600" />
                                        {pDetails.isFullPeriod ? 'Período Integral' : 'Período Parcial'}
                                      </span>
                                      <span>Ocupa {pDetails.periodCoveragePercent}% do turno</span>
                                    </div>
                                    <div className="w-full bg-blue-200/60 rounded-full h-1.5 overflow-hidden">
                                      <div
                                        className="bg-blue-600 h-full rounded-full"
                                        style={{ width: `${pDetails.periodCoveragePercent}%` }}
                                      />
                                    </div>
                                  </div>

                                  {/* Informações da Aula */}
                                  <div className="space-y-1 text-xs text-slate-600">
                                    <div className="flex items-center gap-1.5">
                                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      <span className="truncate">
                                        <strong>Prof:</strong> {booking.teacherName}
                                      </span>
                                    </div>

                                    {booking.subject && (
                                      <div className="text-[11px] text-slate-700 truncate pl-5">
                                        <strong>Disciplina:</strong> {booking.subject}
                                      </div>
                                    )}

                                    <div className="flex items-center justify-between pt-1">
                                      <div className="text-[11px] text-slate-500 truncate">
                                        <strong>Turma:</strong> {booking.classGroup}
                                      </div>
                                      {booking.educationLevel && (
                                        <EducationBadge level={booking.educationLevel} size="xs" />
                                      )}
                                    </div>

                                    {booking.requestedMachines && (
                                      <div className="text-[11px] text-slate-500 pl-5">
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

                                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                                  <span>ID: #{booking.id.slice(0, 6)}</span>
                                  <span className="text-blue-600 font-semibold hover:underline">
                                    Ver detalhes &rarr;
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Banner de Espaço Livre Restante se for parcial */}
                        {totalBookedMinutes < 180 && (
                          <div
                            onClick={() => onRequestNewBooking?.(currentDateStr, period.id, selectedLabId !== 'all' ? selectedLabId : undefined)}
                            className="p-3 rounded-xl border border-dashed border-blue-300 bg-blue-50/40 hover:bg-blue-50 text-blue-900 flex items-center justify-between transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2 text-xs">
                              <Plus className="w-4 h-4 text-blue-600 shrink-0" />
                              <span>
                                <strong>Espaço Disponível:</strong> Ainda há horários livres no {period.name} ({period.timeRange}).
                              </span>
                            </div>
                            <span className="text-xs font-bold text-blue-700 underline shrink-0">
                              + Agendar no restante da {period.label}
                            </span>
                          </div>
                        )}
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
      {/* 4. LEGENDA VISUAL DO CALENDÁRIO (FÁCIL DE IDENTIFICAR)    */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:px-4 sm:py-3 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          {/* Turnos */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              Turnos & Cores:
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border-l-[3px] border-l-amber-500 border border-slate-200 bg-amber-50/70 text-amber-950 font-medium">
              <Sun className="w-3 h-3 text-amber-600" />
              <span>Manhã (07:30 - 11:55)</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border-l-[3px] border-l-orange-500 border border-slate-200 bg-orange-50/70 text-orange-950 font-medium">
              <Sunset className="w-3 h-3 text-orange-600" />
              <span>Tarde (13:15 - 17:40)</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border-l-[3px] border-l-indigo-500 border border-slate-200 bg-indigo-50/70 text-indigo-950 font-medium">
              <Moon className="w-3 h-3 text-indigo-600" />
              <span>Noite (19:00 - 22:15)</span>
            </span>
          </div>

          {/* Status & Recursos */}
          <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-600 pt-1 lg:pt-0 border-t lg:border-t-0 border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
              <span>Confirmado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-amber-200" />
              <span>Pendente</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Laptop className="w-3 h-3 text-blue-600" />
              <span>Lab Fixo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Truck className="w-3 h-3 text-amber-600" />
              <span>Móvel</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Wrench className="w-3 h-3 text-rose-600" />
              <span>Manutenção</span>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Detail Quick Modal */}
      {activeBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
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

            <div className="p-4 sm:p-5 space-y-3 text-xs overflow-y-auto flex-1">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="font-bold text-sm text-slate-900">
                  {activeBookingModal.labName}
                </span>
                {getStatusBadge(activeBookingModal.status)}
              </div>

              {(() => {
                const pDetails = getBookingPeriodDetails(activeBookingModal);
                return (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-slate-700">
                      <div className="p-2.5 bg-slate-50 rounded-xl">
                        <span className="text-[11px] text-slate-400 block font-medium">Data</span>
                        <span className="font-semibold">{formatDateBR(activeBookingModal.date)}</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl">
                        <span className="text-[11px] text-slate-400 block font-medium">Turno / Período</span>
                        <span className="font-bold text-slate-900">{pDetails.periodName}</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-blue-50/80 border border-blue-200/80 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono font-bold text-blue-900">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          {pDetails.startTime} às {pDetails.endTime}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 bg-blue-200/80 text-blue-900 rounded-md font-sans">
                          Duração: {pDetails.durationLabel}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-600 pt-0.5">
                        <span className="font-semibold text-indigo-900 flex items-center gap-1">
                          <Timer className="w-3 h-3 text-indigo-600" />
                          {pDetails.isFullPeriod ? 'Período Integral' : 'Período Parcial'}
                        </span>
                        <span>Ocupa {pDetails.periodCoveragePercent}% do turno</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

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
                  <span className="font-semibold text-slate-900 mr-2">{activeBookingModal.classGroup}</span>
                  {activeBookingModal.educationLevel && (
                    <EducationBadge level={activeBookingModal.educationLevel} size="xs" />
                  )}
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

              <div className="pt-4 flex items-center justify-between gap-2 border-t border-slate-100">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      const b = activeBookingModal;
                      setActiveBookingModal(null);
                      if (onAdjustBookingDate) {
                        onAdjustBookingDate(b);
                      } else {
                        setBookingToAdjust(b);
                        setIsAdjustModalOpen(true);
                      }
                    }}
                    className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs text-xs"
                    title="Ajustar data ou horário do agendamento (Exclusivo Administrador e Técnico)"
                  >
                    <CalendarClock className="w-4 h-4 text-blue-600" />
                    <span>Ajustar Data</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveBookingModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer ml-auto"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl border border-amber-200 overflow-hidden animate-fade-in">
            <div className="p-3.5 sm:p-4 bg-amber-600 text-white flex items-center justify-between shrink-0">
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

            <div className="p-4 sm:p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
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
      {/* Modal de Todos os Agendamentos do Dia Expandido */}
      {dayExpandedModal && (() => {
        const dayBookings = filteredBookings
          .filter((b) => b.date === dayExpandedModal.dateStr)
          .sort((a, b) => (a.startTime || a.timeSlot).localeCompare(b.startTime || b.timeSlot));
        const dayMaintenances = getMaintenanceForDate(dayExpandedModal.dateStr);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
              {/* Header */}
              <div className="p-3.5 sm:p-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                    <CalendarIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold capitalize">
                      {dayExpandedModal.dayName}
                    </h3>
                    <p className="text-[11px] text-blue-100">
                      Data: {formatDateBR(dayExpandedModal.dateStr)} • {dayBookings.length} {dayBookings.length === 1 ? 'agendamento' : 'agendamentos'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDayExpandedModal(null)}
                  className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 cursor-pointer text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Corpo da Lista com Scroll */}
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
                {/* Interdições Técnicas no Dia */}
                {dayMaintenances.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-rose-900 flex items-center gap-1">
                      <Wrench className="w-3.5 h-3.5 text-rose-600" />
                      Manutenções / Interdições no Dia:
                    </span>
                    {dayMaintenances.map(({ lab: mLab, status: mStatus }) => (
                      <div
                        key={`modal-maint-${mLab.id}`}
                        onClick={() => {
                          setDayExpandedModal(null);
                          setSelectedMaintenanceLabModal(mLab);
                        }}
                        className={`p-3 rounded-xl border text-xs flex items-center justify-between cursor-pointer ${
                          mStatus.allDay
                            ? 'bg-rose-50 border-rose-200 text-rose-950 hover:bg-rose-100'
                            : 'bg-amber-50 border-amber-200 text-amber-950 hover:bg-amber-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Wrench className="w-4 h-4 text-rose-600 shrink-0" />
                          <div>
                            <strong className="block font-bold">{mLab.name}</strong>
                            <span className="text-[11px] text-slate-600">{mStatus.reason}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 border">
                          {mStatus.allDay ? 'Dia Todo' : `${mStatus.startTime} - ${mStatus.endTime}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Lista de Reservas */}
                {dayBookings.length === 0 ? (
                  <div className="text-center py-10 px-4 text-slate-500 space-y-2">
                    <Clock className="w-8 h-8 mx-auto text-slate-400" />
                    <p className="text-sm font-semibold text-slate-700">Nenhum agendamento para este dia com os filtros atuais.</p>
                    <p className="text-xs text-slate-400">Clique abaixo para criar um novo agendamento nesta data.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {dayBookings.map((b) => {
                      const pDetails = getBookingPeriodDetails(b);

                      const shiftColor =
                        pDetails.shift === 'manha'
                          ? 'border-l-amber-500 bg-amber-50/40 hover:bg-amber-50'
                          : pDetails.shift === 'tarde'
                          ? 'border-l-orange-500 bg-orange-50/40 hover:bg-orange-50'
                          : 'border-l-indigo-500 bg-indigo-50/40 hover:bg-indigo-50';

                      return (
                        <div
                          key={`expanded-booking-${b.id}`}
                          onClick={() => {
                            setDayExpandedModal(null);
                            setActiveBookingModal(b);
                            onSelectBooking?.(b);
                          }}
                          className={`p-3.5 rounded-xl border-l-4 border border-slate-200 shadow-2xs hover:shadow-xs transition-all cursor-pointer ${shiftColor}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                                  {pDetails.startTime} às {pDetails.endTime}
                                </span>
                                <span className="text-[11px] font-bold text-slate-700">
                                  {pDetails.periodName}
                                </span>
                                {b.isMobileLab ? (
                                  <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <Truck className="w-3 h-3" /> Móvel
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-blue-900 bg-blue-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <Laptop className="w-3 h-3" /> Fixo
                                  </span>
                                )}
                              </div>

                              <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{b.labName}</span>
                                {b.roomNumber && (
                                  <span className="text-xs font-normal text-slate-500">
                                    (Sala {b.roomNumber})
                                  </span>
                                )}
                              </div>

                              <div className="text-xs text-slate-700 flex items-center gap-2 flex-wrap">
                                <span>
                                  <strong>Professor:</strong> {b.teacherName}
                                </span>
                                {b.subject && (
                                  <span>
                                    • <strong>Disciplina:</strong> {b.subject}
                                  </span>
                                )}
                                <span>
                                  • <strong>Turma:</strong> {b.classGroup}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              {getStatusBadge(b.status)}
                              <span className="text-[11px] text-blue-600 font-semibold hover:underline">
                                Detalhes &rarr;
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Rodapé do Modal */}
              <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const targetDateStr = dayExpandedModal.dateStr;
                    setDayExpandedModal(null);
                    setCurrentDate(new Date(targetDateStr + 'T12:00:00'));
                    setViewMode('day');
                  }}
                  className="text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Timer className="w-3.5 h-3.5" />
                  <span>Abrir visualização detalhada do Dia</span>
                </button>

                <div className="flex items-center gap-2">
                  {onRequestNewBooking && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetDateStr = dayExpandedModal.dateStr;
                        setDayExpandedModal(null);
                        onRequestNewBooking(targetDateStr, undefined, selectedLabId !== 'all' ? selectedLabId : undefined);
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nova Reserva neste Dia</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDayExpandedModal(null)}
                    className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {/* Modal de Ajuste de Data (Administrador e Técnico) */}
      <AdjustBookingDateModal
        booking={bookingToAdjust}
        isOpen={isAdjustModalOpen}
        onClose={() => {
          setIsAdjustModalOpen(false);
          setBookingToAdjust(null);
        }}
        existingBookings={bookings}
        labs={labs}
      />
    </div>
  );
};
