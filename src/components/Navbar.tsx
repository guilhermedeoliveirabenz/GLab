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
  Edit2,
  Building2,
  Check,
  RotateCcw,
  X,
} from 'lucide-react';
import { isSoundEnabled, toggleSound, playNotificationPingSound } from '../lib/soundUtils';
import { PWAInstallButton } from './PWAInstallButton';
import {
  subscribeToInstitutionSubtitle,
  updateInstitutionSubtitle,
  DEFAULT_INSTITUTION_SUBTITLE,
} from '../lib/settingsService';

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

  // Subtítulo da instituição (padrão CTI/UNASP-HT com suporte a alteração pelo administrador)
  const [institutionSubtitle, setInstitutionSubtitle] = useState<string>(DEFAULT_INSTITUTION_SUBTITLE);
  const [isEditingSubtitleModal, setIsEditingSubtitleModal] = useState(false);
  const [newSubtitleInput, setNewSubtitleInput] = useState('');
  const [savingSubtitle, setSavingSubtitle] = useState(false);
  const [saveSubtitleSuccess, setSaveSubtitleSuccess] = useState(false);

  useEffect(() => {
    const unsub = subscribeToInstitutionSubtitle((subtitle) => {
      setInstitutionSubtitle(subtitle);
    });
    return () => unsub();
  }, []);

  const handleOpenEditSubtitle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNewSubtitleInput(institutionSubtitle);
    setSaveSubtitleSuccess(false);
    setIsEditingSubtitleModal(true);
  };

  const handleSaveSubtitle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSubtitle(true);
    try {
      await updateInstitutionSubtitle(newSubtitleInput);
      setSaveSubtitleSuccess(true);
      setTimeout(() => {
        setIsEditingSubtitleModal(false);
        setSaveSubtitleSuccess(false);
      }, 1000);
    } catch (err) {
      console.error('Erro ao salvar subtítulo:', err);
    } finally {
      setSavingSubtitle(false);
    }
  };

  const handleRestoreDefaultSubtitle = async () => {
    setNewSubtitleInput(DEFAULT_INSTITUTION_SUBTITLE);
  };

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
              <div className="flex items-center gap-1.5">
                <p
                  id="navbar-institution-subtitle"
                  className="text-[10px] sm:text-[11px] font-semibold text-slate-600 block tracking-tight truncate max-w-[130px] sm:max-w-[220px]"
                  title={`Instituição: ${institutionSubtitle}`}
                >
                  {institutionSubtitle}
                </p>
                {isAdmin && (
                  <button
                    id="edit-subtitle-header-btn"
                    type="button"
                    title="Alterar identificação abaixo do nome GestLab"
                    onClick={handleOpenEditSubtitle}
                    className="p-0.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </button>
                )}
              </div>
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

            {isAdmin && (
              <button
                id="nav-tab-admin"
                onClick={() => onSelectTab('admin')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-800 bg-slate-100 hover:bg-slate-200'
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
            )}
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

        {/* Mobile Top Subtitle & Quick Status Bar */}
        <div className="md:hidden flex items-center justify-between border-t border-slate-100 py-1.5 px-0.5 text-[11px] text-slate-500">
          <span className="truncate max-w-[200px] font-medium">
            {institutionSubtitle}
          </span>
          {isAdmin ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              <Shield className="w-3 h-3 text-amber-600" />
              {user?.role === 'technician' ? 'Técnico' : 'Admin'}
            </span>
          ) : teacherSession ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 truncate max-w-[140px]">
              <UserCheck className="w-3 h-3 text-blue-600" />
              {teacherSession.name ? teacherSession.name.split(' ')[0] : 'Professor'}
            </span>
          ) : null}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BARRA DE NAVEGAÇÃO INFERIOR DOCKADA PARA DISPOSITIVOS MÓVEIS (MD:HIDDEN) */}
      {/* ========================================================================= */}
      <nav
        id="mobile-bottom-nav-bar"
        aria-label="Navegação móvel"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe shadow-lg px-1 pt-1.5 flex items-center justify-around"
      >
        <button
          type="button"
          id="mobile-nav-tab-calendar"
          onClick={() => onSelectTab('calendar')}
          className={`flex-1 min-h-[48px] py-1 px-1 flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer select-none active:scale-95 ${
            activeTab === 'calendar'
              ? 'text-blue-700 font-bold bg-blue-50/70'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarDays className={`w-5 h-5 mb-0.5 ${activeTab === 'calendar' ? 'text-blue-600' : 'text-slate-500'}`} />
          <span className="text-[10px] tracking-tight leading-none">Calendário</span>
        </button>

        <button
          type="button"
          id="mobile-nav-tab-booking"
          onClick={() => onSelectTab('booking')}
          className={`flex-1 min-h-[48px] py-1 px-1 flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer select-none active:scale-95 ${
            activeTab === 'booking'
              ? 'text-blue-700 font-bold bg-blue-50/70'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className={`w-5 h-5 mb-0.5 ${activeTab === 'booking' ? 'text-blue-600' : 'text-slate-500'}`} />
          <span className="text-[10px] tracking-tight leading-none">Reservar</span>
        </button>

        <button
          type="button"
          id="mobile-nav-tab-labs"
          onClick={() => onSelectTab('labs')}
          className={`flex-1 min-h-[48px] py-1 px-1 flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer select-none active:scale-95 ${
            activeTab === 'labs'
              ? 'text-blue-700 font-bold bg-blue-50/70'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Monitor className={`w-5 h-5 mb-0.5 ${activeTab === 'labs' ? 'text-blue-600' : 'text-slate-500'}`} />
          <span className="text-[10px] tracking-tight leading-none">Labs</span>
        </button>

        <button
          type="button"
          id="mobile-nav-tab-my-bookings"
          onClick={() => onSelectTab('my_bookings')}
          className={`flex-1 min-h-[48px] py-1 px-1 flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer select-none active:scale-95 ${
            activeTab === 'my_bookings'
              ? 'text-blue-700 font-bold bg-blue-50/70'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className={`w-5 h-5 mb-0.5 ${activeTab === 'my_bookings' ? 'text-blue-600' : 'text-slate-500'}`} />
          <span className="text-[10px] tracking-tight leading-none">Pedidos</span>
        </button>

        {isAdmin ? (
          <button
            type="button"
            id="mobile-nav-tab-admin"
            onClick={() => onSelectTab('admin')}
            className={`flex-1 min-h-[48px] py-1 px-1 flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer select-none relative active:scale-95 ${
              activeTab === 'admin'
                ? 'text-slate-900 font-bold bg-slate-100'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Shield className={`w-5 h-5 mb-0.5 ${activeTab === 'admin' ? 'text-amber-500' : 'text-slate-500'}`} />
            <span className="text-[10px] tracking-tight leading-none">
              {user?.role === 'technician' ? 'Técnico' : 'Admin'}
            </span>
            {pendingCount > 0 && (
              <span className="absolute top-1 right-2.5 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                {pendingCount}
              </span>
            )}
          </button>
        ) : (
          <button
            type="button"
            id="mobile-nav-tab-login"
            onClick={onOpenLoginModal}
            className="flex-1 min-h-[48px] py-1 px-1 flex flex-col items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 transition-all cursor-pointer select-none active:scale-95"
          >
            <LogIn className="w-5 h-5 mb-0.5 text-slate-500" />
            <span className="text-[10px] tracking-tight leading-none">Acesso</span>
          </button>
        )}
      </nav>

      {/* Modal para Administrador editar o texto abaixo de GestLab */}
      {isEditingSubtitleModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div
            id="modal-edit-institution-subtitle"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Identificação da Instituição
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Exibido diretamente abaixo do nome GestLab
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingSubtitleModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {saveSubtitleSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-fade-in">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Identificação atualizada com sucesso!</span>
              </div>
            )}

            <form onSubmit={handleSaveSubtitle} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Texto do Subtítulo *
                </label>
                <input
                  id="institution-subtitle-input"
                  type="text"
                  required
                  placeholder="Ex: CTI/UNASP-HT"
                  value={newSubtitleInput}
                  onChange={(e) => setNewSubtitleInput(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Padrão do sistema: <strong>CTI/UNASP-HT</strong>
                </p>
              </div>

              {/* Prévia visual */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Prévia no Cabeçalho:
                </span>
                <div className="flex items-center gap-2 pt-1">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                    <Monitor className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-900 text-sm tracking-tight leading-none block">
                      GestLab
                    </span>
                    <span className="text-[11px] font-semibold text-slate-600 block leading-tight">
                      {newSubtitleInput.trim() || DEFAULT_INSTITUTION_SUBTITLE}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleRestoreDefaultSubtitle}
                  className="px-3 py-2 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar Padrão</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingSubtitleModal(false)}
                    className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    id="save-institution-subtitle-btn"
                    type="submit"
                    disabled={savingSubtitle}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{savingSubtitle ? 'Salvando...' : 'Salvar Alteração'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
