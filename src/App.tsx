import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/authContext';
import { Booking, Lab, LAB_LIST } from './types';
import { subscribeToBookings } from './lib/bookingService';
import { subscribeToLabs } from './lib/labService';
import { Navbar, ActiveTab } from './components/Navbar';
import { LabGrid } from './components/LabGrid';
import { BookingForm } from './components/BookingForm';
import { AdminPanel } from './components/AdminPanel';
import { TeacherMyBookings } from './components/TeacherMyBookings';
import { AdminLoginModal } from './components/AdminLoginModal';
import { BookingCalendar } from './components/BookingCalendar';
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
} from 'lucide-react';

function AppContent() {
  const { isAdmin } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [labs, setLabs] = useState<Lab[]>(LAB_LIST);
  const [activeTab, setActiveTab] = useState<ActiveTab>('calendar');
  const [preselectedLabId, setPreselectedLabId] = useState<string>('lab-1');
  const [preselectedDate, setPreselectedDate] = useState<string>('');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [latestNewBookingAlert, setLatestNewBookingAlert] = useState<Booking | null>(null);

  const isInitialLoadRef = React.useRef(true);
  const prevBookingsRef = React.useRef<Booking[]>([]);

  // Inscrição em tempo real no Firestore para agendamentos e laboratórios
  useEffect(() => {
    const unsubBookings = subscribeToBookings((data) => {
      // Se não for a carga inicial e houver novos agendamentos criados, dispara alerta
      if (!isInitialLoadRef.current) {
        const prevIds = new Set(prevBookingsRef.current.map((b) => b.id));
        const newArrivals = data.filter((b) => !prevIds.has(b.id) && b.status === 'pending');

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
    return () => {
      unsubBookings();
      unsubLabs();
    };
  }, []);

  const pendingCount = bookings.filter((b) => b.status === 'pending').length;

  const handleSelectLabToBook = (labId: string) => {
    setPreselectedLabId(labId);
    setActiveTab('booking');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBookingCreated = (newBooking: Booking) => {
    // Mantém no histórico e pode redirecionar para a visualização
  };

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
      <section className="bg-white border-b border-slate-200 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                <Sparkles className="w-3 h-3 text-blue-600" />
                Sistema Integrado ao Firebase Firestore
              </span>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  <Shield className="w-3 h-3 text-amber-600" />
                  Modo Administrador Ativo
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Gestão de Laboratórios de Informática
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
              Agendamento de 8 laboratórios fixos e 4 carrinhos móveis com indicação obrigatória de
              sala e envio instantâneo de confirmação pelo WhatsApp do professor.
            </p>
          </div>

          {/* Quick Action CTA */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {activeTab !== 'booking' && (
              <button
                id="hero-new-booking-btn"
                onClick={() => {
                  setActiveTab('booking');
                  setPreselectedLabId('lab-1');
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>+ Fazer Agendamento</span>
              </button>
            )}

            {!isAdmin && (
              <button
                id="hero-admin-access-btn"
                onClick={() => setIsLoginModalOpen(true)}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Área do Administrador</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'labs' && (
          <LabGrid
            bookings={bookings}
            labs={labs}
            onSelectLabToBook={handleSelectLabToBook}
          />
        )}

        {activeTab === 'booking' && (
          <BookingForm
            existingBookings={bookings}
            labs={labs}
            preselectedLabId={preselectedLabId}
            preselectedDate={preselectedDate}
            onBookingCreated={handleBookingCreated}
          />
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-blue-600" />
                  <span>Calendário Geral de Agendamentos dos Laboratórios</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Consulte a disponibilidade de todos os 12 laboratórios e carrinhos por dia, semana ou mês
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('booking');
                  setPreselectedLabId('lab-1');
                }}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>+ Fazer Agendamento</span>
              </button>
            </div>

            <BookingCalendar
              bookings={bookings}
              onRequestNewBooking={(date) => {
                setPreselectedDate(date);
                setActiveTab('booking');
              }}
            />
          </div>
        )}

        {activeTab === 'my_bookings' && (
          <TeacherMyBookings
            bookings={bookings}
            onNewBookingClick={() => {
              setActiveTab('booking');
              setPreselectedLabId('lab-1');
            }}
          />
        )}

        {activeTab === 'admin' && (
          isAdmin ? (
            <AdminPanel bookings={bookings} labs={labs} />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto shadow-xs">
              <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-200">
                <Lock className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Acesso Restrito ao Administrador</h2>
              <p className="text-xs text-slate-600 mb-6">
                Faça login para gerenciar o histórico de agendamentos, aprovar solicitações e encaminhar a confirmação por WhatsApp.
              </p>
              <button
                id="prompt-login-admin-btn"
                onClick={() => setIsLoginModalOpen(true)}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
              >
                Fazer Login como Administrador
              </button>
            </div>
          )
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 text-center text-xs text-slate-600">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            © {new Date().getFullYear()} Sistema Escolar de Gestão de Laboratórios de Informática - CTI/UNASP-HT
          </p>
          <div className="flex items-center gap-4 text-slate-600">
            <span>12 Laboratórios Registrados</span>
            <span>•</span>
            <span>478 Máquinas Totais</span>
            <span>•</span>
            <span>Sincronização Firebase Firestore</span>
          </div>
        </div>
      </footer>

      {/* Alerta Flutuante em Tempo Real para Técnicos/Administradores */}
      {latestNewBookingAlert && (
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
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('admin');
                  setLatestNewBookingAlert(null);
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                Ver no Painel
              </button>
              <button
                type="button"
                onClick={() => setLatestNewBookingAlert(null)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

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
