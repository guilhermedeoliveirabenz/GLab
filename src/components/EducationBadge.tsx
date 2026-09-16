import React from 'react';
import { EducationLevel, EDUCATION_LEVEL_OPTIONS, EDUCATION_LEVEL_LABELS } from '../types';
import { School, GraduationCap, MonitorPlay, Sparkles } from 'lucide-react';

interface EducationBadgeProps {
  level?: EducationLevel;
  size?: 'xs' | 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

export function getEducationLevelIcon(level?: EducationLevel, className = 'w-3 h-3') {
  switch (level) {
    case 'basico':
      return <School className={className} />;
    case 'superior':
      return <GraduationCap className={className} />;
    case 'ead':
      return <MonitorPlay className={className} />;
    case 'outros':
    default:
      return <Sparkles className={className} />;
  }
}

export const EducationBadge: React.FC<EducationBadgeProps> = ({
  level,
  size = 'sm',
  showIcon = true,
  className = '',
}) => {
  if (!level) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 text-slate-600 font-medium ${
          size === 'xs'
            ? 'px-1.5 py-0.5 text-[10px]'
            : size === 'md'
            ? 'px-2.5 py-1 text-xs'
            : 'px-2 py-0.5 text-[11px]'
        } ${className}`}
      >
        <span>Não definido</span>
      </span>
    );
  }

  const option = EDUCATION_LEVEL_OPTIONS.find((opt) => opt.id === level) || {
    id: level,
    label: EDUCATION_LEVEL_LABELS[level] || level,
    shortLabel: EDUCATION_LEVEL_LABELS[level] || level,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    dotColor: 'bg-slate-500',
  };

  const iconSizeClass = size === 'xs' ? 'w-2.5 h-2.5' : size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold ${option.badgeClass} ${
        size === 'xs'
          ? 'px-1.5 py-0.5 text-[10px]'
          : size === 'md'
          ? 'px-2.5 py-1 text-xs'
          : 'px-2 py-0.5 text-[11px]'
      } ${className}`}
      title={`Nível/Modalidade: ${option.label}`}
    >
      {showIcon && getEducationLevelIcon(level, iconSizeClass)}
      <span>{size === 'xs' ? option.shortLabel : option.label}</span>
    </span>
  );
};

interface EducationLevelSelectorProps {
  value: EducationLevel;
  onChange: (val: EducationLevel) => void;
  idPrefix?: string;
  disabled?: boolean;
}

export const EducationLevelSelector: React.FC<EducationLevelSelectorProps> = ({
  value,
  onChange,
  idPrefix = 'edu-level',
  disabled = false,
}) => {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-700 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
          <span>Nível de Ensino / Segmento *</span>
        </span>
        <span className="text-[10px] text-slate-400 font-normal">Selecione o público da aula</span>
      </label>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {EDUCATION_LEVEL_OPTIONS.map((opt) => {
          const isSelected = value === opt.id;
          return (
            <button
              key={opt.id}
              id={`${idPrefix}-${opt.id}`}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.id)}
              className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1 cursor-pointer ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-1 ring-blue-600/30'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      opt.id === 'basico'
                        ? 'bg-emerald-500'
                        : opt.id === 'superior'
                        ? 'bg-indigo-500'
                        : opt.id === 'ead'
                        ? 'bg-purple-500'
                        : 'bg-amber-500'
                    }`}
                  />
                  <span className={`text-xs font-bold ${isSelected ? 'text-blue-950' : 'text-slate-800'}`}>
                    {opt.label}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 line-clamp-1">{opt.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
