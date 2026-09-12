import React, { useState } from 'react';
import { Lab } from '../types';
import { updateLabSoftwares, POPULAR_SOFTWARES_LIST } from '../lib/labService';
import {
  Code,
  Laptop,
  Truck,
  Plus,
  Trash2,
  Check,
  Save,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';

interface LabSoftwareManagerProps {
  labs: Lab[];
}

export const LabSoftwareManager: React.FC<LabSoftwareManagerProps> = ({ labs }) => {
  const [selectedLabId, setSelectedLabId] = useState<string>(labs[0]?.id || 'lab-1');
  const [customSoftwareInput, setCustomSoftwareInput] = useState('');
  const [savingLabId, setSavingLabId] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Local state for software edits before saving
  const [softwareEdits, setSoftwareEdits] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    labs.forEach((lab) => {
      initial[lab.id] = lab.softwares ? [...lab.softwares] : [];
    });
    return initial;
  });

  // Sync if labs change from external Firestore update
  React.useEffect(() => {
    setSoftwareEdits((prev) => {
      const updated = { ...prev };
      labs.forEach((lab) => {
        if (!updated[lab.id]) {
          updated[lab.id] = lab.softwares ? [...lab.softwares] : [];
        }
      });
      return updated;
    });
  }, [labs]);

  const selectedLab = labs.find((l) => l.id === selectedLabId) || labs[0];
  const currentSoftwares = softwareEdits[selectedLabId] || [];

  const handleAddSoftware = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (currentSoftwares.includes(trimmed)) return;

    setSoftwareEdits((prev) => ({
      ...prev,
      [selectedLabId]: [...(prev[selectedLabId] || []), trimmed],
    }));
    setCustomSoftwareInput('');
  };

  const handleRemoveSoftware = (name: string) => {
    setSoftwareEdits((prev) => ({
      ...prev,
      [selectedLabId]: (prev[selectedLabId] || []).filter((s) => s !== name),
    }));
  };

  const handleSave = async (labId: string) => {
    setSavingLabId(labId);
    setSaveSuccessMsg(null);
    try {
      const toSave = softwareEdits[labId] || [];
      await updateLabSoftwares(labId, toSave);
      setSaveSuccessMsg(`Softwares do ${selectedLab.name} atualizados com sucesso!`);
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } catch (err) {
      console.error('Erro ao salvar softwares:', err);
    } finally {
      setSavingLabId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Info */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Code className="w-5 h-5 text-blue-600" />
            <span>Gestão de Softwares Instalados por Laboratório</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Configure quais programas, IDEs, simuladores e ferramentas estão disponíveis em cada um dos 12 laboratórios. 
            Os professores verão essas informações na visualização dos laboratórios e no formulário de reserva.
          </p>
        </div>

        {saveSuccessMsg && (
          <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lab Selector Sidebar */}
        <div className="lg:col-span-4 space-y-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block px-1">
            Selecione o Laboratório ({labs.length})
          </span>
          <div className="bg-white rounded-2xl border border-slate-200 p-2 space-y-1 shadow-2xs max-h-[580px] overflow-y-auto">
            {labs.map((lab) => {
              const isSelected = lab.id === selectedLabId;
              const count = (softwareEdits[lab.id] || lab.softwares || []).length;
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
                        lab.isMobile
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {lab.isMobile ? <Truck className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold truncate leading-tight">{lab.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {lab.capacity} máquinas • {lab.isMobile ? 'Móvel' : 'Fixo'}
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

        {/* Software Configuration Panel */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
            {/* Top Lab Header in Editor */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center text-white ${
                    selectedLab.isMobile ? 'bg-amber-600' : 'bg-blue-600'
                  }`}
                >
                  {selectedLab.isMobile ? <Truck className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{selectedLab.name}</h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {selectedLab.capacity} computadores
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{selectedLab.description}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSave(selectedLab.id)}
                disabled={savingLabId === selectedLab.id}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-center cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingLabId === selectedLab.id ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>
            </div>

            {/* List of currently installed softwares */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>Softwares Cadastrados neste Laboratório ({currentSoftwares.length})</span>
                </span>
                {currentSoftwares.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSoftwareEdits((prev) => ({
                        ...prev,
                        [selectedLabId]: [],
                      }));
                    }}
                    className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                  >
                    Limpar todos
                  </button>
                )}
              </div>

              {currentSoftwares.length === 0 ? (
                <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50">
                  <Info className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-slate-700">
                    Nenhum software cadastrado para o {selectedLab.name}.
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Adicione programas abaixo para que os professores saibam o que está pronto para uso.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  {currentSoftwares.map((sw) => (
                    <span
                      key={sw}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs group hover:border-rose-300"
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
            </div>

            {/* Add Custom Software Input */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
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
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Catálogo de Softwares Frequentes (Clique para incluir):</span>
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 bg-slate-50/70 rounded-xl border border-slate-200">
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

            {/* Bottom Save Action */}
            <div className="pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => handleSave(selectedLab.id)}
                disabled={savingLabId === selectedLab.id}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingLabId === selectedLab.id ? 'Salvando...' : 'Salvar Softwares deste Lab'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
