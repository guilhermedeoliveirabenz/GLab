import React, { useState, useMemo } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Clock,
  Layers,
  Sparkles,
  Clipboard,
  Info,
  ChevronRight,
  Filter,
  Check,
  Shield,
  ShieldAlert,
  Lock,
  Phone,
  FileDown,
  Table,
} from 'lucide-react';
import { Booking, Lab, LAB_LIST, EducationLevel } from '../types';
import { EducationBadge } from './EducationBadge';
import { useAuth } from '../lib/authContext';
import {
  readSpreadsheetFile,
  parsePastedClipboardText,
  parseWeeklyGridMatrix,
  generateBookingsForSingleWeek,
  generateBookingsForSemesterRange,
  downloadSampleExcelFile,
  downloadTeacherTemplateFile,
  SAMPLE_IMAGE_SCHEDULE_MATRIX,
  SAMPLE_TEACHER_LIST_MATRIX,
  isTabularMatrix,
  parseTabularBookingsMatrix,
  formatPhoneNumber,
  isValidPhoneNumber,
  BatchBookingCandidate,
} from '../lib/batchScheduleParser';
import { createBatchBookings } from '../lib/bookingService';

interface BatchImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  labs?: Lab[];
  existingBookings?: Booking[];
  defaultLabId?: string;
  onSuccess?: (createdCount: number) => void;
  onOpenLogin?: () => void;
}

export const BatchImportModal: React.FC<BatchImportModalProps> = ({
  isOpen,
  onClose,
  labs = LAB_LIST,
  existingBookings = [],
  defaultLabId,
  onSuccess,
  onOpenLogin,
}) => {
  const { isAdmin, user } = useAuth();

  // Entrada de dados
  const [inputTab, setInputTab] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [rawMatrix, setRawMatrix] = useState<string[][] | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Configurações do Lote
  const [selectedLabId, setSelectedLabId] = useState<string>(
    defaultLabId || (labs.length > 0 ? labs[0].id : LAB_LIST[0].id)
  );
  const [applicationMode, setApplicationMode] = useState<'single_week' | 'semester_range'>('single_week');
  
  // Data inicial padrão: próxima segunda-feira a partir de hoje
  const getNextMonday = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? 1 : (8 - day) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
  };

  const [weekStartDate, setWeekStartDate] = useState<string>(getNextMonday());
  const [semesterStartDate, setSemesterStartDate] = useState<string>(getNextMonday());
  // Fim do semestre: ~3 meses à frente
  const getDefaultSemesterEnd = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split('T')[0];
  };
  const [semesterEndDate, setSemesterEndDate] = useState<string>(getDefaultSemesterEnd());

  const [groupConsecutive, setGroupConsecutive] = useState(true);
  const [initialStatus, setInitialStatus] = useState<'confirmed' | 'pending'>('confirmed');
  const [batchEducationLevel, setBatchEducationLevel] = useState<EducationLevel>('basico');

  // Candidatos gerados
  const [candidates, setCandidates] = useState<BatchBookingCandidate[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessCount, setSaveSuccessCount] = useState<number | null>(null);

  // Lab selecionado atual
  const currentLab = useMemo(() => {
    return labs.find((l) => l.id === selectedLabId) || labs[0] || LAB_LIST[0];
  }, [labs, selectedLabId]);

  // Carrega e processa a matriz quando os parâmetros mudam
  const processMatrix = (matrixToUse: string[][]) => {
    try {
      setParseError(null);

      // 1. Verifica se é o formato Lista / Tabela (Professor, Matéria, Celular...)
      if (isTabularMatrix(matrixToUse)) {
        const generated = parseTabularBookingsMatrix(
          matrixToUse,
          currentLab,
          labs,
          applicationMode === 'single_week' ? weekStartDate : semesterStartDate,
          existingBookings,
          batchEducationLevel
        );

        if (generated.length === 0) {
          setParseError(
            'Não foram identificadas linhas válidas com Nome do Professor ou Matéria na planilha. Baixe o modelo oficial com colunas de Nome do Professor, Matéria e Número do Celular.'
          );
          setCandidates([]);
          return;
        }

        setCandidates(generated);
        return;
      }

      // 2. Formato Grade Semanal (Horário x Seg, Ter, Qua, Qui, Sex)
      const slots = parseWeeklyGridMatrix(matrixToUse);

      if (slots.length === 0) {
        setParseError(
          'Não foram identificadas colunas de dias da semana (Seg, Ter, Qua, Qui...) nem colunas de Professor/Matéria/Celular. Baixe o modelo oficial para conferir a estrutura recomendada.'
        );
        setCandidates([]);
        return;
      }

      let generated: BatchBookingCandidate[] = [];

      if (applicationMode === 'single_week') {
        generated = generateBookingsForSingleWeek(
          slots,
          weekStartDate,
          currentLab,
          groupConsecutive,
          existingBookings
        );
      } else {
        generated = generateBookingsForSemesterRange(
          slots,
          semesterStartDate,
          semesterEndDate,
          currentLab,
          groupConsecutive,
          existingBookings
        );
      }

      setCandidates(generated);
    } catch (err: any) {
      console.error('Erro ao processar grade:', err);
      setParseError('Falha ao processar dados da grade: ' + (err?.message || 'Formato desconhecido'));
      setCandidates([]);
    }
  };

  // Trata upload de arquivo
  const handleFileUpload = async (file: File) => {
    try {
      setIsProcessing(true);
      setParseError(null);
      setUploadedFileName(file.name);
      const matrix = await readSpreadsheetFile(file);
      setRawMatrix(matrix);
      processMatrix(matrix);
    } catch (err: any) {
      console.error('Erro ao ler arquivo:', err);
      setParseError('Não foi possível ler o arquivo Excel/CSV. Verifique se o arquivo não está corrompido.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Trata texto colado
  const handlePasteProcess = () => {
    if (!pastedText.trim()) {
      setParseError('Cole os dados da planilha na caixa de texto.');
      return;
    }
    try {
      setIsProcessing(true);
      setParseError(null);
      const matrix = parsePastedClipboardText(pastedText);
      setRawMatrix(matrix);
      setUploadedFileName('Dados colados da área de transferência');
      processMatrix(matrix);
    } catch (err: any) {
      setParseError('Erro ao interpretar texto colado: ' + err?.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Carrega o exemplo da imagem do usuário
  const handleLoadSampleFromImage = () => {
    setParseError(null);
    setRawMatrix(SAMPLE_IMAGE_SCHEDULE_MATRIX);
    setUploadedFileName('Exemplo da Grade do Usuário (Imagem)');
    processMatrix(SAMPLE_IMAGE_SCHEDULE_MATRIX);
  };

  // Carrega o exemplo modelo com Professor, Matéria e Celular
  const handleLoadSampleTeachers = () => {
    setParseError(null);
    setRawMatrix(SAMPLE_TEACHER_LIST_MATRIX);
    setUploadedFileName('Exemplo: Professores, Matérias e Celulares');
    processMatrix(SAMPLE_TEACHER_LIST_MATRIX);
  };

  // Re-processa quando filtros de data/lab mudam e já temos uma matriz carregada
  const handleReapplyFilters = () => {
    if (rawMatrix) {
      processMatrix(rawMatrix);
    }
  };

  // Selecionar / desselecionar todos
  const handleToggleSelectAll = (selectAll: boolean) => {
    setCandidates((prev) => prev.map((c) => ({ ...c, selected: selectAll })));
  };

  const handleToggleCandidate = (tempId: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.tempId === tempId ? { ...c, selected: !c.selected } : c))
    );
  };

  // Edição inline de candidato
  const handleUpdateCandidateField = (
    tempId: string,
    field: keyof BatchBookingCandidate,
    value: string
  ) => {
    setCandidates((prev) =>
      prev.map((c) => (c.tempId === tempId ? { ...c, [field]: value } : c))
    );
  };

  // Estatísticas dos candidatos
  const selectedCount = candidates.filter((c) => c.selected).length;
  const conflictCount = candidates.filter((c) => c.hasConflict).length;
  const uniqueTeachersCount = new Set(candidates.map((c) => c.teacherName)).size;
  const uniqueSubjectsCount = new Set(candidates.map((c) => c.subject)).size;
  const validPhonesCount = candidates.filter(
    (c) => c.whatsapp && c.whatsapp !== '(00) 00000-0000' && isValidPhoneNumber(c.whatsapp)
  ).length;

  // Confirmar e salvar todos os agendamentos selecionados
  const handleConfirmImport = async () => {
    if (!isAdmin) {
      setParseError('Acesso negado: Apenas a equipe técnica de TI ou administradores podem importar agendamentos em lote.');
      return;
    }

    const toSave = candidates.filter((c) => c.selected);
    if (toSave.length === 0) return;

    try {
      setIsSaving(true);
      const itemsToCreate = toSave.map((c) => ({
        teacherName: c.teacherName,
        whatsapp: c.whatsapp || '(00) 00000-0000',
        classGroup: c.classGroup || 'Geral',
        subject: c.subject,
        labId: c.labId,
        labName: c.labName,
        isMobileLab: c.isMobileLab,
        date: c.date,
        timeSlot: c.timeSlot,
        startTime: c.startTime,
        endTime: c.endTime,
        shift: c.shift,
        educationLevel: c.educationLevel || batchEducationLevel || 'basico',
        notes: c.notes || `Agendamento importado via lote em ${new Date().toLocaleDateString('pt-BR')}`,
        status: initialStatus,
      }));

      await createBatchBookings(itemsToCreate, initialStatus);
      setSaveSuccessCount(toSave.length);
      if (onSuccess) {
        onSuccess(toSave.length);
      }
    } catch (err: any) {
      console.error('Erro ao salvar em lote:', err);
      setParseError('Ocorreu um erro ao gravar os agendamentos: ' + (err?.message || 'Tente novamente'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <FileSpreadsheet className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold tracking-tight">
                  Importação de Agendamentos por Lote
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/40 text-blue-100 border border-blue-400/30">
                  Grade / Planilha
                </span>
                {isAdmin ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-emerald-300" />
                    <span>{user?.role === 'technician' ? 'Técnico de TI' : 'Admin'}</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/30 text-amber-200 border border-amber-400/40 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-300" />
                    <span>Exclusivo TI & Admin</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-100/80 mt-0.5">
                Suba ou cole grades semanais (Hor x Dias da Semana) e gere agendamentos automaticamente
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            title="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body com Scroll */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {!isAdmin ? (
            /* Tela de Bloqueio de Acesso Restrito (Apenas TI ou Admin) */
            <div className="text-center py-12 px-6 space-y-5 max-w-md mx-auto bg-white p-8 rounded-2xl border border-amber-200 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 mx-auto flex items-center justify-center shadow-xs">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Acesso Restrito: Apenas TI ou Administradores</span>
                </div>
                <h4 className="text-lg font-bold text-slate-900">
                  Permissão Exclusiva de TI / Administração
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  A importação em lote por planilha Excel ou grade semanal altera a agenda de laboratórios em grande escala e é uma funcionalidade restrita exclusivamente aos <strong>técnicos de TI</strong> e <strong>administradores gerais</strong> do sistema.
                </p>
                <p className="text-xs text-slate-500">
                  Se você é professor, solicite reservas individuais através do formulário de agendamento.
                </p>
              </div>

              <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
                {onOpenLogin && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenLogin();
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Entrar como TI / Admin</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          ) : saveSuccessCount !== null ? (
            /* Tela de Sucesso */
            <div className="text-center py-10 space-y-4 max-w-lg mx-auto bg-white p-8 rounded-2xl border border-emerald-200 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-bold text-slate-900">
                {saveSuccessCount} Agendamentos Criados com Sucesso!
              </h4>
              <p className="text-sm text-slate-600">
                Os agendamentos da grade foram registrados para o laboratório{' '}
                <strong className="text-slate-900 font-semibold">{currentLab.name}</strong> e já
                estão visíveis no calendário e na matriz de ocupação diária.
              </p>
              <div className="pt-3 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSaveSuccessCount(null);
                    setCandidates([]);
                    setRawMatrix(null);
                    setUploadedFileName(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Importar Mais Aulas
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  Fechar e Visualizar Calendário
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Etapa 1: Métodos de Entrada de Dados */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                {/* Cabeçalho Passo 1 com Modelos para Download */}
                <div className="space-y-3 border-b border-slate-100 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
                        Passo 1
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">
                        Entrada dos Dados da Grade / Planilha
                      </h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Botão Baixar Modelo de Professores */}
                      <button
                        type="button"
                        onClick={() => downloadTeacherTemplateFile('xlsx')}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                        title="Baixar planilha com colunas: Nome do Professor, Matéria e Celular"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>Baixar Modelo (.xlsx)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadTeacherTemplateFile('csv')}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        title="Baixar modelo em formato CSV"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span>CSV</span>
                      </button>

                      {/* Botão Testar com Exemplo de Professores */}
                      <button
                        type="button"
                        onClick={handleLoadSampleTeachers}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Carregar exemplo preenchido com Professor, Matéria e Celular"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Carregar Exemplo de Professores</span>
                      </button>
                    </div>
                  </div>

                  {/* Banner Explicativo do Modelo com Professor, Matéria e Celular */}
                  <div className="bg-linear-to-r from-blue-50/80 to-indigo-50/60 border border-blue-100 rounded-xl p-3 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <Table className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-slate-900">
                          Estrutura do Modelo de Importação (Colunas):
                        </p>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          <strong className="text-blue-900">1. Nome do Professor</strong> &bull;{' '}
                          <strong className="text-blue-900">2. Matéria / Disciplina</strong> &bull;{' '}
                          <strong className="text-emerald-800">3. Número do Celular (WhatsApp)</strong> &bull;{' '}
                          4. Data &bull; 5. Início &bull; 6. Fim &bull; 7. Turma &bull; 8. Lab
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={downloadSampleExcelFile}
                        className="text-[11px] text-slate-500 hover:text-slate-800 underline font-medium cursor-pointer"
                        title="Baixar modelo em grade horária (Seg a Sex)"
                      >
                        Modelo alternativo (Grade semanal)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Alternância Upload vs Colar */}
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <button
                    type="button"
                    onClick={() => setInputTab('upload')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                      inputTab === 'upload'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Upload Arquivo (.xlsx, .xls, .csv)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInputTab('paste')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                      inputTab === 'paste'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    <span>Colar Direto do Excel (Ctrl+V)</span>
                  </button>
                </div>

                {/* Conteúdo da Aba Upload */}
                {inputTab === 'upload' ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragActive(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleFileUpload(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                      dragActive
                        ? 'border-blue-500 bg-blue-50/50'
                        : uploadedFileName
                        ? 'border-emerald-400 bg-emerald-50/30'
                        : 'border-slate-300 hover:border-blue-400 bg-slate-50/50'
                    }`}
                  >
                    <input
                      type="file"
                      id="spreadsheet-file-input"
                      accept=".xlsx, .xls, .csv"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(e.target.files[0]);
                        }
                      }}
                    />
                    <label
                      htmlFor="spreadsheet-file-input"
                      className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                    >
                      <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <div>
                        {uploadedFileName ? (
                          <div className="flex items-center justify-center gap-1.5 text-emerald-700 font-bold text-sm">
                            <Check className="w-4 h-4" />
                            <span>Arquivo carregado: {uploadedFileName}</span>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm font-semibold text-slate-800">
                              Clique para selecionar ou arraste sua planilha aqui
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              Formatos aceitos: Microsoft Excel (.xlsx, .xls) ou CSV
                            </p>
                          </>
                        )}
                      </div>
                    </label>
                  </div>
                ) : (
                  /* Conteúdo da Aba Colar */
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500">
                      Abra sua planilha no Excel ou Google Planilhas, selecione as células da grade
                      (incluindo a linha de cabeçalho com Hor, Seg, Ter...), copie (Ctrl+C) e cole
                      abaixo:
                    </p>
                    <textarea
                      rows={5}
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      placeholder="Cole aqui os dados copiados da planilha (Ctrl+V)..."
                      className="w-full text-xs font-mono p-3 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handlePasteProcess}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Processar Texto Colado</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Exibição de Erro de Processamento */}
                {parseError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Aviso no Processamento</p>
                      <p className="mt-0.5 text-rose-700">{parseError}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Etapa 2: Configurações do Lote (Laboratório, Período e Agrupamento) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
                    Passo 2
                  </span>
                  <h4 className="text-sm font-bold text-slate-900">
                    Configuração do Laboratório e Período de Aplicação
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Laboratório Alvo */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Laboratório de Destino
                    </label>
                    <select
                      value={selectedLabId}
                      onChange={(e) => {
                        setSelectedLabId(e.target.value);
                      }}
                      className="w-full text-xs font-semibold p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                    >
                      {labs.map((lab) => (
                        <option key={lab.id} value={lab.id}>
                          {lab.name} ({lab.capacity} máq. {lab.isMobile ? '- Móvel' : '- Fixo'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Modo de Aplicação */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Período de Aplicação
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setApplicationMode('single_week')}
                        className={`py-1.5 px-2 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                          applicationMode === 'single_week'
                            ? 'bg-white text-blue-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Semana Única
                      </button>
                      <button
                        type="button"
                        onClick={() => setApplicationMode('semester_range')}
                        className={`py-1.5 px-2 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                          applicationMode === 'semester_range'
                            ? 'bg-white text-blue-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Semestre / Faixa
                      </button>
                    </div>
                  </div>

                  {/* Datas dependendo do Modo */}
                  {applicationMode === 'single_week' ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Semana de Referência (Segunda-feira)
                      </label>
                      <input
                        type="date"
                        value={weekStartDate}
                        onChange={(e) => setWeekStartDate(e.target.value)}
                        className="w-full text-xs p-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Data Inicial
                        </label>
                        <input
                          type="date"
                          value={semesterStartDate}
                          onChange={(e) => setSemesterStartDate(e.target.value)}
                          className="w-full text-xs p-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Data Final
                        </label>
                        <input
                          type="date"
                          value={semesterEndDate}
                          onChange={(e) => setSemesterEndDate(e.target.value)}
                          className="w-full text-xs p-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </>
                  )}

                  {/* Status Inicial */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Status Inicial dos Agendamentos
                    </label>
                    <select
                      value={initialStatus}
                      onChange={(e) => setInitialStatus(e.target.value as 'confirmed' | 'pending')}
                      className="w-full text-xs font-semibold p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="confirmed">Confirmado (Aprovação Direta)</option>
                      <option value="pending">Pendente (Aguardando Revisão)</option>
                    </select>
                  </div>

                  {/* Segmento / Nível Padrão */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Segmento Educacional Padrão
                    </label>
                    <select
                      value={batchEducationLevel}
                      onChange={(e) => {
                        const newLevel = e.target.value as EducationLevel;
                        setBatchEducationLevel(newLevel);
                        setCandidates((prev) =>
                          prev.map((c) => ({ ...c, educationLevel: c.educationLevel || newLevel }))
                        );
                      }}
                      className="w-full text-xs font-semibold p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="basico">Ensino Básico</option>
                      <option value="superior">Ensino Superior</option>
                      <option value="ead">EAD</option>
                      <option value="outros">Outros</option>
                    </select>
                  </div>
                </div>

                {/* Opção de Agrupamento Consecutivo */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={groupConsecutive}
                      onChange={(e) => setGroupConsecutive(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-semibold text-slate-800">
                      Agrupar horários contínuos da mesma disciplina e professor (ex: 19:00 às 22:15)
                    </span>
                  </label>

                  {rawMatrix && (
                    <button
                      type="button"
                      onClick={handleReapplyFilters}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Filter className="w-3.5 h-3.5" />
                      <span>Recalcular Prévia com essas opções</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Etapa 3: Prévia da Grade e Seleção de Itens */}
              {candidates.length > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
                        Passo 3
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">
                        Prévia dos Agendamentos Gerados ({candidates.length})
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleSelectAll(true)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-bold px-2 py-1 rounded hover:bg-blue-50 cursor-pointer"
                      >
                        Marcar Todos
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => handleToggleSelectAll(false)}
                        className="text-xs text-slate-500 hover:text-slate-800 font-bold px-2 py-1 rounded hover:bg-slate-100 cursor-pointer"
                      >
                        Desmarcar Todos
                      </button>
                    </div>
                  </div>

                  {/* Resumo Métricas Rápidas */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                      <span className="text-[10px] font-bold uppercase text-blue-700 block">
                        Selecionados
                      </span>
                      <span className="text-lg font-bold text-blue-950">
                        {selectedCount} de {candidates.length}
                      </span>
                    </div>

                    <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl">
                      <span className="text-[10px] font-bold uppercase text-indigo-700 block">
                        Professores
                      </span>
                      <span className="text-lg font-bold text-indigo-950">
                        {uniqueTeachersCount}
                      </span>
                    </div>

                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                      <span className="text-[10px] font-bold uppercase text-emerald-700 block">
                        Celular / WhatsApp
                      </span>
                      <span className="text-lg font-bold text-emerald-950">
                        {validPhonesCount} de {candidates.length}
                      </span>
                    </div>

                    <div
                      className={`p-3 rounded-xl border ${
                        conflictCount > 0
                          ? 'bg-amber-50 border-amber-300 text-amber-900'
                          : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase block">
                        Conflitos Identificados
                      </span>
                      <span className="text-lg font-bold">
                        {conflictCount}
                      </span>
                    </div>
                  </div>

                  {/* Tabela de Candidatos */}
                  <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-[360px] overflow-y-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10">
                        <tr>
                          <th className="p-2.5 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={selectedCount === candidates.length && candidates.length > 0}
                              onChange={(e) => handleToggleSelectAll(e.target.checked)}
                              className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500"
                            />
                          </th>
                          <th className="p-2.5">Data / Dia</th>
                          <th className="p-2.5">Horário / Turno</th>
                          <th className="p-2.5">Professor</th>
                          <th className="p-2.5">Celular / WhatsApp</th>
                          <th className="p-2.5">Matéria / Disciplina</th>
                          <th className="p-2.5">Turma</th>
                          <th className="p-2.5">Segmento</th>
                          <th className="p-2.5">Laboratório</th>
                          <th className="p-2.5">Validação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {candidates.map((cand) => {
                          const dateObj = new Date(cand.date + 'T12:00:00');
                          const formattedDate = dateObj.toLocaleDateString('pt-BR');

                          return (
                            <tr
                              key={cand.tempId}
                              className={`hover:bg-slate-50/80 transition-colors ${
                                !cand.selected ? 'opacity-50 bg-slate-50/40' : ''
                              } ${cand.hasConflict ? 'bg-amber-50/30' : ''}`}
                            >
                              <td className="p-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={cand.selected}
                                  onChange={() => handleToggleCandidate(cand.tempId)}
                                  className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                              </td>
                              <td className="p-2.5 whitespace-nowrap font-medium text-slate-800">
                                <div>{cand.dayOfWeekName}</div>
                                <div className="text-[11px] text-slate-500">{formattedDate}</div>
                              </td>
                              <td className="p-2.5 whitespace-nowrap">
                                <div className="font-semibold text-slate-900">{cand.timeSlot}</div>
                                <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700 mt-0.5">
                                  {cand.shift === 'manha'
                                    ? 'Manhã'
                                    : cand.shift === 'tarde'
                                    ? 'Tarde'
                                    : 'Noite'}
                                </span>
                              </td>
                              <td className="p-2.5">
                                <input
                                  type="text"
                                  value={cand.teacherName}
                                  onChange={(e) =>
                                    handleUpdateCandidateField(cand.tempId, 'teacherName', e.target.value)
                                  }
                                  className="w-full text-xs font-semibold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none px-1 py-0.5 rounded"
                                  placeholder="Nome do professor"
                                />
                              </td>
                              <td className="p-2.5 whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <input
                                    type="text"
                                    value={cand.whatsapp || ''}
                                    placeholder="(11) 9XXXX-XXXX"
                                    onChange={(e) =>
                                      handleUpdateCandidateField(cand.tempId, 'whatsapp', e.target.value)
                                    }
                                    onBlur={(e) => {
                                      const formatted = formatPhoneNumber(e.target.value);
                                      if (formatted) {
                                        handleUpdateCandidateField(cand.tempId, 'whatsapp', formatted);
                                      }
                                    }}
                                    className={`w-32 text-xs font-mono px-1.5 py-0.5 rounded border transition-colors ${
                                      !cand.whatsapp || cand.whatsapp === '(00) 00000-0000'
                                        ? 'border-amber-300 bg-amber-50/60 text-amber-900 placeholder:text-amber-400'
                                        : 'border-slate-200 bg-white text-slate-800 focus:border-blue-500'
                                    } focus:outline-none`}
                                  />
                                </div>
                              </td>
                              <td className="p-2.5">
                                <input
                                  type="text"
                                  value={cand.subject}
                                  onChange={(e) =>
                                    handleUpdateCandidateField(cand.tempId, 'subject', e.target.value)
                                  }
                                  className="w-full text-xs font-semibold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none px-1 py-0.5 rounded"
                                  placeholder="Matéria / Disciplina"
                                />
                              </td>
                              <td className="p-2.5 whitespace-nowrap">
                                <input
                                  type="text"
                                  value={cand.classGroup}
                                  onChange={(e) =>
                                    handleUpdateCandidateField(cand.tempId, 'classGroup', e.target.value)
                                  }
                                  className="w-24 text-xs font-mono text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none px-1 py-0.5 rounded"
                                />
                              </td>
                              <td className="p-2.5 whitespace-nowrap">
                                <select
                                  value={cand.educationLevel || batchEducationLevel}
                                  onChange={(e) =>
                                    handleUpdateCandidateField(cand.tempId, 'educationLevel' as any, e.target.value)
                                  }
                                  className="text-[11px] font-semibold py-1 px-1.5 border border-slate-200 rounded-lg bg-white text-slate-800"
                                >
                                  <option value="basico">Básico</option>
                                  <option value="superior">Superior</option>
                                  <option value="ead">EAD</option>
                                  <option value="outros">Outros</option>
                                </select>
                              </td>
                              <td className="p-2.5 whitespace-nowrap text-slate-700 font-medium">
                                {cand.labName}
                              </td>
                              <td className="p-2.5 whitespace-nowrap">
                                {cand.hasConflict ? (
                                  <span
                                    className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1"
                                    title={cand.conflictDetails}
                                  >
                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                    <span>Conflito</span>
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span>Livre</span>
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {conflictCount > 0 && (
                    <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                      <strong>Atenção:</strong> Foram detectados {conflictCount} agendamentos com
                      possível sobreposição de horário no mesmo laboratório. Por padrão, eles vêm
                      desmarcados para evitar duplicidades, mas você pode marcá-los manualmente se
                      desejar.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {isAdmin && saveSuccessCount === null && (
          <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-slate-600">
              {candidates.length > 0 ? (
                <span>
                  Pronto para importar <strong>{selectedCount}</strong> agendamento(s) no laboratório{' '}
                  <strong>{currentLab.name}</strong>.
                </span>
              ) : (
                <span>Carregue ou cole sua planilha de grade para visualizar a prévia.</span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                id="confirm-batch-import-btn"
                type="button"
                onClick={handleConfirmImport}
                disabled={selectedCount === 0 || isSaving}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer ${
                  selectedCount > 0 && !isSaving
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Salvando Agendamentos...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Importar {selectedCount} Agendamentos</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
