import React, { useState, useEffect } from 'react';
import { Technician, Lab, LAB_LIST } from '../types';
import {
  subscribeToTechnicians,
  createTechnician,
  updateTechnician,
  deleteTechnician,
} from '../lib/technicianService';
import { useAuth } from '../lib/authContext';
import {
  Users,
  UserPlus,
  Trash2,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  Shield,
  KeyRound,
  UserCheck,
  AlertCircle,
  Clock,
  Edit2,
  Monitor,
  Truck,
  Building,
  Send,
} from 'lucide-react';
import { getWhatsAppSendUrl } from '../lib/whatsapp';

interface TechnicianManagementProps {
  labs?: Lab[];
}

export const TechnicianManagement: React.FC<TechnicianManagementProps> = ({
  labs = LAB_LIST,
}) => {
  const { isSuperAdmin, user } = useAuth();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [labSelectionMode, setLabSelectionMode] = useState<'all' | 'specific'>('all');
  const [assignedLabIds, setAssignedLabIds] = useState<string[]>([]);

  useEffect(() => {
    const unsub = subscribeToTechnicians((list) => {
      setTechnicians(list);
    });
    return () => unsub();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingTech(null);
    setName('');
    setUsername('');
    setPassword('');
    setPhone('');
    setEmail('');
    setLabSelectionMode('all');
    setAssignedLabIds([]);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tech: Technician) => {
    setEditingTech(tech);
    setName(tech.name);
    setUsername(tech.username);
    setPassword(''); // Deixar em branco para manter a senha atual
    setPhone(tech.phone || '');
    setEmail(tech.email || '');
    if (tech.assignedLabIds && tech.assignedLabIds.length > 0) {
      setLabSelectionMode('specific');
      setAssignedLabIds(tech.assignedLabIds);
    } else {
      setLabSelectionMode('all');
      setAssignedLabIds([]);
    }
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handlePhoneChange = (val: string) => {
    const raw = val.replace(/\D/g, '');
    let formatted = raw;
    if (raw.length <= 2) {
      formatted = raw.length > 0 ? `(${raw}` : '';
    } else if (raw.length <= 7) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    } else if (raw.length <= 11) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
    } else {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
    }
    setPhone(formatted);
  };

  const toggleLabAssignment = (labId: string) => {
    setAssignedLabIds((prev) =>
      prev.includes(labId) ? prev.filter((id) => id !== labId) : [...prev, labId],
    );
  };

  const selectAllFixedLabs = () => {
    const fixedIds = labs.filter((l) => !l.isMobile).map((l) => l.id);
    setAssignedLabIds((prev) => Array.from(new Set([...prev, ...fixedIds])));
  };

  const selectAllMobileLabs = () => {
    const mobileIds = labs.filter((l) => l.isMobile).map((l) => l.id);
    setAssignedLabIds((prev) => Array.from(new Set([...prev, ...mobileIds])));
  };

  const clearLabSelection = () => {
    setAssignedLabIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser || cleanUser.length < 3) {
      setErrorMsg('O nome de usuário deve ter pelo menos 3 caracteres.');
      return;
    }

    if (cleanUser === 'guilherme.benz') {
      setErrorMsg('O usuário "guilherme.benz" é reservado para o Administrador Geral.');
      return;
    }

    // Se estiver criando ou alterou o username, verifica duplicação
    const duplicate = technicians.some(
      (t) =>
        t.username.trim().toLowerCase() === cleanUser &&
        (!editingTech || t.id !== editingTech.id),
    );
    if (duplicate) {
      setErrorMsg(`Já existe um técnico cadastrado com o usuário "${cleanUser}". Escolha outro.`);
      return;
    }

    // Validação de senha
    if (!editingTech) {
      if (!password || password.length < 4) {
        setErrorMsg('A senha inicial deve ter pelo menos 4 caracteres.');
        return;
      }
    } else if (password && password.length < 4) {
      setErrorMsg('A nova senha deve ter pelo menos 4 caracteres.');
      return;
    }

    // Laboratórios finais
    const finalAssignedLabs = labSelectionMode === 'all' ? [] : assignedLabIds;

    if (labSelectionMode === 'specific' && finalAssignedLabs.length === 0) {
      setErrorMsg('Por favor, selecione pelo menos um laboratório ou marque a opção "Todos os Laboratórios".');
      return;
    }

    setLoading(true);
    try {
      if (editingTech) {
        // Atualiza técnico existente
        await updateTechnician(editingTech.id, {
          name: name.trim(),
          username: cleanUser,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          assignedLabIds: finalAssignedLabs,
          ...(password ? { newPassword: password.trim() } : {}),
        });

        setSuccessMsg(`Técnico "${name.trim()}" atualizado com sucesso!`);
      } else {
        // Cria novo técnico
        await createTechnician({
          name: name.trim(),
          username: cleanUser,
          password: password.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          role: 'technician',
          assignedLabIds: finalAssignedLabs,
          active: true,
        });

        setSuccessMsg(`Técnico "${name.trim()}" cadastrado com sucesso!`);
      }

      setTimeout(() => setSuccessMsg(null), 4000);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Erro ao salvar técnico:', err);
      setErrorMsg('Erro ao salvar técnico. Verifique os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (tech: Technician) => {
    try {
      await updateTechnician(tech.id, { active: !tech.active });
    } catch (err) {
      console.error('Erro ao alternar status do técnico:', err);
    }
  };

  const handleDelete = async (tech: Technician) => {
    if (
      window.confirm(
        `Tem certeza de que deseja remover o acesso do técnico ${tech.name} (@${tech.username})?`,
      )
    ) {
      try {
        await deleteTechnician(tech.id);
        setSuccessMsg(`Técnico ${tech.name} removido.`);
        setTimeout(() => setSuccessMsg(null), 3000);
      } catch (err) {
        console.error('Erro ao deletar técnico:', err);
      }
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-3">
        <Shield className="w-10 h-10 text-amber-600 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">Acesso Restrito ao Administrador Geral</h3>
        <p className="text-xs text-slate-600 max-w-md mx-auto">
          Apenas Administradores podem visualizar ou gerenciar a equipe de técnicos de TI.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Gestão da Equipe de Técnicos de TI
              </h2>
              <p className="text-xs text-slate-500">
                Cadastre técnicos e determine quais laboratórios cada técnico pode visualizar e gerenciar.
              </p>
            </div>
          </div>
        </div>

        {isSuperAdmin && (
          <button
            id="open-create-technician-btn"
            type="button"
            onClick={handleOpenCreateModal}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Cadastrar Novo Técnico</span>
          </button>
        )}
      </div>

      {/* Success Notification Banner */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Lista de Técnicos */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
          Técnicos Cadastrados ({technicians.length})
        </h3>

        {technicians.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Nenhum técnico cadastrado</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Cadastre técnicos de informática para que possam acompanhar os agendamentos dos laboratórios escolares.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {technicians.map((tech) => {
              const hasSpecificLabs = tech.assignedLabIds && tech.assignedLabIds.length > 0;
              const assignedLabsList = hasSpecificLabs
                ? labs.filter((l) => tech.assignedLabIds?.includes(l.id))
                : [];

              return (
                <div
                  key={tech.id}
                  id={`tech-card-${tech.id}`}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 ${
                        tech.active
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}
                    >
                      {tech.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{tech.name}</h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 font-mono">
                          @{tech.username}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            tech.active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {tech.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>

                      {/* Informações de contato */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        {tech.phone && (
                          <div className="flex items-center gap-1.5">
                            <span className="flex items-center gap-1 font-medium text-slate-700">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{tech.phone}</span>
                            </span>
                            <a
                              href={getWhatsAppSendUrl(
                                tech.phone,
                                `*TESTE DE NOTIFICAÇÃO - GESTLAB* 🔔\n\nOlá ${tech.name}! Este é um teste do sistema de laboratórios. Seu número está pronto para receber notificações de novos agendamentos.`
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                              title="Enviar mensagem de teste no WhatsApp deste técnico"
                            >
                              <Send className="w-2.5 h-2.5" />
                              <span>Testar WhatsApp</span>
                            </a>
                          </div>
                        )}
                        {tech.email ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="flex items-center gap-1 text-slate-700">
                              <Mail className="w-3 h-3 text-blue-600" />
                              <span className="font-medium">{tech.email}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              E-mail de Agendamento Ativo
                            </span>
                          </div>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            <span>Sem e-mail (não receberá avisos de agendamentos)</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>Cadastrado em {new Date(tech.createdAt).toLocaleDateString('pt-BR')}</span>
                        </span>
                      </div>

                      {/* Opção de visualização dos Laboratórios */}
                      <div className="pt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                          <Building className="w-3 h-3 text-slate-400" />
                          Visualiza:
                        </span>
                        {!hasSpecificLabs ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            Todos os Laboratórios
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {assignedLabsList.map((lab) => (
                              <span
                                key={lab.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-800 border border-slate-200"
                              >
                                {lab.isMobile ? (
                                  <Truck className="w-2.5 h-2.5 text-rose-600" />
                                ) : (
                                  <Monitor className="w-2.5 h-2.5 text-blue-600" />
                                )}
                                {lab.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    {isSuperAdmin && (
                      <button
                        id={`edit-tech-btn-${tech.id}`}
                        type="button"
                        onClick={() => handleOpenEditModal(tech)}
                        title="Editar Permissões e Laboratórios"
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Editar Labs</span>
                      </button>
                    )}

                    <button
                      id={`toggle-active-${tech.id}`}
                      type="button"
                      onClick={() => handleToggleActive(tech)}
                      title={tech.active ? 'Desativar Acesso' : 'Ativar Acesso'}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1.5 ${
                        tech.active
                          ? 'border-slate-200 text-slate-700 hover:bg-slate-100'
                          : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                      }`}
                    >
                      {tech.active ? (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-slate-500" />
                          <span>Desativar</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Ativar</span>
                        </>
                      )}
                    </button>

                    {isSuperAdmin && (
                      <button
                        id={`delete-tech-${tech.id}`}
                        type="button"
                        onClick={() => handleDelete(tech)}
                        title="Excluir Técnico"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Cadastro / Edição de Técnico */}
      {isModalOpen && (
        <div
          id="technician-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-fade-in my-8 max-h-[90vh] flex flex-col">
            <div className="p-5 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">
                    {editingTech ? 'Editar Técnico e Laboratórios' : 'Cadastrar Técnico de TI'}
                  </h3>
                  <p className="text-[11px] text-blue-100">
                    Defina permissões de acesso e laboratórios autorizados
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="tech-name-input"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Nome Completo do Técnico *
                </label>
                <input
                  id="tech-name-input"
                  type="text"
                  required
                  placeholder="Ex: Matheus Oliveira"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="tech-username-input"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Nome de Usuário (Login) *
                  </label>
                  <input
                    id="tech-username-input"
                    type="text"
                    required
                    placeholder="Ex: matheus.ti"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="tech-password-input"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    {editingTech ? 'Nova Senha (Opcional)' : 'Senha de Acesso *'}
                  </label>
                  <input
                    id="tech-password-input"
                    type="password"
                    required={!editingTech}
                    placeholder={editingTech ? 'Deixe em branco p/ manter' : 'Mínimo 4 caracteres'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="tech-phone-input"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    WhatsApp / Telefone
                  </label>
                  <input
                    id="tech-phone-input"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="tech-email-input"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    E-mail para Notificações de Agendamento
                  </label>
                  <input
                    id="tech-email-input"
                    type="email"
                    placeholder="tecnico@escola.gov.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Receberá avisos automáticos por e-mail para os laboratórios atendidos.
                  </p>
                </div>
              </div>

              {/* SEÇÃO: QUAL LAB O TÉCNICO VISUALIZARÁ */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-900">
                    Laboratórios que este técnico visualizará:
                  </label>
                  <span className="text-[11px] text-blue-600 font-medium">Controle de Acesso</span>
                </div>

                {/* Opções de Escopo */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setLabSelectionMode('all');
                      setAssignedLabIds([]);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      labSelectionMode === 'all'
                        ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-600/20 text-blue-950 font-bold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-blue-600" />
                      <span className="text-xs">Todos os Labs</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-normal mt-1">
                      Acesso total aos 12 laboratórios (fixos e móveis)
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLabSelectionMode('specific')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      labSelectionMode === 'specific'
                        ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-600/20 text-blue-950 font-bold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Monitor className="w-4 h-4 text-blue-600" />
                      <span className="text-xs">Labs Específicos</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-normal mt-1">
                      Visualizar apenas laboratórios selecionados
                    </p>
                  </button>
                </div>

                {/* Seletor detalhado se "specific" estiver ativo */}
                {labSelectionMode === 'specific' && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-700">
                        Selecione os laboratórios ({assignedLabIds.length} selecionados):
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={selectAllFixedLabs}
                          className="text-blue-600 hover:underline font-medium cursor-pointer"
                        >
                          + Todos Fixos
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={selectAllMobileLabs}
                          className="text-blue-600 hover:underline font-medium cursor-pointer"
                        >
                          + Todos Móveis
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={clearLabSelection}
                          className="text-slate-500 hover:underline cursor-pointer"
                        >
                          Limpar
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {labs.map((lab) => {
                        const isChecked = assignedLabIds.includes(lab.id);
                        return (
                          <label
                            key={lab.id}
                            className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-blue-100/60 border-blue-400 text-blue-950 font-semibold'
                                : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleLabAssignment(lab.id)}
                              className="rounded-sm text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                            />
                            <div className="flex items-center gap-1.5 truncate">
                              {lab.isMobile ? (
                                <Truck className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              ) : (
                                <Monitor className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              )}
                              <span className="truncate">{lab.name}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="save-technician-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{loading ? 'Salvando...' : editingTech ? 'Salvar Alterações' : 'Salvar Técnico'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
