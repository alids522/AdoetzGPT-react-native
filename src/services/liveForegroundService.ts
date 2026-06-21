// liveForegroundService — Android foreground notification + wake-lock-style
// keep-alive during Gemini Live (port of LiveForegroundService.kt via Notifee).
// iOS has no foreground service; Live runs in-app only.
import notifee, { AndroidImportance, type Event } from '@notifee/react-native';

const CHANNEL_ID = 'adoetzgpt-live';
const NOTIF_ID = 'adoetzgpt-live';

export const liveForegroundService = {
  async initialize(): Promise<void> {
    try {
      await notifee.createChannel({
        id: CHANNEL_ID,
        name: 'Gemini Live',
        importance: AndroidImportance.LOW,
      });
    } catch {
      // iOS — no-op
    }
  },

  async start(): Promise<void> {
    try {
      await notifee.displayNotification({
        id: NOTIF_ID,
        title: 'AdoetzGPT Live',
        body: 'Listening…',
        android: {
          channelId: CHANNEL_ID,
          asForegroundService: true,
          // FOREGROUND_SERVICE_TYPE_MICROPHONE (Android 14+); numeric per notifee enum.
          foregroundServiceTypes: [8],
          ongoing: true,
          actions: [
            { title: 'Toggle Mic', pressAction: { id: 'toggle_mic' } },
            { title: 'End Live', pressAction: { id: 'end_live' } },
          ],
        } as Record<string, unknown>,
      });
    } catch {
      // iOS / not ready — ignore
    }
  },

  async stop(): Promise<void> {
    try {
      await notifee.cancelNotification(NOTIF_ID);
    } catch {
      // ignore
    }
  },

  onAction(handler: (action: string) => void): () => void {
    return notifee.onForegroundEvent((event: Event) => {
      const id = event.detail.pressAction?.id ?? '';
      if (id) handler(id);
    });
  },
};
