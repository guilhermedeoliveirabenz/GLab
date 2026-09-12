import React, { useState } from 'react';
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
} from 'lucide-react';

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
    </div>
  );
};
