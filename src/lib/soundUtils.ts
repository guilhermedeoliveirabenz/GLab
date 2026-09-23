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
  osc.stop(startTime + duration + 0.05);
}

/**
 * Toca uma nota de sino/carrilhão rica com harmônicos e decaimento acústico natural
 */
function playHarmonicBell(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number = 1.8,
  volume: number = 0.22,
) {
  // Harmônicos para simular sino tubular/carrilhão suave e acústico
  const layers = [
    { mult: 1.0, vol: volume, type: 'sine' as OscillatorType, durMult: 1.0 },
    { mult: 2.0, vol: volume * 0.4, type: 'triangle' as OscillatorType, durMult: 0.8 },
    { mult: 2.76, vol: volume * 0.18, type: 'sine' as OscillatorType, durMult: 0.65 },
    { mult: 4.0, vol: volume * 0.08, type: 'sine' as OscillatorType, durMult: 0.5 },
  ];

  layers.forEach(({ mult, vol, type, durMult }) => {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq * mult, startTime);

      const noteDuration = duration * durMult;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0001), startTime + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + noteDuration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + noteDuration + 0.05);
    } catch {
      // Safe context
    }
  });
}

/**
 * Notificação de Agendamento Realizado com Sucesso (~3 segundos de duração)
 * Arpeggio festivo ascendente em C maior com cauda harmônica ressonante
 */
export function playBookingSuccessSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    // Sequência melódica estendida para durar ~3.0 segundos
    playHarmonicBell(ctx, 523.25, now + 0.00, 1.4, 0.22); // C5
    playHarmonicBell(ctx, 659.25, now + 0.25, 1.4, 0.22); // E5
    playHarmonicBell(ctx, 783.99, now + 0.50, 1.5, 0.24); // G5
    playHarmonicBell(ctx, 1046.50, now + 0.80, 1.6, 0.26); // C6
    playHarmonicBell(ctx, 1318.51, now + 1.15, 1.8, 0.24); // E6
    // Acorde final harmônico que reverbera suavemente até 3.05s
    playHarmonicBell(ctx, 1046.50, now + 1.50, 1.55, 0.22); // C6
    playHarmonicBell(ctx, 1567.98, now + 1.50, 1.55, 0.20); // G6
  } catch (e) {
    console.warn('Erro ao reproduzir som de agendamento:', e);
  }
}

/**
 * Notificação de Novo Agendamento Recebido (~3 segundos de duração)
 * Carrilhão de 5 notas melódicas harmônicas com sustentação aveludada
 */
export function playNewBookingAlertSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    // Frase melódica em F# menor pentatônica / D maior estendida para exatamente 3.0 segundos
    playHarmonicBell(ctx, 587.33, now + 0.00, 1.4, 0.25); // D5
    playHarmonicBell(ctx, 739.99, now + 0.35, 1.4, 0.26); // F#5
    playHarmonicBell(ctx, 880.00, now + 0.70, 1.5, 0.28); // A5
    playHarmonicBell(ctx, 1174.66, now + 1.10, 1.7, 0.30); // D6
    playHarmonicBell(ctx, 1479.98, now + 1.50, 1.55, 0.25); // F#6 (termina em ~3.05s)
  } catch (e) {
    console.warn('Erro ao reproduzir alerta de novo agendamento:', e);
  }
}

/**
 * Notificação de Agendamento Aprovado / Confirmado (~2.8s)
 */
export function playBookingConfirmedSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    playHarmonicBell(ctx, 659.25, now + 0.00, 1.3, 0.25);  // E5
    playHarmonicBell(ctx, 830.61, now + 0.30, 1.4, 0.26);  // G#5
    playHarmonicBell(ctx, 1046.50, now + 0.65, 1.6, 0.28); // C6
    playHarmonicBell(ctx, 1318.51, now + 1.05, 1.8, 0.30); // E6 (termina em ~2.85s)
  } catch (e) {
    console.warn('Erro ao reproduzir som de confirmação:', e);
  }
}

/**
 * Notificação de Ping simples / Demonstração (~3 segundos de duração)
 */
export function playNotificationPingSound(): void {
  // Reproduz o carrilhão de 3 segundos para teste imediato
  playPendingAlertSound();
}

/**
 * Notificação de Alerta Pré-Agendamento (~3 segundos de duração)
 * 3 pares de sinos suaves com reverberação espaçada para alertar 20 min antes
 */
export function playUpcomingBooking20MinReminderSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    // Par 1
    playHarmonicBell(ctx, 554.37, now + 0.00, 1.2, 0.25); // C#5
    playHarmonicBell(ctx, 659.25, now + 0.18, 1.2, 0.25); // E5
    // Par 2
    playHarmonicBell(ctx, 739.99, now + 0.85, 1.3, 0.26); // F#5
    playHarmonicBell(ctx, 880.00, now + 1.03, 1.3, 0.28); // A5
    // Par 3 com sustentação suave até ~3.05 segundos
    playHarmonicBell(ctx, 1108.73, now + 1.70, 1.35, 0.30); // C#6
    playHarmonicBell(ctx, 1318.51, now + 1.85, 1.20, 0.28); // E6
  } catch (e) {
    console.warn('Erro ao reproduzir alerta de 20 minutos:', e);
  }
}

/**
 * Notificação de Agendamento Pendente / Pop-up Alerta (~3 segundos de duração)
 * Carrilhão de 5 fases harmoniosas que chamam a atenção por ~3 segundos sem ruído estridente
 */
export function playPendingAlertSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    // 1º sino (grave e aveludado)
    playHarmonicBell(ctx, 523.25, now + 0.00, 1.4, 0.25); // C5
    // 2º sino (brilho intermediário)
    playHarmonicBell(ctx, 659.25, now + 0.35, 1.4, 0.27); // E5
    // 3º sino (presença)
    playHarmonicBell(ctx, 783.99, now + 0.70, 1.5, 0.28); // G5
    // 4º sino (destaque agudo)
    playHarmonicBell(ctx, 1046.50, now + 1.10, 1.7, 0.30); // C6
    // 5º sino final harmonizado com sustain de 1.5s (duração total: 1.55s + 1.5s = 3.05s)
    playHarmonicBell(ctx, 1318.51, now + 1.55, 1.50, 0.26); // E6
    playHarmonicBell(ctx, 783.99, now + 1.55, 1.50, 0.18);  // G5 (fundo harmônico)
  } catch (e) {
    console.warn('Erro ao reproduzir som de pendência:', e);
  }
}

