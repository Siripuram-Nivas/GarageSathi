import path from 'path';
import dotenv from 'dotenv';

// Root .env first, then server/.env (if present) so a local override wins.
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export type AiMode = 'mock' | 'live';

export const config = {
  port: Number(process.env.PORT || 4000),
  isProd: process.env.NODE_ENV === 'production',
  mongodbUri: process.env.MONGODB_URI?.trim() || '',
  dataDir: process.env.DATA_DIR?.trim() || path.resolve(process.cwd(), '../data'),
  demoMode: process.env.DEMO_MODE !== 'false',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  gnani: {
    baseUrl: 'https://api.vachana.ai',
    apiKey: process.env.GNANI_API_KEY_ID?.trim() || '',
    sttModel: process.env.GNANI_STT_MODEL || 'prisma-v3.0',
    sttLanguage: process.env.GNANI_STT_LANGUAGE || 'te-IN,en-IN',
    sttFormat: process.env.GNANI_STT_FORMAT || 'transcribe',
    keytermsEnabled: process.env.GNANI_STT_KEYTERMS_ENABLED !== 'false',
    topic: process.env.GNANI_STT_TOPIC || 'Telugu-English two-wheeler repair complaints and garage service requests',
    ttsModel: process.env.GNANI_TTS_MODEL || 'timbre-v2.5',
    ttsVoice: process.env.GNANI_TTS_VOICE || 'Varuni',
    ttsLanguage: process.env.GNANI_TTS_LANGUAGE || 'te-IN',
  },
  evon: {
    enabled: process.env.EVON_ENABLED === 'true',
    baseUrl: process.env.EVON_BASE_URL?.trim() || '',
    apiKey: process.env.EVON_API_KEY?.trim() || '',
    model: process.env.EVON_MODEL || 'gnani/gnani-evon-v3.3-30B-A3B',
  },
  allowLiveTests: process.env.ALLOW_GNANI_LIVE_TESTS === 'true',
};

export const gnaniConfigured = () => Boolean(config.gnani.apiKey);

/** Live only when the developer opted in AND a key exists. Never silently upgrade. */
export const aiMode = (): AiMode =>
  process.env.AI_PROVIDER_MODE === 'live' && gnaniConfigured() ? 'live' : 'mock';

export const evonStatus = (): 'NOT_CONFIGURED' | 'DISABLED' | 'READY' => {
  if (!config.evon.enabled) return 'DISABLED';
  return config.evon.baseUrl ? 'READY' : 'NOT_CONFIGURED';
};

export const TELUGU_TTS_VOICES = ['Varuni', 'Suhana', 'Lehara', 'Lavanya', 'Yukti'];
