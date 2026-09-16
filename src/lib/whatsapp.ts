import { Booking } from '../types';

/**
 * Limpa e formata o telefone para o padrão do WhatsApp (com DDI 55 do Brasil)
 */
export function sanitizeWhatsAppPhone(phone: string): string {
  // Remove todos os caracteres não numéricos
  const clean = phone.replace(/\D/g, '');

  if (!clean) return '';

  // Se já começar com 55 e tiver 12 ou 13 dígitos
  if (clean.startsWith('55') && (clean.length === 12 || clean.length === 13)) {
    return clean;
  }

  // Se for DDD + Número (10 ou 11 dígitos, ex: 11987654321 ou 1187654321)
  if (clean.length === 10 || clean.length === 11) {
    return `55${clean}`;
  }

  // Se tiver 8 ou 9 dígitos sem DDD (caso raro), retorna apenas com 55
  if (clean.length === 8 || clean.length === 9) {
    return `5511${clean}`; // Assume DDD padrão se ausente
  }

  return clean;
}

/**
 * Formata a data YYYY-MM-DD para o formato legível em português DD/MM/YYYY
 */
export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const weekDay = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
    const capitalizedWeekDay = weekDay.charAt(0).toUpperCase() + weekDay.slice(1);
    return `${day}/${month}/${year} (${capitalizedWeekDay})`;
  } catch {
    return dateStr;
  }
}

/**
 * Gera a mensagem oficial de confirmação para o WhatsApp
 */
export function generateWhatsAppMessage(booking: Booking, customAdminNote?: string): string {
  const formattedDate = formatDateBR(booking.date);

  const rawTeacher = booking.teacherName?.trim();
  const cleanTeacher = rawTeacher ? rawTeacher.replace(/^Prof\.?\s*/i, '').trim() : 'Guilherme Benz';
  const teacherName = cleanTeacher || 'Guilherme Benz';

  const lines = [
    `*CONFIRMAÇÃO DE AGENDAMENTO DE LABORATÓRIO* 🏫`,
    ``,
    `Olá, *Prof. ${teacherName}*!`,
    `Informamos que o seu agendamento foi *APROVADO E CONFIRMADO* com sucesso pelo departamento de TI.`,
    ``,
    `📋 *DETALHES DA RESERVA:*`,
    `🖥️ *Laboratório:* ${booking.labName}`,
    ...(booking.requestedMachines ? [`💻 *Máquinas Solicitadas:* ${booking.requestedMachines} computadores`] : []),
    `📅 *Data:* ${formattedDate}`,
    `⏰ *Horário/Aula:* ${booking.timeSlot}`,
    `👥 *Turma:* ${booking.classGroup}`,
    ...(booking.educationLevel
      ? [
          `🎓 *Segmento:* ${{
            basico: 'Ensino Básico',
            superior: 'Ensino Superior',
            ead: 'EAD',
            outros: 'Outros',
          }[booking.educationLevel] || booking.educationLevel}`,
        ]
      : []),
  ];

  if (booking.subject) {
    lines.push(`📚 *Disciplina/Conteúdo:* ${booking.subject}`);
  }

  if (booking.isMobileLab && booking.roomNumber) {
    lines.push(
      ``,
      `🚚 *ENTREGA DO CARRINHO MÓVEL:*`,
      `O carrinho de notebooks será levado até a *SALA: ${booking.roomNumber.toUpperCase()}* antes do início do horário agendado. Certifique-se de que a sala estará aberta.`,
    );
  }

  if (booking.notes) {
    lines.push(``, `📝 *Observação do Professor:* ${booking.notes}`);
  }

  if (customAdminNote) {
    lines.push(``, `⚠️ *Aviso da Coordenação/TI:* ${customAdminNote}`);
  }

  lines.push(
    ``,
    `Caso precise cancelar ou alterar algum detalhe, favor nos avisar com antecedência.`,
    `Tenha uma excelente aula! 💻🎓`,
  );

  return lines.join('\n');
}

/**
 * Gera mensagem de notificação de novo agendamento destinada ao Técnico / Equipe de TI
 */
export function generateTechnicianAlertWhatsAppMessage(booking: Booking, technicianName?: string): string {
  const formattedDate = formatDateBR(booking.date);

  const lines = [
    `*🔔 NOVO AGENDAMENTO DE LABORATÓRIO*`,
    ``,
    technicianName ? `Olá, *${technicianName}*!` : `Olá, *Equipe de TI / Suporte Escolar*!`,
    `Um novo agendamento foi registrado no sistema GestLab e aguarda sua conferência:`,
    ``,
    `📋 *DADOS DA SOLICITAÇÃO:*`,
    `👨‍🏫 *Professor(a):* ${booking.teacherName}`,
    `📱 *WhatsApp:* ${booking.whatsapp}`,
    `🖥️ *Laboratório:* ${booking.labName}`,
    ...(booking.requestedMachines ? [`💻 *Qtd. Máquinas:* ${booking.requestedMachines} computadores`] : []),
    `📅 *Data da Aula:* ${formattedDate}`,
    `⏰ *Horário:* ${booking.timeSlot}`,
    `👥 *Turma:* ${booking.classGroup}`,
  ];

  if (booking.subject) {
    lines.push(`📚 *Disciplina:* ${booking.subject}`);
  }

  if (booking.isMobileLab && booking.roomNumber) {
    lines.push(
      ``,
      `🚚 *ATENÇÃO - CARRINHO MÓVEL:*`,
      `Este pedido requer levar o carrinho de notebooks até a *SALA: ${booking.roomNumber.toUpperCase()}*.`,
    );
  }

  if (booking.notes) {
    lines.push(``, `📝 *Observação:* ${booking.notes}`);
  }

  lines.push(
    ``,
    `🔗 Por favor, acesse o painel administrativo do GestLab para conferir e aprovar a reserva.`,
  );

  return lines.join('\n');
}

/**
 * Gera mensagem de recusa ou cancelamento caso necessário

 */
export function generateWhatsAppRejectionMessage(booking: Booking, reason?: string): string {
  const formattedDate = formatDateBR(booking.date);
  return [
    `*AVISO DE AGENDAMENTO - LABORATÓRIO ESCOLAR* 🏫`,
    ``,
    `Olá, *Prof. ${booking.teacherName}*!`,
    `Infelizmente não foi possível confirmar o agendamento para o *${booking.labName}* no dia *${formattedDate}* (${booking.timeSlot}).`,
    ``,
    reason ? `📌 *Motivo informado:* ${reason}` : `📌 O laboratório solicitado está indisponível para manutenção ou já estava reservado para outra atividade.`,
    ``,
    `Por favor, acesse o sistema para verificar outros horários ou laboratórios disponíveis para sua turma (${booking.classGroup}).`,
    ``,
    `Estamos à disposição!`,
    `Equipe de Gestão e TI Escolar 🏫`,
  ].join('\n');
}

/**
 * Cria a URL completa para abrir o WhatsApp Web ou App com a mensagem pré-carregada
 */
export function getWhatsAppSendUrl(phone: string, text: string): string {
  const sanitized = sanitizeWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(text);
  return `https://api.whatsapp.com/send?phone=${sanitized}&text=${encodedText}`;
}
