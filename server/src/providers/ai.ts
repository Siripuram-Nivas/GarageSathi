import { AiMode, aiMode, config, evonStatus, gnaniConfigured } from '../config';
import { AppError } from '../errors';
import { mockSpeak, mockTranscribe } from './mock';
import { SpeechResult, TranscriptResult, speakLive, transcribeLive } from './gnani';

const inFlight = new Set<string>();

/** Credit guard: one deliberate request per operation at a time. */
async function singleFlight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (inFlight.has(key)) {
    throw new AppError(409, 'REQUEST_IN_PROGRESS', 'A voice request is already running. Wait for it to finish.');
  }
  inFlight.add(key);
  try {
    return await fn();
  } finally {
    inFlight.delete(key);
  }
}

export function transcribe(wav: Buffer, format?: string): Promise<TranscriptResult> {
  return singleFlight('stt', async () => (aiMode() === 'live' ? transcribeLive(wav, format) : mockTranscribe(wav, format)));
}

export function speak(text: string, voice?: string): Promise<SpeechResult> {
  return singleFlight('tts', async () => (aiMode() === 'live' ? speakLive(text, voice) : mockSpeak()));
}

export interface AiStatus {
  mode: AiMode;
  mock: boolean;
  gnaniConfigured: boolean;
  allowLiveTests: boolean;
  stt: { baseUrl: string; endpoint: string; model: string; language: string; format: string; keyterms: boolean };
  tts: { endpoint: string; model: string; voice: string; language: string; voices: string[] };
  evon: ReturnType<typeof evonStatus>;
  notes: string[];
}

export function aiStatus(): AiStatus {
  const mode = aiMode();
  const notes: string[] = [];
  if (mode === 'mock') notes.push('Mock mode: no Gnani request is made and no credits are consumed.');
  if (process.env.AI_PROVIDER_MODE === 'live' && !gnaniConfigured())
    notes.push('AI_PROVIDER_MODE=live was requested but GNANI_API_KEY_ID is empty; running in mock mode.');
  if (mode === 'live' && !config.allowLiveTests)
    notes.push('Live mode is on. The one-time smoke test still requires ALLOW_GNANI_LIVE_TESTS=true.');
  return {
    mode,
    mock: mode === 'mock',
    gnaniConfigured: gnaniConfigured(),
    allowLiveTests: config.allowLiveTests,
    stt: {
      baseUrl: config.gnani.baseUrl,
      endpoint: '/stt/v3',
      model: config.gnani.sttModel,
      language: config.gnani.sttLanguage,
      format: config.gnani.sttFormat,
      keyterms: config.gnani.keytermsEnabled,
    },
    tts: {
      endpoint: '/api/v1/tts/inference',
      model: config.gnani.ttsModel,
      voice: config.gnani.ttsVoice,
      language: config.gnani.ttsLanguage,
      voices: ['Varuni', 'Suhana', 'Lehara', 'Lavanya', 'Yukti'],
    },
    evon: evonStatus(),
    notes,
  };
}
