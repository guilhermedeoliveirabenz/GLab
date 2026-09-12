import React, { useState, useEffect } from 'react';
import { Booking } from '../types';
import { generateWhatsAppMessage, getWhatsAppSendUrl, sanitizeWhatsAppPhone } from '../lib/whatsapp';
import { MessageSquare, Send, Copy, Check, ExternalLink, X, AlertCircle } from 'lucide-react';

interface WhatsAppModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmAndSend: (bookingId: string, customNote?: string) => Promise<void>;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  booking,
  isOpen,
  onClose,
  onConfirmAndSend,
}) => {
  const [customNote, setCustomNote] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (booking) {
      const generated = generateWhatsAppMessage(booking, customNote);
      setMessage(generated);
    }
  }, [booking, customNote]);

  if (!isOpen || !booking) return null;

  const sanitizedPhone = sanitizeWhatsAppPhone(booking.whatsapp);
  const isValidPhone = sanitizedPhone.length >= 10;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  const handleSendWhatsApp = async () => {
    setSending(true);
    try {
      await onConfirmAndSend(booking.id, customNote);
      const url = getWhatsAppSendUrl(booking.whatsapp, message);
      window.open(url, '_blank', 'noopener,noreferrer');
      onClose();
    } catch (err) {
      console.error('Erro ao enviar via WhatsApp:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      id="whatsapp-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
    >
      <div
        id="whatsapp-modal-content"
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-emerald-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-white">Confirmação via WhatsApp</h3>
              <p className="text-xs text-emerald-100">
                Encaminhe os detalhes da reserva diretamente para o professor
              </p>
            </div>
          </div>
          <button
            id="close-whatsapp-modal-btn"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-slate-800">
          {/* Card Resumo do Agendamento */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row justify-between gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-700 uppercase font-semibold">Professor(a)</p>
              <p className="font-semibold text-slate-900 text-base">{booking.teacherName}</p>
              <p className="text-emerald-700 font-mono text-xs flex items-center gap-1 mt-0.5 font-medium">
                📱 {booking.whatsapp}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-700 uppercase font-semibold">Laboratório & Turma</p>
              <p className="font-medium text-slate-900">
                {booking.labName} • <span className="text-slate-600">{booking.classGroup}</span>
              </p>
              <p className="text-xs text-slate-700 mt-0.5">
                {booking.date} • {booking.timeSlot}
              </p>
            </div>
            {booking.isMobileLab && (
              <div className="bg-amber-100/90 border border-amber-300 px-3 py-2 rounded-lg sm:text-right">
                <p className="text-xs font-bold text-amber-900 uppercase">Carrinho Móvel</p>
                <p className="text-sm font-semibold text-amber-950">
                  Sala: {booking.roomNumber || 'Não informada'}
                </p>
              </div>
            )}
          </div>

          {/* Aviso se número parece inválido */}
          {!isValidPhone && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                Atenção: O telefone informado ({booking.whatsapp}) pode estar incompleto. O padrão
                recomendado é DDD + 9 dígitos (ex: 11987654321).
              </span>
            </div>
          )}

          {/* Campo para Observação Adicional do Admin */}
          <div>
            <label
              htmlFor="admin-whatsapp-note"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Aviso ou observação adicional da administração (opcional):
            </label>
            <input
              id="admin-whatsapp-note"
              type="text"
              placeholder="Ex: Pegar a chave na recepção; notebooks estão carregados..."
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Prévia da Mensagem Formatada */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-700">
                Mensagem que será enviada pelo WhatsApp:
              </span>
              <button
                id="copy-whatsapp-text-btn"
                onClick={handleCopy}
                className="text-xs flex items-center gap-1 text-slate-600 hover:text-emerald-600 font-medium transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar texto</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              id="whatsapp-message-preview"
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3.5 text-xs font-sans bg-slate-900 text-emerald-300 border border-slate-800 rounded-xl leading-relaxed resize-none focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-[11px] text-slate-700 mt-1">
              Você pode editar o texto acima antes de disparar o WhatsApp.
            </p>
          </div>

          {booking.whatsappSent && (
            <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Uma mensagem de confirmação já foi enviada anteriormente em{' '}
                {booking.whatsappSentAt ? new Date(booking.whatsappSentAt).toLocaleString('pt-BR') : 'data anterior'}.
                Você pode reenviar se necessário.
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
          <button
            id="cancel-whatsapp-modal-btn"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              id="copy-modal-action-btn"
              onClick={handleCopy}
              type="button"
              className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>

            <button
              id="open-whatsapp-web-btn"
              onClick={handleSendWhatsApp}
              disabled={sending}
              className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{sending ? 'Abrindo...' : 'Confirmar & Abrir WhatsApp'}</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
