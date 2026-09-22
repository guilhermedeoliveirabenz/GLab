import {
  collection,
  doc,
  setDoc,
  updateDoc,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { Booking, EmailLog, EmailSettings, Technician, SmtpConfig } from '../types';
import { formatDateBR } from './whatsapp';
import { getLocalTechnicians } from './technicianService';
import {
  getLocalEmailSettings,
  getEmailSettings,
  getLocalInstitutionSubtitle,
  DEFAULT_ADMIN_NOTIFICATION_EMAIL,
} from './settingsService';

const MAIL_COLLECTION = 'mail';
const EMAIL_LOGS_COLLECTION = 'email_logs';
const LOCAL_EMAIL_LOGS_KEY = 'gestlab_email_logs_cache';

// Helper para ler histórico local de e-mails
export function getLocalEmailLogs(): EmailLog[] {
  try {
    const raw = localStorage.getItem(LOCAL_EMAIL_LOGS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Erro ao ler logs de e-mail locais:', e);
  }
  return [];
}

function setLocalEmailLogs(logs: EmailLog[]) {
  try {
    localStorage.setItem(LOCAL_EMAIL_LOGS_KEY, JSON.stringify(logs.slice(0, 100)));
  } catch (e) {
    console.warn('Erro ao salvar logs de e-mail:', e);
  }
}

/**
 * Identifica a lista de e-mails dos técnicos e administradores responsáveis pelo agendamento
 */
export async function getRecipientsForBooking(
  booking: Booking,
  emailSettings?: EmailSettings,
): Promise<string[]> {
  const settings = emailSettings || (await getEmailSettings());
  const recipientsSet = new Set<string>();

  // 1. E-mails cadastrados para receber as notificações (destinatários customizados e equipe)
  if (Array.isArray(settings.recipientEmails) && settings.recipientEmails.length > 0) {
    for (const email of settings.recipientEmails) {
      if (email && typeof email === 'string') {
        let clean = email.trim().toLowerCase();
        if (clean.includes('@uansp.edu.br')) {
          clean = clean.replace('@uansp.edu.br', '@unasp.edu.br');
        }
        if (isValidEmail(clean)) {
          recipientsSet.add(clean);
        }
      }
    }
  }

  // E-mail geral do Administrador (retrocompatibilidade)
  if (settings.adminNotificationEmail && settings.adminNotificationEmail.trim()) {
    let cleanAdminEmail = settings.adminNotificationEmail.trim().toLowerCase();
    if (cleanAdminEmail.includes('@uansp.edu.br')) {
      cleanAdminEmail = cleanAdminEmail.replace('@uansp.edu.br', '@unasp.edu.br');
    }
    if (isValidEmail(cleanAdminEmail)) {
      recipientsSet.add(cleanAdminEmail);
    }
  }

  // 2. Busca técnicos cadastrados no sistema
  let techniciansList: Technician[] = getLocalTechnicians();

  // Tenta sincronizar com o Firestore para garantir dados atualizados
  if (db) {
    try {
      const snap = await getDocs(collection(db, 'technicians'));
      const remoteTechs: Technician[] = [];
      snap.forEach((d) => {
        remoteTechs.push({ ...d.data(), id: d.id } as Technician);
      });
      if (remoteTechs.length > 0) {
        techniciansList = remoteTechs;
      }
    } catch (err) {
      console.warn('Não foi possível obter técnicos do Firestore, utilizando cache:', err);
    }
  }

  for (const tech of techniciansList) {
    // Apenas usuários ativos com e-mail válido
    if (!tech.active || !tech.email) {
      continue;
    }

    let techEmail = tech.email.trim().toLowerCase();
    if (techEmail.includes('@uansp.edu.br')) {
      techEmail = techEmail.replace('@uansp.edu.br', '@unasp.edu.br');
    }
    if (!isValidEmail(techEmail)) {
      continue;
    }

    // Se for Administrador e a configuração permitir
    if (tech.role === 'admin' && settings.notifyAllAdmins) {
      recipientsSet.add(techEmail);
      continue;
    }

    // Se for Técnico responsável pelo laboratório
    if (tech.role === 'technician' && settings.notifyAssignedTechnicians) {
      const hasAccess =
        !tech.assignedLabIds ||
        tech.assignedLabIds.length === 0 ||
        tech.assignedLabIds.includes('all') ||
        tech.assignedLabIds.includes(booking.labId);

      if (hasAccess) {
        recipientsSet.add(techEmail);
      }
    }
  }

  return Array.from(recipientsSet);
}

/**
 * Validador simples de formato de e-mail
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

/**
 * Gera o conteúdo do e-mail (HTML responsivo e texto plano) para notificação do agendamento
 */
export function generateBookingEmailContent(
  booking: Booking,
  options?: { institutionSubtitle?: string },
): { subject: string; text: string; html: string } {
  const subtitle = options?.institutionSubtitle || getLocalInstitutionSubtitle();
  const formattedDate = formatDateBR(booking.date);

  const segmentLabel = booking.educationLevel
    ? {
        basico: 'Ensino Básico (Fundamental, Médio e Técnico)',
        superior: 'Ensino Superior (Graduação e Pós)',
        ead: 'EAD e Polos',
        outros: 'Outros / Eventos',
      }[booking.educationLevel] || booking.educationLevel
    : 'Não especificado';

  const subject = `[GestLab ${subtitle}] Novo Agendamento: ${booking.labName} - Prof. ${booking.teacherName} (${formattedDate})`;

  // Versão em Texto Puro
  const textLines = [
    `======================================================`,
    `GESTLAB - SISTEMA DE AGENDAMENTO DE LABORATÓRIOS`,
    `${subtitle}`,
    `======================================================`,
    ``,
    `NOTIFICAÇÃO DE NOVO AGENDAMENTO DE LABORATÓRIO`,
    ``,
    `Um novo agendamento foi realizado e aguarda sua conferência/preparação:`,
    ``,
    `• Laboratório: ${booking.labName}`,
    ...(booking.requestedMachines ? [`• Máquinas Solicitadas: ${booking.requestedMachines} computadores`] : []),
    `• Professor(a): ${booking.teacherName}`,
    `• WhatsApp / Contato: ${booking.whatsapp}`,
    `• Data da Aula: ${formattedDate}`,
    `• Horário / Aula: ${booking.timeSlot}`,
    `• Turma: ${booking.classGroup}`,
    `• Segmento: ${segmentLabel}`,
    ...(booking.subject ? [`• Disciplina / Conteúdo: ${booking.subject}`] : []),
    ...(booking.isMobileLab && booking.roomNumber
      ? [`• ATENÇÃO - CARRINHO MÓVEL: Levar até a SALA ${booking.roomNumber.toUpperCase()}`]
      : []),
    ...(booking.notes ? [`• Observações do Professor: ${booking.notes}`] : []),
    ``,
    `Status atual: ${booking.status === 'confirmed' ? 'CONFIRMADO' : 'PENDENTE DE APROVAÇÃO'}`,
    ``,
    `Acesse o GestLab para gerenciar ou confirmar esta reserva.`,
    `Mensagem gerada automaticamente pelo sistema GestLab.`,
  ];
  const text = textLines.join('\n');

  // Versão em HTML Rico e Responsivo
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
          
          <!-- Cabeçalho -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%); padding: 28px 24px; text-align: left;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 4px 10px; border-radius: 20px; margin-bottom: 8px;">
                      Notificação de Reserva
                    </span>
                    <h1 style="margin: 6px 0 2px 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
                      GestLab • Gestão de Laboratórios
                    </h1>
                    <p style="margin: 0; color: #bfdbfe; font-size: 13px; font-weight: 500;">
                      ${subtitle}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Banner Informativo -->
          <tr>
            <td style="background-color: #f8fafc; padding: 16px 24px; border-bottom: 1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size: 14px; color: #334155;">
                    🔔 <strong>Olá, Equipe de Suporte e TI!</strong><br>
                    Um novo agendamento foi registrado pelo corpo docente e requer sua atenção.
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; background-color: ${
                      booking.status === 'confirmed' ? '#dcfce7' : '#fef3c7'
                    }; color: ${
                      booking.status === 'confirmed' ? '#166534' : '#92400e'
                    }; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 12px; border: 1px solid ${
                      booking.status === 'confirmed' ? '#bbf7d0' : '#fde68a'
                    };">
                      ${booking.status === 'confirmed' ? '✓ CONFIRMADO' : '⏳ PENDENTE'}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Detalhes do Agendamento -->
          <tr>
            <td style="padding: 24px;">
              <h2 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: #0f172a; border-left: 4px solid #2563eb; padding-left: 10px;">
                Dados da Solicitação
              </h2>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px; width: 38%;">
                    🖥️ Laboratório:
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 700;">
                    ${booking.labName}
                  </td>
                </tr>

                ${
                  booking.requestedMachines
                    ? `
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">
                    💻 Máquinas Solicitadas:
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #2563eb; font-size: 14px; font-weight: 700;">
                    ${booking.requestedMachines} computadores
                  </td>
                </tr>
                `
                    : ''
                }

                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">
                    👨‍🏫 Professor(a):
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 600;">
                    ${booking.teacherName}
                  </td>
                </tr>

                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">
                    📱 WhatsApp / Contato:
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 600;">
                    <a href="https://api.whatsapp.com/send?phone=${booking.whatsapp.replace(/\D/g, '')}" style="color: #059669; text-decoration: none; font-weight: 700;">
                      ${booking.whatsapp} ↗
                    </a>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">
                    📅 Data da Aula:
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 700;">
                    ${formattedDate}
                  </td>
                </tr>

                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">
                    ⏰ Horário / Aula:
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 700;">
                    ${booking.timeSlot}
                  </td>
                </tr>

                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">
                    👥 Turma:
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 600;">
                    ${booking.classGroup}
                  </td>
                </tr>

                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">
                    🎓 Nível / Segmento:
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 13px;">
                    ${segmentLabel}
                  </td>
                </tr>

                ${
                  booking.subject
                    ? `
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">
                    📚 Disciplina / Assunto:
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px;">
                    ${booking.subject}
                  </td>
                </tr>
                `
                    : ''
                }
              </table>

              ${
                booking.isMobileLab && booking.roomNumber
                  ? `
              <!-- Alerta de Entrega do Móvel -->
              <div style="margin-top: 18px; padding: 14px; background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 10px;">
                <p style="margin: 0; color: #9f1239; font-size: 13px; font-weight: 700;">
                  🚚 ATENÇÃO - LABORATÓRIO MÓVEL (CARRINHO):
                </p>
                <p style="margin: 4px 0 0 0; color: #881337; font-size: 13px;">
                  Este carrinho de notebooks deve ser entregue na <strong>SALA: ${booking.roomNumber.toUpperCase()}</strong> antes do início do horário da aula.
                </p>
              </div>
              `
                  : ''
              }

              ${
                booking.notes
                  ? `
              <!-- Observações do Professor -->
              <div style="margin-top: 18px; padding: 14px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
                <p style="margin: 0; color: #475569; font-size: 12px; font-weight: 700; text-transform: uppercase;">
                  📝 Observações adicionais do professor:
                </p>
                <p style="margin: 4px 0 0 0; color: #1e293b; font-size: 13px; font-style: italic;">
                  "${booking.notes}"
                </p>
              </div>
              `
                  : ''
              }

              <!-- Ação / Botão -->
              <div style="margin-top: 28px; text-align: center;">
                <a href="${typeof window !== 'undefined' ? window.location.origin : '#'}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 10px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
                  Acessar Painel do GestLab ↗
                </a>
              </div>
            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td style="background-color: #f8fafc; padding: 18px 24px; text-align: center; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px;">
              Este é um e-mail automático gerado pelo sistema <strong>GestLab</strong> para os técnicos e administradores cadastrados.<br>
              Data de registro: ${new Date().toLocaleString('pt-BR')}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return { subject, text, html };
}

/**
 * Testa a conexão com o servidor SMTP/SNMP e opcionalmente envia e-mail de verificação
 */
export async function testSmtpConnection(
  smtpConfig: SmtpConfig,
  toEmail?: string,
): Promise<{ success: boolean; message: string; response?: string; error?: string }> {
  try {
    const res = await fetch('/api/test-smtp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        user: smtpConfig.user,
        pass: smtpConfig.pass,
        from: `"${smtpConfig.fromName || 'GestLab Notificações'}" <${smtpConfig.fromEmail || smtpConfig.user || 'gestlab@escola.edu.br'}>`,
        toEmail,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        message: data.error || 'Falha ao conectar com o servidor SMTP.',
        error: data.error,
      };
    }

    return {
      success: true,
      message: data.message || 'Conexão com servidor SMTP estabelecida e validada com sucesso!',
      response: data.response,
    };
  } catch (err: any) {
    console.error('Erro ao chamar /api/test-smtp:', err);
    return {
      success: false,
      message: err.message || 'Não foi possível contatar o serviço SMTP.',
      error: err.message,
    };
  }
}

/**
 * Envia e-mail via serviço backend SMTP
 */
export async function sendEmailViaSmtp(
  to: string[],
  subject: string,
  html: string,
  text: string,
  smtpConfig?: SmtpConfig,
): Promise<{ success: boolean; messageId?: string; response?: string; error?: string }> {
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        subject,
        html,
        text,
        smtpConfig,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Erro no envio via SMTP.',
      };
    }

    return {
      success: true,
      messageId: data.messageId,
      response: data.response,
    };
  } catch (err: any) {
    console.warn('Erro ao disparar e-mail via /api/send-email:', err);
    return {
      success: false,
      error: err.message || 'Falha ao contatar serviço backend SMTP.',
    };
  }
}

/**
 * Dispara o e-mail de notificação para todos os técnicos e administradores cadastrados
 */
export async function sendBookingNotificationEmail(
  booking: Booking,
): Promise<{ success: boolean; recipients: string[]; logId?: string; protocol?: string; error?: string; smtpResponse?: string }> {
  const emailSettings = await getEmailSettings();

  if (!emailSettings.enabled) {
    console.log('Notificações por e-mail desativadas nas configurações.');
    return {
      success: false,
      recipients: [],
      error: 'Notificações por e-mail desativadas no painel de configurações.',
    };
  }

  // 1. Obtém a lista de e-mails dos responsáveis
  const recipients = await getRecipientsForBooking(booking, emailSettings);

  if (recipients.length === 0) {
    console.warn('Nenhum e-mail de técnico ou administrador encontrado para notificação.');
    return {
      success: false,
      recipients: [],
      error: 'Nenhum e-mail cadastrado para técnicos ou administradores responsáveis por este laboratório.',
    };
  }

  // 2. Gera o template completo do e-mail
  const { subject, text, html } = generateBookingEmailContent(booking);

  const logId = `email-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();

  // 3. Disparo Automático Real via Serviço SMTP
  let smtpSuccess = false;
  let smtpResponse: string | undefined;
  let smtpErrorMessage: string | undefined;

  const isSmtpAllowed = emailSettings.smtp?.enabled !== false;

  if (isSmtpAllowed) {
    try {
      const smtpRes = await sendEmailViaSmtp(recipients, subject, html, text, emailSettings.smtp);
      if (smtpRes.success) {
        smtpSuccess = true;
        smtpResponse = smtpRes.response || 'SMTP 250 OK Message accepted';
        console.log('Notificação enviada com sucesso via SMTP para:', recipients);
      } else {
        smtpErrorMessage = smtpRes.error;
        console.warn('Tentativa via SMTP retornou aviso:', smtpRes.error);
      }
    } catch (smtpErr: any) {
      smtpErrorMessage = smtpErr?.message || 'Falha ao conectar com o serviço SMTP';
      console.warn('Falha na requisição SMTP:', smtpErr);
    }
  }

  const emailLog: EmailLog = {
    id: logId,
    bookingId: booking.id,
    subject,
    recipients,
    sentAt: now,
    status: smtpSuccess ? 'sent' : (smtpErrorMessage ? 'failed' : 'sent'),
    type: 'booking_created',
    protocol: smtpSuccess ? 'smtp' : 'firebase',
    labName: booking.labName,
    teacherName: booking.teacherName,
    details: `${booking.date} • ${booking.timeSlot}`,
    smtpResponse: smtpResponse || (smtpErrorMessage ? `Erro: ${smtpErrorMessage}` : undefined),
  };

  // Salva no cache local de logs
  const currentLogs = getLocalEmailLogs();
  setLocalEmailLogs([emailLog, ...currentLogs]);

  // 4. Grava na coleção 'mail' do Firestore (para histórico e integração com Firebase extension)
  if (db) {
    try {
      await addDoc(collection(db, MAIL_COLLECTION), {
        to: recipients,
        message: {
          subject,
          text,
          html,
        },
        bookingId: booking.id,
        protocol: smtpSuccess ? 'smtp' : 'firebase',
        createdAt: now,
      });

      // Grava também no histórico de auditoria 'email_logs'
      await setDoc(doc(db, EMAIL_LOGS_COLLECTION, logId), emailLog);

      // Atualiza o documento de booking com os dados de envio
      await updateDoc(doc(db, 'bookings', booking.id), {
        emailSent: true,
        emailSentAt: now,
        emailRecipients: recipients,
        emailProtocol: smtpSuccess ? 'smtp' : 'firebase',
      }).catch((e) => console.warn('Falha leve ao marcar emailSent no booking:', e));
    } catch (err: any) {
      console.error('Erro ao gravar notificação de e-mail no Firestore:', err);
    }
  }

  return {
    success: true,
    recipients,
    protocol: smtpSuccess ? 'smtp' : 'firebase',
    logId,
    smtpResponse,
    error: smtpErrorMessage,
  };
}

/**
 * Dispara um e-mail de teste para verificar as notificações via SMTP
 */
export async function sendTestNotificationEmail(
  targetEmail?: string,
  smtpOverride?: SmtpConfig,
): Promise<{ success: boolean; recipients: string[]; error?: string; message?: string; protocol?: string }> {
  const settings = await getEmailSettings();
  const subtitle = getLocalInstitutionSubtitle();

  const recipients = targetEmail
    ? [targetEmail.trim().toLowerCase()]
    : Array.from(
        new Set([
          ...(settings.recipientEmails || []),
          settings.adminNotificationEmail || DEFAULT_ADMIN_NOTIFICATION_EMAIL,
          ...getLocalTechnicians()
            .filter((t) => t.active && t.email)
            .map((t) => t.email!.trim().toLowerCase()),
        ]),
      ).filter(isValidEmail);

  if (recipients.length === 0) {
    return {
      success: false,
      recipients: [],
      error: 'Nenhum e-mail de destino válido encontrado para o teste.',
    };
  }

  const activeSmtp = smtpOverride || settings.smtp;

  // 1. Tenta envio e handshake via serviço SMTP
  if (activeSmtp) {
    const smtpTest = await testSmtpConnection(activeSmtp, recipients[0]);
    if (smtpTest.success) {
      const logId = `test-smtp-${Date.now()}`;
      const emailLog: EmailLog = {
        id: logId,
        subject: `[GestLab ${subtitle}] Teste de Conexão SMTP`,
        recipients,
        sentAt: Date.now(),
        status: 'sent',
        type: 'test',
        protocol: 'smtp',
        details: `Servidor SMTP: ${activeSmtp.host}:${activeSmtp.port}`,
        smtpResponse: smtpTest.response,
      };
      const currentLogs = getLocalEmailLogs();
      setLocalEmailLogs([emailLog, ...currentLogs]);
      if (db) {
        await setDoc(doc(db, EMAIL_LOGS_COLLECTION, logId), emailLog).catch(() => {});
      }

      return {
        success: true,
        recipients,
        message: smtpTest.message,
        protocol: 'smtp',
      };
    } else if (activeSmtp.host) {
      // Se SMTP foi configurado explicitamente e falhou, reporta o erro exato
      return {
        success: false,
        recipients,
        error: `Falha na conexão SMTP (${activeSmtp.host}:${activeSmtp.port}): ${smtpTest.error || smtpTest.message}`,
      };
    }
  }

  const subject = `[GestLab ${subtitle}] Teste de Notificação por E-mail`;
  const text = `Este é um e-mail de teste do sistema GestLab (${subtitle}) confirmando que as notificações para técnicos e administradores estão ativas.`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; max-width: 500px;">
      <h2 style="color: #2563eb; margin-top: 0;">GestLab • Teste de E-mail</h2>
      <p style="color: #334155;">Olá! Este e-mail confirma que a integração de notificações do <strong>GestLab (${subtitle})</strong> está operando corretamente.</p>
      <p style="color: #64748b; font-size: 13px;">Destinatários configurados: ${recipients.join(', ')}</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">Enviado em: ${new Date().toLocaleString('pt-BR')}</p>
    </div>
  `;

  const logId = `test-${Date.now()}`;
  const emailLog: EmailLog = {
    id: logId,
    subject,
    recipients,
    sentAt: Date.now(),
    status: 'sent',
    type: 'test',
    protocol: 'firebase',
    details: 'Disparo de teste administrativo',
  };

  const currentLogs = getLocalEmailLogs();
  setLocalEmailLogs([emailLog, ...currentLogs]);

  if (db) {
    try {
      await addDoc(collection(db, MAIL_COLLECTION), {
        to: recipients,
        message: { subject, text, html },
        createdAt: Date.now(),
      });
      await setDoc(doc(db, EMAIL_LOGS_COLLECTION, logId), emailLog);
    } catch (err) {
      console.warn('Falha ao gravar e-mail de teste no Firestore:', err);
    }
  }

  return { success: true, recipients, protocol: 'firebase' };
}

/**
 * Escuta em tempo real os logs de e-mails enviados
 */
export function subscribeToEmailLogs(callback: (logs: EmailLog[]) => void): () => void {
  callback(getLocalEmailLogs());

  if (!db) {
    return () => {};
  }

  try {
    const q = query(collection(db, EMAIL_LOGS_COLLECTION), orderBy('sentAt', 'desc'), limit(30));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: EmailLog[] = [];
        snapshot.forEach((d) => {
          list.push({ ...d.data(), id: d.id } as EmailLog);
        });
        setLocalEmailLogs(list);
        callback(list);
      },
      (error) => {
        console.warn('Erro ao escutar logs de e-mail:', error);
        callback(getLocalEmailLogs());
      },
    );
    return unsubscribe;
  } catch (e) {
    console.warn('Erro ao inicializar listener de logs de e-mail:', e);
    return () => {};
  }
}

/**
 * Cria a URL mailto para abertura direta no cliente de e-mail (Gmail / Outlook / Apple Mail)
 */
export function generateMailtoUrl(booking: Booking, recipients: string[]): string {
  const { subject, text } = generateBookingEmailContent(booking);
  const cleanRecipients = recipients
    .map((r) => r.trim().replace('@uansp.edu.br', '@unasp.edu.br'))
    .filter(Boolean);
  const to = cleanRecipients.join(',');
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
}

/**
 * Cria a URL para composição direta no Gmail Web (browser)
 */
export function generateGmailWebComposeUrl(booking: Booking, recipients: string[]): string {
  const { subject, text } = generateBookingEmailContent(booking);
  const cleanRecipients = recipients
    .map((r) => r.trim().replace('@uansp.edu.br', '@unasp.edu.br'))
    .filter(Boolean);
  const to = cleanRecipients.join(',');
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
}

/**
 * Cria a URL para composição direta no Microsoft Outlook Web / Office 365
 */
export function generateOutlookWebComposeUrl(booking: Booking, recipients: string[]): string {
  const { subject, text } = generateBookingEmailContent(booking);
  const cleanRecipients = recipients
    .map((r) => r.trim().replace('@uansp.edu.br', '@unasp.edu.br'))
    .filter(Boolean);
  const to = cleanRecipients.join(',');
  return `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
}

