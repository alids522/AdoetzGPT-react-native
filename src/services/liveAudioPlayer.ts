// liveAudioPlayer — JS wrapper over the custom Expo native module
// (modules/live-audio-player), exposing the LivePlayer interface used by
// GeminiLiveService. The native module is registered as "LiveAudioPlayer".
import LiveAudioPlayerModule from '../../modules/live-audio-player/src/LiveAudioPlayer';
import type { LivePlayer } from './geminiLiveService';

export const liveAudioPlayer: LivePlayer = LiveAudioPlayerModule as unknown as LivePlayer;
