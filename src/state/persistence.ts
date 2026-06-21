// Persistence — port of lib/services/storage_service.dart.
// The Dart app writes one JSON blob (adoetzgpt_state.json) including secrets;
// we mirror that with a single AsyncStorage entry (secrets split into
// expo-secure-store is a Phase 8 hardening item, not a behavior change).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PersistedAppState, type Json } from '../models';

export const APP_STATE_KEY = 'adoetzgpt.appState';

export async function loadPersistedState(): Promise<PersistedAppState | null> {
  try {
    const raw = await AsyncStorage.getItem(APP_STATE_KEY);
    if (!raw || raw.length === 0) return null;
    return PersistedAppState.fromJson(JSON.parse(raw) as Json);
  } catch {
    return null;
  }
}

/** Mirrors StorageService._compactForStorage: strip >500KB attachments, cap usage at 500. */
export function compactForStorage(state: PersistedAppState): Json {
  const json = state.toJson(true);
  for (const session of (json.sessions as Json[] | undefined) ?? []) {
    const messages = (session.messages as Json[] | undefined) ?? [];
    for (const message of messages) {
      const attachments = message.attachments;
      if (Array.isArray(attachments)) {
        for (const a of attachments as Json[]) {
          if (typeof a.data === 'string' && a.data.length > 500000) {
            a.data = '';
            delete a.url;
          }
        }
      }
    }
  }
  if (Array.isArray(json.tokenUsageData) && (json.tokenUsageData as unknown[]).length > 500) {
    json.tokenUsageData = (json.tokenUsageData as unknown[]).slice(0, 500);
  }
  return json;
}

export async function savePersistedState(state: PersistedAppState): Promise<void> {
  await AsyncStorage.setItem(APP_STATE_KEY, JSON.stringify(compactForStorage(state)));
}

/** Dart cleared SharedPreferences currentUser/authToken; the blob is single-key here, so no-op. */
export async function clearAuthStorage(): Promise<void> {
  // Intentionally empty — auth lives inside the persisted state blob.
}
