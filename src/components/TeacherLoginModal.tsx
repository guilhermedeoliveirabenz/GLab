import React, { useState } from 'react';
import { useAuth } from '../lib/authContext';
import { Phone, LogIn, User, Sparkles, AlertCircle } from 'lucide-react';

interface TeacherLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const TeacherLoginModal: React.FC<TeacherLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { loginTeacher } = useAuth();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePhoneChange = (val: string) => {
    const raw = val.replace(/\D/g, '');
    let formatted = raw;
    if (raw.length <= 2) {
      formatted = raw.length > 0 ? `(${raw}` : '';
    } else if (raw.length <= 7) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    } else if (raw.length <= 11) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
    } else {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
    }
    setPhone(formatted);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const raw = phone.replace(/\D/g, '');
    if (raw.length < 10) {
      setError('Por favor, informe seu número de WhatsApp com DDD (mínimo 10 dígitos).');
      return;
    }

    loginTeacher(raw, name.trim() || undefined);
    onSuccess?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div
        id="teacher-login-modal-box"
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Acesso do Professor</h3>
            <p className="text-xs text-slate-500">
              Digite seu celular para consultar todo o seu histórico de agendamentos
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="teacher-modal-phone"
              className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              <span>Número de Celular / WhatsApp *</span>
            </label>
            <input
              id="teacher-modal-phone"
              type="tel"
              required
              autoFocus
              placeholder="(11) 98765-4321"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-blue-600 font-mono"
            />
            <p className="text-[11px] text-slate-600 mt-1">
              Usaremos este número para localizar suas reservas aprovadas e pendentes.
            </p>
          </div>

          <div>
            <label
              htmlFor="teacher-modal-name"
              className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Seu Nome (Opcional)</span>
            </label>
            <input
              id="teacher-modal-name"
              type="text"
              placeholder="Ex: Prof. Carlos Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              id="submit-teacher-login-btn"
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Acessar Histórico</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
