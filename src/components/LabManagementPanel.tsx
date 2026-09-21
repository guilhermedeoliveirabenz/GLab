import React, { useState, useEffect } from 'react';
import { Lab } from '../types';
import {
  updateLabMaintenanceStatus,
  updateLabBroadcastMessage,
  updateLabSoftwares,
  clearAllLabsSoftwares,
  updateLabNotes,
  updateLabVisibilityForBooking,
  POPULAR_SOFTWARES_LIST,
} from '../lib/labService';
import {
  formatDateBR,
  getTodayDateString,
  formatMaintenancePeriod,
  getLabMaintenanceStatus,
} from '../lib/maintenanceUtils';
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
  Calendar,
  Clock,
  CalendarRange,
  FileText,
  Edit3,
  Building2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { LabModal } from './LabModal';

interface LabMaintenanceDraft {
  isUnderMaintenance: boolean;
  reason: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
}

interface LabManagementPanelProps {
  labs: Lab[];
}

export const LabManagementPanel: React.FC<LabManagementPanelProps> = ({ labs }) => {
  const [selectedLabId, setSelectedLabId] = useState<string>(labs[0]?.id || 'lab-1');
  const [customSoftwareInput, setCustomSoftwareInput] = useState('');
  const [savingLabId, setSavingLabId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isClearingAllSoftwares, setIsClearingAllSoftwares] = useState(false);
  const [isLabModalOpen, setIsLabModalOpen] = useState(false);
  const [labModalTarget, setLabModalTarget] = useState<Lab | null>(null);
  const [isMobileLabListOpen, setIsMobileLabListOpen] = useState(false);

  // Local draft states per lab
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    labs.forEach((l) => {
      initial[l.id] = l.notes || '';
    });
    return initial;
  });

  const [maintenanceDraft, setMaintenanceDraft] = useState<
    Record<string, LabMaintenanceDraft>
  >(() => {
    const today = getTodayDateString();
    const initial: Record<string, LabMaintenanceDraft> = {};
    labs.forEach((l) => {
      initial[l.id] = {
        isUnderMaintenance: Boolean(l.isUnderMaintenance),
        reason: l.maintenanceReason || '',
        startDate: l.maintenanceStartDate || today,
        endDate: l.maintenanceEndDate || l.maintenanceStartDate || today,
        startTime: l.maintenanceStartTime || '07:30',
        endTime: l.maintenanceEndTime || '17:40',
        allDay: l.maintenanceAllDay !== undefined ? l.maintenanceAllDay : true,
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

  const [visibleDraft, setVisibleDraft] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    labs.forEach((l) => {
      initial[l.id] = l.visibleForBooking !== false;
    });
    return initial;
  });

  // Sync when external labs change
  useEffect(() => {
    const today = getTodayDateString();
    setNotesDraft((prev) => {
      const updated = { ...prev };
      labs.forEach((l) => {
        if (updated[l.id] === undefined) {
          updated[l.id] = l.notes || '';
        }
      });
      return updated;
    });

    setMaintenanceDraft((prev) => {
      const updated = { ...prev };
      labs.forEach((l) => {
        if (updated[l.id] === undefined) {
          updated[l.id] = {
            isUnderMaintenance: Boolean(l.isUnderMaintenance),
            reason: l.maintenanceReason || '',
            startDate: l.maintenanceStartDate || today,
            endDate: l.maintenanceEndDate || l.maintenanceStartDate || today,
            startTime: l.maintenanceStartTime || '07:30',
            endTime: l.maintenanceEndTime || '17:40',
            allDay: l.maintenanceAllDay !== undefined ? l.maintenanceAllDay : true,
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

    setVisibleDraft(() => {
      const updated: Record<string, boolean> = {};
      labs.forEach((l) => {
        updated[l.id] = l.visibleForBooking !== false;
      });
      return updated;
    });
  }, [labs]);

  const selectedLab = labs.find((l) => l.id === selectedLabId) || labs[0];
  const today = getTodayDateString();
  const currentMaintenance: LabMaintenanceDraft = maintenanceDraft[selectedLabId] || {
    isUnderMaintenance: false,
    reason: '',
    startDate: today,
    endDate: today,
    startTime: '07:30',
    endTime: '17:40',
    allDay: true,
  };
  const currentBroadcast = broadcastDraft[selectedLabId] || '';
  const currentSoftwares = softwaresDraft[selectedLabId] || [];

  const [dateModeByLab, setDateModeByLab] = useState<Record<string, 'single' | 'range'>>({});

  const dateMode: 'single' | 'range' =
    dateModeByLab[selectedLabId] ||
    (currentMaintenance.startDate && currentMaintenance.endDate && currentMaintenance.startDate !== currentMaintenance.endDate
      ? 'range'
      : 'single');

  const handleSetDateMode = (mode: 'single' | 'range') => {
    setDateModeByLab((prev) => ({ ...prev, [selectedLabId]: mode }));
    if (mode === 'single') {
      // Trava na mesma data: início e término iguais
      const baseDate = currentMaintenance.startDate || today;
      setMaintenanceDraft((prev) => ({
        ...prev,
        [selectedLabId]: {
          ...(prev[selectedLabId] || currentMaintenance),
          startDate: baseDate,
          endDate: baseDate,
        },
      }));
    }
  };

  // Maintenance handlers
  const handleToggleMaintenance = (val: boolean) => {
    setMaintenanceDraft((prev) => ({
      ...prev,
      [selectedLabId]: {
        ...(prev[selectedLabId] || currentMaintenance),
        isUnderMaintenance: val,
        reason: val ? (prev[selectedLabId]?.reason || 'Manutenção técnica e preventiva.') : '',
      },
    }));
  };

  const handleMaintenanceFieldChange = <K extends keyof LabMaintenanceDraft>(
    field: K,
    val: LabMaintenanceDraft[K],
  ) => {
    setMaintenanceDraft((prev) => ({
      ...prev,
      [selectedLabId]: {
        ...(prev[selectedLabId] || currentMaintenance),
        [field]: val,
      },
    }));
  };

  const handleSingleDateChange = (newDate: string) => {
    setMaintenanceDraft((prev) => ({
      ...prev,
      [selectedLabId]: {
        ...(prev[selectedLabId] || currentMaintenance),
        startDate: newDate,
        endDate: newDate,
      },
    }));
  };

  // Preset handlers for maintenance dates
  const setDatePreset = (daysOffset: number, spanDays: number = 1) => {
    const start = new Date();
    start.setDate(start.getDate() + daysOffset);
    const end = new Date(start);
    end.setDate(end.getDate() + (spanDays - 1));

    const toISO = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dayStr}`;
    };

    if (spanDays === 1) {
      setDateModeByLab((prev) => ({ ...prev, [selectedLabId]: 'single' }));
    } else {
      setDateModeByLab((prev) => ({ ...prev, [selectedLabId]: 'range' }));
    }

    setMaintenanceDraft((prev) => ({
      ...prev,
      [selectedLabId]: {
        ...(prev[selectedLabId] || currentMaintenance),
        startDate: toISO(start),
        endDate: toISO(end),
      },
    }));
  };

  const setTimePreset = (startTime: string, endTime: string, allDay: boolean = false) => {
    setMaintenanceDraft((prev) => ({
      ...prev,
      [selectedLabId]: {
        ...(prev[selectedLabId] || currentMaintenance),
        startTime,
        endTime,
        allDay,
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

  // Quick toggle for booking visibility
  const handleQuickToggleVisibility = async (labId: string, newVisibility: boolean) => {
    setVisibleDraft((prev) => ({ ...prev, [labId]: newVisibility }));
    const targetLab = labs.find((l) => l.id === labId);
    const labName = targetLab ? targetLab.name : 'Laboratório';
    try {
      await updateLabVisibilityForBooking(labId, newVisibility);
      setSuccessMsg(
        newVisibility
          ? `O ${labName} agora está VISÍVEL para agendamentos no formulário de professores!`
          : `O ${labName} agora está OCULTO para agendamentos (visível apenas para administradores).`,
      );
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (e) {
      console.error('Erro ao atualizar visibilidade do laboratório:', e);
    }
  };

  // Save All for Selected Lab
  const handleSaveLabSettings = async (labId: string) => {
    setSavingLabId(labId);
    setSuccessMsg(null);
    try {
      const maint = maintenanceDraft[labId] || currentMaintenance;
      const broad = broadcastDraft[labId] || '';
      const softs = softwaresDraft[labId] || [];
      const notes = notesDraft[labId] !== undefined ? notesDraft[labId] : (selectedLab.notes || '');
      const isVisible = visibleDraft[labId] !== undefined ? visibleDraft[labId] : (selectedLab.visibleForBooking !== false);

      await Promise.all([
        updateLabMaintenanceStatus(
          labId,
          maint.isUnderMaintenance,
          maint.reason,
          {
            startDate: maint.isUnderMaintenance ? maint.startDate : undefined,
            endDate: maint.isUnderMaintenance ? maint.endDate : undefined,
            startTime: maint.isUnderMaintenance && !maint.allDay ? maint.startTime : undefined,
            endTime: maint.isUnderMaintenance && !maint.allDay ? maint.endTime : undefined,
            allDay: maint.allDay,
          },
        ),
        updateLabBroadcastMessage(labId, broad),
        updateLabSoftwares(labId, softs),
        updateLabNotes(labId, notes),
        updateLabVisibilityForBooking(labId, isVisible),
      ]);

      setSuccessMsg(`Configurações de agendamento, visibilidade e manutenção do ${selectedLab.name} salvas com sucesso!`);
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

      {/* Seletor Rápido de Laboratórios para Celular (Telas Pequenas) */}
      <div className="lg:hidden bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="mobile-lab-quick-select" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Laptop className="w-3.5 h-3.5 text-blue-600" />
            <span>Selecionar Laboratório:</span>
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setLabModalTarget(null);
                setIsLabModalOpen(true);
              }}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>+ Novo</span>
            </button>
            <button
              type="button"
              onClick={() => setIsMobileLabListOpen(!isMobileLabListOpen)}
              className="text-xs text-blue-700 font-bold px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 cursor-pointer"
            >
              {isMobileLabListOpen ? 'Ocultar Lista' : `Ver Todos (${labs.length})`}
            </button>
          </div>
        </div>

        <select
          id="mobile-lab-quick-select"
          value={selectedLabId}
          onChange={(e) => {
            setSelectedLabId(e.target.value);
            setCustomSoftwareInput('');
          }}
          className="w-full text-xs font-bold py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 text-slate-900 min-h-[44px] cursor-pointer"
        >
          {labs.map((lab) => {
            const isMaint = maintenanceDraft[lab.id]?.isUnderMaintenance;
            const isHidden = (visibleDraft[lab.id] !== undefined ? visibleDraft[lab.id] : (lab.visibleForBooking !== false)) === false;
            return (
              <option key={lab.id} value={lab.id}>
                {lab.name} ({lab.capacity} máqs){isMaint ? ' • [Manutenção]' : ''}{isHidden ? ' • [Oculto]' : ''}
              </option>
            );
          })}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lab Selector Sidebar */}
        <div className={`${isMobileLabListOpen ? 'block' : 'hidden'} lg:block lg:col-span-4 space-y-2`}>
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Laboratórios ({labs.length})
            </span>
            <button
              type="button"
              onClick={() => {
                setLabModalTarget(null);
                setIsLabModalOpen(true);
              }}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Novo Lab</span>
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-2 space-y-1 shadow-2xs max-h-[620px] overflow-y-auto">
            {labs.map((lab) => {
              const isSelected = lab.id === selectedLabId;
              const isMaint = maintenanceDraft[lab.id]?.isUnderMaintenance;
              const hasMsg = Boolean(broadcastDraft[lab.id]?.trim());
              const hasNotes = Boolean((notesDraft[lab.id] !== undefined ? notesDraft[lab.id] : lab.notes)?.trim());
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
                        {hasNotes && (
                          <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-sm" title="Possui observações cadastradas">
                            Obs
                          </span>
                        )}
                        {(visibleDraft[lab.id] !== undefined ? visibleDraft[lab.id] : (lab.visibleForBooking !== false)) === false && (
                          <span
                            className="text-[9px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-sm flex items-center gap-0.5"
                            title="Oculto para agendamento dos professores"
                          >
                            <EyeOff className="w-2.5 h-2.5 text-slate-500" />
                            <span>Oculto</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {lab.capacity} máq. • {lab.isMobile ? 'Móvel' : 'Fixo'}
                        {lab.customAdded && ' • Custom'}
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
              <div className="flex items-start sm:items-center gap-3">
                <div
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-white shrink-0 ${
                    currentMaintenance.isUnderMaintenance
                      ? 'bg-rose-600'
                      : selectedLab.isMobile
                        ? 'bg-amber-600'
                        : 'bg-blue-600'
                  }`}
                >
                  {currentMaintenance.isUnderMaintenance ? (
                    <Wrench className="w-5 h-5 sm:w-6 sm:h-6" />
                  ) : selectedLab.isMobile ? (
                    <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
                  ) : (
                    <Laptop className="w-5 h-5 sm:w-6 sm:h-6" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <h3 className="text-base font-bold text-slate-900">{selectedLab.name}</h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {selectedLab.capacity} computadores
                    </span>
                    {currentMaintenance.isUnderMaintenance ? (
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                          currentMaintenance.startDate > today
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-rose-100 text-rose-800 border-rose-200'
                        }`}
                      >
                        {currentMaintenance.startDate > today
                          ? 'MANUTENÇÃO AGENDADA'
                          : 'FECHADO PARA MANUTENÇÃO'}
                      </span>
                    ) : (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        DISPONÍVEL
                      </span>
                    )}
                    {(visibleDraft[selectedLab.id] !== undefined
                      ? visibleDraft[selectedLab.id]
                      : selectedLab.visibleForBooking !== false) ? (
                      <span
                        className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1"
                        title="Este laboratório está visível no formulário de agendamento"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Visível para Professores</span>
                      </span>
                    ) : (
                      <span
                        className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1"
                        title="Este laboratório está oculto para os professores no agendamento"
                      >
                        <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                        <span>Oculto do Formulário</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {selectedLab.description}
                    {currentMaintenance.isUnderMaintenance && (
                      <span className="block mt-0.5 font-semibold text-rose-700">
                        ⚠️ Manutenção:{' '}
                        {currentMaintenance.startDate === currentMaintenance.endDate
                          ? formatDateBR(currentMaintenance.startDate)
                          : `${formatDateBR(currentMaintenance.startDate)} a ${formatDateBR(currentMaintenance.endDate)}`}
                        {' • '}
                        {currentMaintenance.allDay
                          ? 'Período integral'
                          : `${currentMaintenance.startTime} às ${currentMaintenance.endTime}`}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() =>
                    handleQuickToggleVisibility(
                      selectedLab.id,
                      !(visibleDraft[selectedLab.id] !== undefined
                        ? visibleDraft[selectedLab.id]
                        : selectedLab.visibleForBooking !== false),
                    )
                  }
                  className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    (visibleDraft[selectedLab.id] !== undefined
                      ? visibleDraft[selectedLab.id]
                      : selectedLab.visibleForBooking !== false)
                      ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}
                  title={
                    (visibleDraft[selectedLab.id] !== undefined
                      ? visibleDraft[selectedLab.id]
                      : selectedLab.visibleForBooking !== false)
                      ? 'Ocultar este laboratório do formulário de agendamento dos professores'
                      : 'Tornar este laboratório visível para agendamento pelos professores'
                  }
                >
                  {(visibleDraft[selectedLab.id] !== undefined
                    ? visibleDraft[selectedLab.id]
                    : selectedLab.visibleForBooking !== false) ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                      <span>Ocultar Lab</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tornar Visível</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLabModalTarget(selectedLab);
                    setIsLabModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Editar nome, capacidade, tipo e cor do laboratório"
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Editar Dados do Lab</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveLabSettings(selectedLab.id)}
                  disabled={savingLabId === selectedLab.id}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingLabId === selectedLab.id ? 'Salvando...' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </div>

            {/* SEÇÃO: VISIBILIDADE PARA AGENDAMENTO */}
            <div
              className={`p-5 rounded-2xl border transition-all ${
                (visibleDraft[selectedLab.id] !== undefined
                  ? visibleDraft[selectedLab.id]
                  : selectedLab.visibleForBooking !== false)
                  ? 'border-emerald-200 bg-emerald-50/40'
                  : 'border-slate-300 bg-slate-50/80'
              } space-y-3.5`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs text-white ${
                      (visibleDraft[selectedLab.id] !== undefined
                        ? visibleDraft[selectedLab.id]
                        : selectedLab.visibleForBooking !== false)
                        ? 'bg-emerald-600'
                        : 'bg-slate-500'
                    }`}
                  >
                    {(visibleDraft[selectedLab.id] !== undefined
                      ? visibleDraft[selectedLab.id]
                      : selectedLab.visibleForBooking !== false) ? (
                      <Eye className="w-5 h-5" />
                    ) : (
                      <EyeOff className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>Visibilidade para Agendamento</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          (visibleDraft[selectedLab.id] !== undefined
                            ? visibleDraft[selectedLab.id]
                            : selectedLab.visibleForBooking !== false)
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-200 text-slate-700 border border-slate-300'
                        }`}
                      >
                        {(visibleDraft[selectedLab.id] !== undefined
                          ? visibleDraft[selectedLab.id]
                          : selectedLab.visibleForBooking !== false)
                          ? 'Visível para Professores'
                          : 'Oculto para Professores'}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      Defina se este laboratório estará disponível para escolha no formulário de agendamento.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-center">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        visibleDraft[selectedLab.id] !== undefined
                          ? visibleDraft[selectedLab.id]
                          : selectedLab.visibleForBooking !== false
                      }
                      onChange={(e) =>
                        handleQuickToggleVisibility(selectedLab.id, e.target.checked)
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                  <span className="text-xs font-bold text-slate-800 min-w-[50px]">
                    {(visibleDraft[selectedLab.id] !== undefined
                      ? visibleDraft[selectedLab.id]
                      : selectedLab.visibleForBooking !== false)
                      ? 'Visível'
                      : 'Oculto'}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-600 bg-white/80 p-3 rounded-xl border border-slate-200/70">
                {(visibleDraft[selectedLab.id] !== undefined
                  ? visibleDraft[selectedLab.id]
                  : selectedLab.visibleForBooking !== false) ? (
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-emerald-950">
                        Laboratório ativo e disponível para agendamentos
                      </p>
                      <p className="text-slate-500 mt-0.5 text-[11px] leading-relaxed">
                        Os professores podem selecionar o <strong>{selectedLab.name}</strong> diretamente no formulário de solicitação de agendamento de aulas.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-900">
                        Laboratório oculto do formulário de agendamento
                      </p>
                      <p className="text-slate-500 mt-0.5 text-[11px] leading-relaxed">
                        O <strong>{selectedLab.name}</strong> não é exibido como opção no formulário de agendamento para os professores. Apenas administradores podem gerenciá-lo ou visualizá-lo.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SEÇÃO: OBSERVAÇÕES E DADOS DO LABORATÓRIO */}
            <div className="p-5 rounded-2xl border border-amber-200/90 bg-amber-50/40 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/70">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>Observações e Orientações do Laboratório</span>
                      {selectedLab.customAdded && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                          Criado pelo Admin
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Estas anotações aparecem em destaque para os professores na consulta e no agendamento.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setLabModalTarget(selectedLab);
                    setIsLabModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl border border-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-center"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Editar em Janela Completa</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-amber-950">
                    <FileText className="w-4 h-4 text-amber-600" />
                    <span>Observações Gerais:</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    (Ex: ar-condicionado, controle remoto, localização de chave, tomadas extras, projetor)
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={notesDraft[selectedLab.id] !== undefined ? notesDraft[selectedLab.id] : (selectedLab.notes || '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNotesDraft((prev) => ({ ...prev, [selectedLab.id]: val }));
                  }}
                  placeholder="Ex: Chave retirada na coordenação com o responsável do turno. Possui 6 tomadas adicionais para notebooks e projetor HDMI na parede frontal. Ar condicionado no controle 1."
                  className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 transition-all leading-relaxed"
                />
              </div>

              {selectedLab.location && (
                <div className="flex items-center gap-2 text-xs text-slate-600 bg-white/70 px-3 py-1.5 rounded-lg border border-amber-200">
                  <Building2 className="w-3.5 h-3.5 text-amber-700" />
                  <span><strong>Localização física:</strong> {selectedLab.location}</span>
                </div>
              )}
            </div>

            {/* SEÇÃO 1: STATUS E AGENDAMENTO DE MANUTENÇÃO */}
            <div
              className={`p-5 rounded-2xl border transition-all ${
                currentMaintenance.isUnderMaintenance
                  ? 'bg-rose-50/70 border-rose-200 ring-1 ring-rose-200'
                  : 'bg-slate-50/70 border-slate-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      currentMaintenance.isUnderMaintenance
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>Interdição & Agendamento de Manutenção</span>
                      {currentMaintenance.isUnderMaintenance && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white">
                          Ativo
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
                      Defina o dia, horário e período em que o laboratório estará em manutenção técnica. O sistema bloqueará reservas conflitantes e notificará os professores.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    id="lab-maintenance-toggle-btn"
                    type="button"
                    onClick={() => handleToggleMaintenance(!currentMaintenance.isUnderMaintenance)}
                    className={`px-3.5 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                      currentMaintenance.isUnderMaintenance
                        ? 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    {currentMaintenance.isUnderMaintenance ? (
                      <>
                        <XCircle className="w-4 h-4 text-white" />
                        <span>Em Manutenção / Agendado</span>
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

              {/* CAMPOS DE AGENDAMENTO DE PERÍODO */}
              {currentMaintenance.isUnderMaintenance && (
                <div className="mt-5 pt-4 border-t border-rose-200/70 space-y-4 animate-fade-in">
                  {/* Bloco 1: Tipo de Bloqueio por Data (Data Específica vs Período) */}
                  <div className="bg-white/90 p-4 rounded-xl border border-rose-200 space-y-3.5 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-rose-100">
                      <div className="flex items-center gap-2">
                        <CalendarRange className="w-4 h-4 text-rose-600" />
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                          1. Bloqueio por Data
                        </span>
                      </div>

                      {/* Seletor entre Data Específica e Período */}
                      <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                        <button
                          type="button"
                          id="btn-maint-mode-single"
                          onClick={() => handleSetDateMode('single')}
                          className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                            dateMode === 'single'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-700 hover:text-slate-900'
                          }`}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Data Específica (1 Dia)</span>
                        </button>
                        <button
                          type="button"
                          id="btn-maint-mode-range"
                          onClick={() => handleSetDateMode('range')}
                          className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                            dateMode === 'range'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-700 hover:text-slate-900'
                          }`}
                        >
                          <CalendarRange className="w-3.5 h-3.5" />
                          <span>Período (Vários Dias)</span>
                        </button>
                      </div>
                    </div>

                    {/* Conteúdo para DATA ESPECÍFICA */}
                    {dateMode === 'single' ? (
                      <div className="space-y-3 animate-fade-in">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="text-[11px] text-slate-600">
                            O bloqueio será aplicado <strong>exclusivamente nesta data</strong>.
                          </span>
                          {/* Atalhos para Data Específica */}
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-[10px] font-medium text-slate-500 mr-1">Atalhos:</span>
                            <button
                              type="button"
                              onClick={() => setDatePreset(0, 1)}
                              className="px-2 py-0.5 text-[10px] font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-md border border-rose-200 transition-colors cursor-pointer"
                            >
                              Hoje
                            </button>
                            <button
                              type="button"
                              onClick={() => setDatePreset(1, 1)}
                              className="px-2 py-0.5 text-[10px] font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-md border border-rose-200 transition-colors cursor-pointer"
                            >
                              Amanhã
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const d = new Date();
                                const daysUntilMonday = ((1 - d.getDay() + 7) % 7) || 7;
                                setDatePreset(daysUntilMonday, 1);
                              }}
                              className="px-2 py-0.5 text-[10px] font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-md border border-rose-200 transition-colors cursor-pointer"
                            >
                              Próx. Segunda
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const d = new Date();
                                const daysUntilFriday = ((5 - d.getDay() + 7) % 7) || 7;
                                setDatePreset(daysUntilFriday, 1);
                              }}
                              className="px-2 py-0.5 text-[10px] font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-md border border-rose-200 transition-colors cursor-pointer"
                            >
                              Próx. Sexta
                            </button>
                          </div>
                        </div>

                        <div className="max-w-md">
                          <label
                            htmlFor="maintenance-single-date"
                            className="block text-[11px] font-bold text-slate-700 mb-1"
                          >
                            Data do Bloqueio:
                          </label>
                          <div className="relative">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                            <input
                              id="maintenance-single-date"
                              type="date"
                              value={currentMaintenance.startDate}
                              onChange={(e) => handleSingleDateChange(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500 font-semibold text-slate-800"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Conteúdo para PERÍODO DE VÁRIOS DIAS */
                      <div className="space-y-3 animate-fade-in">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="text-[11px] text-slate-600">
                            O bloqueio vigorará do dia de início até a data de término (inclusive).
                          </span>
                          {/* Atalhos para Período */}
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-[10px] font-medium text-slate-500 mr-1">Atalhos:</span>
                            <button
                              type="button"
                              onClick={() => setDatePreset(0, 3)}
                              className="px-2 py-0.5 text-[10px] font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-md border border-rose-200 transition-colors cursor-pointer"
                            >
                              Próx. 3 dias
                            </button>
                            <button
                              type="button"
                              onClick={() => setDatePreset(0, 5)}
                              className="px-2 py-0.5 text-[10px] font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-md border border-rose-200 transition-colors cursor-pointer"
                            >
                              5 dias corridos
                            </button>
                            <button
                              type="button"
                              onClick={() => setDatePreset(7, 5)}
                              className="px-2 py-0.5 text-[10px] font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-md border border-rose-200 transition-colors cursor-pointer"
                            >
                              Próx. Semana (5 dias)
                            </button>
                            <button
                              type="button"
                              onClick={() => setDatePreset(0, 15)}
                              className="px-2 py-0.5 text-[10px] font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-md border border-rose-200 transition-colors cursor-pointer"
                            >
                              15 dias
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label
                              htmlFor="maintenance-start-date"
                              className="block text-[11px] font-bold text-slate-700 mb-1"
                            >
                              Data de Início:
                            </label>
                            <div className="relative">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                              <input
                                id="maintenance-start-date"
                                type="date"
                                value={currentMaintenance.startDate}
                                onChange={(e) => {
                                  const newStart = e.target.value;
                                  handleMaintenanceFieldChange('startDate', newStart);
                                  if (newStart > currentMaintenance.endDate) {
                                    handleMaintenanceFieldChange('endDate', newStart);
                                  }
                                }}
                                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500 font-semibold text-slate-800"
                              />
                            </div>
                          </div>

                          <div>
                            <label
                              htmlFor="maintenance-end-date"
                              className="block text-[11px] font-bold text-slate-700 mb-1"
                            >
                              Data de Término:
                            </label>
                            <div className="relative">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                              <input
                                id="maintenance-end-date"
                                type="date"
                                min={currentMaintenance.startDate}
                                value={currentMaintenance.endDate}
                                onChange={(e) => handleMaintenanceFieldChange('endDate', e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500 font-semibold text-slate-800"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bloco 2: Tipo de Bloqueio por Horário (Dia Todo vs Horário Específico) */}
                  <div className="bg-white/90 p-4 rounded-xl border border-rose-200 space-y-3.5 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-rose-100">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-rose-600" />
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                          2. Bloqueio por Horário / Turno
                        </span>
                      </div>

                      {/* Seletor entre Dia Inteiro e Horário Específico */}
                      <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                        <button
                          type="button"
                          id="btn-maint-allday-yes"
                          onClick={() => handleMaintenanceFieldChange('allDay', true)}
                          className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                            currentMaintenance.allDay
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-700 hover:text-slate-900'
                          }`}
                        >
                          Dia Inteiro (Integral)
                        </button>
                        <button
                          type="button"
                          id="btn-maint-allday-no"
                          onClick={() => handleMaintenanceFieldChange('allDay', false)}
                          className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                            !currentMaintenance.allDay
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-700 hover:text-slate-900'
                          }`}
                        >
                          Horário Específico
                        </button>
                      </div>
                    </div>

                    {currentMaintenance.allDay ? (
                      <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-center gap-2 animate-fade-in">
                        <CheckCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>
                          <strong>Interdição Integral:</strong> O laboratório ficará bloqueado durante todos os turnos (manhã, tarde e noite) nas datas selecionadas.
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-3 animate-fade-in">
                        {/* Presets rápidos de turnos */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-medium text-slate-500 mr-1">Turnos rápidos:</span>
                          <button
                            type="button"
                            onClick={() => setTimePreset('07:30', '11:55', false)}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-sky-50 text-sky-800 hover:bg-sky-100 rounded-lg border border-sky-200 transition-colors cursor-pointer"
                          >
                            Manhã (07:30 - 11:55)
                          </button>
                          <button
                            type="button"
                            onClick={() => setTimePreset('13:15', '17:40', false)}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors cursor-pointer"
                          >
                            Tarde (13:15 - 17:40)
                          </button>
                          <button
                            type="button"
                            onClick={() => setTimePreset('19:00', '22:15', false)}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-50 text-indigo-800 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                          >
                            Noite (19:00 - 22:15)
                          </button>
                          <button
                            type="button"
                            onClick={() => setTimePreset('08:00', '17:00', false)}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 text-slate-800 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors cursor-pointer"
                          >
                            Comercial (08:00 - 17:00)
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label
                              htmlFor="maintenance-start-time"
                              className="block text-[11px] font-bold text-slate-700 mb-1"
                            >
                              Horário de Início do Bloqueio:
                            </label>
                            <input
                              id="maintenance-start-time"
                              type="time"
                              value={currentMaintenance.startTime}
                              onChange={(e) => handleMaintenanceFieldChange('startTime', e.target.value)}
                              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500 font-semibold text-slate-800"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor="maintenance-end-time"
                              className="block text-[11px] font-bold text-slate-700 mb-1"
                            >
                              Horário de Término do Bloqueio:
                            </label>
                            <input
                              id="maintenance-end-time"
                              type="time"
                              value={currentMaintenance.endTime}
                              onChange={(e) => handleMaintenanceFieldChange('endTime', e.target.value)}
                              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500 font-semibold text-slate-800"
                            />
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-500 italic">
                          ℹ️ Fora deste horário ({currentMaintenance.startTime} às {currentMaintenance.endTime}), o laboratório continuará liberado para reservas normais de outros turnos.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Motivo da Manutenção */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="maintenance-reason-input"
                        className="block text-xs font-bold text-rose-950"
                      >
                        Motivo da Manutenção (exibido aos professores ao tentar agendar):
                      </label>
                      <span className="text-[10px] text-slate-500">Obrigatório informar aos docentes</span>
                    </div>

                    <input
                      id="maintenance-reason-input"
                      type="text"
                      placeholder="Ex: Troca de cabeamento de rede, formatação geral, conserto de ar-condicionado..."
                      value={currentMaintenance.reason}
                      onChange={(e) => handleMaintenanceFieldChange('reason', e.target.value)}
                      className="w-full px-3.5 py-2 text-xs bg-white border border-rose-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-600 text-slate-800 font-medium"
                    />

                    {/* Sugestões rápidas de motivos */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[10px] text-slate-500">Sugestões:</span>
                      {[
                        'Manutenção preventiva e limpeza',
                        'Troca de cabeamento de rede',
                        'Formatação e atualização de softwares',
                        'Reparo de ar-condicionado',
                        'Substituição de fontes e periféricos',
                      ].map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => handleMaintenanceFieldChange('reason', sug)}
                          className="text-[10px] px-2 py-0.5 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-700 rounded-md transition-colors cursor-pointer"
                        >
                          + {sug}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Banner de Resumo da Manutenção Agendada */}
                  <div className="p-3.5 bg-amber-50/80 border border-amber-300/80 rounded-xl flex items-start justify-between gap-3 text-amber-950 text-xs">
                    <div className="flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-amber-900">
                          Resumo do Bloqueio Agendado:
                        </p>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          📅 <strong>Período:</strong>{' '}
                          {currentMaintenance.startDate === currentMaintenance.endDate
                            ? `Dia ${formatDateBR(currentMaintenance.startDate)}`
                            : `De ${formatDateBR(currentMaintenance.startDate)} até ${formatDateBR(currentMaintenance.endDate)}`}
                          {' • '}
                          ⏰ <strong>Horário:</strong>{' '}
                          {currentMaintenance.allDay
                            ? 'Dia todo (integral)'
                            : `Das ${currentMaintenance.startTime} às ${currentMaintenance.endTime}`}
                        </p>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          🛠️ <strong>Motivo:</strong>{' '}
                          {currentMaintenance.reason || 'Manutenção técnica geral'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleMaintenance(false)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:text-rose-900 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                      title="Liberar laboratório e remover agendamento de manutenção"
                    >
                      Remover Bloqueio
                    </button>
                  </div>
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

      {/* Modal para Incluir / Editar Laboratório */}
      <LabModal
        isOpen={isLabModalOpen}
        labToEdit={labModalTarget}
        onClose={() => setIsLabModalOpen(false)}
        onSaved={(savedLab) => {
          setSelectedLabId(savedLab.id);
          setSuccessMsg(`Laboratório "${savedLab.name}" salvo com sucesso!`);
          setTimeout(() => setSuccessMsg(null), 4000);
        }}
        onDeleted={(deletedId) => {
          const remaining = labs.filter((l) => l.id !== deletedId);
          if (remaining.length > 0) {
            setSelectedLabId(remaining[0].id);
          }
          setSuccessMsg('Laboratório removido com sucesso!');
          setTimeout(() => setSuccessMsg(null), 4000);
        }}
      />
    </div>
  );
};
