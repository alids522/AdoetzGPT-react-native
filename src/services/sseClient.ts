// SSE client — abstraction over react-native-sse's EventSource (supports POST +
// custom headers + body, which the OpenAI stream:true and Gemini ?alt=sse paths
// both need). Mirrors Dart's per-`data:` line handling.
//
// NOTE: react-native-sse fires an `error` event both on real failures AND when
// the server closes the stream normally (e.g. Gemini has no `[DONE]`). We treat
// an error after we've already received data as a clean completion. Validate
// per-provider on device (Phase 5 gate).
import EventSource from 'react-native-sse';
import type { Json } from '../models';

export interface SseOptions {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
}

export interface SseHandle {
  close(): void;
}

export interface SseHandlers {
  /** Called once per `data:` payload (the payload string, already stripped of the `data: ` prefix). */
  onEvent: (data: string) => void;
  /** Called on a genuine failure (no data received yet). */
  onError: (message: string) => void;
  /** Called when the stream ends cleanly (server close after data, or [DONE]). */
  onDone?: () => void;
}

export function openSse(opts: SseOptions, handlers: SseHandlers): SseHandle {
  const es = new EventSource(opts.url, {
    method: opts.method ?? 'GET',
    headers: opts.headers ?? {},
    body: opts.body,
    pollingInterval: 0,
    withCredentials: false,
    // Avoid auto-reconnect loops on completion.
    debug: false,
  });

  let settled = false;
  let receivedAny = false;
  const finish = (kind: 'done' | 'error', msg?: string) => {
    if (settled) return;
    settled = true;
    try {
      es.close();
    } catch {
      // ignore
    }
    if (kind === 'done') handlers.onDone?.();
    else handlers.onError(msg ?? 'Stream error');
  };

  es.addEventListener('message', (e: any) => {
    receivedAny = true;
    const data = typeof e?.data === 'string' ? e.data : '';
    handlers.onEvent(data);
  });
  es.addEventListener('error', (e: any) => {
    const msg = typeof e?.message === 'string' ? e.message : 'Stream error';
    // Server-closed streams surface as error; if we got data, treat as done.
    finish(receivedAny ? 'done' : 'error', msg);
  });

  return {
    close: () => finish('done'),
  };
}

/**
 * Stream an SSE endpoint, invoking `onData` for each parsed JSON payload.
 * Resolves when the stream ends ([DONE] or server close after data), rejects on
 * a real failure before any data. `cancel()` aborts the stream.
 */
export function streamJsonSse(
  opts: SseOptions,
  onData: (data: Json) => void,
): { promise: Promise<{ raw: string }>; cancel: () => void } {
  let raw = '';
  let settled = false;
  let resolveRef!: (v: { raw: string }) => void;
  let rejectRef!: (e: Error) => void;
  const promise = new Promise<{ raw: string }>((res, rej) => {
    resolveRef = res;
    rejectRef = rej;
  });
  const settle = (fn: () => void) => {
    if (settled) return;
    settled = true;
    fn();
  };

  let handle: SseHandle;
  handle = openSse(opts, {
    onEvent: (dataStr) => {
      raw += dataStr + '\n';
      if (dataStr === '[DONE]') {
        handle.close();
        return;
      }
      try {
        onData(JSON.parse(dataStr));
      } catch {
        // ignore non-JSON keep-alive lines
      }
    },
    onError: (msg) => settle(() => rejectRef(new Error(msg))),
    onDone: () => settle(() => resolveRef({ raw })),
  });

  return { promise, cancel: () => handle.close() };
}
