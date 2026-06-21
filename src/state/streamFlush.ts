// Stream-flush batching — port of _queueStreamText / _flushStreamText /
// _cancelStreamFlush / _streamFlushDelay in lib/state/app_state.dart.
// Debounces streaming token updates so the UI isn't re-rendered on every chunk.

export interface StreamFlushDeps {
  /** True while `generationId` is the active generation for `sessionId` and not stop-requested. */
  isActive: (sessionId: string, generationId: string) => boolean;
  /** Write the latest accumulated text into the bot message. */
  updateBotMessage: (sessionId: string, botId: string, text: string) => void;
}

export function streamFlushDelay(textLength: number): number {
  if (textLength > 12000) return 160;
  if (textLength > 6000) return 120;
  return 80;
}

export class StreamFlushController {
  private pending = new Map<string, string>();
  private lastDisplayed = new Map<string, string>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(private deps: StreamFlushDeps) {}

  queue(generationId: string, sessionId: string, botId: string, text: string): void {
    if (!this.deps.isActive(sessionId, generationId)) return;
    this.pending.set(generationId, text);
    if (!this.timers.has(generationId)) {
      const delay = streamFlushDelay(text.length);
      const timer = setTimeout(() => {
        this.timers.delete(generationId);
        this.flush(generationId, sessionId, botId, false);
      }, delay);
      this.timers.set(generationId, timer);
    }
  }

  flush(generationId: string, sessionId: string, botId: string, force: boolean): void {
    const pendingText = this.pending.get(generationId);
    if (
      !this.deps.isActive(sessionId, generationId) ||
      pendingText == null ||
      pendingText.length === 0
    ) {
      return;
    }
    const timer = this.timers.get(generationId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(generationId);
    }
    if (!force && pendingText === this.lastDisplayed.get(generationId)) return;
    this.lastDisplayed.set(generationId, pendingText);
    this.deps.updateBotMessage(sessionId, botId, pendingText);
  }

  cancel(generationId?: string, resetText = false): void {
    if (generationId != null) {
      const timer = this.timers.get(generationId);
      if (timer) clearTimeout(timer);
      this.timers.delete(generationId);
      if (resetText) {
        this.pending.delete(generationId);
        this.lastDisplayed.delete(generationId);
      }
    } else {
      for (const timer of this.timers.values()) clearTimeout(timer);
      this.timers.clear();
      if (resetText) {
        this.pending.clear();
        this.lastDisplayed.clear();
      }
    }
  }

  dispose(): void {
    this.cancel(undefined, true);
  }
}
