import { TELUGU_TTS_VOICES, config } from '../config';
import { AppError } from '../errors';

const KEYTERMS = [
  'Activa', 'Honda', 'Hero', 'Splendor', 'Bajaj', 'Pulsar', 'TVS', 'Jupiter', 'Access', 'Apache',
  'Yamaha', 'engine oil', 'battery', 'brake', 'clutch', 'chain', 'puncture', 'spark plug',
  'self start', 'kick start', 'oil change', 'mileage', 'general service',
];

const authHeaders = () => ({ 'X-API-Key-ID': config.gnani.apiKey });

const requireKey = () => {
  if (!config.gnani.apiKey) {
    throw new AppError(
      503,
      'GNANI_NOT_CONFIGURED',
      'Live mode needs GNANI_API_KEY_ID in the server .env. Nothing was sent to Gnani.',
    );
  }
};

export interface TranscriptResult {
  transcript: string;
  detectedLanguage: string;
  requestId: string;
  provider: 'gnani' | 'mock';
  isMock: boolean;
  format: string;
}

/** One request, no retries. Caller must be in live mode. */
export async function transcribeLive(wav: Buffer, format?: string): Promise<TranscriptResult> {
  requireKey();
  const form = new FormData();
  form.append('audio_file', new Blob([new Uint8Array(wav)], { type: 'audio/wav' }), 'garagesathi.wav');
  form.append('model', config.gnani.sttModel);
  form.append('language_code', config.gnani.sttLanguage);
  form.append('format', format || config.gnani.sttFormat);
  if (config.gnani.keytermsEnabled) form.append('keyterms', JSON.stringify(KEYTERMS));
  form.append('topic', config.gnani.topic);

  let res: Response;
  try {
    res = await fetch(`${config.gnani.baseUrl}/stt/v3`, {
      method: 'POST',
      headers: authHeaders(),
      body: form,
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err) {
    throw new AppError(504, 'STT_TIMEOUT', 'Gnani Prisma did not respond in time. No retry was made.', String(err));
  }

  if (!res.ok) {
    throw new AppError(502, 'STT_FAILED', `Gnani Prisma returned HTTP ${res.status}.`, {
      status: res.status,
    });
  }

  const json = (await res.json().catch(() => null)) as any;
  const transcript: string =
    json?.transcript ?? json?.text ?? json?.data?.transcript ?? json?.results?.[0]?.transcript ?? '';
  if (!transcript.trim()) {
    throw new AppError(502, 'STT_EMPTY', 'Gnani Prisma returned no transcript.');
  }
  return {
    transcript: transcript.trim(),
    detectedLanguage: json?.detected_language_code ?? json?.language_code ?? json?.data?.detected_language_code ?? '',
    requestId: String(json?.request_id ?? json?.id ?? ''),
    provider: 'gnani',
    isMock: false,
    format: format || config.gnani.sttFormat,
  };
}

export interface SpeechResult {
  audio: Buffer;
  contentType: string;
  isMock: boolean;
}

export async function speakLive(text: string, voiceOverride?: string): Promise<SpeechResult> {
  requireKey();
  const voice = voiceOverride || config.gnani.ttsVoice;
  if (!TELUGU_TTS_VOICES.includes(voice)) {
    throw new AppError(400, 'INVALID_VOICE', `Voice "${voice}" is not in the documented Timbre v2.5 Telugu catalogue.`);
  }

  let res: Response;
  try {
    res = await fetch(`${config.gnani.baseUrl}/api/v1/tts/inference`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model: config.gnani.ttsModel,
        voice,
        language: config.gnani.ttsLanguage,
        speed: 1.0,
        audio_config: {
          sample_rate: 48000,
          num_channels: 1,
          sample_width: 2,
          encoding: 'linear_pcm',
          container: 'wav',
        },
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err) {
    throw new AppError(504, 'TTS_TIMEOUT', 'Gnani Timbre did not respond in time. No retry was made.', String(err));
  }

  if (!res.ok) {
    throw new AppError(502, 'TTS_FAILED', `Gnani Timbre returned HTTP ${res.status}.`, { status: res.status });
  }

  // Timbre returns raw audio, never JSON on success.
  const audio = Buffer.from(await res.arrayBuffer());
  if (audio.length < 44 || audio.toString('ascii', 0, 4) !== 'RIFF') {
    throw new AppError(502, 'TTS_BAD_AUDIO', 'Timbre response was not a WAV file.');
  }
  return { audio, contentType: 'audio/wav', isMock: false };
}
