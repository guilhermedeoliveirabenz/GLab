import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from './firebase';
import { authenticateTechnician } from './technicianService';
import {
  verifyMasterAdminPassword,
  updateMasterAdminPassword,
  checkLockoutStatus,
  recordFailedLoginAttempt,
  resetFailedAttempts,
  LockoutStatus,
} from './securityUtils';

export interface AdminUser {
  email: string;
  name: string;
  role: 'admin' | 'technician';
  provider?: string;
  assignedLabIds?: string[];
  technicianId?: string;
}

export interface TeacherSession {
  phone: string;
  name?: string;
}

interface AuthContextType {
  user: AdminUser | null;
  firebaseUser: User | null;
  isAdmin: boolean; // True para Admin Geral ou Técnico
  isSuperAdmin: boolean; // True apenas para Admin Geral
  teacherSession: TeacherSession | null;
  loading: boolean;
  lockoutStatus: LockoutStatus;
  login: (userOrEmail: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  updateAdminPassword: (currentPass: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loginTeacher: (phone: string, name?: string) => void;
  logoutTeacher: () => void;
  refreshLockout: () => LockoutStatus;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_SESSION_STORAGE_KEY = 'school_lab_admin_session';
const TEACHER_PHONE_STORAGE_KEY = 'school_lab_teacher_session';

// E-mails autorizados com perfil de Administrador Geral via Google
const SUPER_ADMIN_EMAILS = [
  'guilhermedeoliveirabenz@gmail.com',
  'guilherme.benz@gmail.com',
  'guilherme.benz@escola.gov.br',
  'guilherme.benz@escola.edu.br',
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [teacherSession, setTeacherSession] = useState<TeacherSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [lockoutStatus, setLockoutStatus] = useState<LockoutStatus>(checkLockoutStatus());

  const refreshLockout = () => {
    const status = checkLockoutStatus();
    setLockoutStatus(status);
    return status;
  };

  useEffect(() => {
    // Limpeza de resquícios de demo antigo para fechar brecha
    localStorage.removeItem('school_lab_demo_admin');

    // Verifica se há sessão de professor salva
    const savedTeacher = localStorage.getItem(TEACHER_PHONE_STORAGE_KEY);
    if (savedTeacher) {
      try {
        const parsed = JSON.parse(savedTeacher);
        setTeacherSession(parsed);
      } catch (e) {
        console.warn('Erro ao carregar sessão do professor:', e);
      }
    }

    // Verifica se há sessão administrativa segura salva
    const savedAdmin = localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
    if (savedAdmin) {
      try {
        const parsed = JSON.parse(savedAdmin);
        setUser(parsed);
      } catch (e) {
        console.warn('Erro ao carregar sessão de admin:', e);
      }
    }

    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const userEmail = (fbUser.email || '').toLowerCase();
        const isSuper = SUPER_ADMIN_EMAILS.some((e) => e.toLowerCase() === userEmail) || userEmail.includes('guilherme.benz');
        const adminData: AdminUser = {
          email: fbUser.email || 'admin@escola.edu.br',
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Administrador',
          role: isSuper ? 'admin' : 'technician',
          provider: fbUser.providerData[0]?.providerId || 'firebase',
        };
        setUser(adminData);
        localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(adminData));
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (userOrEmail: string, pass: string) => {
    // 1. Verificação de Bloqueio por Força Bruta
    const status = refreshLockout();
    if (status.isLocked) {
      throw new Error(
        `Acesso temporariamente bloqueado por motivos de segurança devido a repetidas tentativas incorretas. Aguarde ${status.remainingSeconds} segundos.`,
      );
    }

    const cleanUser = userOrEmail.trim().toLowerCase();
    const cleanPass = pass.trim();

    // 2. Verificação segura do Administrador Geral guilherme.benz com Hash
    const isGuilherme =
      cleanUser === 'guilherme.benz' ||
      cleanUser === 'guilherme.benz@gmail.com' ||
      cleanUser === 'guilhermedeoliveirabenz@gmail.com' ||
      cleanUser === 'guilherme.benz@escola.gov.br' ||
      cleanUser === 'guilherme.benz@escola.edu.br';

    if (isGuilherme) {
      const isValid = await verifyMasterAdminPassword(cleanPass);
      if (isValid) {
        resetFailedAttempts();
        refreshLockout();
        const adminData: AdminUser = {
          email: 'guilherme.benz',
          name: 'Guilherme Benz (Administrador Geral)',
          role: 'admin',
        };
        setUser(adminData);
        localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(adminData));
        return;
      } else {
        const newStatus = recordFailedLoginAttempt();
        setLockoutStatus(newStatus);
        if (newStatus.isLocked) {
          throw new Error('Senha incorreta. Limite de tentativas atingido. Acesso bloqueado por 2 minutos.');
        }
        throw new Error(
          `Senha incorreta para o administrador. Restam ${newStatus.attemptsLeft} tentativas antes do bloqueio temporário.`,
        );
      }
    }

    // 3. Verificação de Técnicos Cadastrados (com hash de senha)
    try {
      const tech = await authenticateTechnician(userOrEmail, cleanPass);
      if (tech) {
        resetFailedAttempts();
        refreshLockout();
        const techData: AdminUser = {
          email: tech.username,
          name: `${tech.name} (Técnico)`,
          role: tech.role,
          assignedLabIds: tech.assignedLabIds || [],
          technicianId: tech.id,
        };
        setUser(techData);
        localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(techData));
        return;
      }
    } catch (techErr) {
      console.warn('Erro ao verificar técnico:', techErr);
    }

    // 4. Fallback Firebase Auth com Email/Senha (se cadastrado no Firebase Auth)
    if (auth && userOrEmail.includes('@')) {
      try {
        const cred = await signInWithEmailAndPassword(auth, userOrEmail, cleanPass);
        resetFailedAttempts();
        refreshLockout();
        const fbUser = cred.user;
        const userEmail = (fbUser.email || '').toLowerCase();
        const isSuper = SUPER_ADMIN_EMAILS.some((e) => e.toLowerCase() === userEmail);
        const adminData: AdminUser = {
          email: fbUser.email || userOrEmail,
          name: fbUser.displayName || userOrEmail.split('@')[0],
          role: isSuper ? 'admin' : 'technician',
        };
        setUser(adminData);
        localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(adminData));
        return;
      } catch (fbErr: unknown) {
        console.warn('Falha autenticação Firebase:', fbErr);
      }
    }

    // Se chegou aqui, credenciais inválidas: registra tentativa falha
    const newStatus = recordFailedLoginAttempt();
    setLockoutStatus(newStatus);
    if (newStatus.isLocked) {
      throw new Error('Credenciais inválidas. Limite de tentativas atingido. Acesso bloqueado por 2 minutos.');
    }
    throw new Error(
      `Usuário ou senha inválidos. Restam ${newStatus.attemptsLeft} tentativas antes do bloqueio temporário.`,
    );
  };

  /**
   * Login seguro com Google OAuth via Firebase Auth
   */
  const loginWithGoogle = async () => {
    if (!auth) {
      throw new Error('Serviço de autenticação Firebase não está disponível no momento.');
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;
      const userEmail = (fbUser.email || '').toLowerCase();

      // Verifica se o e-mail possui permissão administrativa
      const isSuper =
        SUPER_ADMIN_EMAILS.some((e) => e.toLowerCase() === userEmail) ||
        userEmail.includes('guilherme.benz') ||
        userEmail.includes('guilhermedeoliveirabenz');

      const adminData: AdminUser = {
        email: fbUser.email || 'admin@escola.edu.br',
        name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Administrador',
        role: isSuper ? 'admin' : 'technician',
        provider: 'google',
      };

      resetFailedAttempts();
      refreshLockout();
      setUser(adminData);
      localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(adminData));
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      if (errorObj?.code === 'auth/popup-closed-by-user') {
        throw new Error('Janela de login com Google foi fechada.');
      }
      throw new Error(errorObj?.message || 'Falha ao autenticar com Google. Tente novamente.');
    }
  };

  const updateAdminPassword = async (currentPass: string, newPass: string) => {
    return await updateMasterAdminPassword(currentPass, newPass);
  };

  const loginTeacher = (phone: string, name?: string) => {
    const raw = phone.replace(/\D/g, '');
    const session: TeacherSession = {
      phone: raw,
      name: name || undefined,
    };
    setTeacherSession(session);
    localStorage.setItem(TEACHER_PHONE_STORAGE_KEY, JSON.stringify(session));
  };

  const logoutTeacher = () => {
    setTeacherSession(null);
    localStorage.removeItem(TEACHER_PHONE_STORAGE_KEY);
  };

  const logout = async () => {
    if (auth && firebaseUser) {
      try {
        await signOut(auth);
      } catch (e) {
        console.warn('Erro ao deslogar do Firebase:', e);
      }
    }
    setUser(null);
    setFirebaseUser(null);
    localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
  };

  const isSuperAdmin =
    user?.role === 'admin' ||
    SUPER_ADMIN_EMAILS.some((e) => e.toLowerCase() === (user?.email || '').toLowerCase()) ||
    (user?.email || '').includes('guilherme.benz');

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isAdmin: !!user,
        isSuperAdmin,
        teacherSession,
        loading,
        lockoutStatus,
        login,
        loginWithGoogle,
        updateAdminPassword,
        logout,
        loginTeacher,
        logoutTeacher,
        refreshLockout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
