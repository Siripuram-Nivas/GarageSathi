import { describe, expect, it } from 'vitest';
import { encodeWav, getVoiceLevel } from './audio';

const bytes = async (blob: Blob) => new Uint8Array(await blob.arrayBuffer());

describe('WAV encoding', () => {
  it('writes a valid RIFF/WAVE header with 16-bit mono PCM', async () => {
    const blob = encodeWav([new Float32Array(1600)], 16_000);
    expect(blob.type).toBe('audio/wav');
    const buffer = await bytes(blob);
    const ascii = (start: number, end: number) => String.fromCharCode(...buffer.slice(start, end));
    expect(ascii(0, 4)).toBe('RIFF');
    expect(ascii(8, 12)).toBe('WAVE');
    expect(buffer.length).toBe(44 + 1600 * 2);
    const view = new DataView(buffer.buffer);
    expect(view.getUint32(24, true)).toBe(16_000);
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint16(34, true)).toBe(16);
  });
});

describe('voice level detection', () => {
  it('returns zero for silence and scales louder input up to one', () => {
    expect(getVoiceLevel(new Float32Array(4))).toBe(0);
    expect(getVoiceLevel(new Float32Array())).toBe(0);
    expect(getVoiceLevel(new Float32Array([0.05, 0.05, 0.05, 0.05]))).toBeCloseTo(0.6);
    expect(getVoiceLevel(new Float32Array([1, 1, 1, 1]))).toBe(1);
  });
});
