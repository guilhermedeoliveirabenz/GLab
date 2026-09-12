import React, { useState, useEffect } from 'react';
import { Lab } from '../types';
import {
  updateLabMaintenanceStatus,
  updateLabBroadcastMessage,
  updateLabSoftwares,
  clearAllLabsSoftwares,
  POPULAR_SOFTWARES_LIST,
} from '../lib/labService';
import {
  Wrench,
  AlertTriangle,
  MessageSquare,
  CheckCircle,
  XCircle,
  Save,
  Laptop,
  Truck,
  Code,
  Plus,
  Trash2,
  Sparkles,
  Info,
  Layers,
  Bell,
  Check,
} from 'lucide-react';

interface LabManagementPanelProps {
  labs: Lab[];
}

export const LabManagementPanel: React.FC<LabManagementPanelProps> = ({ labs }) => {
  const [selectedLabId, setSelectedLabId] = useState<string>(labs[0]?.id || 'lab-1');
  const [customSoftwareInput, setCustomSoftwareInput] = useState('');
  const [savingLabId, setSavingLabId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isClearingAllSoftwares, setIsClearingAllSoftwares] = useState(false);

  // Local draft states per lab
  const [maintenanceDraft, setMaintenanceDraft] = useState<
    Record<string, { isUnderMaintenance: boolean; reason: string }>
  >(() => {
    const initial: Record<string, { isUnderMaintenance: boolean; reason: string }> = {};
    labs.forEach((l) => {
      initial[l.id] = {
        isUnderMaintenance: Boolean(l.isUnderMaintenance),
        reason: l.maintenanceReason || '',
      };
    });
    return initial;
  });

  const [broadcastDraft, setBroadcastDraft] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    labs.forEach((l) => {
      initial[l.id] = l.broadcastMessage || '';
    });
    return initial;
  });

  const [softwaresDraft, setSoftwaresDraft] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    labs.forEach((l) => {
      initial[l.id] = l.softwares ? [...l.softwares] : [];
    });
    return initial;
  });

  // Sync when external labs change
  useEffect(() => {
    setMaintenanceDraft((prev) => {
      const updated = { ...prev };
      labs.forEach((l) => {
        if (updated[l.id] === undefined) {
          updated[l.id] = {
            isUnderMaintenance: Boolean(l.isUnderMaintenance),
            reason: l.maintenanceReason || '',
          };
        }
      });
      return updated;
    });

    setBroadcastDraft((prev) => {
      const updated = { ...prev };
      labs.forEach((l) => {
        if (updated[l.id] === undefined) {
          updated[l.id] = l.broadcastMessage || '';
        }
      });
      return updated;
    });

    setSoftwaresDraft((prev) => {
      const updated = { ...prev };
      labs.forEach((l) => {
        if (!updated[l.id]) {
          updated[l.id] = l.softwares ? [...l.softwares] : [];
        }
      });
      return updated;
    });
  }, [labs]);

  const selectedLab = labs.find((l) => l.id === selectedLabId) || labs[0];
  const currentMaintenance = maintenanceDraft[selectedLabId] || {
    isUnderMaintenance: false,
    reason: '',
  };
  const currentBroadcast = broadcastDraft[selectedLabId] || '';
  const currentSoftwares = softwaresDraft[selectedLabId] || [];

  // Toggle Maintenance
  const handleToggleMaintenance = (val: boolean) => {
    setMaintenanceDraft((prev) => ({
      ...prev,
      [selectedLabId]: {
        ...prev[selectedLabId],
        isUnderMaintenance: val,
        reason: val ? (prev[selectedLabId]?.reason || 'Em manutenção técnica.') : '',
      },
    }));
  };

  const handleReasonChange = (reason: string) => {
    setMaintenanceDraft((prev) => ({
      ...prev,
      [selectedLabId]: {
        ...prev[selectedLabId],
        reason,
      },
    }));
  };

  const handleBroadcastChange = (msg: string) => {
    setBroadcastDraft((prev) => ({
      ...prev,
      [selectedLabId]: msg,
    }));
  };

  // Software management handlers
  const handleAddSoftware = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (currentSoftwares.includes(trimmed)) return;

    setSoftwaresDraft((prev) => ({
      ...prev,
      [selectedLabId]: [...(prev[selectedLabId] || []), trimmed],
    }));
    setCustomSoftwareInput('');
  };

  const handleRemoveSoftware = (name: string) => {
    setSoftwaresDraft((prev) => ({
      ...prev,
      [selectedLabId]: (prev[selectedLabId] || []).filter((s) => s !== name),
    }));
  };

  // Save All for Selected Lab
  const handleSaveLabSettings = async (labId: string) => {
    setSavingLabId(labId);
    setSuccessMsg(null);
    try {
      const maint = maintenanceDraft[labId] || { isUnderMaintenance: false, reason: '' };
      const broad = broadcastDraft[labId] || '';
      const softs = softwaresDraft[labId] || [];

      await Promise.all([
        updateLabMaintenanceStatus(labId, maint.isUnderMaintenance, maint.reason),
        updateLabBroadcastMessage(labId, broad),
        updateLabSoftwares(labId, softs),
      ]);

      setSuccessMsg(`Configurações e status do ${selectedLab.name} gravados com sucesso!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (e) {
      console.error('Erro ao salvar laboratório:', e);
    } finally {
      setSavingLabId(null);
    }
  };

  // Clear all softwares across all labs
  const handleClearAllSoftwaresAcrossLabs = async () => {
    const confirmed = window.confirm(
      'Deseja limpar todos os softwares pré-preenchidos de TODOS os laboratórios? Os labs ficarão com lista de softwares limpa.',
    );
    if (!confirmed) return;

    setIsClearingAllSoftwares(true);
    try {
      await clearAllLabsSoftwares();
      // Update local draft
      const cleared: Record<string, string[]> = {};
      labs.forEach((l) => {
        cleared[l.id] = [];
      });
      setSoftwaresDraft(cleared);
      setSuccessMsg('Softwares de todos os laboratórios foram limpos com sucesso!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (e) {
      console.error('Erro ao limpar softwares gerais:', e);
    } finally {
      setIsClearingAllSoftwares(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Info */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-600" />
            <span>Gestão dos Laboratórios: Manutenção, Avisos & Softwares</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Técnicos e administradores podem fechar laboratórios para manutenção, deixar avisos visíveis para os professores durante o agendamento e gerenciar os softwares instalados.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClearAllSoftwaresAcrossLabs}
            disabled={isClearingAllSoftwares}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Remove softwares pré-configurados de todos os laboratórios"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>{isClearingAllSoftwares ? 'Limpando...' : 'Limpar Softwares Pré-preenchidos'}</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lab Selector Sidebar */}
        <div className="lg:col-span-4 space-y-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block px-1">
            Selecione o Laboratório ({labs.length})
          </span>
          <div className="bg-white rounded-2xl border border-slate-200 p-2 space-y-1 shadow-2xs max-h-[620px] overflow-y-auto">
            {labs.map((lab) => {
              const isSelected = lab.id === selectedLabId;
              const isMaint = maintenanceDraft[lab.id]?.isUnderMaintenance;
              const hasMsg = Boolean(broadcastDraft[lab.id]?.trim());
              const count = (softwaresDraft[lab.id] || []).length;

              return (
                <button
                  key={lab.id}
                  type="button"
                  onClick={() => {
                    setSelectedLabId(lab.id);
                    setCustomSoftwareInput('');
                  }}
                  className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 border-2 border-blue-600 text-blue-950 font-bold shadow-xs'
                      : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isMaint
                          ? 'bg-rose-100 text-rose-800'
                          : lab.isMobile
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {isMaint ? (
                        <Wrench className="w-4 h-4 text-rose-600" />
                      ) : lab.isMobile ? (
                        <Truck className="w-4 h-4" />
                      ) : (
                        <Laptop className="w-4 h-4" />
                      )}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold truncate leading-tight flex items-center gap-1.5">
                        <span>{lab.name}</span>
                        {isMaint && (
                          <span className="text-[9px] font-bold bg-rose-600 text-white px-1.5 py-0.2 rounded-sm">
                            Manutenção
                          </span>
                        )}
                        {hasMsg && (
                          <span className="text-[9px] font-bold bg-amber-500 text-white px-1.5 py-0.2 rounded-sm">
                            Aviso
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {lab.capacity} máq. • {lab.isMobile ? 'Móvel' : 'Fixo'}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count} softw.
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Lab Editor */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-6">
            {/* Top Lab Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${
                    currentMaintenance.isUnderMaintenance
                      ? 'bg-rose-600'
                      : selectedLab.isMobile
                        ? 'bg-amber-600'
                        : 'bg-blue-600'
                  }`}
                >
                  {currentMaintenance.isUnderMaintenance ? (
                    <Wrench className="w-6 h-6" />
                  ) : selectedLab.isMobile ? (
                    <Truck className="w-6 h-6" />
                  ) : (
                    <Laptop className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{selectedLab.name}</h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {selectedLab.capacity} computadores
                    </span>
                    {currentMaintenance.isUnderMaintenance ? (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                        FECHADO PARA MANUTENÇÃO
                      </span>
                    ) : (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        DISPONÍVEL
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{selectedLab.description}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSaveLabSettings(selectedLab.id)}
                disabled={savingLabId === selectedLab.id}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-center cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingLabId === selectedLab.id ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>
            </div>

            {/* SEÇÃO 1: STATUS DE MANUTENÇÃO */}
            <div className={`p-4 rounded-xl border ${currentMaintenance.isUnderMaintenance ? 'bg-rose-50/70 border-rose-200' : 'bg-slate-50/70 border-slate-200'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <Wrench className={`w-5 h-5 mt-0.5 ${currentMaintenance.isUnderMaintenance ? 'text-rose-600' : 'text-slate-500'}`} />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Interdição / Fechamento para Manutenção
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Quando ativado, o laboratório ficará bloqueado para novos agendamentos e exibirá o alerta de manutenção aos professores.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleMaintenance(!currentMaintenance.isUnderMaintenance)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                      currentMaintenance.isUnderMaintenance
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {currentMaintenance.isUnderMaintenance ? (
                      <>
                        <XCircle className="w-4 h-4" />
                        <span>Fechado (Em Manutenção)</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span>Aberto / Disponível</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {currentMaintenance.isUnderMaintenance && (
                <div className="mt-3 pt-3 border-t border-rose-200/60 space-y-1.5 animate-fade-in">
                  <label htmlFor="maintenance-reason-input" className="block text-xs font-semibold text-rose-900">
                    Motivo da Manutenção (visível aos professores ao tentar agendar):
                  </label>
                  <input
                    id="maintenance-reason-input"
                    type="text"
                    placeholder="Ex: Troca de cabeamento de rede, formatação geral, conserto de ar-condicionado..."
                    value={currentMaintenance.reason}
                    onChange={(e) => handleReasonChange(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-rose-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-600 text-slate-800 font-medium"
                  />
                </div>
              )}
            </div>

            {/* SEÇÃO 2: MENSAGEM / AVISO PARA O USUÁRIO NA HORA DO AGENDAMENTO */}
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
              <div className="flex items-start gap-2.5">
                <Bell className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Mensagem ou Aviso aos Professores na Hora do Agendamento
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Deixe um recado específico para quem selecionar este laboratório (ex: orientações sobre uso de fones, regras de login, turmas prioritárias ou observações técnicas).
                  </p>
                </div>
              </div>

              <textarea
                id="lab-broadcast-message-input"
                rows={2}
                placeholder="Ex: Favor solicitar aos alunos que tragam fones de ouvido para as aulas nesta semana. As máquinas 15 a 18 estão com o áudio frontal em reparo."
                value={currentBroadcast}
                onChange={(e) => handleBroadcastChange(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white border border-amber-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-800 resize-none"
              />
            </div>

            {/* SEÇÃO 3: SOFTWARES INSTALADOS NO LABORATÓRIO */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Code className="w-4 h-4 text-blue-600" />
                  <span>Softwares Instalados neste Laboratório ({currentSoftwares.length})</span>
                </span>
                {currentSoftwares.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSoftwaresDraft((prev) => ({
                        ...prev,
                        [selectedLabId]: [],
                      }));
                    }}
                    className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                  >
                    Limpar todos deste lab
                  </button>
                )}
              </div>

              {currentSoftwares.length === 0 ? (
                <div className="p-5 border-2 border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50">
                  <Info className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs font-semibold text-slate-700">
                    Nenhum software cadastrado para o {selectedLab.name}.
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Adicione abaixo os programas disponíveis neste laboratório.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  {currentSoftwares.map((sw) => (
                    <span
                      key={sw}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 shadow-2xs group hover:border-rose-300"
                    >
                      <span>{sw}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSoftware(sw)}
                        title={`Remover ${sw}`}
                        className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Add Custom Software Input */}
              <div className="pt-2 space-y-1.5">
                <label htmlFor="custom-software-input" className="block text-xs font-bold text-slate-700">
                  Adicionar Outro Software ou Versão Específica
                </label>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddSoftware(customSoftwareInput);
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    id="custom-software-input"
                    type="text"
                    placeholder="Ex: Cisco Packet Tracer, Arduino IDE, Blender 4.0..."
                    value={customSoftwareInput}
                    onChange={(e) => setCustomSoftwareInput(e.target.value)}
                    className="flex-1 px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 bg-white"
                  />
                  <button
                    type="submit"
                    disabled={!customSoftwareInput.trim()}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar</span>
                  </button>
                </form>
              </div>

              {/* Quick Pick: Popular Softwares Catalog */}
              <div className="pt-2 space-y-1.5">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Catálogo de Softwares Frequentes (Clique para incluir):</span>
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50/70 rounded-xl border border-slate-200">
                  {POPULAR_SOFTWARES_LIST.map((sw) => {
                    const alreadyAdded = currentSoftwares.includes(sw);
                    return (
                      <button
                        key={sw}
                        type="button"
                        onClick={() => {
                          if (alreadyAdded) {
                            handleRemoveSoftware(sw);
                          } else {
                            handleAddSoftware(sw);
                          }
                        }}
                        className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                          alreadyAdded
                            ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50/50'
                        }`}
                      >
                        {alreadyAdded ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3 text-slate-400" />}
                        <span>{sw}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Save Action */}
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => handleSaveLabSettings(selectedLab.id)}
                disabled={savingLabId === selectedLab.id}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingLabId === selectedLab.id ? 'Salvando...' : `Salvar Alterações do ${selectedLab.name}`}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
