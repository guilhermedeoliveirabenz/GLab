import * as XLSX from 'xlsx';
import { Booking, Lab, ShiftType, EducationLevel } from '../types';

export interface ParsedTimetableCell {
  raw: string;
  subject: string;
  classGroup: string;
  teacherName: string;
}

export interface ParsedScheduleSlot {
  dayOfWeekIndex: number; // 0 = Domingo, 1 = Segunda, 2 = Terça, 3 = Quarta, 4 = Quinta, 5 = Sexta, 6 = Sábado
  dayOfWeekName: string; // "Segunda", "Terça", etc.
  startTime: string; // "19:00"
  endTime: string; // "19:45"
  subject: string;
  classGroup: string;
  teacherName: string;
  rawCell: string;
}

export interface BatchBookingCandidate {
  tempId: string;
  selected: boolean;
  date: string; // YYYY-MM-DD
  dayOfWeekName: string;
  startTime: string;
  endTime: string;
  timeSlot: string; // "19:00 às 22:15"
  shift: ShiftType;
  labId: string;
  labName: string;
  isMobileLab: boolean;
  teacherName: string;
  classGroup: string;
  subject: string;
  whatsapp: string;
  educationLevel?: EducationLevel;
  notes?: string;
  hasConflict?: boolean;
  conflictDetails?: string;
}

// Normaliza cabeçalhos de dias da semana para índice 0..6
export const DAY_HEADER_MAP: Record<string, number> = {
  seg: 1,
  segunda: 1,
  'segunda-feira': 1,
  mon: 1,
  monday: 1,
  ter: 2,
  terca: 2,
  terça: 2,
  'terça-feira': 2,
  'terca-feira': 2,
  tue: 2,
  tuesday: 2,
  qua: 3,
  quarta: 3,
  'quarta-feira': 3,
  wed: 3,
  wednesday: 3,
  qui: 4,
  quinta: 4,
  'quinta-feira': 4,
  thu: 4,
  thursday: 4,
  sex: 5,
  sexta: 5,
  'sexta-feira': 5,
  fri: 5,
  friday: 5,
  sab: 6,
  sáb: 6,
  sabado: 6,
  sábado: 6,
  sat: 6,
  saturday: 6,
  dom: 0,
  domingo: 0,
  sun: 0,
  sunday: 0,
};

export const DAY_NAMES_BY_INDEX: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
};

/**
 * Determina o turno a partir do horário de início
 */
export function getShiftFromTime(timeStr: string): ShiftType {
  const match = timeStr.match(/^(\d{1,2}):?(\d{2})?/);
  if (!match) return 'noite';
  const hour = parseInt(match[1], 10);
  if (hour < 12) return 'manha';
  if (hour < 18) return 'tarde';
  return 'noite';
}

/**
 * Normaliza um horário para o padrão "HH:mm"
 */
export function normalizeTimeString(raw: string): string {
  if (!raw) return '19:00';
  const clean = raw.trim().toLowerCase().replace('h', ':');
  const match = clean.match(/(\d{1,2})[:.]?(\d{2})?/);
  if (!match) return '19:00';
  const h = match[1].padStart(2, '0');
  const m = match[2] ? match[2].padEnd(2, '0') : '00';
  return `${h}:${m}`;
}

/**
 * Adiciona minutos a um horário "HH:mm"
 */
export function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  const [hStr, mStr] = normalizeTimeString(timeStr).split(':');
  let h = parseInt(hStr, 10);
  let m = parseInt(mStr, 10) + minutesToAdd;
  h += Math.floor(m / 60);
  m = m % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Analisa o conteúdo de uma célula da grade (como visto na imagem do usuário):
 * Exemplo 1:
 *   Linha 1: "Direção de Arte"
 *   Linha 2: "GBCSPP43A - Joabe Martins Silva"
 * Exemplo 2:
 *   Linha 1: "Procedimentos e Rotinas C - GBCCON23A"
 *   Linha 2: "Ricardo De Souza"
 */
export function parseGridCell(cellText: string): ParsedTimetableCell | null {
  if (!cellText || typeof cellText !== 'string') return null;
  const trimmed = cellText.trim();
  if (!trimmed) return null;

  const lines = trimmed
    .split(/\r?\n|<br\s*\/?>/i)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return null;

  let subject = '';
  let classGroup = '';
  let teacherName = '';

  if (lines.length >= 2) {
    const line1 = lines[0];
    const line2 = lines.slice(1).join(' - ');

    // Caso A: Linha 2 tem o formato "TURMA - Professor", ex: "GBCSPP43A - Joabe Martins Silva"
    const line2Match = line2.match(/^([A-Z0-9_-]{3,20})\s*[-–—]\s*(.+)$/i);
    if (line2Match) {
      subject = line1;
      classGroup = line2Match[1].trim();
      teacherName = line2Match[2].trim();
    } else {
      // Caso B: Linha 1 possui a turma no fim, ex: "Procedimentos e Rotinas C - GBCCON23A" e Linha 2 é "Ricardo De Souza"
      const line1Match = line1.match(/^(.+?)\s*[-–—]\s*([A-Z0-9_-]{3,20})$/i);
      if (line1Match) {
        subject = line1Match[1].trim();
        classGroup = line1Match[2].trim();
        teacherName = line2;
      } else {
        // Caso genérico com 2 linhas
        subject = line1;
        teacherName = line2;
      }
    }
  } else {
    // Apenas 1 linha: tenta separar por traço
    const single = lines[0];
    const parts = single.split(/\s*[-–—]\s*/);
    if (parts.length >= 3) {
      subject = parts[0];
      classGroup = parts[1];
      teacherName = parts.slice(2).join(' - ');
    } else if (parts.length === 2) {
      subject = parts[0];
      teacherName = parts[1];
    } else {
      subject = single;
    }
  }

  // Limpeza de campos
  subject = subject.replace(/\s+/g, ' ').trim();
  classGroup = classGroup.replace(/\s+/g, ' ').trim();
  teacherName = teacherName.replace(/\s+/g, ' ').trim();

  return {
    raw: cellText,
    subject,
    classGroup,
    teacherName,
  };
}

/**
 * Converte dados brutos (matriz 2D de strings) em slots de horários semanais
 */
export function parseWeeklyGridMatrix(matrix: string[][]): ParsedScheduleSlot[] {
  if (!matrix || matrix.length < 2) return [];

  // 1. Localiza a linha de cabeçalho com dias da semana
  let headerRowIndex = -1;
  let dayColumnMap: { colIndex: number; dayIndex: number; dayName: string }[] = [];
  let timeColIndex = 0;

  for (let r = 0; r < Math.min(matrix.length, 5); r++) {
    const row = matrix[r];
    const foundDays: { colIndex: number; dayIndex: number; dayName: string }[] = [];
    let horCol = -1;

    row.forEach((val, c) => {
      if (!val || typeof val !== 'string') return;
      const cleanVal = val.toLowerCase().trim().replace(/[-_.]/g, '');

      if (cleanVal.includes('hor') || cleanVal === 'hora' || cleanVal === 'time') {
        horCol = c;
      }

      for (const [key, dIndex] of Object.entries(DAY_HEADER_MAP)) {
        if (cleanVal === key || cleanVal.startsWith(key)) {
          foundDays.push({
            colIndex: c,
            dayIndex: dIndex,
            dayName: DAY_NAMES_BY_INDEX[dIndex],
          });
          break;
        }
      }
    });

    if (foundDays.length >= 2) {
      headerRowIndex = r;
      dayColumnMap = foundDays;
      if (horCol !== -1) timeColIndex = horCol;
      break;
    }
  }

  if (headerRowIndex === -1 || dayColumnMap.length === 0) {
    return [];
  }

  // 2. Coleta os horários de início das linhas para calcular o fim de cada aula
  const rowTimes: { rowIndex: number; startTime: string }[] = [];
  for (let r = headerRowIndex + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row || row.length === 0) continue;
    const timeCell = row[timeColIndex];
    if (!timeCell) continue;

    const timeStr = String(timeCell).trim();
    if (timeStr && /\d/.test(timeStr)) {
      rowTimes.push({
        rowIndex: r,
        startTime: normalizeTimeString(timeStr),
      });
    }
  }

  const resultSlots: ParsedScheduleSlot[] = [];

  // 3. Itera por cada linha de horário e coluna de dia
  for (let i = 0; i < rowTimes.length; i++) {
    const { rowIndex, startTime } = rowTimes[i];
    const nextSlot = rowTimes[i + 1];

    // Se houver próximo horário, calcula a duração ou usa o horário seguinte como término
    let endTime = '';
    if (nextSlot) {
      endTime = nextSlot.startTime;
    } else {
      // Padrão de 45 a 50 minutos para o último bloco
      endTime = addMinutesToTime(startTime, 45);
    }

    const rowData = matrix[rowIndex];

    for (const dayCol of dayColumnMap) {
      const rawCell = rowData[dayCol.colIndex];
      if (!rawCell) continue;

      const parsedCell = parseGridCell(String(rawCell));
      if (!parsedCell || !parsedCell.subject) continue;

      resultSlots.push({
        dayOfWeekIndex: dayCol.dayIndex,
        dayOfWeekName: dayCol.dayName,
        startTime,
        endTime,
        subject: parsedCell.subject,
        classGroup: parsedCell.classGroup,
        teacherName: parsedCell.teacherName,
        rawCell: parsedCell.raw,
      });
    }
  }

  return resultSlots;
}

/**
 * Agrupa horários contínuos na mesma semana/dia da mesma disciplina e professor
 */
export function groupConsecutiveSlots(slots: ParsedScheduleSlot[]): ParsedScheduleSlot[] {
  if (slots.length <= 1) return slots;

  // Ordena por dia da semana e horário de início
  const sorted = [...slots].sort((a, b) => {
    if (a.dayOfWeekIndex !== b.dayOfWeekIndex) return a.dayOfWeekIndex - b.dayOfWeekIndex;
    return a.startTime.localeCompare(b.startTime);
  });

  const grouped: ParsedScheduleSlot[] = [];
  let currentGroup: ParsedScheduleSlot | null = null;

  for (const slot of sorted) {
    if (!currentGroup) {
      currentGroup = { ...slot };
      continue;
    }

    const sameDay = currentGroup.dayOfWeekIndex === slot.dayOfWeekIndex;
    const sameSubject =
      currentGroup.subject.trim().toLowerCase() === slot.subject.trim().toLowerCase();
    const sameTeacher =
      currentGroup.teacherName.trim().toLowerCase() === slot.teacherName.trim().toLowerCase();
    const sameClass =
      currentGroup.classGroup.trim().toLowerCase() === slot.classGroup.trim().toLowerCase();

    // Se é o mesmo dia, mesma disciplina, mesmo professor e os horários são adjacentes
    if (sameDay && sameSubject && sameTeacher && sameClass) {
      // Estende o horário final
      currentGroup.endTime = slot.endTime;
    } else {
      grouped.push(currentGroup);
      currentGroup = { ...slot };
    }
  }

  if (currentGroup) {
    grouped.push(currentGroup);
  }

  return grouped;
}

/**
 * Detecta o segmento educacional a partir da turma e disciplina
 */
export function detectEducationLevel(classGroup?: string, subject?: string): EducationLevel {
  const text = `${classGroup || ''} ${subject || ''}`.toLowerCase();

  if (
    text.includes('ead') ||
    text.includes('distância') ||
    text.includes('distancia') ||
    text.includes('remoto') ||
    text.includes('online') ||
    text.includes('semipresencial')
  ) {
    return 'ead';
  }

  if (
    text.includes('faculdade') ||
    text.includes('graduação') ||
    text.includes('graduacao') ||
    text.includes('superior') ||
    text.includes('engenharia') ||
    text.includes('direito') ||
    text.includes('administração') ||
    text.includes('administracao') ||
    text.includes('medicina') ||
    text.includes('semestre') ||
    text.includes('período') ||
    text.includes('periodo')
  ) {
    return 'superior';
  }

  if (
    text.includes('médio') ||
    text.includes('medio') ||
    text.includes('fundamental') ||
    text.includes('infantil') ||
    text.includes('terceirão') ||
    text.includes('terceirao') ||
    text.includes('básico') ||
    text.includes('basico') ||
    /\b[1-9]º?\s*ano\b/i.test(text) ||
    /\b[1-3]ª?\s*série\b/i.test(text) ||
    text.includes('colegial')
  ) {
    return 'basico';
  }

  return 'basico';
}

/**
 * Gera candidatos a agendamento para uma semana específica a partir da data de início (Segunda-feira)
 */
export function generateBookingsForSingleWeek(
  slots: ParsedScheduleSlot[],
  referenceMondayDate: string, // YYYY-MM-DD
  targetLab: Lab,
  groupConsecutive: boolean = true,
  existingBookings: Booking[] = []
): BatchBookingCandidate[] {
  const processedSlots = groupConsecutive ? groupConsecutiveSlots(slots) : slots;

  // Calcula as datas de Segunda a Domingo da semana
  const monday = new Date(referenceMondayDate + 'T12:00:00Z');
  // Encontra o dia da semana do Monday selecionado (1 = Seg)
  const currentDay = monday.getUTCDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const actualMonday = new Date(monday);
  actualMonday.setUTCDate(monday.getUTCDate() + diffToMonday);

  const datesByDayIndex: Record<number, string> = {};
  for (let i = 0; i <= 6; i++) {
    const d = new Date(actualMonday);
    // Segunda = 1, Terça = 2 ... Domingo = 0
    const offset = i === 0 ? 6 : i - 1;
    d.setUTCDate(actualMonday.getUTCDate() + offset);
    datesByDayIndex[i] = d.toISOString().split('T')[0];
  }

  const candidates: BatchBookingCandidate[] = [];

  processedSlots.forEach((slot, index) => {
    const dateStr = datesByDayIndex[slot.dayOfWeekIndex];
    if (!dateStr) return;

    const timeSlotStr = `${slot.startTime} às ${slot.endTime}`;
    const shift = getShiftFromTime(slot.startTime);

    // Checagem de conflitos com agendamentos existentes
    const conflict = existingBookings.find(
      (b) =>
        b.labId === targetLab.id &&
        b.date === dateStr &&
        b.status !== 'rejected' &&
        b.status !== 'cancelled' &&
        ((b.startTime && b.endTime && !(slot.endTime <= b.startTime || slot.startTime >= b.endTime)) ||
          b.timeSlot === timeSlotStr)
    );

    candidates.push({
      tempId: `cand-week-${index}-${Math.random().toString(36).substring(2, 6)}`,
      selected: !conflict,
      date: dateStr,
      dayOfWeekName: slot.dayOfWeekName,
      startTime: slot.startTime,
      endTime: slot.endTime,
      timeSlot: timeSlotStr,
      shift,
      labId: targetLab.id,
      labName: targetLab.name,
      isMobileLab: targetLab.isMobile,
      teacherName: slot.teacherName || 'Professor a confirmar',
      classGroup: slot.classGroup || 'Geral',
      subject: slot.subject,
      whatsapp: '(00) 00000-0000',
      educationLevel: detectEducationLevel(slot.classGroup, slot.subject),
      hasConflict: !!conflict,
      conflictDetails: conflict
        ? `Já reservado para ${conflict.teacherName} (${conflict.subject || 'Aula'}) às ${conflict.timeSlot}`
        : undefined,
    });
  });

  return candidates;
}

/**
 * Gera candidatos a agendamento recorrentes para um semestre / período (ex: de 22/09/2026 até 18/12/2026)
 */
export function generateBookingsForSemesterRange(
  slots: ParsedScheduleSlot[],
  startDateStr: string, // YYYY-MM-DD
  endDateStr: string, // YYYY-MM-DD
  targetLab: Lab,
  groupConsecutive: boolean = true,
  existingBookings: Booking[] = []
): BatchBookingCandidate[] {
  const processedSlots = groupConsecutive ? groupConsecutiveSlots(slots) : slots;
  const start = new Date(startDateStr + 'T12:00:00Z');
  const end = new Date(endDateStr + 'T12:00:00Z');

  if (start > end) return [];

  const candidates: BatchBookingCandidate[] = [];
  let indexCounter = 0;

  // Itera dia a dia no intervalo
  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getUTCDay(); // 0 = Dom, 1 = Seg, etc.
    const dateStr = current.toISOString().split('T')[0];

    // Pega todos os slots deste dia da semana
    const matchingSlots = processedSlots.filter((s) => s.dayOfWeekIndex === dayOfWeek);

    for (const slot of matchingSlots) {
      const timeSlotStr = `${slot.startTime} às ${slot.endTime}`;
      const shift = getShiftFromTime(slot.startTime);

      const conflict = existingBookings.find(
        (b) =>
          b.labId === targetLab.id &&
          b.date === dateStr &&
          b.status !== 'rejected' &&
          b.status !== 'cancelled' &&
          ((b.startTime && b.endTime && !(slot.endTime <= b.startTime || slot.startTime >= b.endTime)) ||
            b.timeSlot === timeSlotStr)
      );

      candidates.push({
        tempId: `cand-sem-${indexCounter++}-${Math.random().toString(36).substring(2, 6)}`,
        selected: !conflict,
        date: dateStr,
        dayOfWeekName: slot.dayOfWeekName,
        startTime: slot.startTime,
        endTime: slot.endTime,
        timeSlot: timeSlotStr,
        shift,
        labId: targetLab.id,
        labName: targetLab.name,
        isMobileLab: targetLab.isMobile,
        teacherName: slot.teacherName || 'Professor a confirmar',
        classGroup: slot.classGroup || 'Geral',
        subject: slot.subject,
        whatsapp: '(00) 00000-0000',
        educationLevel: detectEducationLevel(slot.classGroup, slot.subject),
        hasConflict: !!conflict,
        conflictDetails: conflict
          ? `Já reservado para ${conflict.teacherName} (${conflict.subject || 'Aula'}) às ${conflict.timeSlot}`
          : undefined,
      });
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return candidates;
}

/**
 * Lê arquivo Excel ou CSV via SheetJS e retorna matriz 2D
 */
export async function readSpreadsheetFile(file: File): Promise<string[][]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const matrix: string[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
  return matrix;
}

/**
 * Converte texto colado da área de transferência (TSV do Excel) em matriz 2D
 */
export function parsePastedClipboardText(text: string): string[][] {
  if (!text || !text.trim()) return [];
  const lines = text.trim().split(/\r?\n/);
  return lines.map((line) => line.split('\t'));
}

/**
 * Dados de exemplo idênticos aos da imagem enviada pelo usuário
 */
export const SAMPLE_IMAGE_SCHEDULE_MATRIX: string[][] = [
  ['Hor', 'Seg', 'Ter', 'Qua', 'Qui'],
  [
    '19:00',
    'Direção de Arte\nGBCSPP43A - Joabe Martins Silva',
    'Interação Humano-Computad\nGBSINF23B - Hiarlen Carnellosi Carolino Ce',
    'Fotografia Publicitária\nGBCSPP43A - Suzie Adriana Signori',
    'Procedimentos e Rotinas C - GBCCON23A\nRicardo De Souza',
  ],
  [
    '19:45',
    'Direção de Arte\nGBCSPP43A - Joabe Martins Silva',
    'Interação Humano-Computad\nGBSINF23B - Hiarlen Carnellosi Carolino Ce',
    'Fotografia Publicitária\nGBCSPP43A - Suzie Adriana Signori',
    'Produção Pub. em Áudio e\nGBCSPP63A - Joabe Martins Silva',
  ],
  [
    '20:45',
    'Direção de Arte\nGBCSPP43A - Joabe Martins Silva',
    'Sistemas Operacionais\nGTADSI23A - Hiarlen Carnellosi Carolino Ce',
    'Produção Pub. em Áudio e\nGBCSPP63A - Joabe Martins Silva',
    'Produção Pub. em Áudio e\nGBCSPP63A - Joabe Martins Silva',
  ],
  [
    '21:30',
    'Direção de Arte\nGBCSPP43A - Joabe Martins Silva',
    'Sistemas Operacionais\nGTADSI23A - Hiarlen Carnellosi Carolino Ce',
    'Produção Pub. em Áudio e\nGBCSPP63A - Joabe Martins Silva',
    '',
  ],
  [
    '22:15',
    '',
    '',
    'Construção de Algoritmos\nGBECOM23A - Thiago de Oliveira Pires',
    '',
  ],
];

/**
 * Gera e baixa uma planilha modelo do Excel (.xlsx) com a estrutura da imagem
 */
export function downloadSampleExcelFile() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(SAMPLE_IMAGE_SCHEDULE_MATRIX);

  // Define larguras das colunas
  ws['!cols'] = [
    { wch: 10 }, // Hor
    { wch: 38 }, // Seg
    { wch: 42 }, // Ter
    { wch: 38 }, // Qua
    { wch: 42 }, // Qui
    { wch: 38 }, // Sex
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Grade_Horarios');
  XLSX.writeFile(wb, 'modelo_grade_laboratorios.xlsx');
}
