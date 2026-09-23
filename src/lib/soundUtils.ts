/**
 * Utilitário de Notificações Sonoras para o LabGestão
 * Utiliza a Web Audio API nativa para reproduzir efeitos sonoros de alta fidelidade
 * sem necessidade de downloads de arquivos MP3/WAV externos, operando perfeitamente offline.
 */

const SOUND_STORAGE_KEY = 'labgestao_sound_enabled';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(SOUND_STORAGE_KEY);
  return stored !== 'false'; // Habilitado por padrão
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SOUND_STORAGE_KEY, enabled ? 'true' : 'false');
  // Dispara evento para sincronizar componentes
  window.dispatchEvent(new CustomEvent('labgestao-sound-changed', { detail: enabled }));
}

export function toggleSound(): boolean {
  const current = isSoundEnabled();
  const next = !current;
  setSoundEnabled(next);
  if (next) {
    playNotificationPingSound();
  }
  return next;
}

/**
 * Toca uma nota sintética com envelope de ganho suave
 */
function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.2,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

/**
 * Notificação de Agendamento Realizado com Sucesso (Arpeggio melódico ascendente festivo)
 */
export function playBookingSuccessSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    // Acorde C maior brilhante: C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.5)
    playTone(ctx, 523.25, now + 0.00, 0.25, 'triangle', 0.25);
    playTone(ctx, 659.25, now + 0.08, 0.25, 'triangle', 0.25);
    playTone(ctx, 783.99, now + 0.16, 0.30, 'triangle', 0.25);
    playTone(ctx, 1046.5, now + 0.24, 0.55, 'sine', 0.30);
  } catch (e) {
    console.warn('Erro ao reproduzir som de agendamento:', e);
  }
}

/**
 * Notificação de Novo Agendamento Recebido (para técnicos e administradores)
 * Som de campainha de notificação suave (duplo chime)
 */
export function playNewBookingAlertSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    playTone(ctx, 587.33, now + 0.00, 0.20, 'sine', 0.25); // D5
    playTone(ctx, 880.00, now + 0.12, 0.40, 'sine', 0.30); // A5
  } catch (e) {
    console.warn('Erro ao reproduzir alerta de novo agendamento:', e);
  }
}

/**
 * Notificação de Agendamento Aprovado / Confirmado
 */
export function playBookingConfirmedSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    playTone(ctx, 659.25, now + 0.00, 0.18, 'triangle', 0.25); // E5
    playTone(ctx, 1046.50, now + 0.12, 0.40, 'sine', 0.30);  // C6
  } catch (e) {
    console.warn('Erro ao reproduzir som de confirmação:', e);
  }
}

/**
 * Notificação de Ping simples (teste ou clique de ação)
 */
export function playNotificationPingSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    playTone(ctx, 880.00, now, 0.25, 'sine', 0.25);
  } catch (e) {
    console.warn('Erro ao reproduzir ping:', e);
  }
}

/**
 * Notificação de Alerta Pré-Agendamento (20 minutos antes do início da aula)
 * Chime suave triplo harmônico de alta visibilidade
 */
export function playUpcomingBooking20MinReminderSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    playTone(ctx, 554.37, now + 0.00, 0.22, 'triangle', 0.28); // C#5
    playTone(ctx, 659.25, now + 0.12, 0.22, 'triangle', 0.28); // E5
    playTone(ctx, 880.00, now + 0.24, 0.45, 'sine', 0.32);     // A5
  } catch (e) {
    console.warn('Erro ao reproduzir alerta de 20 minutos:', e);
  }
}

/**
 * Notificação de Agendamento Pendente (para técnicos e administradores)
 */
export function playPendingAlertSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    playTone(ctx, 493.88, now + 0.00, 0.18, 'sine', 0.25); // B4
    playTone(ctx, 739.99, now + 0.10, 0.35, 'sine', 0.30); // F#5
  } catch (e) {
    console.warn('Erro ao reproduzir som de pendência:', e);
  }
}

