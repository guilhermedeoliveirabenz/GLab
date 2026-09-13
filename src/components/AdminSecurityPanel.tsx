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
} from 'lucide-react';
import {
  subscribeToInstitutionSubtitle,
  updateInstitutionSubtitle,
  DEFAULT_INSTITUTION_SUBTITLE,
} from '../lib/settingsService';

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

  useEffect(() => {
    const unsub = subscribeToInstitutionSubtitle((val) => {
      setSubtitle(val);
      setSubtitleInput(val);
    });
    return () => unsub();
  }, []);

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
    </div>
  );
};
