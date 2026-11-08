import { AppError } from './errors';

export const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
export const MAX_AUDIO_SECONDS = 30;

export interface WavInfo {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  durationSec: number;
}

/** Parse RIFF/WAVE chunks. Gnani only ever receives PCM WAV from this server. */
export function inspectWav(buffer: Buffer): WavInfo {
  if (buffer.length < 44 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new AppError(415, 'INVALID_AUDIO', 'Audio must be a valid WAV file.');
  }
  let offset = 12;
  let fmt: { sampleRate: number; channels: number; bitsPerSample: number } | null = null;
  let dataSize = 0;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === 'fmt ') {
      const format = buffer.readUInt16LE(body);
      if (format !== 1 && format !== 0xfffe) {
        throw new AppError(415, 'INVALID_AUDIO', 'Audio must be PCM WAV.');
      }
      fmt = {
        channels: buffer.readUInt16LE(body + 2),
        sampleRate: buffer.readUInt32LE(body + 4),
        bitsPerSample: buffer.readUInt16LE(body + 14),
      };
    }
    if (id === 'data') dataSize = size;
    offset = body + size + (size % 2);
  }
  if (!fmt || !dataSize) throw new AppError(415, 'INVALID_AUDIO', 'WAV file has no audio data.');
  const bytesPerSecond = fmt.sampleRate * fmt.channels * (fmt.bitsPerSample / 8);
  const durationSec = dataSize / bytesPerSecond;
  if (durationSec > MAX_AUDIO_SECONDS + 0.5) {
    throw new AppError(413, 'AUDIO_TOO_LONG', `Recording must be ${MAX_AUDIO_SECONDS} seconds or less.`);
  }
  return { ...fmt, durationSec: Math.round(durationSec * 10) / 10 };
}

/** A two-tone placeholder so Mock TTS is obviously not speech. */
export function mockToneWav(): Buffer {
  const sampleRate = 16_000;
  const tone = (freq: number, seconds: number) => {
    const out = new Float32Array(Math.floor(sampleRate * seconds));
    for (let i = 0; i < out.length; i++) {
      const fade = Math.min(1, i / 800, (out.length - i) / 800);
      out[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate) * 0.25 * fade;
    }
    return out;
  };
  const samples = [tone(660, 0.35), new Float32Array(800), tone(440, 0.45)];
  const total = samples.reduce((n, s) => n + s.length, 0);
  const buffer = Buffer.alloc(44 + total * 2);
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + total * 2, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(total * 2, 40);
  let offset = 44;
  for (const chunk of samples) {
    for (const s of chunk) {
      buffer.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(s * 32767))), offset);
      offset += 2;
    }
  }
  return buffer;
}
