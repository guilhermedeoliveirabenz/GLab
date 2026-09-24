import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/authContext';
import {
  ShieldCheck,
  KeyRound,
  Lock,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  ShieldAlert,
  Fingerprint,
  Building2,
  RotateCcw,
  Check,
  Monitor,
  Mail,
  Send,
  Bell,
  History,
  Users,
  MailCheck,
  Server,
  Radio,
  Zap,
  Sliders,
  Globe,
  HelpCircle,
  Plus,
  Trash2,
  AtSign,
  MailPlus,
  ExternalLink,
  CalendarDays,
  CalendarPlus,
} from 'lucide-react';
import {
  subscribeToInstitutionSubtitle,
  updateInstitutionSubtitle,
  DEFAULT_INSTITUTION_SUBTITLE,
  subscribeToEmailSettings,
  updateEmailSettings,
  DEFAULT_ADMIN_NOTIFICATION_EMAIL,
  DEFAULT_EMAIL_SETTINGS,
  DEFAULT_SMTP_CONFIG,
  subscribeToInitialTab,
  updateInitialTab,
  AVAILABLE_INITIAL_TABS,
  InitialViewTab,
  DEFAULT_INITIAL_TAB,
} from '../lib/settingsService';
import {
  sendTestNotificationEmail,
  subscribeToEmailLogs,
  testSmtpConnection,
  isValidEmail,
} from '../lib/emailService';
import { subscribeToTechnicians } from '../lib/technicianService';
import { EmailSettings, EmailLog, Technician, SmtpConfig } from '../types';

export const AdminSecurityPanel: React.FC = () => {
  const { user, isSuperAdmin, updateAdminPassword, lockoutStatus, logout } = useAuth();

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Subtítulo da Instituição (padrão CTI/UNASP-HT)
  const [subtitle, setSubtitle] = useState(DEFAULT_INSTITUTION_SUBTITLE);
  const [subtitleInput, setSubtitleInput] = useState(DEFAULT_INSTITUTION_SUBTITLE);
  const [savingSubtitle, setSavingSubtitle] = useState(false);
  const [subtitleSuccess, setSubtitleSuccess] = useState<string | null>(null);

  // Configurações da Aba / Visualização Inicial Padrão
  const [selectedInitialTab, setSelectedInitialTab] = useState<InitialViewTab>(DEFAULT_INITIAL_TAB);
  const [savingInitialTab, setSavingInitialTab] = useState(false);
  const [initialTabSuccess, setInitialTabSuccess] = useState<string | null>(null);

  // Configurações de Notificações por E-mail
  const [emailSettings, setEmailSettings] = useState<EmailSettings>(DEFAULT_EMAIL_SETTINGS);
  const [adminEmailInput, setAdminEmailInput] = useState(DEFAULT_ADMIN_NOTIFICATION_EMAIL);
  const [recipientEmailsList, setRecipientEmailsList] = useState<string[]>([DEFAULT_ADMIN_NOTIFICATION_EMAIL]);
  const [newRecipientInput, setNewRecipientInput] = useState('');
  const [recipientInputError, setRecipientInputError] = useState<string | null>(null);
  const [notifyAdmins, setNotifyAdmins] = useState(true);
  const [notifyTechs, setNotifyTechs] = useState(true);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [savingEmailSettings, setSavingEmailSettings] = useState(false);
  const [emailSettingsSuccess, setEmailSettingsSuccess] = useState<string | null>(null);
  const [emailSettingsError, setEmailSettingsError] = useState<string | null>(null);

  // Configurações do Servidor SMTP / SNMP
  const [smtpEnabled, setSmtpEnabled] = useState(true);
  const [smtpHost, setSmtpHost] = useState(DEFAULT_SMTP_CONFIG.host);
  const [smtpPort, setSmtpPort] = useState(DEFAULT_SMTP_CONFIG.port);
  const [smtpSecure, setSmtpSecure] = useState(DEFAULT_SMTP_CONFIG.secure);
  const [smtpUser, setSmtpUser] = useState(DEFAULT_SMTP_CONFIG.user);
  const [smtpPass, setSmtpPass] = useState(DEFAULT_SMTP_CONFIG.pass);
  const [smtpFromName, setSmtpFromName] = useState(DEFAULT_SMTP_CONFIG.fromName);
  const [smtpFromEmail, setSmtpFromEmail] = useState(DEFAULT_SMTP_CONFIG.fromEmail);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpDiagnostic, setSmtpDiagnostic] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);

  // Teste de envio
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailFeedback, setTestEmailFeedback] = useState<{ success: boolean; msg: string } | null>(null);

  // Destinatários e Logs
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);

  useEffect(() => {
    const unsubSubtitle = subscribeToInstitutionSubtitle((val) => {
      setSubtitle(val);
      setSubtitleInput(val);
    });

    const unsubEmailSettings = subscribeToEmailSettings((settings) => {
      setEmailSettings(settings);
      setAdminEmailInput(settings.adminNotificationEmail);
      if (settings.recipientEmails && Array.isArray(settings.recipientEmails) && settings.recipientEmails.length > 0) {
        setRecipientEmailsList(settings.recipientEmails);
      } else if (settings.adminNotificationEmail) {
        setRecipientEmailsList([settings.adminNotificationEmail]);
      }
      setNotifyAdmins(settings.notifyAllAdmins);
      setNotifyTechs(settings.notifyAssignedTechnicians);
      setEmailNotificationsEnabled(settings.enabled);
      if (settings.smtp) {
        setSmtpEnabled(settings.smtp.enabled !== undefined ? settings.smtp.enabled : true);
        setSmtpHost(settings.smtp.host || DEFAULT_SMTP_CONFIG.host);
        setSmtpPort(settings.smtp.port || DEFAULT_SMTP_CONFIG.port);
        setSmtpSecure(Boolean(settings.smtp.secure));
        setSmtpUser(settings.smtp.user || '');
        setSmtpPass(settings.smtp.pass || '');
        setSmtpFromName(settings.smtp.fromName || DEFAULT_SMTP_CONFIG.fromName);
        setSmtpFromEmail(settings.smtp.fromEmail || DEFAULT_SMTP_CONFIG.fromEmail);
      }
    });

    const unsubTechs = subscribeToTechnicians((list) => {
      setTechnicians(list);
    });

    const unsubLogs = subscribeToEmailLogs((logs) => {
      setEmailLogs(logs);
    });

    return () => {
      unsubSubtitle();
      unsubEmailSettings();
      unsubTechs();
      unsubLogs();
    };
  }, []);

  const handleAddRecipient = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setRecipientInputError(null);
    const emailToAdd = newRecipientInput.trim().toLowerCase();

    if (!emailToAdd) {
      setRecipientInputError('Digite um endereço de e-mail.');
      return;
    }

    if (!isValidEmail(emailToAdd)) {
      setRecipientInputError('Por favor, informe um e-mail válido (ex: contato@escola.edu.br).');
      return;
    }

    if (recipientEmailsList.some((em) => em.toLowerCase() === emailToAdd)) {
      setRecipientInputError('Este e-mail já está cadastrado na lista.');
      return;
    }

    const updated = [...recipientEmailsList, emailToAdd];
    setRecipientEmailsList(updated);
    setNewRecipientInput('');

    // Se o input de e-mail geral estiver vazio, sincroniza
    if (!adminEmailInput.trim()) {
      setAdminEmailInput(emailToAdd);
    }
  };

  const handleRemoveRecipient = (emailToRemove: string) => {
    const updated = recipientEmailsList.filter((em) => em.toLowerCase() !== emailToRemove.toLowerCase());
    setRecipientEmailsList(updated);
    if (adminEmailInput.toLowerCase() === emailToRemove.toLowerCase() && updated.length > 0) {
      setAdminEmailInput(updated[0]);
    }
  };

  const handleSaveEmailSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEmailSettings(true);
    setEmailSettingsSuccess(null);
    setEmailSettingsError(null);

    try {
      const sanitizedRecipients = Array.from(
        new Set(
          [
            ...recipientEmailsList,
            ...(adminEmailInput.trim() ? [adminEmailInput.trim().toLowerCase()] : []),
          ].filter(isValidEmail),
        ),
      );

      const primaryEmail = sanitizedRecipients[0] || adminEmailInput.trim() || DEFAULT_ADMIN_NOTIFICATION_EMAIL;

      const res = await updateEmailSettings({
        enabled: emailNotificationsEnabled,
        adminNotificationEmail: primaryEmail,
        recipientEmails: sanitizedRecipients.length > 0 ? sanitizedRecipients : [primaryEmail],
        notifyAllAdmins: notifyAdmins,
        notifyAssignedTechnicians: notifyTechs,
        smtp: {
          enabled: Boolean(smtpUser.trim() && smtpPass.trim()) || smtpEnabled,
          host: smtpHost.trim(),
          port: Number(smtpPort) || 587,
          secure: smtpSecure,
          user: smtpUser.trim(),
          pass: smtpPass.trim(),
          fromName: smtpFromName.trim() || 'GestLab Notificações',
          fromEmail: smtpFromEmail.trim() || smtpUser.trim() || 'notificacoes@escola.edu.br',
        },
      });

      if (res.success) {
        setEmailSettingsSuccess('Configurações de e-mail e lista de destinatários salvas com sucesso!');
        setTimeout(() => setEmailSettingsSuccess(null), 3500);
      } else {
        setEmailSettingsError(res.error || 'Falha ao salvar configurações de e-mail.');
      }
    } catch (err: any) {
      console.error('Erro ao atualizar configurações de e-mail:', err);
      setEmailSettingsError('Erro ao gravar configurações no servidor.');
    } finally {
      setSavingEmailSettings(false);
    }
  };

  const handleTestSmtpConnection = async () => {
    setTestingSmtp(true);
    setSmtpDiagnostic(null);
    try {
      const config: SmtpConfig = {
        enabled: smtpEnabled,
        host: smtpHost.trim() || 'smtp.gmail.com',
        port: Number(smtpPort) || 587,
        secure: smtpSecure,
        user: smtpUser.trim(),
        pass: smtpPass.trim(),
        fromName: smtpFromName.trim() || 'GestLab Notificações',
        fromEmail: smtpFromEmail.trim() || smtpUser.trim() || 'notificacoes@escola.edu.br',
      };
      // Só envia e-mail de teste se houver credenciais completas preenchidas; caso contrário testa o handshake de conectividade
      const hasAuth = Boolean(config.user && config.pass);
      const testEmail = hasAuth ? (adminEmailInput.trim() || recipientEmailsList[0] || undefined) : undefined;
      const result = await testSmtpConnection(config, testEmail);
      setSmtpDiagnostic({
        tested: true,
        success: result.success,
        message: result.message,
        details: result.response,
      });
    } catch (err: any) {
      setSmtpDiagnostic({
        tested: true,
        success: false,
        message: err.message || 'Falha ao conectar com o servidor SMTP.',
      });
    } finally {
      setTestingSmtp(false);
    }
  };

  const applyPresetGmail = () => {
    setSmtpHost('smtp.gmail.com');
    setSmtpPort(587);
    setSmtpSecure(false);
    setSmtpFromName('GestLab Notificações');
    if (!smtpUser && adminEmailInput.includes('@gmail.com')) {
      setSmtpUser(adminEmailInput);
      setSmtpFromEmail(adminEmailInput);
    }
  };

  const applyPresetOutlook = () => {
    setSmtpHost('smtp.office365.com');
    setSmtpPort(587);
    setSmtpSecure(false);
    setSmtpFromName('GestLab Notificações');
  };

  const applyPresetLocal = () => {
    setSmtpHost('localhost');
    setSmtpPort(25);
    setSmtpSecure(false);
    setSmtpFromName('GestLab CTI/UNASP');
    setSmtpFromEmail('notificacoes@unasp.edu.br');
  };

  const applyPresetSendGrid = () => {
    setSmtpHost('smtp.sendgrid.net');
    setSmtpPort(587);
    setSmtpSecure(false);
    setSmtpUser('apikey');
    setSmtpFromName('GestLab Notificações');
  };

  const handleSendTestEmail = async () => {
    setSendingTestEmail(true);
    setTestEmailFeedback(null);
    try {
      const activeSmtp: SmtpConfig = {
        enabled: smtpEnabled,
        host: smtpHost.trim() || 'smtp.gmail.com',
        port: Number(smtpPort) || 587,
        secure: smtpSecure,
        user: smtpUser.trim(),
        pass: smtpPass.trim(),
        fromName: smtpFromName.trim() || 'GestLab Notificações',
        fromEmail: smtpFromEmail.trim() || smtpUser.trim() || 'notificacoes@escola.edu.br',
      };

      if ((activeSmtp.host.includes('gmail') || activeSmtp.host.includes('google')) && (!activeSmtp.user || !activeSmtp.pass)) {
        setTestEmailFeedback({
          success: false,
          msg: 'Autenticação necessária (530): Para disparar e-mails via Gmail, preencha o Usuário e a Senha de Aplicativo (16 caracteres) nas configurações SMTP.',
        });
        setSendingTestEmail(false);
        return;
      }

      const target = recipientEmailsList[0] || adminEmailInput.trim() || undefined;
      const res = await sendTestNotificationEmail(target, activeSmtp);
      if (res.success) {
        setTestEmailFeedback({
          success: true,
          msg: res.message || `E-mail de teste disparado com sucesso via SMTP para: ${res.recipients.join(', ')}`,
        });
      } else {
        setTestEmailFeedback({
          success: false,
          msg: res.error || 'Não foi possível disparar o e-mail de teste.',
        });
      }
    } catch (err: any) {
      setTestEmailFeedback({
        success: false,
        msg: 'Erro inesperado ao disparar e-mail de teste.',
      });
    } finally {
      setSendingTestEmail(false);
      setTimeout(() => setTestEmailFeedback(null), 7000);
    }
  };

  const handleSaveSubtitle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSubtitle(true);
    setSubtitleSuccess(null);
    try {
      const res = await updateInstitutionSubtitle(subtitleInput);
      if (res.success) {
        setSubtitleSuccess('Informação da instituição atualizada com sucesso no cabeçalho do GestLab!');
      }
      setTimeout(() => setSubtitleSuccess(null), 3500);
    } catch (e) {
      console.error('Erro ao atualizar subtítulo:', e);
    } finally {
      setSavingSubtitle(false);
    }
  };

  const handleRestoreDefault = async () => {
    setSubtitleInput(DEFAULT_INSTITUTION_SUBTITLE);
    setSavingSubtitle(true);
    try {
      await updateInstitutionSubtitle(DEFAULT_INSTITUTION_SUBTITLE);
      setSubtitleSuccess('Padrão CTI/UNASP-HT restaurado com sucesso!');
      setTimeout(() => setSubtitleSuccess(null), 3500);
    } catch (e) {
      console.error('Erro ao restaurar padrão:', e);
    } finally {
      setSavingSubtitle(false);
    }
  };

  // Sincronização em tempo real da visualização inicial configurada
  useEffect(() => {
    const unsub = subscribeToInitialTab((tab) => {
      setSelectedInitialTab(tab);
    });
    return () => unsub();
  }, []);

  const handleSaveInitialTab = async (tab: InitialViewTab) => {
    setSelectedInitialTab(tab);
    setSavingInitialTab(true);
    setInitialTabSuccess(null);
    try {
      const res = await updateInitialTab(tab);
      if (res.success) {
        const option = AVAILABLE_INITIAL_TABS.find((t) => t.id === tab);
        setInitialTabSuccess(`Visualização inicial alterada com sucesso para "${option?.label || tab}"!`);
      }
      setTimeout(() => setInitialTabSuccess(null), 4000);
    } catch (e) {
      console.error('Erro ao atualizar aba inicial:', e);
    } finally {
      setSavingInitialTab(false);
    }
  };

  const calculateStrength = (pass: string) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  const strength = calculateStrength(newPass);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!currentPass) {
      setErrorMsg('Informe a senha atual para autorizar a alteração.');
      return;
    }

    if (newPass.length < 6) {
      setErrorMsg('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPass !== confirmPass) {
      setErrorMsg('A confirmação de senha não coincide com a nova senha.');
      return;
    }

    setLoading(true);
    try {
      const res = await updateAdminPassword(currentPass, newPass);
      if (res.success) {
        setSuccessMsg('Senha do Administrador Geral atualizada com sucesso! A nova credencial está criptografada.');
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
      } else {
        setErrorMsg(res.error || 'Erro ao atualizar senha. Verifique a senha atual informada.');
      }
    } catch {
      setErrorMsg('Ocorreu um erro ao atualizar a senha.');
    } finally {
      setLoading(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-3">
        <ShieldCheck className="w-10 h-10 text-amber-600 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">Acesso Restrito ao Administrador Geral</h3>
        <p className="text-xs text-slate-600 max-w-md mx-auto">
          Apenas Administradores podem gerenciar configurações de segurança, senhas e parâmetros institucionais.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Segurança & Controle de Acesso Administrativo
            </h2>
            <p className="text-xs text-slate-500">
              Gerenciamento de credenciais, blindagem contra força bruta e criptografia de senhas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Fingerprint className="w-3.5 h-3.5" />
            Proteção Criptográfica Ativa
          </span>
        </div>
      </div>

      {/* Grid: Status de Segurança e Alteração de Senha */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Alterar Senha do Administrador Geral */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <KeyRound className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Alterar Senha do Administrador Geral
            </h3>
          </div>

          {successMsg && (
            <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-start gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Senha Atual *
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  required
                  placeholder="Digite a senha atual"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nova Senha Forte *
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  placeholder="No mínimo 6 caracteres"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Indicador de Força da Senha */}
              {newPass && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        strength <= 2 ? 'w-1/3 bg-rose-500' : strength <= 3 ? 'w-2/3 bg-amber-500' : 'w-full bg-emerald-500'
                      }`}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Força:{' '}
                    {strength <= 2 ? (
                      <strong className="text-rose-600">Fraca</strong>
                    ) : strength <= 3 ? (
                      <strong className="text-amber-600">Média</strong>
                    ) : (
                      <strong className="text-emerald-600">Forte</strong>
                    )}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirmar Nova Senha *
              </label>
              <input
                type="password"
                required
                placeholder="Repita a nova senha"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <button
              id="save-new-admin-password-btn"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{loading ? 'Criptografando e Salvando...' : 'Salvar Nova Senha com Criptografia'}</span>
            </button>
          </form>
        </div>

        {/* Card 2: Status das Camadas de Blindagem */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 mb-2 pb-3 border-b border-slate-100">
            <ShieldAlert className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Camadas de Proteção Aplicadas
            </h3>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-900">Remoção de Credenciais Expostas</p>
                <p className="text-[11px] text-slate-500">
                  Todas as senhas em texto puro e botões de preenchimento automático foram expurgados da interface de login.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-900">Eliminação do Bypass de Demonstração</p>
                <p className="text-[11px] text-slate-500">
                  O botão que concedia privilégios de administrador sem senha foi permanentemente desativado.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-900">Proteção contra Ataques de Força Bruta</p>
                <p className="text-[11px] text-slate-500">
                  Tentativas incorretas consecutivas bloqueiam o acesso por 2 minutos (Status atual:{' '}
                  {lockoutStatus.isLocked ? (
                    <span className="text-amber-600 font-bold">Bloqueado temporariamente</span>
                  ) : (
                    <span className="text-emerald-600 font-bold">Monitorando ativamente</span>
                  )}
                  ).
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-900">Hashing Criptográfico de Senhas (SHA-256 + Salt)</p>
                <p className="text-[11px] text-slate-500">
                  As senhas de técnicos e do administrador nunca são gravadas em texto plano no banco de dados.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-900">Higienização de Dados em Tempo Real</p>
                <p className="text-[11px] text-slate-500">
                  Campos de senha e hash são removidos antes de qualquer objeto de técnico ser repassado ao navegador.
                </p>
              </div>
            </div>
          </div>

          {/* Sessão Conectada */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-slate-500" />
              <div className="text-xs">
                <span className="font-semibold text-slate-800">{user?.name}</span>
                <span className="text-slate-500 ml-1">({user?.email})</span>
              </div>
            </div>

            <button
              onClick={logout}
              className="px-3 py-1.5 text-xs text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors font-medium cursor-pointer"
            >
              Encerrar Sessão
            </button>
          </div>
        </div>
      </div>

      {/* Card 3: Identidade da Instituição & Subtítulo do GestLab */}
      <div id="admin-institution-identity-card" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Identidade da Instituição (Texto Abaixo de GestLab)
              </h3>
              <p className="text-xs text-slate-500">
                Altere a sigla ou nome da instituição exibido no cabeçalho do sistema. Valor padrão: <strong>CTI/UNASP-HT</strong>
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 self-start sm:self-auto">
            <Monitor className="w-3.5 h-3.5" />
            Cabeçalho Global
          </span>
        </div>

        {subtitleSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{subtitleSuccess}</span>
          </div>
        )}

        <form onSubmit={handleSaveSubtitle} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nome/Sigla da Instituição *
              </label>
              <input
                id="admin-institution-subtitle-input"
                type="text"
                required
                placeholder="Ex: CTI/UNASP-HT"
                value={subtitleInput}
                onChange={(e) => setSubtitleInput(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-semibold text-slate-800 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600"
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                Esta informação fica visível para todos os professores, técnicos e visitantes no topo da aplicação.
              </p>
            </div>

            {/* Prévia do Cabeçalho */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Visualização no Topo do GestLab:
              </span>
              <div className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                  <Monitor className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-extrabold text-slate-900 text-sm tracking-tight block leading-none">
                    GestLab
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600 block leading-tight mt-0.5">
                    {subtitleInput.trim() || DEFAULT_INSTITUTION_SUBTITLE}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <button
              id="admin-restore-default-subtitle-btn"
              type="button"
              onClick={handleRestoreDefault}
              disabled={savingSubtitle}
              className="px-3.5 py-2 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer font-medium disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Padrão (CTI/UNASP-HT)</span>
            </button>

            <button
              id="admin-save-institution-subtitle-btn"
              type="submit"
              disabled={savingSubtitle}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{savingSubtitle ? 'Salvando Alteração...' : 'Salvar Informação da Instituição'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Card: Visualização Inicial Padrão do Sistema (Aba de Abertura) */}
      <div
        id="admin-initial-tab-card"
        className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-xs">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900">
                  Visualização Inicial do Sistema (Aba Padrão de Abertura)
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Aba Ativa: {AVAILABLE_INITIAL_TABS.find((t) => t.id === selectedInitialTab)?.shortName || 'Calendário'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Escolha qual aba é exibida automaticamente quando professores, técnicos ou alunos entram no GestLab.
              </p>
            </div>
          </div>

          <span className="text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl self-start sm:self-auto">
            Sincronização em tempo real
          </span>
        </div>

        {initialTabSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{initialTabSuccess}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {AVAILABLE_INITIAL_TABS.map((tabOption) => {
            const isSelected = selectedInitialTab === tabOption.id;
            return (
              <div
                key={tabOption.id}
                id={`admin-select-initial-tab-${tabOption.id}`}
                onClick={() => handleSaveInitialTab(tabOption.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between relative text-left ${
                  isSelected
                    ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {tabOption.id === 'calendar' && <CalendarDays className="w-4 h-4" />}
                      {tabOption.id === 'booking' && <CalendarPlus className="w-4 h-4" />}
                      {tabOption.id === 'labs' && <Monitor className="w-4 h-4" />}
                      {tabOption.id === 'my_bookings' && <Users className="w-4 h-4" />}
                    </div>

                    {isSelected ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-600 text-white">
                        Padrão Ativo
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium hover:text-indigo-600">
                        Clique para definir
                      </span>
                    )}
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 leading-tight">
                    {tabOption.label}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    {tabOption.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Identificador:</span>
                  <span className="font-mono text-slate-600 font-semibold">{tabOption.id}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-700">Como funciona:</span>
            <span>Ao clicar em qualquer cartão acima, a nova visualização padrão é gravada no banco e passa a carregar para todos os visitantes do sistema.</span>
          </div>
          {savingInitialTab && (
            <span className="text-indigo-600 font-semibold text-xs flex items-center gap-1.5 shrink-0">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
              Salvando...
            </span>
          )}
        </div>
      </div>

      {/* Card 4: Configuração de Notificações por E-mail para Técnicos e Administradores */}
      <div
        id="admin-email-notifications-card"
        className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-xs">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900">
                  Notificações por E-mail (Técnicos e Administradores)
                </h3>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    emailNotificationsEnabled
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-300'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      emailNotificationsEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                    }`}
                  />
                  {emailNotificationsEnabled ? 'Notificações Ativas' : 'Desativado'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                O sistema envia um e-mail com os detalhes completos sempre que um professor realiza um novo agendamento.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleSendTestEmail}
              disabled={sendingTestEmail}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 border border-slate-200"
              title="Disparar e-mail de teste para verificar entrega"
            >
              <Send className="w-3.5 h-3.5 text-blue-600" />
              <span>{sendingTestEmail ? 'Disparando Teste...' : 'Enviar E-mail de Teste'}</span>
            </button>
          </div>
        </div>

        {emailSettingsSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{emailSettingsSuccess}</span>
          </div>
        )}

        {emailSettingsError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{emailSettingsError}</span>
          </div>
        )}

        {testEmailFeedback && (
          <div
            className={`p-3.5 text-xs rounded-xl flex items-center gap-2 animate-fade-in ${
              testEmailFeedback.success
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            {testEmailFeedback.success ? (
              <MailCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{testEmailFeedback.msg}</span>
          </div>
        )}

        <form onSubmit={handleSaveEmailSettings} className="space-y-4">
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
            {/* Toggle Geral */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={emailNotificationsEnabled}
                onChange={(e) => setEmailNotificationsEnabled(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500"
              />
              <span className="text-xs font-bold text-slate-800">
                Ativar envio automático de e-mail ao realizar agendamentos
              </span>
            </label>

            {/* Seção: E-mails Cadastrados para Receber Notificações */}
            <div className="pt-3 border-t border-slate-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-blue-600" />
                    E-mails Cadastrados para Receber as Notificações
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Cadastre os e-mails (coordenação, TI, secretaria, etc.) que receberão automaticamente os avisos completos de cada novo agendamento.
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 self-start sm:self-auto shrink-0">
                  {recipientEmailsList.length} {recipientEmailsList.length === 1 ? 'e-mail cadastrado' : 'e-mails cadastrados'}
                </span>
              </div>

              {/* Formulário para Cadastrar Novo E-mail */}
              <div className="space-y-1.5">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="email"
                      placeholder="Digite o e-mail (ex: ti@escola.edu.br ou seuemail@gmail.com)"
                      value={newRecipientInput}
                      onChange={(e) => {
                        setNewRecipientInput(e.target.value);
                        if (recipientInputError) setRecipientInputError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddRecipient();
                        }
                      }}
                      className="w-full pl-9 pr-3 py-2 text-xs text-slate-800 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 bg-white"
                    />
                    <MailPlus className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddRecipient()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Cadastrar E-mail
                  </button>
                </div>

                {recipientInputError && (
                  <p className="text-[11px] text-rose-600 flex items-center gap-1 font-medium animate-fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {recipientInputError}
                  </p>
                )}

                {/* Atalho se o e-mail do usuário não estiver na lista */}
                {!recipientEmailsList.some((e) => e.toLowerCase() === DEFAULT_ADMIN_NOTIFICATION_EMAIL.toLowerCase()) && (
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-[11px] text-slate-500">Sugestão:</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!recipientEmailsList.includes(DEFAULT_ADMIN_NOTIFICATION_EMAIL)) {
                          setRecipientEmailsList([...recipientEmailsList, DEFAULT_ADMIN_NOTIFICATION_EMAIL]);
                        }
                      }}
                      className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Incluir {DEFAULT_ADMIN_NOTIFICATION_EMAIL}
                    </button>
                  </div>
                )}
              </div>

              {/* Lista dos E-mails Ativos Cadastrados */}
              <div className="space-y-1.5 pt-1">
                {recipientEmailsList.map((email, idx) => (
                  <div
                    key={email}
                    className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs hover:border-slate-300 transition-colors shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 truncate">{email}</span>
                          {idx === 0 && (
                            <span className="px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                              Principal
                            </span>
                          )}
                          <span className="px-1.5 py-0.2 rounded-md text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                            Ativo
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate">
                          Recebe notificações automáticas de agendamentos
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveRecipient(email)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                      title={`Remover ${email} da lista de recebimento`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {recipientEmailsList.length === 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs text-amber-800">
                    <p className="font-semibold">Nenhum e-mail de destino cadastrado no momento.</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Cadastre um ou mais e-mails acima para receber as notificações.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Opções de Escopo de Destinatários */}
            <div className="pt-2 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyTechs}
                  onChange={(e) => setNotifyTechs(e.target.checked)}
                  className="w-3.5 h-3.5 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500"
                />
                <span>Notificar Técnicos responsáveis pelo laboratório</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyAdmins}
                  onChange={(e) => setNotifyAdmins(e.target.checked)}
                  className="w-3.5 h-3.5 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500"
                />
                <span>Notificar outros Administradores cadastrados</span>
              </label>
            </div>
          </div>

          {/* Seção Dedicada: Servidor SMTP / SNMP de Envio Automático */}
          <div
            id="admin-smtp-service-section"
            className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    Serviço de Envio SMTP / SNMP
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      Disparo Automático
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Configuração do servidor de e-mails para envio imediato aos técnicos após a realização de novos agendamentos.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    checked={smtpEnabled}
                    onChange={(e) => setSmtpEnabled(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500"
                  />
                  <span>Ativar Envio SMTP</span>
                </label>
                <button
                  type="button"
                  onClick={handleTestSmtpConnection}
                  disabled={testingSmtp}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Testa o handshake de conexão e autenticação com o servidor SMTP"
                >
                  <Zap className={`w-3.5 h-3.5 ${testingSmtp ? 'animate-spin' : ''}`} />
                  <span>{testingSmtp ? 'Testando Conexão...' : 'Testar Conexão SMTP'}</span>
                </button>
              </div>
            </div>

            {/* Presets Rápidos de Provedores */}
            <div>
              <span className="text-[11px] font-semibold text-slate-600 block mb-1.5">
                Preencher rapidamente com provedores comuns:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={applyPresetGmail}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Gmail (smtp.gmail.com:587)
                </button>
                <button
                  type="button"
                  onClick={applyPresetOutlook}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Microsoft 365 / Outlook
                </button>
                <button
                  type="button"
                  onClick={applyPresetLocal}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Rede Interna / UNASP Local
                </button>
                <button
                  type="button"
                  onClick={applyPresetSendGrid}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  SendGrid Relay
                </button>
              </div>
            </div>

            {/* Diagnóstico em tempo real */}
            {smtpDiagnostic && (
              <div
                className={`p-3 rounded-xl border text-xs animate-fade-in ${
                  smtpDiagnostic.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <div className="flex items-start gap-2">
                  {smtpDiagnostic.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-bold">{smtpDiagnostic.message}</p>
                    {smtpDiagnostic.details && (
                      <p className="font-mono text-[11px] opacity-90">
                        Resposta do Servidor: {smtpDiagnostic.details}
                      </p>
                    )}
                    {!smtpDiagnostic.success && (smtpHost.includes('gmail') || smtpUser.includes('gmail.com')) && (
                      <div className="mt-2 p-2.5 bg-white/80 border border-rose-200 rounded-lg text-[11px] text-slate-800 space-y-1.5 shadow-xs">
                        <p className="font-bold text-rose-800 flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          Como resolver a Autenticação no Gmail (Código 530 / 535):
                        </p>
                        <p className="text-slate-600">
                          O Google não permite usar sua senha comum de login do Gmail via SMTP por segurança. É necessário gerar uma <strong>Senha de App</strong>:
                        </p>
                        <ol className="list-decimal list-inside space-y-0.5 text-slate-700 pl-1">
                          <li>
                            Acesse{' '}
                            <a
                              href="https://myaccount.google.com/apppasswords"
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-blue-700 underline hover:text-blue-900 inline-flex items-center gap-0.5"
                            >
                              myaccount.google.com/apppasswords
                              <ExternalLink className="w-3 h-3 inline" />
                            </a>
                          </li>
                          <li>Certifique-se de que a verificação em duas etapas está ativa na sua Conta Google</li>
                          <li>Digite o nome do app (ex: <em>GestLab</em>) e clique em <strong>Criar</strong></li>
                          <li>Copie o código amarelo gerado de 16 caracteres e cole no campo <strong>Senha / Senha de Aplicativo</strong> logo abaixo</li>
                        </ol>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Grid de Configurações SMTP */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Host */}
              <div className="sm:col-span-6">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Host do Servidor SMTP / Relé *
                </label>
                <input
                  type="text"
                  required
                  placeholder="smtp.gmail.com ou 192.168.1.10"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs text-slate-800 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600 bg-white"
                />
              </div>

              {/* Porta */}
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Porta SMTP *
                </label>
                <input
                  type="number"
                  required
                  placeholder="587"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs text-slate-800 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600 bg-white"
                />
              </div>

              {/* Criptografia SSL/TLS */}
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Segurança / SSL
                </label>
                <select
                  value={smtpSecure ? 'ssl' : 'tls'}
                  onChange={(e) => setSmtpSecure(e.target.value === 'ssl')}
                  className="w-full px-2.5 py-1.5 text-xs text-slate-800 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600 bg-white"
                >
                  <option value="tls">STARTTLS (587)</option>
                  <option value="ssl">SSL / TLS Direto (465)</option>
                </select>
              </div>

              {/* Usuário de Autenticação */}
              <div className="sm:col-span-6">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Usuário / E-mail de Autenticação
                </label>
                <input
                  type="text"
                  placeholder="usuario@escola.edu.br ou guilhermebenz60@gmail.com"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs text-slate-800 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600 bg-white"
                />
              </div>

              {/* Senha de Autenticação */}
              <div className="sm:col-span-6">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Senha / Senha de Aplicativo
                </label>
                <div className="relative">
                  <input
                    type={showSmtpPass ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    className="w-full pl-3 pr-8 py-1.5 text-xs text-slate-800 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSmtpPass(!showSmtpPass)}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                  >
                    {showSmtpPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {(smtpHost.includes('gmail') || smtpUser.includes('@gmail.com')) && (
                  <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200/80 rounded-lg text-[11px] text-amber-900 flex items-start gap-1.5">
                    <span className="font-bold text-amber-700 shrink-0">⚠️ Gmail:</span>
                    <span>
                      O Google requer uma <strong>Senha de App (16 letras)</strong> em vez da sua senha de login pessoal. Gere em:{' '}
                      <a
                        href="https://myaccount.google.com/apppasswords"
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-blue-700 underline hover:text-blue-900"
                      >
                        myaccount.google.com/apppasswords
                      </a>
                    </span>
                  </div>
                )}
              </div>

              {/* Nome do Remetente */}
              <div className="sm:col-span-6">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nome do Remetente Exibido (From Name)
                </label>
                <input
                  type="text"
                  placeholder="GestLab Notificações"
                  value={smtpFromName}
                  onChange={(e) => setSmtpFromName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs text-slate-800 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600 bg-white"
                />
              </div>

              {/* E-mail do Remetente */}
              <div className="sm:col-span-6">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  E-mail do Remetente (From Email)
                </label>
                <input
                  type="email"
                  placeholder="notificacoes@escola.edu.br"
                  value={smtpFromEmail}
                  onChange={(e) => setSmtpFromEmail(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs text-slate-800 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600 bg-white"
                />
              </div>
            </div>

            <div className="p-2.5 bg-blue-50/60 border border-blue-200/70 rounded-lg text-[11px] text-blue-900 flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Envio Automático:</strong> Assim que qualquer professor concluir uma solicitação de laboratório, a API interna dispara o e-mail diretamente via este servidor SMTP para o Administrador e os Técnicos ativos do laboratório selecionado.
              </span>
            </div>
          </div>

          {/* Destinatários Cadastrados em Tempo Real */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                Destinatários Ativos Cadastrados no Sistema
              </span>
              <span className="text-[11px] text-slate-500">
                Atualizado dinamicamente
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
              {/* E-mails Cadastrados de Notificação */}
              {recipientEmailsList.map((email, idx) => (
                <div
                  key={`recipient-card-${email}`}
                  className="p-2.5 bg-white border border-blue-200 rounded-lg flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-slate-800 block truncate">{email}</span>
                      <span className="text-slate-500 text-[11px] truncate block">
                        Destinatário Direto {idx === 0 ? '(Principal)' : ''}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                    Notificação
                  </span>
                </div>
              ))}

              {/* Técnicos Cadastrados */}
              {technicians
                .filter((t) => t.active && t.email)
                .map((tech) => {
                  const coversAll = !tech.assignedLabIds || tech.assignedLabIds.length === 0 || tech.assignedLabIds.includes('all');
                  return (
                    <div
                      key={tech.id}
                      className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                          {tech.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <span className="font-bold text-slate-800 block truncate">{tech.name}</span>
                          <span className="text-slate-500 text-[11px] truncate block">{tech.email}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                        {coversAll ? 'Todos os Labs' : `${tech.assignedLabIds?.length} Labs`}
                      </span>
                    </div>
                  );
                })}

              {technicians.filter((t) => t.active && t.email).length === 0 && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 col-span-full">
                  ⚠️ Nenhum técnico possui e-mail cadastrado na aba "Equipe & Técnicos". Adicione o e-mail dos técnicos no formulário de edição para que eles recebam as notificações.
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              id="admin-save-email-settings-btn"
              type="submit"
              disabled={savingEmailSettings}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{savingEmailSettings ? 'Salvando...' : 'Salvar Configurações de Notificação'}</span>
            </button>
          </div>
        </form>

        {/* Histórico Recente de Notificações Disparadas */}
        {emailLogs.length > 0 && (
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-slate-500" />
                Histórico Recente de Notificações Enviadas ({emailLogs.length})
              </span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {emailLogs.slice(0, 8).map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-lg text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors"
                >
                  <div className="truncate">
                    <span className="font-semibold text-slate-800 block truncate">
                      {log.subject}
                    </span>
                    <span className="text-[11px] text-slate-500 truncate block">
                      Para: {log.recipients.join(', ')} {log.details ? `• ${log.details}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.sentAt).toLocaleString('pt-BR')}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        log.protocol === 'smtp'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}
                      title={log.smtpResponse || 'Disparo de notificação registrado'}
                    >
                      {log.protocol === 'smtp' ? 'SMTP' : 'Disparo Ativo'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Entregue
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
