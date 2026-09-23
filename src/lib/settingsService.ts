import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { EmailSettings, SmtpConfig } from '../types';

export const DEFAULT_INSTITUTION_SUBTITLE = 'CTI/UNASP-HT';
export const DEFAULT_ADMIN_NOTIFICATION_EMAIL = 'guilhermebenz60@gmail.com';

export const DEFAULT_SMTP_CONFIG: SmtpConfig = {
  enabled: true,
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  user: '',
  pass: '',
  fromName: 'GestLab Notificações',
  fromEmail: 'notificacoes@escola.edu.br',
};

const SETTINGS_COLLECTION = 'settings';
const INSTITUTION_DOC = 'institution';
const EMAIL_SETTINGS_DOC = 'email_settings';

const LOCAL_STORAGE_SUBTITLE_KEY = 'gestlab_institution_subtitle';
const LOCAL_STORAGE_EMAIL_SETTINGS_KEY = 'gestlab_email_settings';

export const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  enabled: true,
  adminNotificationEmail: DEFAULT_ADMIN_NOTIFICATION_EMAIL,
  recipientEmails: [DEFAULT_ADMIN_NOTIFICATION_EMAIL],
  notifyAllAdmins: true,
  notifyAssignedTechnicians: true,
  smtp: { ...DEFAULT_SMTP_CONFIG },
};

// Obtém as configurações de e-mail do cache local
export function getLocalEmailSettings(): EmailSettings {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_EMAIL_SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_EMAIL_SETTINGS,
        ...parsed,
        smtp: {
          ...DEFAULT_SMTP_CONFIG,
          ...(parsed?.smtp || {}),
          enabled: parsed?.smtp?.enabled !== undefined ? parsed.smtp.enabled : true,
        },
      };
    }
  } catch (e) {
    console.warn('Erro ao ler configurações de e-mail do localStorage:', e);
  }
  return { ...DEFAULT_EMAIL_SETTINGS };
}

// Obtém as configurações de e-mail atualizadas diretamente do Firestore com fallback para o cache local
export async function getEmailSettings(): Promise<EmailSettings> {
  const local = getLocalEmailSettings();
  if (!db) {
    return local;
  }

  try {
    const docRef = doc(db, SETTINGS_COLLECTION, EMAIL_SETTINGS_DOC);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as Partial<EmailSettings>;
      const rawRecipients: string[] = Array.isArray(data.recipientEmails) && data.recipientEmails.length > 0
        ? data.recipientEmails
        : (data.adminNotificationEmail ? [data.adminNotificationEmail] : [DEFAULT_ADMIN_NOTIFICATION_EMAIL]);
      const sanitizedRecipients = Array.from(
        new Set(
          rawRecipients
            .map((r) => (typeof r === 'string' ? r.trim().toLowerCase() : ''))
            .filter((r) => r.length > 0 && r.includes('@')),
        ),
      );

      const hasSmtpCreds = Boolean(data.smtp?.user?.trim() && data.smtp?.pass?.trim());
      const smtpEnabled = data.smtp?.enabled !== undefined ? data.smtp.enabled : (hasSmtpCreds || true);

      const merged: EmailSettings = {
        enabled: data.enabled !== undefined ? data.enabled : true,
        adminNotificationEmail:
          data.adminNotificationEmail && typeof data.adminNotificationEmail === 'string'
            ? data.adminNotificationEmail.trim()
            : (sanitizedRecipients[0] || DEFAULT_ADMIN_NOTIFICATION_EMAIL),
        recipientEmails: sanitizedRecipients.length > 0 ? sanitizedRecipients : [DEFAULT_ADMIN_NOTIFICATION_EMAIL],
        notifyAllAdmins: data.notifyAllAdmins !== undefined ? data.notifyAllAdmins : true,
        notifyAssignedTechnicians:
          data.notifyAssignedTechnicians !== undefined ? data.notifyAssignedTechnicians : true,
        smtp: data.smtp
          ? {
              ...DEFAULT_SMTP_CONFIG,
              ...data.smtp,
              enabled: smtpEnabled,
            }
          : local.smtp || { ...DEFAULT_SMTP_CONFIG, enabled: true },
        updatedAt: data.updatedAt,
      };

      setLocalEmailSettings(merged);
      return merged;
    }
  } catch (err) {
    console.warn('Erro ao obter configurações de e-mail do Firestore:', err);
  }

  return local;
}

// Salva as configurações de e-mail no cache local
export function setLocalEmailSettings(settings: EmailSettings): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_EMAIL_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Erro ao gravar configurações de e-mail no localStorage:', e);
  }
}

// Escuta em tempo real as configurações de e-mail
export function subscribeToEmailSettings(callback: (settings: EmailSettings) => void): () => void {
  const initial = getLocalEmailSettings();
  callback(initial);

  if (!db) {
    return () => {};
  }

  try {
    const docRef = doc(db, SETTINGS_COLLECTION, EMAIL_SETTINGS_DOC);
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Partial<EmailSettings>;
          const localSettings = getLocalEmailSettings();
          const rawRecipients: string[] = Array.isArray(data.recipientEmails)
            ? data.recipientEmails
            : (data.adminNotificationEmail ? [data.adminNotificationEmail] : [DEFAULT_ADMIN_NOTIFICATION_EMAIL]);
          const sanitizedRecipients = Array.from(
            new Set(
              rawRecipients
                .map((r) => (typeof r === 'string' ? r.trim().toLowerCase() : ''))
                .filter((r) => r.length > 0 && r.includes('@')),
            ),
          );

          const merged: EmailSettings = {
            enabled: data.enabled !== undefined ? data.enabled : true,
            adminNotificationEmail:
              data.adminNotificationEmail && typeof data.adminNotificationEmail === 'string'
                ? data.adminNotificationEmail.trim()
                : (sanitizedRecipients[0] || DEFAULT_ADMIN_NOTIFICATION_EMAIL),
            recipientEmails: sanitizedRecipients.length > 0 ? sanitizedRecipients : [DEFAULT_ADMIN_NOTIFICATION_EMAIL],
            notifyAllAdmins: data.notifyAllAdmins !== undefined ? data.notifyAllAdmins : true,
            notifyAssignedTechnicians:
              data.notifyAssignedTechnicians !== undefined ? data.notifyAssignedTechnicians : true,
            smtp: data.smtp
              ? {
                  ...DEFAULT_SMTP_CONFIG,
                  ...data.smtp,
                  enabled: data.smtp.enabled !== undefined ? data.smtp.enabled : true,
                }
              : localSettings.smtp || { ...DEFAULT_SMTP_CONFIG, enabled: true },
            updatedAt: data.updatedAt,
          };
          setLocalEmailSettings(merged);
          callback(merged);
        } else {
          callback(DEFAULT_EMAIL_SETTINGS);
        }
      },
      (error) => {
        console.warn('Erro ao escutar configurações de e-mail no Firestore:', error);
        callback(getLocalEmailSettings());
      },
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Falha ao inicializar listener de configurações de e-mail:', err);
    return () => {};
  }
}

// Atualiza configurações de e-mail
export async function updateEmailSettings(
  partial: Partial<EmailSettings>,
): Promise<{ success: boolean; error?: string }> {
  const current = getLocalEmailSettings();
  const updated: EmailSettings = {
    ...current,
    ...partial,
    smtp: partial.smtp
      ? {
          ...(current.smtp || DEFAULT_SMTP_CONFIG),
          ...partial.smtp,
          enabled:
            partial.smtp.enabled !== undefined
              ? partial.smtp.enabled
              : Boolean(partial.smtp.user?.trim() && partial.smtp.pass?.trim()) || current.smtp?.enabled || true,
        }
      : current.smtp,
    updatedAt: Date.now(),
  };

  setLocalEmailSettings(updated);

  if (!db) {
    return { success: true };
  }

  try {
    const docRef = doc(db, SETTINGS_COLLECTION, EMAIL_SETTINGS_DOC);
    await setDoc(docRef, updated, { merge: true });
    return { success: true };
  } catch (error: any) {
    console.error('Erro ao atualizar configurações de e-mail no Firestore:', error);
    return {
      success: false,
      error: error?.message || 'Falha ao salvar configurações de e-mail.',
    };
  }
}

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

/* =========================================================================
   CONFIGURAÇÃO DE ABA / VISUALIZAÇÃO INICIAL PADRÃO DO SISTEMA
   Permite ao Administrador escolher qual aba o GestLab abre por padrão:
   - 'calendar': Calendário Geral (padrão)
   - 'booking': Novo Agendamento (Reserva Direta)
   - 'labs': Laboratórios & Status
   - 'my_bookings': Meus Agendamentos
   ========================================================================= */

export type InitialViewTab = 'calendar' | 'booking' | 'labs' | 'my_bookings';
export const DEFAULT_INITIAL_TAB: InitialViewTab = 'calendar';
export const LOCAL_STORAGE_INITIAL_TAB_KEY = 'gestlab_default_initial_tab';

export interface InitialTabOption {
  id: InitialViewTab;
  label: string;
  shortName: string;
  description: string;
  iconName: string;
}

export const AVAILABLE_INITIAL_TABS: InitialTabOption[] = [
  {
    id: 'calendar',
    label: 'Calendário Geral',
    shortName: 'Calendário',
    description: 'Visualização mensal e semanal de ocupação de laboratórios e horários.',
    iconName: 'CalendarDays',
  },
  {
    id: 'booking',
    label: 'Novo Agendamento (Reserva)',
    shortName: 'Fazer Agendamento',
    description: 'Formulário limpo e direto para envio de pedidos de aula.',
    iconName: 'CalendarPlus',
  },
  {
    id: 'labs',
    label: 'Laboratórios & Status',
    shortName: 'Laboratórios',
    description: 'Vitrine visual de laboratórios fixos e carrinhos móveis com status.',
    iconName: 'Monitor',
  },
  {
    id: 'my_bookings',
    label: 'Meus Agendamentos',
    shortName: 'Consultar Reservas',
    description: 'Consulta rápida e cancelamento de reservas realizadas por WhatsApp.',
    iconName: 'Users',
  },
];

// Obtém o valor salvo no localStorage ou o padrão 'calendar'
export function getLocalInitialTab(): InitialViewTab {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_INITIAL_TAB_KEY);
    if (saved && ['calendar', 'booking', 'labs', 'my_bookings'].includes(saved)) {
      return saved as InitialViewTab;
    }
  } catch (e) {
    console.warn('Erro ao ler aba inicial do localStorage:', e);
  }
  return DEFAULT_INITIAL_TAB;
}

// Grava no cache local
export function setLocalInitialTab(tab: InitialViewTab): void {
  try {
    if (['calendar', 'booking', 'labs', 'my_bookings'].includes(tab)) {
      localStorage.setItem(LOCAL_STORAGE_INITIAL_TAB_KEY, tab);
    }
  } catch (e) {
    console.warn('Erro ao gravar aba inicial no localStorage:', e);
  }
}

// Escuta em tempo real as alterações da aba inicial feitas pelo administrador
export function subscribeToInitialTab(callback: (tab: InitialViewTab) => void): () => void {
  const initial = getLocalInitialTab();
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
          const configuredTab = data?.initialTab;
          if (
            configuredTab &&
            typeof configuredTab === 'string' &&
            ['calendar', 'booking', 'labs', 'my_bookings'].includes(configuredTab)
          ) {
            const validTab = configuredTab as InitialViewTab;
            setLocalInitialTab(validTab);
            callback(validTab);
            return;
          }
        }
        callback(getLocalInitialTab());
      },
      (error) => {
        console.warn('Erro ao escutar aba inicial no Firestore:', error);
        callback(getLocalInitialTab());
      },
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Falha ao inicializar listener de aba inicial:', err);
    return () => {};
  }
}

// Atualização da aba inicial feita pelo Administrador
export async function updateInitialTab(newTab: InitialViewTab): Promise<{ success: boolean; error?: string }> {
  if (!['calendar', 'booking', 'labs', 'my_bookings'].includes(newTab)) {
    return { success: false, error: 'Aba selecionada inválida.' };
  }

  setLocalInitialTab(newTab);

  if (!db) {
    return { success: true };
  }

  try {
    const docRef = doc(db, SETTINGS_COLLECTION, INSTITUTION_DOC);
    await setDoc(
      docRef,
      {
        initialTab: newTab,
        updatedAt: Date.now(),
      },
      { merge: true },
    );
    return { success: true };
  } catch (error: any) {
    console.error('Erro ao atualizar aba inicial no Firestore:', error);
    return {
      success: false,
      error: error?.message || 'Falha ao salvar configuração no servidor.',
    };
  }
}
