import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { Lab, LAB_LIST, LabType } from '../types';

const LABS_CONFIG_COLLECTION = 'labs_config';
const LOCAL_STORAGE_LABS_KEY = 'school_labs_config_cache';

export const LAB_BADGE_COLORS = [
  { label: 'Azul', value: 'bg-blue-50 text-blue-700 border-blue-200' },
  { label: 'Índigo', value: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { label: 'Violeta', value: 'bg-violet-50 text-violet-700 border-violet-200' },
  { label: 'Esmeralda / Verde', value: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { label: 'Teal / Turquesa', value: 'bg-teal-50 text-teal-700 border-teal-200' },
  { label: 'Âmbar / Amarelo', value: 'bg-amber-50 text-amber-800 border-amber-200' },
  { label: 'Rosa / Rose', value: 'bg-rose-50 text-rose-700 border-rose-200' },
  { label: 'Ciano', value: 'bg-cyan-50 text-cyan-800 border-cyan-200' },
  { label: 'Púrpura', value: 'bg-purple-50 text-purple-700 border-purple-200' },
];

// Default initial softwares for labs: Cleaned (empty) as requested by user
export const DEFAULT_LAB_SOFTWARES: Record<string, string[]> = {
  'lab-1': [],
  'lab-2': [],
  'lab-3': [],
  'lab-4': [],
  'lab-5': [],
  'lab-6': [],
  'lab-7-eng': [],
  'lab-hibrido': [],
  'lab-movel-1': [],
  'lab-movel-2': [],
  'lab-movel-3-pinho': [],
  'lab-movel-4-pinho': [],
};

// Common software catalog for easy adding/checking
export const POPULAR_SOFTWARES_LIST: string[] = [
  'Pacote Office (Word, Excel, PowerPoint)',
  'Google Chrome',
  'Visual Studio Code',
  'Python (IDLE / PyCharm)',
  'AutoCAD',
  'SolidWorks',
  'Revit',
  'MATLAB',
  'Scratch 3.0',
  'Geogebra',
  'Adobe Photoshop',
  'Adobe Illustrator',
  'Adobe Premiere Pro',
  'Audacity',
  'GIMP',
  'Blender 3D',
  'Canva',
  'MySQL Workbench / XAMPP',
  'Eclipse / NetBeans (Java)',
  'Node.js / Git',
  'OBS Studio',
  'RoboDK / Lego Mindstorms',
  'CorelDRAW',
];

function getLocalLabs(): Lab[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_LABS_KEY);
    if (raw) {
      const parsed: Lab[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((l) => l.active !== false);
      }
    }
  } catch (e) {
    console.warn('Erro ao ler cache de labs:', e);
  }
  // Initialize with empty softwares by default
  return LAB_LIST.map((lab) => ({
    ...lab,
    notes: '',
    softwares: [],
    isUnderMaintenance: false,
    maintenanceReason: '',
    maintenanceStartDate: undefined,
    maintenanceEndDate: undefined,
    maintenanceStartTime: undefined,
    maintenanceEndTime: undefined,
    maintenanceAllDay: true,
    broadcastMessage: '',
    active: true,
  }));
}

function setLocalLabs(labs: Lab[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_LABS_KEY, JSON.stringify(labs));
  } catch (e) {
    console.warn('Erro ao salvar cache de labs:', e);
  }
}

/**
 * Inscreve-se em tempo real para atualizações dos laboratórios, softwares, status de manutenção e avisos
 */
export function subscribeToLabs(callback: (labs: Lab[]) => void): () => void {
  const localLabs = getLocalLabs();
  callback(localLabs);

  if (!db) {
    return () => {};
  }

  const colRef = collection(db, LABS_CONFIG_COLLECTION);
  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        callback(localLabs);
        return;
      }

      const dbMap = new Map<string, Partial<Lab>>();
      snapshot.forEach((docSnap) => {
        dbMap.set(docSnap.id, docSnap.data() as Partial<Lab>);
      });

      // 1. Merge base LAB_LIST with Firestore customizations
      const baseLabsProcessed: Lab[] = LAB_LIST.map((baseLab) => {
        const custom = dbMap.get(baseLab.id);
        const isMobile = custom?.isMobile !== undefined ? custom.isMobile : (custom?.type ? custom.type === 'mobile' : baseLab.isMobile);
        const type: LabType = custom?.type || (isMobile ? 'mobile' : 'fixed');

        return {
          ...baseLab,
          name: custom?.name || baseLab.name,
          capacity: typeof custom?.capacity === 'number' ? custom.capacity : baseLab.capacity,
          type,
          isMobile,
          description: custom?.description !== undefined ? custom.description : baseLab.description,
          notes: custom?.notes !== undefined ? custom.notes : '',
          location: custom?.location || '',
          badgeColor: custom?.badgeColor || baseLab.badgeColor,
          softwares: Array.isArray(custom?.softwares) ? custom!.softwares : [],
          isUnderMaintenance: Boolean(custom?.isUnderMaintenance),
          maintenanceReason: custom?.maintenanceReason || '',
          maintenanceStartDate: custom?.maintenanceStartDate,
          maintenanceEndDate: custom?.maintenanceEndDate,
          maintenanceStartTime: custom?.maintenanceStartTime,
          maintenanceEndTime: custom?.maintenanceEndTime,
          maintenanceAllDay: custom?.maintenanceAllDay !== undefined ? custom.maintenanceAllDay : true,
          broadcastMessage: custom?.broadcastMessage || '',
          customAdded: false,
          active: custom?.active !== false,
        };
      });

      // 2. Extra custom labs created by administrator that are not in LAB_LIST
      const customLabs: Lab[] = [];
      dbMap.forEach((custom, docId) => {
        const isInBase = LAB_LIST.some((l) => l.id === docId);
        if (!isInBase && custom && custom.active !== false && custom.name) {
          const isMobile = custom.isMobile !== undefined ? custom.isMobile : (custom.type === 'mobile');
          const type: LabType = custom.type || (isMobile ? 'mobile' : 'fixed');
          const defaultBadge = isMobile
            ? 'bg-rose-50 text-rose-700 border-rose-200'
            : 'bg-blue-50 text-blue-700 border-blue-200';

          customLabs.push({
            id: docId,
            name: custom.name,
            capacity: typeof custom.capacity === 'number' ? custom.capacity : 30,
            type,
            isMobile,
            description: custom.description || (isMobile ? 'Laboratório móvel' : 'Laboratório fixo de informática'),
            notes: custom.notes || '',
            location: custom.location || '',
            badgeColor: custom.badgeColor || defaultBadge,
            softwares: Array.isArray(custom.softwares) ? custom.softwares : [],
            isUnderMaintenance: Boolean(custom.isUnderMaintenance),
            maintenanceReason: custom.maintenanceReason || '',
            maintenanceStartDate: custom.maintenanceStartDate,
            maintenanceEndDate: custom.maintenanceEndDate,
            maintenanceStartTime: custom.maintenanceStartTime,
            maintenanceEndTime: custom.maintenanceEndTime,
            maintenanceAllDay: custom.maintenanceAllDay !== undefined ? custom.maintenanceAllDay : true,
            broadcastMessage: custom.broadcastMessage || '',
            customAdded: true,
            active: true,
          });
        }
      });

      const mergedLabs: Lab[] = [...baseLabsProcessed, ...customLabs].filter((l) => l.active !== false);

      setLocalLabs(mergedLabs);
      callback(mergedLabs);
    },
    (err) => {
      console.warn('Firestore subscribeToLabs fallback para local:', err);
      callback(localLabs);
    },
  );

  return unsubscribe;
}

/**
 * Cria ou salva as informações completas de um laboratório (incluindo observações)
 */
export async function saveLab(
  labData: {
    id?: string;
    name: string;
    capacity: number;
    type: LabType;
    isMobile?: boolean;
    description?: string;
    notes?: string;
    badgeColor?: string;
    location?: string;
    softwares?: string[];
  }
): Promise<Lab> {
  const isMobile = labData.isMobile !== undefined ? labData.isMobile : (labData.type === 'mobile');
  const labId = labData.id || `lab-${Date.now()}`;
  const defaultBadge = isMobile
    ? 'bg-rose-50 text-rose-700 border-rose-200'
    : 'bg-blue-50 text-blue-700 border-blue-200';

  const newLab: Lab = {
    id: labId,
    name: labData.name.trim(),
    capacity: Number(labData.capacity) || 30,
    type: labData.type,
    isMobile,
    description: labData.description?.trim() || (isMobile ? 'Laboratório móvel' : 'Laboratório fixo de informática'),
    notes: labData.notes?.trim() || '',
    location: labData.location?.trim() || '',
    badgeColor: labData.badgeColor || defaultBadge,
    softwares: labData.softwares || [],
    isUnderMaintenance: false,
    maintenanceReason: '',
    broadcastMessage: '',
    customAdded: !LAB_LIST.some((l) => l.id === labId),
    active: true,
    updatedAt: Date.now(),
  };

  // Update local cache
  const currentLabs = getLocalLabs();
  const existingIdx = currentLabs.findIndex((l) => l.id === labId);
  let updatedList: Lab[];
  if (existingIdx >= 0) {
    updatedList = [...currentLabs];
    updatedList[existingIdx] = { ...updatedList[existingIdx], ...newLab };
  } else {
    updatedList = [...currentLabs, newLab];
  }
  setLocalLabs(updatedList);

  if (db) {
    try {
      const docRef = doc(db, LABS_CONFIG_COLLECTION, labId);
      await setDoc(
        docRef,
        {
          id: labId,
          labId,
          name: newLab.name,
          capacity: newLab.capacity,
          type: newLab.type,
          isMobile: newLab.isMobile,
          description: newLab.description,
          notes: newLab.notes,
          location: newLab.location,
          badgeColor: newLab.badgeColor,
          customAdded: newLab.customAdded,
          active: true,
          updatedAt: Date.now(),
        },
        { merge: true },
      );
    } catch (err) {
      console.error('Erro ao salvar laboratório no Firestore:', err);
    }
  }

  return newLab;
}

/**
 * Atualiza campos gerais e observações de um laboratório
 */
export async function updateLab(
  labId: string,
  updates: Partial<Lab>,
): Promise<void> {
  const currentLabs = getLocalLabs();
  const updatedLabs = currentLabs.map((l) =>
    l.id === labId ? { ...l, ...updates, updatedAt: Date.now() } : l,
  );
  setLocalLabs(updatedLabs);

  if (db) {
    try {
      const docRef = doc(db, LABS_CONFIG_COLLECTION, labId);
      await setDoc(
        docRef,
        {
          ...updates,
          labId,
          updatedAt: Date.now(),
        },
        { merge: true },
      );
    } catch (err) {
      console.error('Erro ao atualizar dados do laboratório no Firestore:', err);
    }
  }
}

/**
 * Atualiza especificamente as observações de um laboratório
 */
export async function updateLabNotes(labId: string, notes: string): Promise<void> {
  await updateLab(labId, { notes: notes.trim() });
}

/**
 * Exclui ou desativa um laboratório
 */
export async function deleteLab(labId: string): Promise<void> {
  const currentLabs = getLocalLabs();
  const updatedLabs = currentLabs.filter((l) => l.id !== labId);
  setLocalLabs(updatedLabs);

  if (db) {
    try {
      const docRef = doc(db, LABS_CONFIG_COLLECTION, labId);
      const isBase = LAB_LIST.some((l) => l.id === labId);
      if (isBase) {
        // Marca como inativo para não reaparecer
        await setDoc(docRef, { active: false, updatedAt: Date.now() }, { merge: true });
      } else {
        // Laboratório criado pelo usuário: remove fisicamente
        await deleteDoc(docRef);
      }
    } catch (err) {
      console.error('Erro ao remover laboratório no Firestore:', err);
    }
  }
}

/**
 * Atualiza os softwares instalados em um laboratório específico
 */
export async function updateLabSoftwares(labId: string, softwares: string[]): Promise<void> {
  const currentLabs = getLocalLabs();
  const updatedLabs = currentLabs.map((l) =>
    l.id === labId ? { ...l, softwares } : l,
  );
  setLocalLabs(updatedLabs);

  if (db) {
    try {
      const docRef = doc(db, LABS_CONFIG_COLLECTION, labId);
      await setDoc(
        docRef,
        {
          labId,
          softwares,
          updatedAt: Date.now(),
        },
        { merge: true },
      );
    } catch (err) {
      console.error('Erro ao atualizar softwares no Firestore:', err);
    }
  }
}

/**
 * Limpa todos os softwares pré-preenchidos de todos os laboratórios
 */
export async function clearAllLabsSoftwares(): Promise<void> {
  const currentLabs = getLocalLabs();
  const updatedLabs = currentLabs.map((l) => ({ ...l, softwares: [] }));
  setLocalLabs(updatedLabs);

  if (db) {
    for (const lab of currentLabs) {
      try {
        const docRef = doc(db, LABS_CONFIG_COLLECTION, lab.id);
        await setDoc(
          docRef,
          {
            labId: lab.id,
            softwares: [],
            updatedAt: Date.now(),
          },
          { merge: true },
        );
      } catch (err) {
        console.error(`Erro ao limpar softwares do ${lab.id}:`, err);
      }
    }
  }
}

export interface MaintenanceScheduleInput {
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
}

/**
 * Fecha, abre ou agenda um período de manutenção para um laboratório
 */
export async function updateLabMaintenanceStatus(
  labId: string,
  isUnderMaintenance: boolean,
  maintenanceReason?: string,
  schedule?: MaintenanceScheduleInput,
): Promise<void> {
  const currentLabs = getLocalLabs();
  const updatedLabs = currentLabs.map((l) =>
    l.id === labId
      ? {
          ...l,
          isUnderMaintenance,
          maintenanceReason: isUnderMaintenance ? (maintenanceReason || 'Em manutenção técnica.') : '',
          maintenanceStartDate: isUnderMaintenance ? schedule?.startDate : undefined,
          maintenanceEndDate: isUnderMaintenance ? schedule?.endDate : undefined,
          maintenanceStartTime: isUnderMaintenance ? schedule?.startTime : undefined,
          maintenanceEndTime: isUnderMaintenance ? schedule?.endTime : undefined,
          maintenanceAllDay: isUnderMaintenance ? (schedule?.allDay !== undefined ? schedule.allDay : true) : true,
        }
      : l,
  );
  setLocalLabs(updatedLabs);

  if (db) {
    try {
      const docRef = doc(db, LABS_CONFIG_COLLECTION, labId);
      const dataToSave: Record<string, any> = {
        labId,
        isUnderMaintenance,
        maintenanceReason: isUnderMaintenance ? (maintenanceReason || 'Em manutenção técnica.') : '',
        maintenanceStartDate: isUnderMaintenance ? (schedule?.startDate || null) : null,
        maintenanceEndDate: isUnderMaintenance ? (schedule?.endDate || null) : null,
        maintenanceStartTime: isUnderMaintenance ? (schedule?.startTime || null) : null,
        maintenanceEndTime: isUnderMaintenance ? (schedule?.endTime || null) : null,
        maintenanceAllDay: isUnderMaintenance ? (schedule?.allDay !== undefined ? schedule.allDay : true) : true,
        updatedAt: Date.now(),
      };
      await setDoc(docRef, dataToSave, { merge: true });
    } catch (err) {
      console.error('Erro ao atualizar status de manutenção:', err);
    }
  }
}

/**
 * Define ou atualiza uma mensagem/aviso que os professores verão na hora do agendamento
 */
export async function updateLabBroadcastMessage(
  labId: string,
  broadcastMessage: string,
): Promise<void> {
  const currentLabs = getLocalLabs();
  const updatedLabs = currentLabs.map((l) =>
    l.id === labId ? { ...l, broadcastMessage } : l,
  );
  setLocalLabs(updatedLabs);

  if (db) {
    try {
      const docRef = doc(db, LABS_CONFIG_COLLECTION, labId);
      await setDoc(
        docRef,
        {
          labId,
          broadcastMessage: broadcastMessage.trim(),
          updatedAt: Date.now(),
        },
        { merge: true },
      );
    } catch (err) {
      console.error('Erro ao atualizar mensagem de aviso do laboratório:', err);
    }
  }
}
