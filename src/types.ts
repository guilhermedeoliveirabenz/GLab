export type LabType = 'fixed' | 'mobile';

export interface Lab {
  id: string;
  name: string;
  capacity: number;
  type: LabType;
  isMobile: boolean;
  description: string;
  badgeColor: string;
  notes?: string; // Observações do laboratório (equipamentos, orientações, etc.)
  location?: string; // Localização física (ex: Bloco C - 2º andar)
  customAdded?: boolean; // Se foi adicionado pelo gestor
  active?: boolean; // Se o laboratório está ativo no sistema
  updatedAt?: number;
  softwares?: string[];
  isUnderMaintenance?: boolean; // Se o laboratório está fechado para manutenção
  maintenanceReason?: string; // Motivo da manutenção
  maintenanceStartDate?: string; // Data inicial da manutenção (YYYY-MM-DD)
  maintenanceEndDate?: string; // Data final da manutenção (YYYY-MM-DD)
  maintenanceStartTime?: string; // Horário de início (HH:mm, ex: "07:30")
  maintenanceEndTime?: string; // Horário de término (HH:mm, ex: "12:00")
  maintenanceAllDay?: boolean; // Se a interdição vale para o dia todo
  broadcastMessage?: string; // Mensagem/aviso para o usuário no momento do agendamento
}

export type BookingStatus = 'pending' | 'confirmed' | 'rejected' | 'completed' | 'cancelled';

export type ShiftType = 'manha' | 'tarde' | 'noite';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'biweekly';

export interface TimeSlotOption {
  id: string;
  label: string;
  shift: ShiftType;
  startTime: string;
  endTime: string;
}

export interface Booking {
  id: string;
  teacherName: string;
  whatsapp: string;
  classGroup: string;
  subject?: string;
  labId: string;
  labName: string;
  isMobileLab: boolean;
  requestedMachines?: number; // Quantidade de máquinas solicitadas pelo professor
  roomNumber?: string; // Obrigatório para labs móveis
  date: string; // YYYY-MM-DD
  timeSlot: string; // ex: "08:00 às 09:30"
  startTime?: string; // ex: "08:00"
  endTime?: string; // ex: "09:30"
  shift: ShiftType;
  notes?: string;
  status: BookingStatus;
  createdAt: number;
  confirmedAt?: number;
  whatsappSent: boolean;
  whatsappSentAt?: number;
  adminNotes?: string;
  recurrenceGroupId?: string; // ID do grupo se for agendamento recorrente
  recurrenceFrequency?: RecurrenceType;
  recurrenceTotalCount?: number;
  recurrenceIndex?: number;
}

export interface Technician {
  id: string;
  name: string;
  username: string; // Ex: 'carlos.silva' ou e-mail
  email?: string;
  password?: string; // Mantido para compatibilidade retroativa (nunca exposto em texto puro)
  passwordHash?: string; // Hash SHA-256 seguro da senha
  phone?: string; // WhatsApp / contato
  role: 'admin' | 'technician';
  assignedLabIds?: string[]; // IDs dos laboratórios autorizados/atribuídos ao técnico (vazio ou ['all'] = todos)
  active: boolean;
  createdAt: number;
}

export interface BookingFilter {
  date?: string;
  labId?: string;
  status?: BookingStatus | 'all';
  search?: string;
  shift?: ShiftType | 'all';
  onlyMobile?: boolean;
}

export const LAB_LIST: Lab[] = [
  {
    id: 'lab-1',
    name: 'Lab 1',
    capacity: 50,
    type: 'fixed',
    isMobile: false,
    description: 'Laboratório fixo com 50 máquinas desktop',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    id: 'lab-2',
    name: 'Lab 2',
    capacity: 40,
    type: 'fixed',
    isMobile: false,
    description: 'Laboratório fixo com 40 máquinas desktop',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    id: 'lab-3',
    name: 'Lab 3',
    capacity: 40,
    type: 'fixed',
    isMobile: false,
    description: 'Laboratório fixo com 40 máquinas desktop',
    badgeColor: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  {
    id: 'lab-4',
    name: 'Lab 4',
    capacity: 40,
    type: 'fixed',
    isMobile: false,
    description: 'Laboratório fixo com 40 máquinas desktop',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  {
    id: 'lab-5',
    name: 'Lab 5',
    capacity: 40,
    type: 'fixed',
    isMobile: false,
    description: 'Laboratório fixo com 40 máquinas desktop',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  {
    id: 'lab-6',
    name: 'Lab 6',
    capacity: 55,
    type: 'fixed',
    isMobile: false,
    description: 'Laboratório fixo com 55 máquinas desktop (alta capacidade)',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    id: 'lab-7-eng',
    name: 'Lab 7 (Eng)',
    capacity: 40,
    type: 'fixed',
    isMobile: false,
    description: 'Laboratório de Engenharia com softwares gráficos e técnicos',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  {
    id: 'lab-hibrido',
    name: 'Lab Híbrido',
    capacity: 60,
    type: 'fixed',
    isMobile: false,
    description: 'Espaço híbrido multiúso com 60 máquinas',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    id: 'lab-movel-1',
    name: 'Lab móvel 1',
    capacity: 32,
    type: 'mobile',
    isMobile: true,
    description: 'Carrinho móvel com 32 notebooks para entrega em sala de aula',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  {
    id: 'lab-movel-2',
    name: 'Lab móvel 2',
    capacity: 32,
    type: 'mobile',
    isMobile: true,
    description: 'Carrinho móvel com 32 notebooks para entrega em sala de aula',
    badgeColor: 'bg-pink-50 text-pink-700 border-pink-200',
  },
  {
    id: 'lab-movel-3-pinho',
    name: 'Lab móvel 3 (Pinho)',
    capacity: 35,
    type: 'mobile',
    isMobile: true,
    description: 'Carrinho móvel Pinho com 35 máquinas disponíveis',
    badgeColor: 'bg-orange-50 text-orange-800 border-orange-200',
  },
  {
    id: 'lab-movel-4-pinho',
    name: 'Lab móvel 4 (Pinho)',
    capacity: 14,
    type: 'mobile',
    isMobile: true,
    description: 'Carrinho móvel Pinho compacto com 14 máquinas',
    badgeColor: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  },
];

export const TIME_SLOTS: TimeSlotOption[] = [
  // Manhã
  { id: 'm1', label: '1ª Aula (07:30 - 08:20)', shift: 'manha', startTime: '07:30', endTime: '08:20' },
  { id: 'm2', label: '2ª Aula (08:20 - 09:10)', shift: 'manha', startTime: '08:20', endTime: '09:10' },
  { id: 'm3', label: '3ª Aula (09:25 - 10:15)', shift: 'manha', startTime: '09:25', endTime: '10:15' },
  { id: 'm4', label: '4ª Aula (10:15 - 11:05)', shift: 'manha', startTime: '10:15', endTime: '11:05' },
  { id: 'm5', label: '5ª Aula (11:05 - 11:55)', shift: 'manha', startTime: '11:05', endTime: '11:55' },
  // Tarde
  { id: 't1', label: '6ª Aula (13:15 - 14:05)', shift: 'tarde', startTime: '13:15', endTime: '14:05' },
  { id: 't2', label: '7ª Aula (14:05 - 14:55)', shift: 'tarde', startTime: '14:05', endTime: '14:55' },
  { id: 't3', label: '8ª Aula (15:10 - 16:00)', shift: 'tarde', startTime: '15:10', endTime: '16:00' },
  { id: 't4', label: '9ª Aula (16:00 - 16:50)', shift: 'tarde', startTime: '16:00', endTime: '16:50' },
  { id: 't5', label: '10ª Aula (16:50 - 17:40)', shift: 'tarde', startTime: '16:50', endTime: '17:40' },
  // Noite
  { id: 'n1', label: '1º Horário Noite (19:00 - 20:30)', shift: 'noite', startTime: '19:00', endTime: '20:30' },
  { id: 'n2', label: '2º Horário Noite (20:45 - 22:15)', shift: 'noite', startTime: '20:45', endTime: '22:15' },
];
