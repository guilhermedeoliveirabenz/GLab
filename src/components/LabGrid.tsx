import React, { useState } from 'react';
import { Lab, LAB_LIST, Booking } from '../types';
import { Monitor, Truck, Calendar, Clock, Search, Code, Wrench, Bell, Info, FileText } from 'lucide-react';
import { getLabMaintenanceStatus } from '../lib/maintenanceUtils';

interface LabGridProps {
  bookings: Booking[];
  labs?: Lab[];
  onSelectLabToBook: (labId: string) => void;
}

export const LabGrid: React.FC<LabGridProps> = ({
  bookings,
  labs = LAB_LIST,
  onSelectLabToBook,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [filterType, setFilterType] = useState<'all' | 'fixed' | 'mobile'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLabs = labs.filter((lab) => {
    if (filterType === 'fixed' && lab.isMobile) return false;
    if (filterType === 'mobile' && !lab.isMobile) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const swMatches = (lab.softwares || []).some((s) => s.toLowerCase().includes(q));
      return (
        lab.name.toLowerCase().includes(q) ||
        lab.description.toLowerCase().includes(q) ||
        swMatches ||
        `${lab.capacity}`.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Control Bar: Date selection & Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Date Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="text-xs font-semibold text-slate-700 shrink-0">Consultar dia:</span>
          <input
            id="lab-grid-date-picker"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium"
          />
        </div>

        {/* Filter buttons and search */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              id="search-labs-input"
              type="text"
              placeholder="Filtrar por nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600 w-40 sm:w-48"
            />
          </div>

          <div className="flex border border-slate-200 rounded-lg p-0.5 bg-slate-50 text-xs">
            <button
              id="filter-labs-all-btn"
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                filterType === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({labs.length})
            </button>
            <button
              id="filter-labs-fixed-btn"
              onClick={() => setFilterType('fixed')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                filterType === 'fixed'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Fixos ({labs.filter((l) => !l.isMobile).length})
            </button>
            <button
              id="filter-labs-mobile-btn"
              onClick={() => setFilterType('mobile')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                filterType === 'mobile'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Móveis ({labs.filter((l) => l.isMobile).length})
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Labs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredLabs.map((lab) => {
          // Reservas deste laboratório para o dia selecionado
          const dayBookings = bookings.filter(
            (b) => b.labId === lab.id && b.date === selectedDate && b.status !== 'cancelled',
          );
          const maintStatus = getLabMaintenanceStatus(lab, selectedDate);
          const isUnderMaint = maintStatus.isUnderMaintenance;
          const isFutureMaint = !isUnderMaint && maintStatus.isScheduledFuture;
          const hasMessage = Boolean(lab.broadcastMessage?.trim());

          return (
            <div
              key={lab.id}
              id={`lab-card-${lab.id}`}
              className={`bg-white rounded-2xl border transition-all flex flex-col justify-between overflow-hidden ${
                isUnderMaint
                  ? 'border-rose-300 ring-1 ring-rose-300/60 shadow-xs'
                  : 'border-slate-200 shadow-xs hover:shadow-md'
              }`}
            >
              <div className="p-5">
                {/* Header do Card */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isUnderMaint
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : lab.isMobile
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : 'bg-blue-50 text-blue-600 border border-blue-200'
                      }`}
                    >
                      {isUnderMaint ? (
                        <Wrench className="w-5 h-5 text-rose-600" />
                      ) : lab.isMobile ? (
                        <Truck className="w-5 h-5" />
                      ) : (
                        <Monitor className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-slate-900 text-base leading-tight">
                          {lab.name}
                        </h3>
                        {isUnderMaint ? (
                          <span className="text-[9px] font-bold bg-rose-600 text-white px-1.5 py-0.5 rounded-sm">
                            Manutenção
                          </span>
                        ) : isFutureMaint ? (
                          <span className="text-[9px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-sm">
                            Manut. Agendada
                          </span>
                        ) : null}
                      </div>
                      <span className="text-[11px] text-slate-600">
                        {lab.isMobile ? 'Laboratório Móvel' : 'Laboratório Fixo'}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full border ${lab.badgeColor}`}
                  >
                    {lab.capacity} máq.
                  </span>
                </div>

                {/* Banner de Manutenção para a Data Selecionada */}
                {isUnderMaint && (
                  <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-start gap-2">
                    <Wrench className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-rose-800">Fechado para Manutenção</p>
                      <p className="text-[11px] text-rose-700 mt-0.5">
                        {maintStatus.formattedPeriod}
                      </p>
                      <p className="text-[11px] text-rose-800 font-medium mt-0.5">
                        Motivo: {maintStatus.reason || 'Em manutenção técnica.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Aviso de Manutenção Futura */}
                {isFutureMaint && (
                  <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <p>
                      <strong>Manutenção agendada:</strong> {maintStatus.formattedPeriod}
                    </p>
                  </div>
                )}

                {/* Aviso aos Professores */}
                {hasMessage && (
                  <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
                    <Bell className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-800">Aviso do Laboratório:</p>
                      <p className="text-[11px] text-amber-700 mt-0.5 leading-snug">
                        {lab.broadcastMessage}
                      </p>
                    </div>
                  </div>
                )}

                <p className="text-xs text-slate-600 mb-3 line-clamp-2">{lab.description}</p>

                {/* Observações do Laboratório */}
                {lab.notes && lab.notes.trim() && (
                  <div className="mb-3 p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs flex items-start gap-2">
                    <FileText className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-blue-900 text-[11px]">Observações:</p>
                      <p className="text-[11px] text-blue-950 mt-0.5 leading-snug whitespace-pre-wrap">
                        {lab.notes}
                      </p>
                    </div>
                  </div>
                )}

                {/* Softwares Disponíveis no Lab */}
                <div className="mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 mb-1.5">
                    <Code className="w-3.5 h-3.5 text-blue-600" />
                    <span>Softwares instalados:</span>
                  </div>
                  {lab.softwares && lab.softwares.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {lab.softwares.map((sw) => (
                        <span
                          key={sw}
                          className="px-2 py-0.5 text-[10px] font-semibold bg-white text-slate-700 border border-slate-200 rounded-md shadow-2xs"
                        >
                          {sw}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-500 italic">
                      Nenhum software específico cadastrado.
                    </p>
                  )}
                </div>

                {/* Status de Ocupação no Dia */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Ocupação ({selectedDate}):
                    </span>
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        dayBookings.length > 0
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {dayBookings.length === 0
                        ? 'Totalmente Livre'
                        : `${dayBookings.length} aula(s)`}
                    </span>
                  </div>

                  {dayBookings.length > 0 ? (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {dayBookings.map((b, bIdx) => (
                        <div
                          key={`${b.id}-${bIdx}`}
                          className={`p-2 rounded-lg text-[11px] border ${
                            b.status === 'confirmed'
                              ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                              : 'bg-amber-50/60 border-amber-200 text-amber-900'
                          }`}
                        >
                          <div className="flex justify-between font-semibold">
                            <span>{b.timeSlot}</span>
                            <span className="text-[10px] font-normal uppercase">
                              {b.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                            </span>
                          </div>
                          <div className="text-slate-600 truncate mt-0.5">
                            {b.teacherName} • {b.classGroup}
                          </div>
                          {b.isMobileLab && b.roomNumber && (
                            <div className="text-rose-700 font-medium text-[10px] mt-0.5">
                              🚚 Entregar na: {b.roomNumber}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-600 italic py-1">
                      Nenhum agendamento para esta data. Horários disponíveis para reserva!
                    </p>
                  )}
                </div>
              </div>

              {/* Botão de Agendamento */}
              <div className="p-4 bg-slate-50 border-t border-slate-100">
                {isUnderMaint ? (
                  <div className="w-full py-2 px-3 text-xs font-semibold text-rose-700 bg-rose-50/80 border border-rose-200 rounded-xl flex items-center justify-center gap-1.5 text-center">
                    <Wrench className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span className="truncate">Em Manutenção ({maintStatus.formattedPeriod})</span>
                  </div>
                ) : (
                  <button
                    id={`book-now-lab-${lab.id}`}
                    onClick={() => onSelectLabToBook(lab.id)}
                    className="w-full py-2 px-3 text-xs font-semibold text-blue-700 bg-white hover:bg-blue-600 hover:text-white border border-blue-200 hover:border-blue-600 rounded-xl transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Agendar {lab.name}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
