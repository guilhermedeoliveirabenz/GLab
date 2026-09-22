import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/authContext';
import { Booking, Lab, LAB_LIST, ShiftType } from './types';
import { subscribeToBookings, deduplicateBookings, isSelfCreatedBooking, markBookingAsSelfCreated } from './lib/bookingService';
import { subscribeToLabs } from './lib/labService';
import { subscribeToEmailSettings } from './lib/settingsService';
import { Navbar, ActiveTab } from './components/Navbar';
import { LabGrid } from './components/LabGrid';
import { BookingForm } from './components/BookingForm';
import { AdminPanel } from './components/AdminPanel';
import { TeacherMyBookings } from './components/TeacherMyBookings';
import { AdminLoginModal } from './components/AdminLoginModal';
import { BookingCalendar } from './components/BookingCalendar';
import { BatchImportModal } from './components/BatchImportModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { playNewBookingAlertSound } from './lib/soundUtils';
import {
  Monitor,
  Calendar,
  Truck,
  MessageSquare,
  Shield,
  Sparkles,
  CheckCircle2,
  Lock,
  CalendarDays,
  Bell,
  X,
  FileSpreadsheet,
} from 'lucide-react';

function AppContent() {
  const { isAdmin, user, teacherSession } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [labs, setLabs] = useState<Lab[]>(LAB_LIST);
  const [activeTab, setActiveTab] = useState<ActiveTab>('calendar');
  const [preselectedLabId, setPreselectedLabId] = useState<string>('');
  const [preselectedDate, setPreselectedDate] = useState<string>('');
  const [preselectedShift, setPreselectedShift] = useState<ShiftType | undefined>();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isBatchImportOpen, setIsBatchImportOpen] = useState(false);
  const [latestNewBookingAlert, setLatestNewBookingAlert] = useState<Booking | null>(null);

  const isInitialLoadRef = React.useRef(true);
  const prevBookingsRef = React.useRef<Booking[]>([]);
  const teacherSessionRef = React.useRef(teacherSession);

  // Mantém a referência da sessão do professor atualizada para uso nas callbacks
  useEffect(() => {
    teacherSessionRef.current = teacherSession;
  }, [teacherSession]);

  // Inscrição em tempo real no Firestore para agendamentos e laboratórios
  useEffect(() => {
    const unsubBookings = subscribeToBookings((rawData) => {
      const data = deduplicateBookings(rawData);
      // Se não for a carga inicial e houver novos agendamentos criados, dispara alerta
      if (!isInitialLoadRef.current) {
        const prevIds = new Set(prevBookingsRef.current.map((b) => b.id));
        const newArrivals = data.filter((b) => {
          if (prevIds.has(b.id)) return false;
          if (b.status !== 'pending') return false;

          // REGRA MANDATÓRIA: Para quem fez o agendamento, esta mensagem NUNCA deve aparecer
          // 1. Se o agendamento foi registrado/submetido neste navegador/sessão
          if (isSelfCreatedBooking(b.id)) {
            return false;
          }

          // 2. Se a sessão de professor ativa for o mesmo autor do agendamento (telefone ou nome)
          const currentTeacher = teacherSessionRef.current;
          if (currentTeacher) {
            const cleanBookingPhone = (b.whatsapp || '').replace(/\D/g, '');
            const cleanTeacherPhone = (currentTeacher.phone || '').replace(/\D/g, '');
            if (cleanTeacherPhone && cleanBookingPhone && cleanTeacherPhone === cleanBookingPhone) {
              return false;
            }
            if (
              currentTeacher.name &&
              b.teacherName &&
              b.teacherName.trim().toLowerCase() === currentTeacher.name.trim().toLowerCase()
            ) {
              return false;
            }
          }

          return true;
        });

        if (newArrivals.length > 0) {
          const newest = newArrivals[0];
          playNewBookingAlertSound();
          setLatestNewBookingAlert(newest);

          // Disparo de notificação nativa do sistema/navegador se autorizada
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('🔔 GestLab: Novo Agendamento de Laboratório', {
                body: `Prof. ${newest.teacherName} solicitou o ${newest.labName} para ${newest.date} (${newest.timeSlot})`,
                icon: '/icon.svg',
              });
            } catch (e) {
              console.warn('Erro ao disparar Web Notification:', e);
            }
          }
        }
      } else {
        isInitialLoadRef.current = false;
      }
      prevBookingsRef.current = data;
      setBookings(data);
    });
    const unsubLabs = subscribeToLabs((data) => {
      setLabs(data);
    });
    const unsubEmailSettings = subscribeToEmailSettings(() => {
      // Sincroniza em tempo real as configurações de e-mail e lista de destinatários em cache
    });
    return () => {
      unsubBookings();
      unsubLabs();
      unsubEmailSettings();
    };
  }, []);

  // O painel de admin só deve aparecer para usuário admin ou técnico logado
  useEffect(() => {
    if (activeTab === 'admin' && !isAdmin) {
      setActiveTab('calendar');
    }
  }, [activeTab, isAdmin]);

  const pendingCount = bookings.filter((b) => b.status === 'pending').length;

  const handleSelectLabToBook = (labId: string) => {
    const targetLab = labs.find((l) => l.id === labId);
    if (!isAdmin && targetLab && targetLab.visibleForBooking === false) {
      return;
    }
    setPreselectedLabId(labId);
    setPreselectedDate('');
    setPreselectedShift(undefined);
    setActiveTab('booking');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenBooking = () => {
    setPreselectedLabId('');
    setPreselectedDate('');
    setPreselectedShift(undefined);
    setActiveTab('booking');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBookingCreated = (newBooking: Booking) => {
    markBookingAsSelfCreated(newBooking.id);
    // Garante que qualquer alerta aberto seja fechado caso corresponda ao novo agendamento
    setLatestNewBookingAlert((prev) => (prev?.id === newBooking.id ? null : prev));
  };

  // Auto-dispensa do alerta flutuante após 10 segundos
  useEffect(() => {
    if (latestNewBookingAlert) {
      const timer = setTimeout(() => {
        setLatestNewBookingAlert(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [latestNewBookingAlert]);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col antialiased">
      {/* Navbar com Autenticação e Tabs */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'admin' && !isAdmin) {
            setIsLoginModalOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        pendingCount={pendingCount}
      />

      {/* Indicador de Status Offline/Online PWA */}
      <OfflineIndicator />

      {/* Hero / Quick Context Header */}
      <section className="bg-white border-b border-slate-200 py-3.5 sm:py-6 px-3 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
          <div>
            {isAdmin && (
              <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  <Shield className="w-3 h-3 text-amber-600" />
                  Modo Administrador Ativo
                </span>
              </div>
            )}
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
              Gestão de Laboratórios de Informática
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5 sm:mt-1 max-w-3xl line-clamp-2 sm:line-clamp-none">
              Agendamento de laboratórios fixos e carrinhos móveis com indicação de sala e envio instantâneo de confirmação pelo WhatsApp do professor.
            </p>
          </div>

          {/* Quick Action CTA */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {activeTab !== 'booking' && (
              <button
                id="hero-new-booking-btn"
                onClick={handleOpenBooking}
                className="flex-1 sm:flex-initial px-3.5 py-2 sm:px-4 sm:py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer min-h-[40px]"
              >
                <Calendar className="w-4 h-4" />
                <span>+ Fazer Agendamento</span>
              </button>
            )}

            {isAdmin && (
              <button
                id="hero-admin-panel-btn"
                onClick={() => setActiveTab('admin')}
                className="flex-1 sm:flex-initial px-3.5 py-2 sm:px-4 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer min-h-[40px]"
              >
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">{user?.role === 'technician' ? 'Painel do Técnico' : 'Painel Administrativo'}</span>
                <span className="sm:hidden">Painel</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Container com espaçamento otimizado para telas pequenas e barra de navegação inferior */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2 sm:px-6 lg:px-8 py-3.5 sm:py-8 pb-24 md:pb-8">
        {activeTab === 'labs' && (
          <LabGrid
            bookings={bookings}
            labs={labs}
            isAdmin={isAdmin}
            onSelectLabToBook={handleSelectLabToBook}
          />
        )}

        {activeTab === 'booking' && (
          <BookingForm
            existingBookings={bookings}
            labs={labs}
            preselectedLabId={preselectedLabId}
            preselectedDate={preselectedDate}
            preselectedShift={preselectedShift}
            onBookingCreated={handleBookingCreated}
          />
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-3 sm:space-y-4">
            <div className="hidden sm:flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-blue-600" />
                  <span>Calendário Geral de Agendamentos dos Laboratórios</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Consulte a disponibilidade de todos os {labs.length} laboratórios e carrinhos por dia, semana ou mês
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    id="calendar-top-batch-import-btn"
                    type="button"
                    onClick={() => setIsBatchImportOpen(true)}
                    className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    title="Subir agendamento por lote a partir de planilha Excel ou grade semanal (Acesso TI & Admin)"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Importar por Lote</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleOpenBooking}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>+ Fazer Agendamento</span>
                </button>
              </div>
            </div>

            <BookingCalendar
              bookings={bookings}
              labs={labs}
              onOpenBatchImport={isAdmin ? () => setIsBatchImportOpen(true) : undefined}
              onRequestNewBooking={(date, shift, labId) => {
                setPreselectedDate(date);
                setPreselectedShift(shift);
                setPreselectedLabId(labId && labId !== 'all' ? labId : '');
                setActiveTab('booking');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}

        {activeTab === 'my_bookings' && (
          <TeacherMyBookings
            bookings={bookings}
            onNewBookingClick={handleOpenBooking}
          />
        )}

        {activeTab === 'admin' && isAdmin && (
          <AdminPanel bookings={bookings} labs={labs} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 text-center text-xs text-slate-600">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            © {new Date().getFullYear()} Sistema Escolar de Gestão de Laboratórios de Informática - CTI/UNASP-HT
          </p>
          <div className="flex items-center gap-4 text-slate-600">
            <span>{labs.length} Laboratórios Registrados</span>
            <span>•</span>
            <span>{labs.reduce((acc, l) => acc + (l.capacity || 0), 0)} Máquinas Totais</span>
          </div>
        </div>
      </footer>

      {/* Alerta Flutuante em Tempo Real para Técnicos/Administradores (não exibido para quem realizou o agendamento) */}
      {latestNewBookingAlert && !isSelfCreatedBooking(latestNewBookingAlert.id) && (
        <div
          id="realtime-new-booking-toast"
          className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 animate-slide-up flex items-start gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
            <Bell className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-bold text-sm text-white">Novo Agendamento Recebido!</h4>
              <button
                type="button"
                onClick={() => setLatestNewBookingAlert(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300 mt-1 truncate">
              <strong className="text-amber-300">{latestNewBookingAlert.teacherName}</strong> solicitou{' '}
              <strong className="text-white">{latestNewBookingAlert.labName}</strong>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              📅 {latestNewBookingAlert.date} • ⏰ {latestNewBookingAlert.timeSlot} (Turma: {latestNewBookingAlert.classGroup})
            </p>
            <div className="mt-2.5 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setLatestNewBookingAlert(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Importação de Agendamentos por Lote (Exclusivo TI/Admin) */}
      <BatchImportModal
        isOpen={isBatchImportOpen}
        onClose={() => setIsBatchImportOpen(false)}
        labs={labs}
        existingBookings={bookings}
        onOpenLogin={() => setIsLoginModalOpen(true)}
      />

      {/* Modal de Login Admin */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => {
          setActiveTab('admin');
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
