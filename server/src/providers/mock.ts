import { SpeechResult, TranscriptResult } from './gnani';
import { mockToneWav } from '../wav';

/**
 * Mock results are canned, deterministic and always labelled. They never touch Gnani.
 * Re-recording the same bytes returns the same sample, so the UI stays predictable.
 */
const SAMPLES = [
  {
    transcript: 'Anna, naa Activa start avvatledu. Battery check cheyyandi, engine oil kuda change cheyyali.',
    detectedLanguage: 'te-IN,en-IN (code-mixed)',
  },
  {
    transcript: 'అన్నా, నా జూపిటర్ బ్రేక్ సరిగా పట్టడం లేదు. బ్రేక్ చెక్ చేయండి, చైన్ క్లీనింగ్ కూడా చేయండి.',
    detectedLanguage: 'te-IN',
  },
  {
    transcript: 'Pulsar ki general service kavali. Puncture repair kuda cheyyandi, chain cleaning cheyyandi.',
    detectedLanguage: 'te-IN,en-IN (code-mixed)',
  },
];

export function mockTranscribe(wav: Buffer, format?: string): TranscriptResult {
  const checksum = wav.reduce((sum, byte, index) => (index % 997 === 0 ? sum + byte : sum), 0);
  const sample = SAMPLES[checksum % SAMPLES.length];
  return {
    transcript: sample.transcript,
    detectedLanguage: sample.detectedLanguage,
    requestId: `mock-${checksum.toString(16)}`,
    provider: 'mock',
    isMock: true,
    format: format || 'transcribe',
  };
}

export function mockSpeak(): SpeechResult {
  return { audio: mockToneWav(), contentType: 'audio/wav', isMock: true };
}
