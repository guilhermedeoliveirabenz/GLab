import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/authContext';
import {
  Monitor,
  Calendar,
  Users,
  Shield,
  LogIn,
  LogOut,
  Truck,
  UserCheck,
  CalendarDays,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
} from 'lucide-react';
import { isSoundEnabled, toggleSound, playNotificationPingSound } from '../lib/soundUtils';
import { PWAInstallButton } from './PWAInstallButton';

export type ActiveTab = 'booking' | 'labs' | 'calendar' | 'my_bookings' | 'admin';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenLoginModal: () => void;
  pendingCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenLoginModal,
  pendingCount,
}) => {
  const { user, isAdmin, logout, teacherSession, logoutTeacher } = useAuth();
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPerm(Notification.permission);
    }
  }, []);

  const handleRequestNotif = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        setNotifPerm(res);
        if (res === 'granted') {
          new Notification('GestLab', {
            body: 'Notificações de agendamento ativadas com sucesso!',
            icon: '/icon.svg',
          });
        }
      } catch (err) {
        console.warn('Erro ao solicitar permissão de notificação:', err);
      }
    }
  };

  useEffect(() => {
    const handler = (e: CustomEvent<boolean>) => setSoundOn(e.detail);
    window.addEventListener('labgestao-sound-changed' as any, handler);
    return () => window.removeEventListener('labgestao-sound-changed' as any, handler);
  }, []);

  const handleToggleSound = () => {
    const newState = toggleSound();
    setSoundOn(newState);
    if (newState) {
      playNotificationPingSound();
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          {/* Logo & School Name */}
          <div
            id="app-brand-logo"
            onClick={() => onSelectTab('calendar')}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none shrink-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Monitor className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight">
                  GestLab
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 hidden sm:block">
                12 Labs • Notificações Sonoras & WhatsApp
              </p>
            </div>
          </div>

          {/* Nav Views - Desktop */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              id="nav-tab-calendar"
              onClick={() => onSelectTab('calendar')}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'calendar'
                  ? 'bg-blue-50 text-blue-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <CalendarDays className="w-4 h-4 text-blue-600" />
              <span>Calendário</span>
            </button>

            <button
              id="nav-tab-booking"
              onClick={() => onSelectTab('booking')}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'booking'
                  ? 'bg-blue-50 text-blue-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Solicitar Reserva</span>
            </button>

            <button
              id="nav-tab-labs"
              onClick={() => onSelectTab('labs')}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'labs'
                  ? 'bg-blue-50 text-blue-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>Laboratórios (12)</span>
            </button>

            <button
              id="nav-tab-my-bookings"
              onClick={() => onSelectTab('my_bookings')}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'my_bookings'
                  ? 'bg-blue-50 text-blue-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Meus Agendamentos</span>
            </button>

            <button
              id="nav-tab-admin"
              onClick={() => {
                if (isAdmin) {
                  onSelectTab('admin');
                } else {
                  onOpenLoginModal();
                }
              }}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : isAdmin
                    ? 'text-slate-800 bg-slate-100 hover:bg-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Shield className="w-4 h-4 text-amber-500" />
              <span>{user?.role === 'technician' ? 'Painel Técnico' : 'Painel Admin'}</span>
              {pendingCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
          </nav>

          {/* User Status, PWA Install & Sound Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* PWA Install Button */}
            <PWAInstallButton />

            {/* Sound Notification Toggle */}
            <button
              id="toggle-sound-btn"
              type="button"
              onClick={handleToggleSound}
              title={
                soundOn
                  ? 'Notificações sonoras ATIVADAS (clique para silenciar)'
                  : 'Notificações sonoras DESATIVADAS (clique para ativar)'
              }
              className={`p-2 rounded-xl transition-colors cursor-pointer border flex items-center gap-1 ${
                soundOn
                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                  : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
              }`}
            >
              {soundOn ? <Volume2 className="w-4 h-4 text-blue-600" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Desktop Notification Toggle (Web Notification API) */}
            {typeof window !== 'undefined' && 'Notification' in window && (
              <button
                id="toggle-desktop-notif-btn"
                type="button"
                onClick={handleRequestNotif}
                title={
                  notifPerm === 'granted'
                    ? 'Notificações no navegador ATIVADAS para novos agendamentos'
                    : 'Clique para permitir notificações de novos agendamentos na tela do computador'
                }
                className={`p-2 rounded-xl transition-colors cursor-pointer border flex items-center gap-1 ${
                  notifPerm === 'granted'
                    ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
                    : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {notifPerm === 'granted' ? (
                  <Bell className="w-4 h-4 text-amber-600" />
                ) : (
                  <BellOff className="w-4 h-4 text-slate-400" />
                )}
              </button>
            )}

            {teacherSession && !isAdmin && (
              <div className="hidden lg:flex items-center gap-2 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                <div className="flex flex-col text-left">
                  <span className="text-[11px] font-bold text-blue-950 truncate max-w-[120px]">
                    {teacherSession.name || 'Prof. ' + teacherSession.phone}
                  </span>
                  <span className="text-[9px] text-blue-700 font-mono">
                    {teacherSession.phone}
                  </span>
                </div>
                <button
                  id="navbar-logout-teacher-btn"
                  onClick={logoutTeacher}
                  title="Sair da sessão do professor"
                  className="ml-1 p-1 text-blue-700 hover:text-blue-950 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {isAdmin ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-900 truncate max-w-[140px]">
                    {user?.name}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-medium">
                    ● {user?.role === 'technician' ? 'Técnico de TI' : 'Admin'} Conectado
                  </span>
                </div>
                <button
                  id="admin-logout-btn"
                  onClick={logout}
                  title="Sair da conta"
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                id="open-admin-login-nav-btn"
                onClick={onOpenLoginModal}
                className="px-2.5 sm:px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Acesso Técnico/Admin</span>
                <span className="sm:hidden">Entrar</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Row - Responsivo com scroll horizontal suave */}
        <div className="md:hidden flex items-center justify-between border-t border-slate-100 py-2 overflow-x-auto gap-1 text-xs">
          <button
            onClick={() => onSelectTab('calendar')}
            className={`px-2.5 py-1.5 rounded-lg shrink-0 font-medium ${
              activeTab === 'calendar' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600'
            }`}
          >
            📅 Calendário
          </button>
          <button
            onClick={() => onSelectTab('booking')}
            className={`px-2.5 py-1.5 rounded-lg shrink-0 font-medium ${
              activeTab === 'booking' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600'
            }`}
          >
            + Reservar
          </button>
          <button
            onClick={() => onSelectTab('labs')}
            className={`px-2.5 py-1.5 rounded-lg shrink-0 font-medium ${
              activeTab === 'labs' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600'
            }`}
          >
            Labs (12)
          </button>
          <button
            onClick={() => onSelectTab('my_bookings')}
            className={`px-2.5 py-1.5 rounded-lg shrink-0 font-medium ${
              activeTab === 'my_bookings' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600'
            }`}
          >
            Meus Pedidos
          </button>
          <button
            onClick={() => {
              if (isAdmin) {
                onSelectTab('admin');
              } else {
                onOpenLoginModal();
              }
            }}
            className={`px-2.5 py-1.5 rounded-lg shrink-0 flex items-center gap-1 font-medium ${
              activeTab === 'admin'
                ? 'bg-slate-900 text-white font-bold'
                : 'text-slate-700 bg-slate-100'
            }`}
          >
            <Shield className="w-3 h-3 text-amber-500" />
            <span>Admin</span>
            {pendingCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
