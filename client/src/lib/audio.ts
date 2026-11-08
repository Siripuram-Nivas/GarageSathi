export const MAX_SECONDS = 30;
const TARGET_RATE = 16_000;

/** Encode Float32 PCM chunks as a 16-bit mono WAV blob. */
export function encodeWav(chunks: Float32Array[], sampleRate: number): Blob {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const buffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, 'RIFF');
  view.setUint32(4, 36 + length * 2, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, length * 2, true);

  let offset = 44;
  for (const chunk of chunks) {
    for (const sample of chunk) {
      const clamped = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

export interface RecordedAudio {
  blob: Blob;
  url: string;
  durationSec: number;
}

interface Handlers {
  onTick: (seconds: number) => void;
  onAutoStop: () => void;
}

let ctx: AudioContext | null = null;
let stream: MediaStream | null = null;
let processor: ScriptProcessorNode | null = null;
let gain: GainNode | null = null;
let chunks: Float32Array[] = [];
let samples = 0;
let rate = 48_000;
let handlers: Handlers | null = null;

export const recorder = {
  get active() {
    return Boolean(ctx);
  },

  async start(next: Handlers) {
    if (ctx) return;
    handlers = next;
    stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true } });
    ctx = new AudioContext();
    await ctx.resume();
    rate = ctx.sampleRate;
    chunks = [];
    samples = 0;
    const source = ctx.createMediaStreamSource(stream);
    processor = ctx.createScriptProcessor(4096, 1, 1);
    gain = ctx.createGain();
    gain.gain.value = 0; // keep the graph alive without echo
    processor.onaudioprocess = (event) => {
      if (!ctx) return;
      chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      samples += event.inputBuffer.length;
      const seconds = samples / rate;
      handlers?.onTick(Math.min(MAX_SECONDS, seconds));
      if (seconds >= MAX_SECONDS) handlers?.onAutoStop();
    };
    source.connect(processor);
    processor.connect(gain);
    gain.connect(ctx.destination);
  },

  stop(): RecordedAudio {
    const recordedChunks = chunks;
    const durationSec = Math.min(MAX_SECONDS, samples / rate);
    const sampleRate = rate;
    cleanup();
    if (!recordedChunks.length) throw new Error('No audio was captured. Check your microphone.');
    const blob = encodeWav(recordedChunks, sampleRate);
    return { blob, url: URL.createObjectURL(blob), durationSec };
  },

  cancel() {
    cleanup();
  },
};

function cleanup() {
  processor?.disconnect();
  gain?.disconnect();
  stream?.getTracks().forEach((track) => track.stop());
  if (ctx && ctx.state !== 'closed') void ctx.close();
  ctx = null;
  stream = null;
  processor = null;
  gain = null;
  samples = 0;
  handlers = null;
}

/** Uploaded files are decoded and re-encoded, never renamed. */
export async function fileToWav(file: File): Promise<RecordedAudio> {
  const buffer = await file.arrayBuffer();
  const decodeCtx = new AudioContext();
  const decoded = await decodeCtx.decodeAudioData(buffer);
  await decodeCtx.close();
  if (decoded.duration > MAX_SECONDS + 0.05) {
    throw new Error(`Audio is ${decoded.duration.toFixed(1)}s. Please use a clip of 30 seconds or less.`);
  }
  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * TARGET_RATE), TARGET_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  const blob = encodeWav([rendered.getChannelData(0)], TARGET_RATE);
  return { blob, url: URL.createObjectURL(blob), durationSec: decoded.duration };
}
