import React, { useState, useEffect } from 'react';
import { Lab, LabType } from '../types';
import { saveLab, deleteLab, LAB_BADGE_COLORS } from '../lib/labService';
import {
  X,
  Plus,
  Monitor,
  Truck,
  FileText,
  Trash2,
  Check,
  AlertTriangle,
  Building2,
  Palette,
  Hash,
  Sparkles,
  Eye,
  EyeOff,
  Lock,
  Ban,
} from 'lucide-react';

interface LabModalProps {
  isOpen: boolean;
  labToEdit: Lab | null; // se for null, cria um novo
  onClose: () => void;
  onSaved?: (savedLab: Lab) => void;
  onDeleted?: (labId: string) => void;
}

export const LabModal: React.FC<LabModalProps> = ({
  isOpen,
  labToEdit,
  onClose,
  onSaved,
  onDeleted,
}) => {
  const isEditing = Boolean(labToEdit);

  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState<number>(30);
  const [type, setType] = useState<LabType>('fixed');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('');
  const [badgeColor, setBadgeColor] = useState(LAB_BADGE_COLORS[0].value);
  const [visibleForBooking, setVisibleForBooking] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedReason, setBlockedReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (labToEdit) {
      setName(labToEdit.name);
      setCapacity(labToEdit.capacity);
      setType(labToEdit.type || (labToEdit.isMobile ? 'mobile' : 'fixed'));
      setDescription(labToEdit.description || '');
      setNotes(labToEdit.notes || '');
      setLocation(labToEdit.location || '');
      setBadgeColor(labToEdit.badgeColor || LAB_BADGE_COLORS[0].value);
      setVisibleForBooking(labToEdit.visibleForBooking !== false);
      setIsBlocked(Boolean(labToEdit.isBlocked));
      setBlockedReason(labToEdit.blockedReason || '');
    } else {
      setName('');
      setCapacity(35);
      setType('fixed');
      setDescription('');
      setNotes('');
      setLocation('');
      setBadgeColor(LAB_BADGE_COLORS[0].value);
      setVisibleForBooking(true);
      setIsBlocked(false);
      setBlockedReason('');
    }
    setErrorMsg(null);
    setIsDeleting(false);
  }, [labToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMsg('Por favor informe o nome do laboratório.');
      return;
    }

    if (capacity <= 0 || isNaN(capacity)) {
      setErrorMsg('A capacidade deve ser de pelo menos 1 computador/máquina.');
      return;
    }

    setSubmitting(true);
    try {
      const isMobile = type === 'mobile';
      const saved = await saveLab({
        id: labToEdit ? labToEdit.id : undefined,
        name: cleanName,
        capacity: Number(capacity),
        type,
        isMobile,
        description: description.trim() || (isMobile ? 'Laboratório móvel' : 'Laboratório fixo de informática'),
        notes: notes.trim(),
        location: location.trim(),
        badgeColor,
        softwares: labToEdit?.softwares || [],
        visibleForBooking,
        isBlocked,
        blockedReason: isBlocked ? (blockedReason.trim() || 'Bloqueado para agendamento') : '',
      });

      if (onSaved) {
        onSaved(saved);
      }
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar laboratório:', err);
      setErrorMsg('Ocorreu um erro ao salvar o laboratório. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!labToEdit) return;
    const confirm = window.confirm(
      `Deseja realmente remover/desativar o "${labToEdit.name}"? Ele deixará de aparecer para agendamentos.`,
    );
    if (!confirm) return;

    setIsDeleting(true);
    try {
      await deleteLab(labToEdit.id);
      if (onDeleted) {
        onDeleted(labToEdit.id);
      }
      onClose();
    } catch (err: any) {
      console.error('Erro ao excluir laboratório:', err);
      setErrorMsg('Erro ao excluir laboratório.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              {type === 'mobile' ? <Truck className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {isEditing ? `Editar ${labToEdit.name}` : 'Cadastrar Novo Laboratório'}
              </h3>
              <p className="text-xs text-slate-400">
                {isEditing
                  ? 'Atualize dados cadastrais, capacidade e observações'
                  : 'Adicione um novo laboratório fixo ou carrinho móvel ao sistema'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Nome e Capacidade */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Nome do Laboratório <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Lab 8, Lab Robótica, Carrinho 5"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-blue-600" />
                <span>Capacidade (Máq.) <span className="text-red-500">*</span></span>
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={capacity}
                onChange={(e) => setCapacity(parseInt(e.target.value, 10) || 0)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
              />
            </div>
          </div>

          {/* Tipo de Laboratório (Fixo vs Móvel) */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">
              Tipo de Laboratório
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setType('fixed');
                  if (!badgeColor || badgeColor.includes('rose')) {
                    setBadgeColor('bg-blue-50 text-blue-700 border-blue-200');
                  }
                }}
                className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  type === 'fixed'
                    ? 'bg-blue-50/70 border-blue-600 ring-2 ring-blue-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <Monitor className={`w-5 h-5 shrink-0 mt-0.5 ${type === 'fixed' ? 'text-blue-600' : 'text-slate-400'}`} />
                <div>
                  <p className={`text-xs font-bold ${type === 'fixed' ? 'text-blue-900' : 'text-slate-800'}`}>
                    Laboratório Fixo
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Sala física dedicada com computadores desktop fixos.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('mobile');
                  if (!badgeColor || badgeColor.includes('blue')) {
                    setBadgeColor('bg-rose-50 text-rose-700 border-rose-200');
                  }
                }}
                className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  type === 'mobile'
                    ? 'bg-rose-50/70 border-rose-600 ring-2 ring-rose-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <Truck className={`w-5 h-5 shrink-0 mt-0.5 ${type === 'mobile' ? 'text-rose-600' : 'text-slate-400'}`} />
                <div>
                  <p className={`text-xs font-bold ${type === 'mobile' ? 'text-rose-900' : 'text-slate-800'}`}>
                    Carrinho Móvel
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Carrinho de notebooks entregue na sala de aula do professor.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Observações dos Labs (SOLICITAÇÃO PRINCIPAL DO USUÁRIO) */}
          <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-200/70">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>Observações do Laboratório</span>
              </label>
              <span className="text-[10px] text-amber-800 font-semibold bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200">
                Visível para professores
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mb-2">
              Adicione orientações técnicas, avisos específicos, localização da chave, projetor ou particularidades deste laboratório:
            </p>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Chave disponível com a coordenação. Possui projetor HDMI integrado e 6 tomadas extras na bancada lateral. Ar condicionado no controle 1."
              className="w-full px-3 py-2 bg-white border border-amber-300/80 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 transition-all leading-relaxed"
            />
          </div>

          {/* Visibilidade para Agendamento */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              visibleForBooking
                ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs'
                : 'bg-slate-50 border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    visibleForBooking
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {visibleForBooking ? (
                    <Eye className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <EyeOff className="w-5 h-5 text-slate-500" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="lab-visible-for-booking-checkbox"
                      className="text-xs font-bold text-slate-900 cursor-pointer"
                    >
                      Visível para Agendamento
                    </label>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        visibleForBooking
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-200 text-slate-700 border border-slate-300'
                      }`}
                    >
                      {visibleForBooking
                        ? 'Disponível no formulário'
                        : 'Oculto para professores'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    {visibleForBooking
                      ? 'Professores e usuários poderão visualizar este laboratório e selecioná-lo no formulário de agendamento.'
                      : 'Este laboratório não aparecerá para os professores na lista de agendamentos (visível e gerenciável apenas por administradores).'}
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  id="lab-visible-for-booking-checkbox"
                  type="checkbox"
                  checked={visibleForBooking}
                  onChange={(e) => setVisibleForBooking(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>

          {/* Bloqueio do Laboratório para Agendamento */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              isBlocked
                ? 'bg-rose-50/80 border-rose-300 ring-1 ring-rose-200 shadow-2xs'
                : 'bg-slate-50/80 border-slate-200'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    isBlocked
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="lab-blocked-for-booking-checkbox"
                      className="text-xs font-bold text-slate-900 cursor-pointer"
                    >
                      Bloquear Laboratório para Agendamento
                    </label>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isBlocked
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isBlocked ? '🚫 Bloqueado' : '✅ Liberado'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    {isBlocked
                      ? 'O laboratório continuará visível mas aparecerá com o selo "🚫 Bloqueado para Agendamento" e novos agendamentos ficarão bloqueados para professores.'
                      : 'O laboratório está liberado para receber agendamentos normalmente conforme as regras escolares.'}
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  id="lab-blocked-for-booking-checkbox"
                  type="checkbox"
                  checked={isBlocked}
                  onChange={(e) => setIsBlocked(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
              </label>
            </div>

            {/* Motivo do Bloqueio (visível se estiver bloqueado) */}
            {isBlocked && (
              <div className="mt-3 pt-3 border-t border-rose-200 space-y-2 animate-fade-in">
                <label className="block text-[11px] font-bold text-rose-950">
                  Motivo do Bloqueio (exibido na tela para os professores):
                </label>
                <input
                  type="text"
                  placeholder="Ex: Interditado pela coordenação, Uso exclusivo para Prova Institucional, etc."
                  value={blockedReason}
                  onChange={(e) => setBlockedReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-rose-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-800"
                />
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-500">Sugestões:</span>
                  {[
                    'Interdição temporária',
                    'Uso institucional / Direção',
                    'Avaliação institucional / Provas',
                    'Treinamento de professores',
                    'Reestruturação das bancadas',
                  ].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setBlockedReason(sug)}
                      className="text-[10px] px-2 py-0.5 bg-white text-rose-700 hover:bg-rose-100/70 border border-rose-200 rounded-md cursor-pointer transition-colors"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Descrição e Localização */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Descrição Curta
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Laboratório fixo com 40 máquinas desktop"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Localização / Bloco (Opcional)</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Bloco C - 2º andar"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
              />
            </div>
          </div>

          {/* Cor de Identificação */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-slate-500" />
              <span>Cor do Distintivo</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {LAB_BADGE_COLORS.map((c) => {
                const isSelected = badgeColor === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setBadgeColor(c.value)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${c.value} ${
                      isSelected ? 'ring-2 ring-slate-800 shadow-xs' : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
            {isEditing ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting || submitting}
                className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-xl border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Removendo...' : 'Excluir / Desativar'}</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{submitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Laboratório'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
