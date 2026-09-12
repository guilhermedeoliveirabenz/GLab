import {
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { Lab, LAB_LIST } from '../types';

const LABS_CONFIG_COLLECTION = 'labs_config';
const LOCAL_STORAGE_LABS_KEY = 'school_labs_config_cache';

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
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Erro ao ler cache de labs:', e);
  }
  // Initialize with empty softwares by default
  return LAB_LIST.map((lab) => ({
    ...lab,
    softwares: [],
    isUnderMaintenance: false,
    maintenanceReason: '',
    broadcastMessage: '',
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

      // Merge base LAB_LIST with Firestore customizations
      const mergedLabs: Lab[] = LAB_LIST.map((baseLab) => {
        const custom = dbMap.get(baseLab.id);
        return {
          ...baseLab,
          softwares: Array.isArray(custom?.softwares) ? custom!.softwares : [],
          isUnderMaintenance: Boolean(custom?.isUnderMaintenance),
          maintenanceReason: custom?.maintenanceReason || '',
          broadcastMessage: custom?.broadcastMessage || '',
          description: custom?.description || baseLab.description,
          capacity: typeof custom?.capacity === 'number' ? custom.capacity : baseLab.capacity,
        };
      });

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

/**
 * Fecha ou abre um laboratório indicando se está em manutenção ou disponível
 */
export async function updateLabMaintenanceStatus(
  labId: string,
  isUnderMaintenance: boolean,
  maintenanceReason?: string,
): Promise<void> {
  const currentLabs = getLocalLabs();
  const updatedLabs = currentLabs.map((l) =>
    l.id === labId
      ? {
          ...l,
          isUnderMaintenance,
          maintenanceReason: isUnderMaintenance ? (maintenanceReason || 'Em manutenção técnica.') : '',
        }
      : l,
  );
  setLocalLabs(updatedLabs);

  if (db) {
    try {
      const docRef = doc(db, LABS_CONFIG_COLLECTION, labId);
      await setDoc(
        docRef,
        {
          labId,
          isUnderMaintenance,
          maintenanceReason: isUnderMaintenance ? (maintenanceReason || 'Em manutenção técnica.') : '',
          updatedAt: Date.now(),
        },
        { merge: true },
      );
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
