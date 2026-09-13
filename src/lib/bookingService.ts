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
import { Booking } from '../types';

const COLLECTION_NAME = 'bookings';
const LOCAL_STORAGE_KEY = 'school_lab_bookings_cache';

// Base de agendamentos inicial vazia (sem dados fictícios)
const INITIAL_DEMO_BOOKINGS: Booking[] = [];

// Helper para desduplicar agendamentos por id
export function deduplicateBookings(list: Booking[]): Booking[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const result: Booking[] = [];
  for (const item of list) {
    if (item && item.id && !seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }
  return result;
}

// Helper para ler do cache local
function getLocalCache(): Booking[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed: Booking[] = JSON.parse(raw);
      // Remove qualquer dado de demonstração remanescente e elimina duplicatas de id
      const cleaned = deduplicateBookings(parsed.filter((b) => !b.id.startsWith('demo-booking-')));
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleaned));
      }
      return cleaned;
    }
  } catch (e) {
    console.warn('Erro ao ler cache local:', e);
  }
  return [];
}

// Helper para salvar no cache local
function setLocalCache(bookings: Booking[]) {
  try {
    const cleaned = deduplicateBookings(bookings.filter((b) => !b.id.startsWith('demo-booking-')));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleaned));
  } catch (e) {
    console.warn('Erro ao salvar cache local:', e);
  }
}

/**
 * Remove com segurança propriedades com valor undefined antes de gravar no Firestore
 */
export function cleanObjectForFirestore<T extends Record<string, any>>(obj: T): T {
  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      cleaned[key] = val;
    }
  }
  return cleaned as T;
}

/**
 * Inscreve-se em tempo real para atualizações de agendamentos no Firestore

 */
export function subscribeToBookings(callback: (bookings: Booking[]) => void): () => void {
  // Inicialmente envia o cache local para renderização imediata
  const localData = getLocalCache();
  callback(localData);

  if (!db) {
    return () => {};
  }

  try {
    const bookingsQuery = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      bookingsQuery,
      async (snapshot) => {
        const list: Booking[] = [];
        snapshot.forEach((d) => {
          if (d.id.startsWith('demo-booking-')) {
            // Remove automaticamente registros demo antigos do Firestore
            if (db) {
              deleteDoc(doc(db, COLLECTION_NAME, d.id)).catch(() => {});
            }
          } else {
            list.push({ ...d.data(), id: d.id } as Booking);
          }
        });

        // Ordena por data e horário e elimina quaisquer duplicatas de id
        const deduplicated = deduplicateBookings(list);
        deduplicated.sort((a, b) => b.createdAt - a.createdAt);

        setLocalCache(deduplicated);
        callback(deduplicated);
      },
      (error) => {
        console.warn('Firestore onSnapshot listener error, relying on local storage fallback:', error);
        callback(getLocalCache());
      },
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Failed to attach Firestore listener:', err);
    return () => {};
  }
}

/**
 * Limpa todos os agendamentos do Firestore e do armazenamento local
 */
export async function clearAllBookings(): Promise<void> {
  if (db) {
    try {
      const snap = await getDocs(collection(db, COLLECTION_NAME));
      for (const d of snap.docs) {
        await deleteDoc(doc(db, COLLECTION_NAME, d.id));
      }
    } catch (e) {
      console.warn('Erro ao limpar Firestore:', e);
    }
  }
  localStorage.removeItem(LOCAL_STORAGE_KEY);
}

/**
 * Cria um novo agendamento
 */
export async function createBooking(newBooking: Omit<Booking, 'id' | 'createdAt' | 'status' | 'whatsappSent'>): Promise<Booking> {
  const id = `res-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const booking: Booking = {
    ...newBooking,
    id,
    createdAt: Date.now(),
    status: 'pending',
    whatsappSent: false,
  };

  // Salva no Firestore
  if (db) {
    try {
      const payload = cleanObjectForFirestore(booking);
      await setDoc(doc(db, COLLECTION_NAME, id), payload);
      console.log('Agendamento gravado com sucesso no Firestore:', id);
    } catch (err) {
      console.error('Falha crítica ao gravar agendamento no Firestore:', err);
    }
  }

  // Atualiza cache local garantindo ausência de duplicatas
  const current = getLocalCache().filter((b) => b.id !== id);
  const updated = deduplicateBookings([booking, ...current]);
  setLocalCache(updated);

  return booking;
}

/**
 * Cria uma série de agendamentos recorrentes agrupados
 */
export async function createRecurringBookings(
  baseBooking: Omit<Booking, 'id' | 'createdAt' | 'status' | 'whatsappSent' | 'date' | 'recurrenceGroupId' | 'recurrenceIndex'>,
  dates: string[],
  frequency: Booking['recurrenceFrequency'],
): Promise<Booking[]> {
  const groupId = `rec-grp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const totalCount = dates.length;
  const createdList: Booking[] = [];

  for (let i = 0; i < dates.length; i++) {
    const targetDate = dates[i];
    const id = `res-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 8)}`;
    const b: Booking = {
      ...baseBooking,
      id,
      date: targetDate,
      recurrenceGroupId: groupId,
      recurrenceFrequency: frequency,
      recurrenceTotalCount: totalCount,
      recurrenceIndex: i + 1,
      createdAt: Date.now(),
      status: 'pending',
      whatsappSent: false,
    };

    if (db) {
      try {
        const payload = cleanObjectForFirestore(b);
        await setDoc(doc(db, COLLECTION_NAME, id), payload);
        console.log('Agendamento recorrente gravado no Firestore:', id);
      } catch (err) {
        console.error('Falha crítica ao salvar agendamento recorrente no Firestore:', err);
      }
    }
    createdList.push(b);
  }

  const newIds = new Set(createdList.map((b) => b.id));
  const current = getLocalCache().filter((b) => !newIds.has(b.id));
  const updated = deduplicateBookings([...createdList, ...current]);
  setLocalCache(updated);

  return createdList;
}

/**
 * Atualiza o status do agendamento
 */
export async function updateBookingStatus(
  bookingId: string,
  status: Booking['status'],
  adminNotes?: string,
): Promise<void> {
  const updates: Partial<Booking> = cleanObjectForFirestore({
    status,
    ...(status === 'confirmed' ? { confirmedAt: Date.now() } : {}),
    ...(adminNotes !== undefined ? { adminNotes } : {}),
  });

  if (db) {
    try {
      await updateDoc(doc(db, COLLECTION_NAME, bookingId), updates);
    } catch (err) {
      console.error('Falha ao atualizar status no Firestore:', err);
    }
  }

  const current = getLocalCache();
  const updated = current.map((b) => (b.id === bookingId ? { ...b, ...updates } : b));
  setLocalCache(updated);
}

/**
 * Marca que a mensagem de confirmação do WhatsApp foi enviada
 */
export async function markWhatsAppAsSent(bookingId: string): Promise<void> {
  const updates: Partial<Booking> = {
    whatsappSent: true,
    whatsappSentAt: Date.now(),
  };

  if (db) {
    try {
      await updateDoc(doc(db, COLLECTION_NAME, bookingId), updates);
    } catch (err) {
      console.warn('Firestore update failed:', err);
    }
  }

  const current = getLocalCache();
  const updated = current.map((b) => (b.id === bookingId ? { ...b, ...updates } : b));
  setLocalCache(updated);
}

/**
 * Exclui um agendamento
 */
export async function deleteBooking(bookingId: string): Promise<void> {
  if (db) {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, bookingId));
    } catch (err) {
      console.warn('Firestore delete failed:', err);
    }
  }

  const current = getLocalCache();
  const updated = current.filter((b) => b.id !== bookingId);
  setLocalCache(updated);
}

/**
 * Verifica se há conflito de horário para o mesmo laboratório na mesma data
 */
export function checkBookingConflict(
  existingBookings: Booking[],
  labId: string,
  date: string,
  timeSlot: string,
  startTime?: string,
  endTime?: string,
  ignoreBookingId?: string,
): Booking | null {
  const conflict = existingBookings.find((b) => {
    if (b.id === ignoreBookingId) return false;
    if (b.labId !== labId || b.date !== date) return false;
    if (b.status !== 'confirmed' && b.status !== 'pending') return false;

    // Se ambos possuem horários no formato HH:MM, compara sobreposição de intervalo
    if (startTime && endTime && b.startTime && b.endTime) {
      const startA = startTime.replace(':', '');
      const endA = endTime.replace(':', '');
      const startB = b.startTime.replace(':', '');
      const endB = b.endTime.replace(':', '');
      // Há sobreposição se startA < endB && endA > startB
      if (startA < endB && endA > startB) {
        return true;
      }
      return false;
    }

    // Fallback de texto caso algum não tenha os horários estruturados
    return b.timeSlot.trim().toLowerCase() === timeSlot.trim().toLowerCase();
  });

  return conflict || null;
}
