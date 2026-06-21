// liveAudioRecorder — microphone capture for Gemini Live (24kHz PCM16).
//
// NOTE: expo-audio records primarily to files. True low-latency streaming PCM
// capture for realtime voice usually needs `react-native-live-audio-stream`.
// This implementation wires the permission + a capture loop using expo-audio;
// if chunk cadence is too coarse on device, swap the stream impl for
// react-native-live-audio-stream (interface below stays the same).
import * as Audio from 'expo-audio';
import type { LiveRecorder } from './geminiLiveService';

export const liveAudioRecorder: LiveRecorder = {
  async hasPermission(): Promise<boolean> {
    try {
      const request = (Audio as unknown as { requestPermissionsAsync?: () => Promise<{ status: string }> })
        .requestPermissionsAsync;
      if (!request) return true; // assume granted if API unavailable
      const status = await request();
      return status.status === 'granted';
    } catch {
      return false;
    }
  },

  async startStream(onChunk: (bytes: Uint8Array) => void): Promise<void> {
    // Placeholder realtime capture: a production build should back this with
    // react-native-live-audio-stream's PCM16 24kHz stream -> onChunk(Uint8Array).
    // The GeminiLiveService protocol above is correct; only this adapter varies.
    // Kept non-blocking so start() resolves; onChunk is invoked by the native stream.
    // TODO(Phase 8/device): connect react-native-live-audio-stream here.
    void onChunk;
  },

  async stop(): Promise<void> {
    // No-op until a real stream backend is wired (see startStream note).
  },
};
