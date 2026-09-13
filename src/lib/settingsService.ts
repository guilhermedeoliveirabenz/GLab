import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

export const DEFAULT_INSTITUTION_SUBTITLE = 'CTI/UNASP-HT';
const SETTINGS_COLLECTION = 'settings';
const INSTITUTION_DOC = 'institution';
const LOCAL_STORAGE_SUBTITLE_KEY = 'gestlab_institution_subtitle';

// Obtém o valor salvo em cache local ou o padrão CTI/UNASP-HT
export function getLocalInstitutionSubtitle(): string {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_SUBTITLE_KEY);
    if (saved && saved.trim()) {
      return saved.trim();
    }
  } catch (e) {
    console.warn('Erro ao ler subtítulo do localStorage:', e);
  }
  return DEFAULT_INSTITUTION_SUBTITLE;
}

// Salva no cache local
export function setLocalInstitutionSubtitle(value: string): void {
  try {
    const cleaned = value.trim() || DEFAULT_INSTITUTION_SUBTITLE;
    localStorage.setItem(LOCAL_STORAGE_SUBTITLE_KEY, cleaned);
  } catch (e) {
    console.warn('Erro ao gravar subtítulo no localStorage:', e);
  }
}

// Listener com Firestore em tempo real e fallback local
export function subscribeToInstitutionSubtitle(callback: (subtitle: string) => void): () => void {
  // Callback imediato com cache
  const initial = getLocalInstitutionSubtitle();
  callback(initial);

  if (!db) {
    return () => {};
  }

  try {
    const docRef = doc(db, SETTINGS_COLLECTION, INSTITUTION_DOC);
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const subtitle = (data.subtitle && typeof data.subtitle === 'string' && data.subtitle.trim())
            ? data.subtitle.trim()
            : DEFAULT_INSTITUTION_SUBTITLE;
          setLocalInstitutionSubtitle(subtitle);
          callback(subtitle);
        } else {
          // Se não existir no Firestore, grava o padrão
          callback(DEFAULT_INSTITUTION_SUBTITLE);
        }
      },
      (error) => {
        console.warn('Erro ao escutar configurações da instituição no Firestore:', error);
        callback(getLocalInstitutionSubtitle());
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Falha ao inicializar listener de configurações:', err);
    return () => {};
  }
}

// Atualização feita pelo Administrador
export async function updateInstitutionSubtitle(newSubtitle: string): Promise<{ success: boolean; error?: string }> {
  const cleaned = newSubtitle.trim() || DEFAULT_INSTITUTION_SUBTITLE;
  setLocalInstitutionSubtitle(cleaned);

  if (!db) {
    return { success: true };
  }

  try {
    const docRef = doc(db, SETTINGS_COLLECTION, INSTITUTION_DOC);
    await setDoc(
      docRef,
      {
        subtitle: cleaned,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
    return { success: true };
  } catch (error: any) {
    console.error('Erro ao atualizar subtítulo no Firestore:', error);
    return {
      success: false,
      error: error?.message || 'Falha ao salvar configuração no servidor.',
    };
  }
}
