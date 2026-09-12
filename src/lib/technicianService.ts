import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { Technician } from '../types';
import { hashPassword } from './securityUtils';
import { cleanObjectForFirestore } from './bookingService';

const COLLECTION_NAME = 'technicians';
const LOCAL_STORAGE_KEY = 'school_lab_technicians_cache';

// Filtra técnicos ativos designados para um laboratório específico ou para todos
export function getTechniciansForLab(technicians: Technician[], labId: string): Technician[] {
  return technicians.filter(
    (t) =>
      t.active &&
      (!t.assignedLabIds || t.assignedLabIds.length === 0 || t.assignedLabIds.includes(labId)),
  );
}

// Remove senhas e hashes do objeto de técnico antes de repassar à interface
export function sanitizeTechnician(tech: Technician): Technician {
  const sanitized = { ...tech };
  delete sanitized.password;
  delete sanitized.passwordHash;
  return sanitized;
}

// Helper de cache local
export function getLocalTechnicians(): Technician[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Erro ao ler cache de técnicos:', e);
  }
  return [];
}

function setLocalTechnicians(techs: Technician[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(techs));
  } catch (e) {
    console.warn('Erro ao salvar cache de técnicos:', e);
  }
}

/**
 * Inscreve-se em tempo real para atualizações de técnicos (com dados higienizados)
 */
export function subscribeToTechnicians(callback: (technicians: Technician[]) => void): () => void {
  // Envia cache local imediatamente (sem senhas)
  const localData = getLocalTechnicians().map(sanitizeTechnician);
  callback(localData);

  if (!db) {
    return () => {};
  }

  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Technician[] = [];
        snapshot.forEach((d) => {
          list.push({ ...d.data(), id: d.id } as Technician);
        });
        setLocalTechnicians(list);
        callback(list.map(sanitizeTechnician));
      },
      (error) => {
        console.warn('Erro no listener de técnicos Firestore:', error);
        callback(getLocalTechnicians().map(sanitizeTechnician));
      },
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Erro ao iniciar listener de técnicos:', err);
    return () => {};
  }
}

/**
 * Cadastra um novo técnico com hash criptográfico de senha
 */
export async function createTechnician(
  techData: Omit<Technician, 'id' | 'createdAt'> & { plainPassword?: string },
): Promise<Technician> {
  const id = `tech-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  
  // Computa hash criptográfico SHA-256
  const rawPass = techData.plainPassword || techData.password || '';
  const passHash = rawPass ? await hashPassword(rawPass) : undefined;

  const technician: Technician = {
    ...techData,
    id,
    passwordHash: passHash,
    createdAt: Date.now(),
  };
  // Remove senha em texto plano por segurança
  delete technician.password;
  delete (technician as { plainPassword?: string }).plainPassword;

  if (db) {
    try {
      const payload = cleanObjectForFirestore(technician);
      await setDoc(doc(db, COLLECTION_NAME, id), payload);
    } catch (err) {
      console.warn('Falha ao salvar técnico no Firestore, salvando no cache local:', err);
    }
  }

  const current = getLocalTechnicians();
  const updated = [technician, ...current];
  setLocalTechnicians(updated);

  return sanitizeTechnician(technician);
}

/**
 * Atualiza um técnico
 */
export async function updateTechnician(
  id: string,
  updates: Partial<Technician> & { newPassword?: string },
): Promise<void> {
  const patch: Partial<Technician> = { ...updates };
  
  if (updates.newPassword) {
    patch.passwordHash = await hashPassword(updates.newPassword);
    delete patch.password;
    delete (patch as { newPassword?: string }).newPassword;
  }

  if (db) {
    try {
      const payload = cleanObjectForFirestore(patch);
      await updateDoc(doc(db, COLLECTION_NAME, id), payload);
    } catch (err) {
      console.warn('Falha ao atualizar técnico no Firestore:', err);
    }
  }

  const current = getLocalTechnicians();
  const updated = current.map((t) => (t.id === id ? { ...t, ...patch } : t));
  setLocalTechnicians(updated);
}

/**
 * Exclui um técnico
 */
export async function deleteTechnician(id: string): Promise<void> {
  if (db) {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (err) {
      console.warn('Falha ao excluir técnico no Firestore:', err);
    }
  }

  const current = getLocalTechnicians();
  const updated = current.filter((t) => t.id !== id);
  setLocalTechnicians(updated);
}

/**
 * Verifica credenciais de um técnico cadastrado usando comparação de hash
 */
export async function authenticateTechnician(
  usernameInput: string,
  passwordInput: string,
): Promise<Technician | null> {
  const cleanUser = usernameInput.trim().toLowerCase();
  const inputHash = await hashPassword(passwordInput);

  // Primeiro busca no Firestore se disponível
  if (db) {
    try {
      const snap = await getDocs(collection(db, COLLECTION_NAME));
      for (const d of snap.docs) {
        const t = d.data() as Technician;
        if (
          t.active &&
          t.username.trim().toLowerCase() === cleanUser &&
          (t.passwordHash === inputHash || t.password === passwordInput)
        ) {
          return sanitizeTechnician({ ...t, id: d.id });
        }
      }
    } catch (e) {
      console.warn('Erro ao consultar técnicos no Firestore, tentando cache local:', e);
    }
  }

  // Fallback para cache local
  const cached = getLocalTechnicians();
  const found = cached.find(
    (t) =>
      t.active &&
      t.username.trim().toLowerCase() === cleanUser &&
      (t.passwordHash === inputHash || t.password === passwordInput),
  );

  return found ? sanitizeTechnician(found) : null;
}
