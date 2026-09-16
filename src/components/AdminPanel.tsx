import React, { useState, useRef, useEffect } from 'react';
import { Booking, LAB_LIST, BookingStatus, TIME_SLOTS } from '../types';
import { formatDateBR, sanitizeWhatsAppPhone } from '../lib/whatsapp';
import {
  updateBookingStatus,
  deleteBooking,
  markWhatsAppAsSent,
  clearAllBookings,
} from '../lib/bookingService';
import {
  Shield,
  MessageSquare,
  CheckCircle,
  XCircle,
  Trash2,
  Filter,
  Search,
  Calendar,
  Truck,
  Monitor,
  Phone,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  Users,
  CalendarDays,
  RefreshCw,
  Code,
  Repeat,
  Check,
  X,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { WhatsAppModal } from './WhatsAppModal';
import { BatchImportModal } from './BatchImportModal';
import { TechnicianManagement } from './TechnicianManagement';
import { BookingCalendar } from './BookingCalendar';
import { ClearDataModal } from './ClearDataModal';
import { LabManagementPanel } from './LabManagementPanel';
import { AdminSecurityPanel } from './AdminSecurityPanel';
import { EducationBadge } from './EducationBadge';
import { useAuth } from '../lib/authContext';
import { Lab } from '../types';
import { playBookingConfirmedSound } from '../lib/soundUtils';

interface AdminPanelProps {
  bookings: Booking[];
  labs?: Lab[];
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ bookings, labs = LAB_LIST }) => {
  const { isSuperAdmin, user } = useAuth();
  const todayStr = new Date().toISOString().split('T')[0];

  const [activeTab, setActiveTab] = useState<
    'all' | 'pending' | 'calendar' | 'mobile_route' | 'schedule' | 'technicians' | 'softwares' | 'security'
  >('pending');
  const [isMenuDropdownOpen, setIsMenuDropdownOpen] = useState(false);
  const menuDropdownRef = useRef<HTMLDivElement>(null);

  // Fecha a janela suspensa do menu ao clicar fora ou apertar Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuDropdownRef.current && !menuDropdownRef.current.contains(event.target as Node)) {
        setIsMenuDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLabId, setSelectedLabId] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedEduLevel, setSelectedEduLevel] = useState<string>('all');
  const [isClearing, setIsClearing] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isBatchImportModalOpen, setIsBatchImportModalOpen] = useState(false);

  // WhatsApp Modal State
  const [activeWhatsAppBooking, setActiveWhatsAppBooking] = useState<Booking | null>(null);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);

  // Stats
  const pendingCount = bookings.filter((b) => b.status === 'pending').length;
  const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length;
  const todayBookingsCount = bookings.filter((b) => b.date === todayStr).length;
  const mobileBookingsCount = bookings.filter((b) => b.isMobileLab && b.status !== 'cancelled').length;
  const whatsAppSentCount = bookings.filter((b) => b.whatsappSent).length;

  // Escopo de laboratórios do técnico (se aplicável)
  const userAssignedLabs =
    user?.role === 'technician' && user.assignedLabIds && user.assignedLabIds.length > 0
      ? user.assignedLabIds
      : null;

  // Filtragem
  const filteredBookings = bookings.filter((b) => {
    // Se o técnico tem laboratórios específicos vinculados e está no modo "all", restringe aos seus laboratórios
    if (userAssignedLabs && selectedLabId === 'all') {
      if (!userAssignedLabs.includes(b.labId)) return false;
    }

    // Tab filtering
    if (activeTab === 'pending' && b.status !== 'pending') return false;
    if (activeTab === 'mobile_route' && !b.isMobileLab) return false;

    // Filters
    if (selectedStatus !== 'all' && b.status !== selectedStatus) return false;
    if (selectedLabId !== 'all' && b.labId !== selectedLabId) return false;
    if (selectedDate && b.date !== selectedDate) return false;
    if (selectedEduLevel !== 'all' && (b.educationLevel || 'outros') !== selectedEduLevel) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const phoneDigits = searchQuery.replace(/\D/g, '');
      const matchName = b.teacherName.toLowerCase().includes(q);
      const matchClass = b.classGroup.toLowerCase().includes(q);
      const matchLab = b.labName.toLowerCase().includes(q);
      const matchRoom = b.roomNumber?.toLowerCase().includes(q) || false;
      const matchEdu = b.educationLevel?.toLowerCase().includes(q) || false;
      const matchPhone = phoneDigits ? b.whatsapp.replace(/\D/g, '').includes(phoneDigits) : false;
      return matchName || matchClass || matchLab || matchRoom || matchEdu || matchPhone;
    }

    return true;
  });

  const handleOpenWhatsAppModal = (booking: Booking) => {
    setActiveWhatsAppBooking(booking);
    setIsWhatsAppOpen(true);
  };

  const handleConfirmAndSendWhatsApp = async (bookingId: string, customNote?: string) => {
    await updateBookingStatus(bookingId, 'confirmed', customNote);
    await markWhatsAppAsSent(bookingId);
    playBookingConfirmedSound();
  };

  const handleStatusChange = async (bookingId: string, status: BookingStatus) => {
    try {
      await updateBookingStatus(bookingId, status);
      if (status === 'confirmed') {
        playBookingConfirmedSound();
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  const handleDelete = async (bookingId: string) => {
    if (window.confirm('Tem certeza de que deseja excluir este agendamento do histórico?')) {
      try {
        await deleteBooking(bookingId);
      } catch (err) {
        console.error('Erro ao excluir:', err);
      }
    }
  };

  const handleClearAllBookings = async () => {
    setIsClearing(true);
    try {
      await clearAllBookings();
    } catch (err) {
      console.error('Erro ao limpar agendamentos:', err);
      throw err;
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Clear Data Math Confirmation Modal */}
      <ClearDataModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleClearAllBookings}
        isLoading={isClearing}
      />

      {/* WhatsApp Modal */}
      <WhatsAppModal
        booking={activeWhatsAppBooking}
        isOpen={isWhatsAppOpen}
        onClose={() => {
          setIsWhatsAppOpen(false);
          setActiveWhatsAppBooking(null);
        }}
        onConfirmAndSend={handleConfirmAndSendWhatsApp}
      />

      {/* Modal de Importação por Lote (Planilhas / Grade) */}
      <BatchImportModal
        isOpen={isBatchImportModalOpen}
        onClose={() => setIsBatchImportModalOpen(false)}
        labs={labs}
        existingBookings={bookings}
      />

      {/* Top Banner with Admin User info & Quick Tools */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-slate-900">
                Painel Administrativo & Gestão Escolar
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                {isSuperAdmin ? 'Admin Geral (guilherme.benz)' : 'Técnico Autorizado'}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200" title="Banco de dados em tempo real ativo">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Firestore Online
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Gerencie reservas dos laboratórios, confirme horários, adicione novos labs e cadastre a equipe técnica
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            id="admin-top-batch-import-btn"
            type="button"
            onClick={() => setIsBatchImportModalOpen(true)}
            title="Importar agendamentos em lote por planilha Excel/CSV ou colar da grade semanal"
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Importar por Lote</span>
          </button>

          <button
            id="admin-clear-bookings-btn"
            type="button"
            disabled={isClearing}
            onClick={() => setIsClearModalOpen(true)}
            title="Limpa agendamentos de teste do banco"
            className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isClearing ? 'animate-spin' : ''}`} />
            <span>{isClearing ? 'Limpando...' : 'Limpar Agendamentos'}</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div
          onClick={() => setActiveTab('pending')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'pending'
              ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Pendentes</span>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <p className="text-2xl font-bold text-amber-700 mt-1">{pendingCount}</p>
          <p className="text-[11px] text-slate-600 mt-0.5">Aguardando aprovação</p>
        </div>

        <div
          onClick={() => setActiveTab('all')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'all'
              ? 'bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-xs font-semibold text-slate-700">Confirmados</span>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{confirmedCount}</p>
          <p className="text-[11px] text-slate-600 mt-0.5">Aprovados no sistema</p>
        </div>

        <div
          onClick={() => {
            setActiveTab('all');
            setSelectedDate(todayStr);
          }}
          className="bg-white p-4 rounded-xl border border-slate-200 cursor-pointer hover:border-slate-300 transition-all"
        >
          <span className="text-xs font-semibold text-slate-700">Aulas Hoje</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{todayBookingsCount}</p>
          <p className="text-[11px] text-slate-600 mt-0.5">{todayStr}</p>
        </div>

        <div
          onClick={() => setActiveTab('mobile_route')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'mobile_route'
              ? 'bg-rose-500/10 border-rose-500 ring-2 ring-rose-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Labs Móveis</span>
            <Truck className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-700 mt-1">{mobileBookingsCount}</p>
          <p className="text-[11px] text-slate-600 mt-0.5">Entregas em sala</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">WhatsApp Enviados</span>
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{whatsAppSentCount}</p>
          <p className="text-[11px] text-slate-600 mt-0.5">Mensagens disparadas</p>
        </div>
      </div>

      {/* Menu com Janela Suspensa (Dropdown Navigation Window) */}
      <div className="relative z-30" ref={menuDropdownRef}>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Botão Principal de Disparo da Janela Suspensa */}
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
            <button
              id="admin-suspended-menu-trigger"
              type="button"
              onClick={() => setIsMenuDropdownOpen((prev) => !prev)}
              className={`flex items-center justify-between gap-3.5 px-4 py-2.5 rounded-xl border transition-all cursor-pointer text-left w-full sm:w-auto ${
                isMenuDropdownOpen
                  ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 hover:border-slate-300'
              }`}
              title="Clique para abrir as opções e módulos do painel"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold shrink-0 shadow-xs ${
                    activeTab === 'pending'
                      ? 'bg-amber-100 text-amber-700'
                      : activeTab === 'all'
                      ? 'bg-blue-100 text-blue-700'
                      : activeTab === 'calendar'
                      ? 'bg-indigo-100 text-indigo-700'
                      : activeTab === 'schedule'
                      ? 'bg-sky-100 text-sky-700'
                      : activeTab === 'mobile_route'
                      ? 'bg-rose-100 text-rose-700'
                      : activeTab === 'technicians'
                      ? 'bg-blue-100 text-blue-700'
                      : activeTab === 'softwares'
                      ? 'bg-cyan-100 text-cyan-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {activeTab === 'pending' && <Clock className="w-4 h-4" />}
                  {activeTab === 'all' && <Layers className="w-4 h-4" />}
                  {activeTab === 'calendar' && <CalendarDays className="w-4 h-4" />}
                  {activeTab === 'schedule' && <Calendar className="w-4 h-4" />}
                  {activeTab === 'mobile_route' && <Truck className="w-4 h-4" />}
                  {activeTab === 'technicians' && <Users className="w-4 h-4" />}
                  {activeTab === 'softwares' && <Code className="w-4 h-4" />}
                  {activeTab === 'security' && <Shield className="w-4 h-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Módulo Selecionado
                    </span>
                    {activeTab === 'pending' && pendingCount > 0 && (
                      <span className="px-1.5 py-0.2 text-[10px] font-bold bg-amber-200/80 text-amber-900 rounded-full">
                        {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
                      </span>
                    )}
                    {activeTab === 'mobile_route' && mobileBookingsCount > 0 && (
                      <span className="px-1.5 py-0.2 text-[10px] font-bold bg-rose-200/80 text-rose-900 rounded-full">
                        {mobileBookingsCount} em rota
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    {activeTab === 'pending' && 'Aguardando Aprovação'}
                    {activeTab === 'all' && 'Todos os Agendamentos'}
                    {activeTab === 'calendar' && 'Calendário (Dia / Semana / Mês)'}
                    {activeTab === 'schedule' && `Grade Diária (${labs.length} Labs)`}
                    {activeTab === 'mobile_route' && 'Roteiro de Carrinhos Móveis'}
                    {activeTab === 'technicians' && 'Equipe de Técnicos'}
                    {activeTab === 'softwares' && 'Gestão de Labs (Incluir/Editar/Obs)'}
                    {activeTab === 'security' && 'Segurança & Instituição'}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2 pl-3 border-l border-slate-200/80">
                <span className="hidden sm:inline text-xs font-semibold text-slate-600">
                  Módulos
                </span>
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform duration-200 ${
                    isMenuDropdownOpen
                      ? 'rotate-180 bg-blue-600 text-white'
                      : 'bg-white text-slate-500 border border-slate-200'
                  }`}
                >
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </button>
          </div>

          {/* Atalhos Rápidos para alternância ágil */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap mr-1 hidden sm:inline">
              Atalhos:
            </span>
            <button
              type="button"
              onClick={() => {
                setActiveTab('pending');
                setIsMenuDropdownOpen(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'pending'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pendentes</span>
              {pendingCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                    activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('all');
                setIsMenuDropdownOpen(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Todos</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('schedule');
                setIsMenuDropdownOpen(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'schedule'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Grade Labs</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('calendar');
                setIsMenuDropdownOpen(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'calendar'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Calendário</span>
            </button>

            <button
              id="admin-open-more-modules-btn"
              type="button"
              onClick={() => setIsMenuDropdownOpen((prev) => !prev)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 flex items-center gap-1 transition-all whitespace-nowrap cursor-pointer"
              title="Abrir menu suspenso completo"
            >
              <span>+ Módulos</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isMenuDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <button
              id="admin-quick-batch-import-btn"
              type="button"
              onClick={() => {
                setIsBatchImportModalOpen(true);
                setIsMenuDropdownOpen(false);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shadow-2xs"
              title="Subir agendamento por lote via planilha"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Importar Lote</span>
            </button>
          </div>
        </div>

        {/* JANELA SUSPENSA (Floating Dropdown Panel) */}
        {isMenuDropdownOpen && (
          <div
            id="admin-suspended-menu-window"
            className="absolute top-full left-0 right-0 lg:right-auto lg:w-[680px] mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 sm:p-5 z-40 animate-fade-in space-y-4"
          >
            {/* Header do Menu de Módulos */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Navegação do Painel Administrativo
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Selecione o módulo ou ferramenta para visualizar:
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMenuDropdownOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title="Fechar menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Seção 1: Agendamentos & Rotinas de Aulas */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">
                Agendamentos & Ocupação de Salas
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  id="tab-pending-btn"
                  type="button"
                  onClick={() => {
                    setActiveTab('pending');
                    setIsMenuDropdownOpen(false);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between gap-2.5 cursor-pointer ${
                    activeTab === 'pending'
                      ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/20'
                      : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">Aguardando Aprovação</span>
                        {pendingCount > 0 && (
                          <span className="px-1.5 py-0.2 text-[10px] font-bold bg-amber-200 text-amber-900 rounded-full">
                            {pendingCount}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        Revisar e aprovar novos agendamentos
                      </p>
                    </div>
                  </div>
                  {activeTab === 'pending' && <Check className="w-4 h-4 text-amber-600 shrink-0 mt-1" />}
                </button>

                <button
                  id="tab-all-btn"
                  type="button"
                  onClick={() => {
                    setActiveTab('all');
                    setIsMenuDropdownOpen(false);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between gap-2.5 cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-400/20'
                      : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">Todos os Agendamentos</span>
                        <span className="text-[10px] text-slate-500 font-medium">({bookings.length})</span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        Histórico completo, filtros e relatórios
                      </p>
                    </div>
                  </div>
                  {activeTab === 'all' && <Check className="w-4 h-4 text-blue-600 shrink-0 mt-1" />}
                </button>

                <button
                  id="tab-calendar-btn"
                  type="button"
                  onClick={() => {
                    setActiveTab('calendar');
                    setIsMenuDropdownOpen(false);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between gap-2.5 cursor-pointer ${
                    activeTab === 'calendar'
                      ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-400/20'
                      : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                      <CalendarDays className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Calendário Geral</span>
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        Visão por Dia, Semana e Mês com horários
                      </p>
                    </div>
                  </div>
                  {activeTab === 'calendar' && <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-1" />}
                </button>

                <button
                  id="tab-schedule-matrix-btn"
                  type="button"
                  onClick={() => {
                    setActiveTab('schedule');
                    setIsMenuDropdownOpen(false);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between gap-2.5 cursor-pointer ${
                    activeTab === 'schedule'
                      ? 'bg-sky-50/80 border-sky-400 ring-2 ring-sky-400/20'
                      : 'bg-white border-slate-200 hover:border-sky-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Grade Diária ({labs.length} Labs)</span>
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        Matriz de ocupação e horários simultâneos
                      </p>
                    </div>
                  </div>
                  {activeTab === 'schedule' && <Check className="w-4 h-4 text-sky-600 shrink-0 mt-1" />}
                </button>

                <button
                  id="tab-mobile-route-btn"
                  type="button"
                  onClick={() => {
                    setActiveTab('mobile_route');
                    setIsMenuDropdownOpen(false);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between gap-2.5 cursor-pointer sm:col-span-2 ${
                    activeTab === 'mobile_route'
                      ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-400/20'
                      : 'bg-white border-slate-200 hover:border-rose-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">Roteiro de Carrinhos Móveis</span>
                        {mobileBookingsCount > 0 && (
                          <span className="px-1.5 py-0.2 text-[10px] font-bold bg-rose-200 text-rose-900 rounded-full">
                            {mobileBookingsCount} entregas
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Logística de transporte de notebooks nas salas de aula
                      </p>
                    </div>
                  </div>
                  {activeTab === 'mobile_route' && <Check className="w-4 h-4 text-rose-600 shrink-0 mt-1" />}
                </button>

                <button
                  id="tab-batch-import-menu-item"
                  type="button"
                  onClick={() => {
                    setIsBatchImportModalOpen(true);
                    setIsMenuDropdownOpen(false);
                  }}
                  className="p-3 rounded-xl border border-emerald-200 hover:border-emerald-400 bg-emerald-50/40 hover:bg-emerald-50 text-left transition-all flex items-start justify-between gap-2.5 cursor-pointer sm:col-span-2"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">Importação por Lote (Planilha / Grade)</span>
                        <span className="px-1.5 py-0.2 text-[10px] font-bold bg-emerald-200 text-emerald-900 rounded-full">
                          Excel / Grade
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Suba ou cole grades semanais (Hor x Dias) e gere agendamentos automaticamente
                      </p>
                    </div>
                  </div>
                  <div className="text-emerald-700 text-xs font-bold shrink-0 mt-1 flex items-center gap-0.5">
                    <span>Abrir</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              </div>
            </div>

            {/* Seção 2: Administração do Sistema & Equipe */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">
                Gestão Técnica & Configuração do GestLab
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  id="tab-technicians-btn"
                  type="button"
                  onClick={() => {
                    setActiveTab('technicians');
                    setIsMenuDropdownOpen(false);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between gap-2 cursor-pointer ${
                    activeTab === 'technicians'
                      ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-400/20'
                      : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-900 block leading-tight">
                      Equipe de Técnicos
                    </span>
                    <p className="text-[10px] text-slate-500">
                      Cadastro e vínculos de labs
                    </p>
                  </div>
                  {activeTab === 'technicians' && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                </button>

                <button
                  id="tab-softwares-btn"
                  type="button"
                  onClick={() => {
                    setActiveTab('softwares');
                    setIsMenuDropdownOpen(false);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between gap-2 cursor-pointer ${
                    activeTab === 'softwares'
                      ? 'bg-cyan-50/80 border-cyan-400 ring-2 ring-cyan-400/20'
                      : 'bg-white border-slate-200 hover:border-cyan-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="w-7 h-7 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center">
                      <Code className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-900 block leading-tight">
                      Gestão de Labs & Softwares
                    </span>
                    <p className="text-[10px] text-slate-500">
                      Cadastrar/editar labs, observações e avisos
                    </p>
                  </div>
                  {activeTab === 'softwares' && <Check className="w-3.5 h-3.5 text-cyan-600 shrink-0" />}
                </button>

                <button
                  id="tab-security-btn"
                  type="button"
                  onClick={() => {
                    setActiveTab('security');
                    setIsMenuDropdownOpen(false);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between gap-2 cursor-pointer ${
                    activeTab === 'security'
                      ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-400/20'
                      : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Shield className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-900 block leading-tight">
                      Segurança & Instituição
                    </span>
                    <p className="text-[10px] text-slate-500">
                      Senhas e subtítulo do topo
                    </p>
                  </div>
                  {activeTab === 'security' && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                </button>
              </div>
            </div>

            {/* Status do Firebase Firestore para o Administrador */}
            <div className="pt-3 border-t border-slate-100 bg-slate-50/80 -mx-4 -mb-4 p-3.5 rounded-b-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="font-bold text-slate-800">Status do Banco de Dados:</span>
                  <span className="text-emerald-700 font-semibold bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                    Firebase Firestore Ativo
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                  <span>Sincronização em tempo real ativa</span>
                  <span>•</span>
                  <span>Cache offline habilitado</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {activeTab === 'security' ? (
        <AdminSecurityPanel />
      ) : activeTab === 'softwares' ? (
        <LabManagementPanel labs={labs} />
      ) : activeTab === 'technicians' ? (
        <TechnicianManagement labs={labs} />
      ) : activeTab === 'calendar' ? (
        <BookingCalendar
          bookings={bookings}
          onSelectBooking={(b) => handleOpenWhatsAppModal(b)}
        />
      ) : activeTab === 'schedule' ? (
        <ScheduleMatrixView
          bookings={bookings}
          labs={labs}
          onOpenWhatsApp={handleOpenWhatsAppModal}
        />
      ) : (
        <div className="space-y-4">
          {/* Barra de Foco do Técnico: Opção de qual laboratório visualizar */}
          {user?.role === 'technician' && (
            <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200 rounded-2xl p-4 shadow-xs">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded-full">
                        Painel do Técnico
                      </span>
                      <span className="text-sm font-bold text-slate-900">{user.name}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {userAssignedLabs
                        ? `Você está designado para ${userAssignedLabs.length} laboratório(s). Escolha qual deseja visualizar:`
                        : `Você possui permissão para visualizar todos os ${labs.length} laboratórios da escola:`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
                    Visualizar Lab:
                  </span>
                  <select
                    id="technician-lab-view-select"
                    value={selectedLabId}
                    onChange={(e) => setSelectedLabId(e.target.value)}
                    className="w-full md:w-auto px-3 py-2 text-xs font-bold bg-white text-blue-900 border border-blue-300 rounded-xl shadow-xs focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="all">
                      {userAssignedLabs
                        ? `★ Todos os Meus Labs Vinculados (${userAssignedLabs.length})`
                        : `★ Todos os Laboratórios (${labs.length})`}
                    </option>
                    {(userAssignedLabs
                      ? labs.filter((l) => userAssignedLabs.includes(l.id))
                      : labs
                    ).map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} {l.isMobile ? '(Carrinho Móvel - Sala)' : `(${l.capacity} máq)`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Botões de Atalho Rápido para o Técnico Alternar de Lab */}
              <div className="mt-3 pt-3 border-t border-blue-200/60 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <span className="text-[11px] font-semibold text-slate-500 shrink-0">Atalhos rápidos:</span>
                <button
                  type="button"
                  onClick={() => setSelectedLabId('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                    selectedLabId === 'all'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  {userAssignedLabs ? `Meus Labs (${userAssignedLabs.length})` : `Todos (${labs.length})`}
                </button>
                {(userAssignedLabs
                  ? labs.filter((l) => userAssignedLabs.includes(l.id))
                  : labs
                ).map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setSelectedLabId(l.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors flex items-center gap-1 cursor-pointer ${
                      selectedLabId === l.id
                        ? 'bg-blue-600 text-white shadow-xs font-bold'
                        : 'bg-white text-slate-700 border border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    {l.isMobile ? (
                      <Truck className="w-3 h-3 text-rose-500" />
                    ) : (
                      <Monitor className="w-3 h-3 text-blue-500" />
                    )}
                    <span>{l.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                id="admin-search-bookings"
                type="text"
                placeholder="Buscar professor, turma, sala, whatsapp..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Filter by Lab */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-700 font-medium">Lab:</span>
              <select
                id="admin-filter-lab"
                value={selectedLabId}
                onChange={(e) => setSelectedLabId(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="all">
                  {userAssignedLabs ? `Meus Labs Atribuídos (${userAssignedLabs.length})` : `Todos os Labs (${labs.length})`}
                </option>
                <optgroup label="Laboratórios Fixos">
                  {(userAssignedLabs
                    ? labs.filter((l) => !l.isMobile && userAssignedLabs.includes(l.id))
                    : labs.filter((l) => !l.isMobile)
                  ).map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.capacity} máq)
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Laboratórios Móveis">
                  {(userAssignedLabs
                    ? labs.filter((l) => l.isMobile && userAssignedLabs.includes(l.id))
                    : labs.filter((l) => l.isMobile)
                  ).map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.capacity} máq)
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Filter by Date */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-700 font-medium">Data:</span>
              <input
                id="admin-filter-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2 py-1 text-xs border border-slate-300 rounded-lg"
              />
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate('')}
                  className="text-[11px] text-slate-500 hover:text-red-600"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Filter by Status */}
            {activeTab === 'all' && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-700 font-medium">Status:</span>
                <select
                  id="admin-filter-status"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="all">Todos os Status</option>
                  <option value="pending">Pendente</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="rejected">Recusado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>
            )}

            {/* Filter by Education Level */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-700 font-medium">Segmento:</span>
              <select
                id="admin-filter-edu-level"
                value={selectedEduLevel}
                onChange={(e) => setSelectedEduLevel(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="all">Todos os Segmentos</option>
                <option value="basico">Ensino Básico</option>
                <option value="superior">Ensino Superior</option>
                <option value="ead">EAD</option>
                <option value="outros">Outros</option>
              </select>
            </div>
          </div>

          {/* Roteiro Móvel Warning Banner if in mobile route tab */}
          {activeTab === 'mobile_route' && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-rose-900">
                    Roteiro de Entrega dos Laboratórios Móveis
                  </h3>
                  <p className="text-xs text-rose-800 mt-0.5">
                    Utilize esta lista para instruir a equipe de apoio e portaria sobre qual carrinho
                    levar para cada sala em cada aula.
                  </p>
                </div>
              </div>
              <button
                id="print-mobile-route-btn"
                onClick={() => window.print()}
                className="px-3.5 py-2 bg-white border border-rose-300 hover:bg-rose-100 text-rose-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 shrink-0 shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Roteiro</span>
              </button>
            </div>
          )}

          {/* Table / List of Bookings */}
          {filteredBookings.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500">
              <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700 text-sm">
                Nenhum agendamento com estes filtros
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                Altere os filtros acima para visualizar outros agendamentos.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-bold text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Professor & WhatsApp</th>
                      <th className="py-3 px-4">Laboratório & Turma</th>
                      <th className="py-3 px-4">Data & Horário</th>
                      {activeTab === 'mobile_route' ? (
                        <th className="py-3 px-4 text-rose-700 font-extrabold bg-rose-50/50">
                          🚚 Sala de Entrega
                        </th>
                      ) : (
                        <th className="py-3 px-4">Local / Sala</th>
                      )}
                      <th className="py-3 px-4 text-right">Ações & Confirmação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBookings.map((b, idx) => {
                      const isPending = b.status === 'pending';
                      const isConfirmed = b.status === 'confirmed';

                      return (
                        <tr
                          key={`${b.id}-${idx}`}
                          id={`admin-row-${b.id}`}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isPending ? 'bg-amber-50/20' : ''
                          }`}
                        >
                          {/* Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <span
                                className={`inline-flex items-center gap-1 font-semibold text-[11px] px-2.5 py-0.5 rounded-full border w-fit ${
                                  isConfirmed
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : isPending
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : 'bg-red-50 text-red-700 border-red-200'
                                }`}
                              >
                                {isConfirmed
                                  ? 'Confirmado'
                                  : isPending
                                    ? 'Pendente'
                                    : 'Recusado'}
                              </span>
                              {b.whatsappSent ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                                  WhatsApp enviado
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-600">
                                  WhatsApp pendente
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Professor & WhatsApp */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 text-sm">
                              {b.teacherName}
                            </div>
                            <div className="flex items-center gap-1 font-mono text-emerald-700 text-xs mt-0.5">
                              <Phone className="w-3 h-3" />
                              <span>{b.whatsapp}</span>
                            </div>
                          </td>

                          {/* Laboratório & Turma */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                              {b.isMobileLab ? (
                                <Truck className="w-3.5 h-3.5 text-rose-600" />
                              ) : (
                                <Monitor className="w-3.5 h-3.5 text-blue-600" />
                              )}
                              <span>{b.labName}</span>
                            </div>
                            <div className="text-slate-600 text-xs mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span>Turma: <span className="font-medium text-slate-800">{b.classGroup}</span></span>
                              {b.educationLevel && <EducationBadge level={b.educationLevel} size="xs" />}
                              {b.subject && <span className="text-slate-500">• {b.subject}</span>}
                            </div>
                            {b.recurrenceGroupId && (
                              <div className="text-[10px] text-indigo-700 font-bold mt-0.5 flex items-center gap-1">
                                <Repeat className="w-3 h-3" />
                                <span>Recorrência ({b.recurrenceIndex && b.recurrenceTotalCount ? `${b.recurrenceIndex}/${b.recurrenceTotalCount}` : 'Série'})</span>
                              </div>
                            )}
                            {b.requestedMachines && (
                              <div className="text-[11px] text-blue-700 font-semibold mt-0.5 flex items-center gap-1">
                                <span>💻 {b.requestedMachines} máquinas solicitadas</span>
                              </div>
                            )}
                          </td>

                          {/* Data & Horário */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-medium text-slate-900">
                              {formatDateBR(b.date)}
                            </div>
                            <div className="text-slate-700 text-[11px] flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-slate-600" />
                              <span>{b.timeSlot}</span>
                            </div>
                          </td>

                          {/* Sala / Local */}
                          <td className="py-3.5 px-4">
                            {b.isMobileLab ? (
                              <div className="bg-amber-100 text-amber-950 px-2.5 py-1 rounded-lg border border-amber-300 inline-block font-bold text-xs">
                                🚚 {b.roomNumber || 'Sala não especificada'}
                              </div>
                            ) : (
                              <span className="text-slate-700 text-xs">
                                Prédio dos Labs (Fixo)
                              </span>
                            )}
                            {b.notes && (
                              <div className="text-[11px] text-slate-600 italic mt-1 line-clamp-1">
                                Obs: {b.notes}
                              </div>
                            )}
                          </td>

                          {/* Ações */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Botão de WhatsApp */}
                              <button
                                id={`send-whatsapp-btn-${b.id}`}
                                onClick={() => handleOpenWhatsAppModal(b)}
                                title="Encaminhar confirmação via WhatsApp"
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                                  b.whatsappSent
                                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                                }`}
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>{b.whatsappSent ? 'Reenviar WhatsApp' : 'Enviar WhatsApp'}</span>
                              </button>

                              {/* Aprovar rápido */}
                              {isPending && (
                                <button
                                  id={`approve-btn-${b.id}`}
                                  onClick={() => handleStatusChange(b.id, 'confirmed')}
                                  title="Aprovar agendamento"
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              )}

                              {/* Recusar */}
                              {isPending && (
                                <button
                                  id={`reject-btn-${b.id}`}
                                  onClick={() => handleStatusChange(b.id, 'rejected')}
                                  title="Recusar agendamento"
                                  className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}

                              {/* Excluir */}
                              <button
                                id={`delete-btn-${b.id}`}
                                onClick={() => handleDelete(b.id)}
                                title="Excluir do histórico"
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Grade visual de horários de todos os laboratórios por dia
 */
const ScheduleMatrixView: React.FC<{
  bookings: Booking[];
  labs?: Lab[];
  onOpenWhatsApp: (b: Booking) => void;
}> = ({ bookings, labs = LAB_LIST, onOpenWhatsApp }) => {
  const [matrixDate, setMatrixDate] = useState(new Date().toISOString().split('T')[0]);

  const activeDayBookings = bookings.filter(
    (b) => b.date === matrixDate && b.status !== 'cancelled' && b.status !== 'rejected',
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-bold text-slate-900 text-base">
            Ocupação Geral dos {labs.length} Laboratórios
          </h3>
          <p className="text-xs text-slate-500">
            Visão consolidada por aula/horário para a data selecionada.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700">Data:</span>
          <input
            type="date"
            value={matrixDate}
            onChange={(e) => setMatrixDate(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-medium"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600 uppercase text-[11px] font-bold">
              <th className="p-3 border border-slate-200 sticky left-0 bg-slate-50 z-10 w-44">
                Laboratório
              </th>
              {TIME_SLOTS.slice(0, 9).map((slot) => (
                <th key={slot.id} className="p-2.5 border border-slate-200 text-center min-w-[130px]">
                  <div>{slot.label.split('(')[0]}</div>
                  <div className="text-[10px] font-normal text-slate-400">
                    {slot.startTime} - {slot.endTime}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labs.map((lab) => {
              return (
                <tr key={lab.id} className="hover:bg-slate-50/50">
                  <td className="p-3 border border-slate-200 sticky left-0 bg-white z-10 font-medium">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-slate-900">{lab.name}</span>
                      <span className="text-[10px] text-slate-500">{lab.capacity} máq.</span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {lab.isMobile ? '🚚 Móvel' : '🖥️ Fixo'}
                    </div>
                  </td>

                  {TIME_SLOTS.slice(0, 9).map((slot) => {
                    const booking = activeDayBookings.find(
                      (b) => b.labId === lab.id && b.timeSlot === slot.label,
                    );

                    if (!booking) {
                      return (
                        <td
                          key={slot.id}
                          className="p-2 border border-slate-200 text-center text-[10px] text-slate-300 bg-slate-50/20"
                        >
                          Livre
                        </td>
                      );
                    }

                    const isConfirmed = booking.status === 'confirmed';

                    return (
                      <td
                        key={slot.id}
                        className={`p-2 border border-slate-200 text-left text-[11px] transition-colors ${
                          isConfirmed
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                            : 'bg-amber-50 border-amber-200 text-amber-950'
                        }`}
                      >
                        <div className="font-bold truncate">{booking.teacherName}</div>
                        <div className="text-[10px] truncate text-slate-600 flex items-center gap-1 justify-between">
                          <span className="truncate">{booking.classGroup}</span>
                          {booking.educationLevel && <EducationBadge level={booking.educationLevel} size="xs" />}
                        </div>
                        {booking.isMobileLab && (
                          <div className="text-[10px] font-bold text-rose-700 truncate">
                            🚚 {booking.roomNumber}
                          </div>
                        )}
                        <button
                          onClick={() => onOpenWhatsApp(booking)}
                          className="mt-1 text-[10px] font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                        >
                          <MessageSquare className="w-2.5 h-2.5" />
                          <span>WhatsApp</span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
