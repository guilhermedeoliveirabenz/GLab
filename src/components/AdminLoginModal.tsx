import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/authContext';
import {
  ShieldCheck,
  Lock,
  Mail,
  X,
  AlertCircle,
  LogIn,
  Eye,
  EyeOff,
  Clock,
} from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { login, lockoutStatus, refreshLockout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState<number>(0);

  // Timer para bloqueio temporário
  useEffect(() => {
    if (!isOpen) return;
    const current = refreshLockout();
    if (current.isLocked) {
      setCountdown(current.remainingSeconds);
    }
  }, [isOpen]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          refreshLockout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  if (!isOpen) return null;

  const isBlocked = lockoutStatus.isLocked || countdown > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBlocked) {
      setError(`Acesso temporariamente bloqueado. Aguarde ${countdown}s.`);
      return;
    }

    if (!email || !password) {
      setError('Por favor preencha usuário/e-mail e senha.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj?.message || 'Falha na autenticação. Verifique os dados informados.');
      const updated = refreshLockout();
      if (updated.isLocked) {
        setCountdown(updated.remainingSeconds);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="admin-login-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
    >
      <div
        id="admin-login-modal-content"
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-white">Acesso Administrativo</h3>
              <p className="text-xs text-slate-400">
                Área Restrita aos Administradores e Equipe de TI
              </p>
            </div>
          </div>
          <button
            id="close-admin-login-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Lockout Warning */}
          {isBlocked && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-300 text-amber-900 text-xs rounded-xl flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Acesso Bloqueado Temporariamente</p>
                <p className="mt-0.5 text-amber-800">
                  Por medidas de segurança contra ataques de força bruta, o login está suspenso por{' '}
                  <strong className="font-mono">{countdown} segundos</strong>.
                </p>
              </div>
            </div>
          )}

          {/* General Error Message */}
          {error && !isBlocked && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-email-input"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Usuário ou E-mail Cadastrado
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="admin-email-input"
                  type="text"
                  required
                  disabled={isBlocked || loading}
                  placeholder="Seu usuário ou e-mail institucional"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-blue-600 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password-input"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="admin-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={isBlocked || loading}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-blue-600 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-hidden cursor-pointer"
                  title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="submit-admin-login-btn"
              type="submit"
              disabled={loading || isBlocked}
              className="w-full py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Validando Credenciais...' : isBlocked ? `Aguarde (${countdown}s)` : 'Entrar com Senha'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
