import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import nodemailer, { TransportOptions } from 'nodemailer';
import { createServer as createViteServer } from 'vite';

function patchViteClientIfNeeded() {
  try {
    const clientPath = path.resolve(process.cwd(), 'node_modules/vite/dist/client/client.mjs');
    if (fs.existsSync(clientPath)) {
      let content = fs.readFileSync(clientPath, 'utf-8');
      if (content.includes('console.error(`[vite] failed to connect to websocket')) {
        content = content.replace(
          /console\.error\(`\[vite\] failed to connect to websocket \(\$\{e\}\)\. `\);\s*throw e;/g,
          'return;'
        );
        content = content.replace(
          /console\.error\(\s*`\[vite\] failed to connect to websocket[\s\S]*?;\s*}/g,
          'return; }'
        );
        fs.writeFileSync(clientPath, content, 'utf-8');
      }
    }
  } catch (_e) {
    // Non-blocking patch
  }
}

async function startServer() {
  patchViteClientIfNeeded();
  const app = express();
  const PORT = 3000;
  const httpServer = http.createServer(app);

  // Middleware para parsing de JSON
  app.use(express.json({ limit: '10mb' }));

  // API Health Check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'gestlab-smtp-service', timestamp: Date.now() });
  });

  // Helper para criar transporter do Nodemailer
  let cachedFirestoreSmtp: any = null;

  async function getStoredSmtpConfig() {
    if (cachedFirestoreSmtp && cachedFirestoreSmtp.user && cachedFirestoreSmtp.pass) {
      return cachedFirestoreSmtp;
    }
    try {
      const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        const fbConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        const { initializeApp, getApps, getApp } = await import('firebase/app');
        const { initializeFirestore, doc, getDoc } = await import('firebase/firestore');

        const app = getApps().length === 0 ? initializeApp(fbConfig) : getApp();
        const db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true }, fbConfig.firestoreDatabaseId);
        const snap = await getDoc(doc(db, 'settings', 'email_settings'));
        if (snap.exists()) {
          const data = snap.data();
          if (data?.smtp) {
            cachedFirestoreSmtp = data.smtp;
            return data.smtp;
          }
        }
      }
    } catch (err) {
      console.warn('Erro ao obter smtp de Firestore no backend:', err);
    }
    return cachedFirestoreSmtp;
  }

  function createTransporter(config?: {
    host?: string;
    port?: number;
    secure?: boolean;
    user?: string;
    pass?: string;
  }) {
    const host = (config?.host || process.env.SMTP_HOST || 'smtp.gmail.com').trim();
    const port = Number(config?.port || process.env.SMTP_PORT || 587);
    const secure = config?.secure !== undefined ? Boolean(config.secure) : (port === 465);
    const user = (config?.user !== undefined ? config.user : (process.env.SMTP_USER || '')).trim();
    let pass = (config?.pass !== undefined ? config.pass : (process.env.SMTP_PASS || '')).trim();

    // Remove espaços que o Google insere em senhas de aplicativo ("abcd efgh ijkl mnop" -> "abcdefghijklmnop")
    if ((host.includes('gmail') || user.includes('@gmail.com')) && pass) {
      pass = pass.replace(/\s+/g, '');
    }

    const hasAuth = Boolean(user && pass);

    const transportOptions: TransportOptions = {
      host,
      port,
      secure,
      auth: hasAuth ? { user, pass } : undefined,
      tls: {
        // Permite conexões seguras mesmo em redes corporativas/escolares com certificados locais
        rejectUnauthorized: false,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    } as any;

    return {
      transporter: nodemailer.createTransport(transportOptions),
      host,
      port,
      secure,
      user,
      hasAuth,
    };
  }

  // Helper para formatar erros amigáveis de SMTP
  function formatSmtpError(err: any, host: string, user?: string): string {
    const errMsg = err?.message || String(err);
    const is530 = errMsg.includes('530') || errMsg.includes('Authentication Required') || errMsg.includes('WantAuthError');
    if (is530) {
      if (host.includes('gmail') || (user && user.includes('@gmail.com'))) {
        return 'Autenticação Obrigatória no Gmail (530): O Gmail exige usuário e "Senha de App" de 16 caracteres para enviar e-mails. Preencha o usuário e a senha de aplicativo em "Configurações SMTP" antes de enviar.';
      }
      return 'Autenticação Obrigatória (530): O servidor SMTP exige autenticação com usuário e senha para autorizar o envio de e-mails.';
    }
    const isAuth = err?.code === 'EAUTH' || errMsg.includes('535') || errMsg.includes('Username and Password not accepted') || errMsg.includes('BadCredentials');
    if (isAuth) {
      if (host.includes('gmail') || (user && user.includes('@gmail.com'))) {
        return 'Falha de autenticação no Gmail (535): O Google exige uma "Senha de App" de 16 caracteres gerada na Conta Google (Segurança > Verificação em duas etapas > Senhas de app) e não a sua senha pessoal do Gmail.';
      }
      return 'Falha de autenticação SMTP (535): Usuário ou senha rejeitados pelo servidor de e-mail.';
    }
    if (errMsg.includes('ECONNREFUSED')) {
      return `Não foi possível conectar ao servidor ${host} (Conexão Recusada). Verifique o host e a porta.`;
    }
    if (errMsg.includes('ETIMEDOUT') || errMsg.includes('ESOCKET')) {
      return `Tempo limite esgotado ao conectar ao servidor ${host}. Verifique firewall e conexão de rede.`;
    }
    return errMsg || 'Erro ao processar comunicação com o servidor SMTP.';
  }

  // POST /api/test-smtp: Testa conexão com servidor SMTP/SNMP e envia e-mail de validação
  app.post('/api/test-smtp', async (req, res) => {
    try {
      let { host, port, secure, user, pass, from, toEmail } = req.body || {};

      // Se usuário for informado mas senha vier vazia, tenta recuperar senha salva previamente
      if (user && !pass) {
        const stored = await getStoredSmtpConfig();
        if (stored?.pass) {
          pass = stored.pass;
        }
      }

      const { transporter, host: activeHost, port: activePort, user: activeUser, hasAuth } = createTransporter({
        host,
        port,
        secure,
        user,
        pass,
      });

      if (user && !pass) {
        return res.status(400).json({
          success: false,
          error: 'Senha de autenticação não informada. Para testar o envio com usuário, preencha a senha correspondente.',
          code: 'MISSING_PASSWORD',
        });
      }

      // 1. Handshake e verificação do servidor SMTP
      await transporter.verify();

      // 2. Se destinatário for informado e houver autenticação configurada, envia e-mail real de teste
      let sendResult: any = null;
      if (toEmail) {
        if (!hasAuth) {
          // Servidor respondeu ao handshake perfeitamente. Como não há credenciais, não força o envio para evitar erro 530
          return res.json({
            success: true,
            message: `Conexão com o servidor SMTP ${activeHost}:${activePort} validada com sucesso! (Para envio real de e-mails de teste, preencha o Usuário e a Senha de Aplicativo).`,
            server: `${activeHost}:${activePort}`,
            requiresAuth: true,
          });
        }

        const isGmail = activeHost.includes('gmail') || activeUser.includes('@gmail.com');
        const fromEmail = isGmail ? activeUser : (from || process.env.SMTP_FROM || activeUser || 'gestlab@escola.edu.br');
        const fromAddress = `"GestLab Notificações" <${fromEmail}>`;

        sendResult = await transporter.sendMail({
          from: fromAddress,
          replyTo: from || activeUser,
          to: toEmail,
          subject: '🔔 GestLab - Teste de Conexão SMTP / Notificações Concluído',
          text: `Teste de envio de e-mail via servidor SMTP realizado com sucesso!\n\nServidor: ${activeHost}:${activePort}\nData/Hora: ${new Date().toLocaleString('pt-BR')}\n\nO sistema GestLab agora está pronto para enviar notificações automáticas de agendamento.`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
              <div style="text-align: center; margin-bottom: 20px;">
                <div style="display: inline-block; padding: 12px 16px; background-color: #2563eb; color: #ffffff; font-weight: 800; font-size: 20px; border-radius: 10px;">GestLab</div>
                <h2 style="color: #0f172a; margin: 16px 0 4px 0; font-size: 20px;">Teste de Conexão SMTP Realizado com Sucesso</h2>
                <p style="color: #64748b; font-size: 14px; margin: 0;">Serviço de disparo automático de e-mails via SMTP ativo</p>
              </div>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <table style="width: 100%; font-size: 13px; color: #334155; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Servidor SMTP:</td>
                    <td style="padding: 6px 0; text-align: right; font-family: monospace; font-weight: bold; color: #1e293b;">${activeHost}:${activePort}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Autenticação:</td>
                    <td style="padding: 6px 0; text-align: right; color: #16a34a; font-weight: bold;">${hasAuth ? 'Autenticado' : 'Sem Autenticação'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Data e Horário:</td>
                    <td style="padding: 6px 0; text-align: right;">${new Date().toLocaleString('pt-BR')}</td>
                  </tr>
                </table>
              </div>
              <p style="font-size: 13px; color: #475569; line-height: 1.6; margin: 0;">
                Este e-mail confirma que o serviço de envio automático de e-mails para novos agendamentos de laboratórios escolares está funcionando perfeitamente.
              </p>
              <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
                GestLab - Sistema de Gestão e Agendamento de Laboratórios de Informática
              </div>
            </div>
          `,
        });

        if (hasAuth) {
          cachedFirestoreSmtp = {
            host: activeHost,
            port: activePort,
            secure: Boolean(secure),
            user: activeUser,
            pass,
            enabled: true,
          };
        }
      }

      res.json({
        success: true,
        message: toEmail
          ? `Conexão SMTP validada e e-mail de teste entregue com sucesso para ${toEmail}!`
          : `Conexão com o servidor SMTP ${activeHost}:${activePort} estabelecida e validada com sucesso!`,
        server: `${activeHost}:${activePort}`,
        messageId: sendResult?.messageId,
        response: sendResult?.response,
      });
    } catch (err: any) {
      const friendlyError = formatSmtpError(err, req.body?.host || 'smtp.gmail.com', req.body?.user);
      console.warn('Falha no teste de conexão SMTP:', friendlyError);
      res.status(400).json({
        success: false,
        error: friendlyError,
        code: err.code || 'SMTP_ERROR',
      });
    }
  });

  // POST /api/send-email: Envia e-mail de notificação de agendamento via SMTP
  app.post('/api/send-email', async (req, res) => {
    try {
      let { to, subject, html, text, smtpConfig } = req.body || {};

      if (!to || (Array.isArray(to) && to.length === 0)) {
        return res.status(400).json({ success: false, error: 'Destinatário (to) é obrigatório.' });
      }

      if (!subject) {
        return res.status(400).json({ success: false, error: 'Assunto (subject) é obrigatório.' });
      }

      const recipients = Array.isArray(to) ? to.filter((e) => e && typeof e === 'string' && e.includes('@')) : [to];

      if (recipients.length === 0) {
        return res.status(400).json({ success: false, error: 'Nenhum e-mail de destinatário válido informado.' });
      }

      // Se smtpConfig não foi fornecido ou não contém usuário e senha, recupera automaticamente do Firestore
      if (!smtpConfig || !smtpConfig.user || !smtpConfig.pass) {
        const stored = await getStoredSmtpConfig();
        if (stored) {
          smtpConfig = {
            ...stored,
            ...(smtpConfig || {}),
            user: stored.user || smtpConfig?.user,
            pass: stored.pass || smtpConfig?.pass,
            enabled: true,
          };
        }
      }

      if (smtpConfig?.user && smtpConfig?.pass) {
        cachedFirestoreSmtp = smtpConfig;
      }

      const { transporter, host: activeHost, user: activeUser, hasAuth } = createTransporter(smtpConfig);

      if (!hasAuth) {
        return res.status(400).json({
          success: false,
          error: 'Credenciais de envio SMTP não configuradas. Acesse o Painel de Administração > Segurança para configurar.',
        });
      }

      const fromName = smtpConfig?.fromName || process.env.SMTP_FROM_NAME || 'GestLab Notificações';
      const isGmail = activeHost.includes('gmail') || activeUser.includes('@gmail.com');
      const fromEmail = isGmail ? activeUser : (smtpConfig?.fromEmail || activeUser || 'notificacoes@escola.edu.br');
      const replyToEmail = smtpConfig?.fromEmail || activeUser;
      const fromAddress = `"${fromName}" <${fromEmail}>`;

      const info = await transporter.sendMail({
        from: fromAddress,
        replyTo: replyToEmail,
        to: recipients.join(', '),
        subject,
        text: text || '',
        html: html || undefined,
      });

      console.log('E-mail enviado com sucesso via SMTP:', info.messageId, 'Para:', recipients);

      res.json({
        success: true,
        messageId: info.messageId,
        response: info.response,
        recipients,
      });
    } catch (err: any) {
      const friendlyError = formatSmtpError(err, req.body?.smtpConfig?.host || 'smtp.gmail.com', req.body?.smtpConfig?.user);
      console.warn('Aviso no envio de e-mail via SMTP:', friendlyError);
      res.status(400).json({
        success: false,
        error: friendlyError,
        code: err.code || 'SMTP_SEND_ERROR',
      });
    }
  });

  // Vite middleware em desenvolvimento vs produção
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`GestLab Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
