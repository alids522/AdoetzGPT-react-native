// GeminiLiveService — port of lib/services/gemini_live_service.dart.
// Faithful to the Gemini Live bidi WebSocket protocol (setup envelope, realtime
// audio/video input, transcription + modelTurn PCM output, tool calls, levels).
// Player + recorder are injected so the transport is decoupled from native bits.
import { Memory, Message, VoiceSettings, type Json } from '../models';

const INPUT_SAMPLE_RATE = 24000;
const OUTPUT_SAMPLE_RATE = 24000;
const INPUT_MIME_TYPE = `audio/pcm;rate=${INPUT_SAMPLE_RATE}`;
const LIVE_ENDPOINT_PATH =
  '/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

export interface LivePlayer {
  start(sampleRate?: number): Promise<void>;
  playPcm16(base64: string): void;
  clear(): Promise<void>;
  stop(): Promise<void>;
}
export interface LiveRecorder {
  hasPermission(): Promise<boolean>;
  startStream(onChunk: (bytes: Uint8Array) => void): Promise<void>;
  stop(): Promise<void>;
}
export interface GeminiLiveCallbacks {
  onStatus: (status: string) => void;
  onInputTranscript: (text: string, finished: boolean) => void;
  onOutputTranscript: (text: string, finished: boolean) => void;
  onLevel: (level: number) => void;
  onOutputLevel: (level: number) => void;
  onRecordingChanged: (recording: boolean) => void;
  onTurnComplete: () => void;
  onError: (error: unknown) => void;
  onClosed: () => void;
  onToolCall?: (name: string, args: Record<string, unknown>) => Promise<unknown>;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    out += B64[bytes[i] >> 2];
    out += B64[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
    out += B64[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
    out += B64[bytes[i + 2] & 63];
  }
  const rem = bytes.length - i;
  if (rem === 1) {
    out += B64[bytes[i] >> 2];
    out += B64[(bytes[i] & 3) << 4];
    out += '==';
  } else if (rem === 2) {
    out += B64[bytes[i] >> 2];
    out += B64[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
    out += B64[(bytes[i + 1] & 15) << 2];
    out += '=';
  }
  return out;
}

function pcmLevel(bytes: Uint8Array): number {
  const sampleCount = Math.floor(bytes.length / 2);
  if (sampleCount === 0) return 0;
  let sum = 0;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < sampleCount; i++) {
    const sample = view.getInt16(i * 2, true) / 32768;
    sum += sample * sample;
  }
  return Math.min(1, Math.sqrt(sum / sampleCount));
}

function formatLiveModel(model: string): string {
  const trimmed = model.trim();
  return trimmed.startsWith('models/') ? trimmed : `models/${trimmed}`;
}

export interface GeminiLiveOptions {
  apiKey: string;
  model: string;
  voiceSettings: VoiceSettings;
  history: Message[];
  memories: Memory[];
  thinkingMode: boolean;
  userName: string;
  player: LivePlayer;
  recorder: LiveRecorder;
  tools?: Json[];
  systemInstructionOverride?: string;
  callbacks: GeminiLiveCallbacks;
}

export class GeminiLiveService {
  private ws: WebSocket | null = null;
  private running = false;
  private recording = false;
  private closed = false;
  private setupResolve: (() => void) | null = null;
  private setupReject: ((e: Error) => void) | null = null;
  private setupTimer: ReturnType<typeof setTimeout> | null = null;
  private outputLevelTimers: ReturnType<typeof setTimeout>[] = [];
  private lastVideoFrameMs = 0;

  constructor(private opts: GeminiLiveOptions) {}

  get isRunning(): boolean {
    return this.running;
  }
  get isRecording(): boolean {
    return this.recording;
  }

  async start(): Promise<void> {
    if (this.running) return;
    if (this.opts.apiKey.trim().length === 0) throw new Error('Gemini API key is required for Gemini Live.');
    this.closed = false;
    this.running = true;
    this.opts.callbacks.onStatus('Connecting to Gemini Live...');

    const url = `wss://generativelanguage.googleapis.com${LIVE_ENDPOINT_PATH}?key=${this.opts.apiKey.trim()}`;
    await new Promise<void>((resolve, reject) => {
      this.setupResolve = resolve;
      this.setupReject = reject;
      try {
        this.ws = new WebSocket(url);
      } catch (e) {
        reject(e as Error);
        return;
      }
      this.ws.onopen = () => this.send(this.setupPayload());
      this.ws.onmessage = (ev) => this.handleSocketMessage(ev.data as string);
      this.ws.onerror = () => this.handleError(new Error('Gemini Live socket error.'));
      this.ws.onclose = () => this.handleDone();
      this.setupTimer = setTimeout(
        () => this.handleError(new Error('Gemini Live did not finish setup. Check model/API-key access.')),
        15000,
      );
    });

    await this.opts.player.start(OUTPUT_SAMPLE_RATE);
    this.opts.callbacks.onStatus('Listening...');
    await this.setRecording(true);
  }

  async setRecording(value: boolean): Promise<void> {
    if (!this.running || value === this.recording) return;
    if (!value) {
      await this.opts.recorder.stop();
      this.recording = false;
      this.opts.callbacks.onRecordingChanged(false);
      this.send({ realtimeInput: { audioStreamEnd: true } });
      return;
    }
    const allowed = await this.opts.recorder.hasPermission();
    if (!allowed) throw new Error('Microphone permission was denied.');
    this.recording = true;
    this.opts.callbacks.onRecordingChanged(true);
    this.opts.callbacks.onStatus('Listening...');
    await this.opts.recorder.startStream((bytes) => {
      if (!this.running || !this.recording || bytes.length === 0) return;
      const level = pcmLevel(bytes);
      this.send({
        realtimeInput: { audio: { data: bytesToBase64(bytes), mimeType: INPUT_MIME_TYPE } },
      });
      this.opts.callbacks.onLevel(level);
    });
  }

  toggleRecording(): Promise<void> {
    return this.setRecording(!this.recording);
  }

  async stop(): Promise<void> {
    if (!this.running && this.closed) return;
    this.running = false;
    this.closed = true;
    await this.opts.recorder.stop().catch(() => {});
    this.cancelOutputLevelTimers();
    if (this.setupTimer) clearTimeout(this.setupTimer);
    try {
      this.ws?.close();
    } catch {
      // ignore
    }
    this.ws = null;
    await this.opts.player.stop().catch(() => {});
    this.opts.callbacks.onLevel(0);
    this.opts.callbacks.onOutputLevel(0);
    this.opts.callbacks.onStatus('');
  }

  async dispose(): Promise<void> {
    await this.stop();
  }

  sendVideoFrame(bytes: Uint8Array, mimeType = 'image/jpeg'): void {
    if (!this.running || this.closed) return;
    const now = Date.now();
    if (now - this.lastVideoFrameMs < 1000) return; // max 1 fps
    this.lastVideoFrameMs = now;
    this.send({ realtimeInput: { video: { mimeType, data: bytesToBase64(bytes) } } });
  }

  injectClientMessage(message: string): void {
    if (!this.running || this.closed) return;
    this.send({ clientContent: { turns: [{ role: 'user', parts: [{ text: message }] }], turnComplete: true } });
  }

  private send(payload: Json): void {
    if (!this.ws || this.closed) return;
    try {
      this.ws.send(JSON.stringify(payload));
    } catch {
      // ignore
    }
  }

  private setupPayload(): Json {
    return {
      setup: {
        model: formatLiveModel(this.opts.model),
        generationConfig: {
          responseModalities: ['AUDIO'],
          mediaResolution: 'MEDIA_RESOLUTION_MEDIUM',
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: this.opts.voiceSettings.voice } } },
        },
        systemInstruction: {
          parts: [{ text: this.opts.systemInstructionOverride ?? this.systemInstruction() }],
        },
        ...(this.opts.tools && this.opts.tools.length > 0 ? { tools: [{ functionDeclarations: this.opts.tools }] } : {}),
      },
    };
  }

  private systemInstruction(): string {
    const personalityPrompt =
      this.opts.voiceSettings.personality === 'Custom' && this.opts.voiceSettings.customPersonality.trim()
        ? this.opts.voiceSettings.customPersonality.trim()
        : `You are a helpful voice assistant for ${this.opts.userName}. Be concise and conversational.`;
    const memText =
      this.opts.memories.length > 0
        ? `\n\nKnown user context:\n${this.opts.memories.map((m) => `- ${m.content}`).join('\n')}`
        : '';
    return `${personalityPrompt}${memText}`;
  }

  private handleSocketMessage(raw: string): void {
    try {
      const data = JSON.parse(raw) as Json;
      if (data.setupComplete != null) {
        this.opts.callbacks.onStatus('Connected. Listening...');
        if (this.setupTimer) clearTimeout(this.setupTimer);
        this.setupResolve?.();
        this.setupResolve = null;
      }
      const sc = data.serverContent as Json | undefined;
      if (sc && typeof sc === 'object') {
        this.handleTranscription(sc.inputTranscription as Json | undefined, this.opts.callbacks.onInputTranscript);
        this.handleTranscription(sc.outputTranscription as Json | undefined, this.opts.callbacks.onOutputTranscript);
        const modelTurn = sc.modelTurn as Json | undefined;
        if (modelTurn && Array.isArray(modelTurn.parts)) {
          for (const part of modelTurn.parts as Json[]) {
            const inline = part.inlineData as Json | undefined;
            if (inline && typeof inline.data === 'string' && inline.data.length > 0) {
              this.scheduleOutputLevels(inline.data);
              this.opts.player.playPcm16(inline.data);
            }
          }
        }
        if (sc.interrupted === true) {
          this.opts.callbacks.onStatus('Interrupted.');
          this.cancelOutputLevelTimers();
          void this.opts.player.clear();
        }
        if (sc.turnComplete === true) {
          this.opts.callbacks.onLevel(0);
          this.opts.callbacks.onTurnComplete();
        }
      }
      const toolCall = data.toolCall as Json | undefined;
      if (toolCall && this.opts.callbacks.onToolCall) {
        const calls = toolCall.functionCalls as Json[] | undefined;
        if (Array.isArray(calls) && calls.length > 0) {
          const first = calls[0];
          const name = String(first.name ?? '');
          const args = first.args && typeof first.args === 'object' ? (first.args as Record<string, unknown>) : {};
          const id = String(first.id ?? '');
          this.opts.callbacks.onStatus(`Executing tool: ${name}...`);
          Promise.resolve(this.opts.callbacks.onToolCall!(name, args))
            .then((result) => {
              if (!this.closed && this.running) {
                this.send({ toolResponse: { functionResponses: [{ id, name, response: result }] } });
                this.opts.callbacks.onStatus('Listening...');
              }
            })
            .catch((e) => {
              if (!this.closed && this.running) {
                this.send({
                  toolResponse: { functionResponses: [{ id, name, response: { error: String((e as Error).message ?? e) } }] },
                });
                this.opts.callbacks.onStatus('Listening...');
              }
            });
        }
      }
      if (data.goAway != null) this.opts.callbacks.onStatus('Gemini Live session is closing.');
      if (data.error != null) this.handleError(new Error(this.extractLiveError(data.error)));
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleTranscription(value: Json | undefined, cb: (text: string, finished: boolean) => void): void {
    if (!value || typeof value !== 'object') return;
    const text = String(value.text ?? '');
    if (text.length === 0) return;
    cb(text, value.finished === true);
  }

  private scheduleOutputLevels(base64: string): void {
    // Decode PCM bytes from base64 and emit RMS per 80ms window, scheduled ahead.
    const bytes = base64ToBytes(base64);
    const windowSamples = (OUTPUT_SAMPLE_RATE * 80) / 1000; // 1920
    const bytesPerWindow = windowSamples * 2;
    let offset = 0;
    let delay = 0;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    while (offset + 1 < bytes.length) {
      const end = Math.min(offset + bytesPerWindow, bytes.length);
      const sampleCount = Math.floor((end - offset) / 2);
      let sum = 0;
      for (let i = 0; i < sampleCount; i++) {
        const s = view.getInt16(offset + i * 2, true) / 32768;
        sum += s * s;
      }
      const level = sampleCount > 0 ? Math.min(1, Math.sqrt(sum / sampleCount)) : 0;
      const t = setTimeout(() => this.opts.callbacks.onOutputLevel(level), delay);
      this.outputLevelTimers.push(t);
      offset = end;
      delay += 80;
    }
  }

  private cancelOutputLevelTimers(): void {
    for (const t of this.outputLevelTimers) clearTimeout(t);
    this.outputLevelTimers = [];
  }

  private extractLiveError(error: unknown): string {
    if (error && typeof error === 'object' && 'message' in error) return String((error as Json).message ?? 'Gemini Live error.');
    return 'Gemini Live error.';
  }

  private handleError(error: unknown): void {
    if (this.setupReject) {
      this.setupReject(error as Error);
      this.setupReject = null;
      if (this.setupTimer) clearTimeout(this.setupTimer);
    }
    this.opts.callbacks.onError(error);
  }

  private handleDone(): void {
    if (this.setupReject) {
      this.setupReject(new Error('Gemini Live socket closed before setup completed.'));
      this.setupReject = null;
    }
    if (!this.closed) {
      this.closed = true;
      this.running = false;
      this.opts.callbacks.onClosed();
    }
  }
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor(clean.length * 3) / 4);
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const c0 = B64.indexOf(clean[i]);
    const c1 = B64.indexOf(clean[i + 1]);
    const c2 = B64.indexOf(clean[i + 2]);
    const c3 = B64.indexOf(clean[i + 3]);
    if (c0 < 0 || c1 < 0) break;
    out[p++] = (c0 << 2) | (c1 >> 4);
    if (c2 >= 0) out[p++] = ((c1 & 15) << 4) | (c2 >> 2);
    if (c3 >= 0) out[p++] = ((c2 & 3) << 6) | c3;
  }
  return out.subarray(0, p);
}
