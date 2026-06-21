// SyncService — port of lib/services/sync_service.dart (Express + Supabase paths
// ONLY; the raw-TCP direct-Postgres path is dropped per the plan — RN cannot open
// Postgres sockets, so all DB access goes through server/index.ts or Supabase).
import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import {
  PersistedAppState,
  Session,
  SyncSettings,
  UserAccount,
  type DatabaseSettings,
  type Json,
} from '../models';
import type { AuthResult, SyncServiceLike } from '../state/store';

export const DEFAULT_WEB_API_BASE_URL = 'http://127.0.0.1:3000';

function apiBaseUrl(settings: SyncSettings): string {
  const configured = settings.apiBaseUrl.trim();
  return configured.length > 0 ? configured : DEFAULT_WEB_API_BASE_URL;
}

function apiUri(settings: SyncSettings, path: string): string {
  return `${apiBaseUrl(settings).replace(/\/$/, '')}${path}`;
}

function databasePayload(db: DatabaseSettings): Json {
  return {
    databaseUrl: db.databaseUrl.trim(),
    database: db.database.trim(),
    schemaName: db.schemaName.trim(),
    user: db.user.trim(),
    password: db.password,
    port: db.port.trim(),
  };
}

/** Settings JSON pushed remotely: strip secrets + lastSyncAt (mirrors _remoteStateJson). */
function remoteStateJson(state: PersistedAppState): Json {
  const json = state.toJson(true);
  json.authToken = '';
  delete json.lastSyncAt;
  const sync = { ...(json.syncSettings as Json) };
  const db = { ...(sync.database as Json) };
  db.password = '';
  sync.database = db;
  json.syncSettings = sync;
  delete json.cachedPasswordHash;
  return json;
}

function sessionsForDelta(
  state: PersistedAppState,
  lastSyncAt?: number | null,
  changedSessionIds?: Iterable<string>,
): Session[] {
  if (changedSessionIds) {
    const set = new Set(changedSessionIds);
    if (set.size === 0) return [];
    return state.sessions.filter((s) => set.has(s.id));
  }
  if (lastSyncAt != null) {
    return state.sessions.filter((s) => s.updatedAt > lastSyncAt);
  }
  return state.sessions;
}

async function postJson(
  settings: SyncSettings,
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<{ status: number; data: Json }> {
  const res = await fetch(apiUri(settings, path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: Json = {};
  try {
    data = text ? (JSON.parse(text) as Json) : {};
  } catch {
    throw new Error(
      text.includes('<html')
        ? 'Sync API URL points to the web app instead of the API server.'
        : 'Sync API did not return JSON.',
    );
  }
  return { status: res.status, data };
}

function authClient(settings: SyncSettings): SupabaseClient {
  return createClient(settings.supabaseUrl, settings.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function sessionClient(settings: SyncSettings, token: string): SupabaseClient {
  return createClient(settings.supabaseUrl, settings.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function supabaseUserIdFromToken(token: string): string {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return '';
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as Json;
    return String(payload.sub ?? '');
  } catch {
    return '';
  }
}

async function supabasePullStateForUser(
  client: SupabaseClient,
  userId: string,
): Promise<PersistedAppState | null> {
  if (userId.length === 0) return null;
  const settingsRes = await client.from('user_settings').select().eq('user_id', userId).maybeSingle();
  const sessionsRes = await client.from('chat_sessions').select().eq('user_id', userId);

  const combined: Json = {};
  const settingsState = settingsRes?.data?.state as Json | undefined;
  if (settingsState && typeof settingsState === 'object') Object.assign(combined, settingsState);
  const rows = (sessionsRes?.data ?? []) as Json[];
  if (rows.length > 0) {
    combined.sessions = rows.map((row) => row.session as Json).filter(Boolean);
  }
  return Object.keys(combined).length > 0 ? PersistedAppState.fromJson(combined) : null;
}

export class SyncService implements SyncServiceLike {
  private realtimeClient: SupabaseClient | null = null;
  private realtimeChannel: RealtimeChannel | null = null;
  private realtimeKey = '';

  async signUp(username: string, password: string, settings: SyncSettings): Promise<AuthResult> {
    if (settings.useSupabase) {
      const client = authClient(settings);
      const { data, error } = await client.auth.signUp({ email: username, password });
      if (error || !data.user || !data.session) {
        throw new Error('Supabase signup failed. Please ensure you provide a valid email format.');
      }
      return {
        user: new UserAccount(data.user.id, username, null, username.split('@')[0], false),
        token: data.session.access_token,
        remoteState: null,
      };
    }
    const { status, data } = await postJson(settings, '/api/auth/signup', {
      username,
      password,
      dbConfig: databasePayload(settings.database),
    });
    if (status < 200 || status >= 300) throw new Error(String(data.error ?? 'Unable to sign up.'));
    return {
      user: UserAccount.fromJson({ ...(data.user as Json) }),
      token: String(data.token),
      remoteState: data.state && typeof data.state === 'object' ? PersistedAppState.fromJson({ ...(data.state as Json) }) : null,
    };
  }

  async login(username: string, password: string, settings: SyncSettings): Promise<AuthResult> {
    if (settings.useSupabase) {
      const client = authClient(settings);
      const { data, error } = await client.auth.signInWithPassword({ email: username, password });
      if (error || !data.user || !data.session) throw new Error('Supabase login failed.');
      let remoteState: PersistedAppState | null = null;
      try {
        remoteState = await supabasePullStateForUser(
          sessionClient(settings, data.session.access_token),
          data.user.id,
        );
      } catch {
        // best-effort
      }
      return {
        user: new UserAccount(data.user.id, username, null, username.split('@')[0], false),
        token: data.session.access_token,
        remoteState,
      };
    }
    const { status, data } = await postJson(settings, '/api/auth/login', {
      username,
      password,
      dbConfig: databasePayload(settings.database),
    });
    if (status < 200 || status >= 300) throw new Error(String(data.error ?? 'Unable to log in.'));
    return {
      user: UserAccount.fromJson({ ...(data.user as Json) }),
      token: String(data.token),
      remoteState: data.state && typeof data.state === 'object' ? PersistedAppState.fromJson({ ...(data.state as Json) }) : null,
    };
  }

  async pullRemoteState(token: string, settings: SyncSettings): Promise<PersistedAppState | null> {
    if (!settings.enabled || token.length === 0) return null;
    if (settings.useSupabase) {
      const userId = supabaseUserIdFromToken(token);
      return supabasePullStateForUser(sessionClient(settings, token), userId);
    }
    const { status, data } = await postJson(
      settings,
      '/api/sync/pull',
      { dbConfig: databasePayload(settings.database) },
      { Authorization: `Bearer ${token}` },
    );
    if (status < 200 || status >= 300) throw new Error(String(data.error ?? 'Unable to pull remote state.'));
    const combined: Json = {};
    if (data.settings && typeof data.settings === 'object') Object.assign(combined, data.settings);
    if (Array.isArray(data.sessions)) {
      combined.sessions = (data.sessions as Json[]).map((s) => s.session as Json);
    }
    return Object.keys(combined).length > 0 ? PersistedAppState.fromJson(combined) : null;
  }

  async pushRemoteState(
    state: PersistedAppState,
    settings: SyncSettings,
    opts: { lastSyncAt?: number | null; changedSessionIds?: Iterable<string>; settingsChanged?: boolean } = {},
  ): Promise<void> {
    if (!settings.enabled || state.authToken.length === 0) return;
    const token = state.authToken;
    const changedIds = opts.changedSessionIds ? new Set(opts.changedSessionIds) : undefined;
    const settingsChanged = opts.settingsChanged ?? true;
    if (!settingsChanged && changedIds && changedIds.size === 0) return;

    const errors: string[] = [];

    if (settings.useSupabase) {
      const client = sessionClient(settings, token);
      const userId = state.currentUser?.id;
      if (!userId) return;
      try {
        if (settingsChanged) {
          const settingsJson = remoteStateJson(state);
          delete settingsJson.sessions;
          await client.from('user_settings').upsert({
            user_id: userId,
            state: settingsJson,
            updated_at: new Date().toISOString(),
          });
        }
        const countRes = await client.from('chat_sessions').select('id').eq('user_id', userId).limit(1);
        const isNewDb = (countRes.data ?? []).length === 0;
        const toPush = isNewDb ? state.sessions : sessionsForDelta(state, opts.lastSyncAt, changedIds);
        for (const s of toPush) {
          await client.from('chat_sessions').upsert({
            id: s.id,
            user_id: userId,
            session: s.toJson(),
            updated_at: new Date().toISOString(),
          });
        }
      } catch (e) {
        errors.push(`Supabase Primary Error: ${(e as Error).message}`);
      }
    } else {
      // Express backend — backup-DB fan-out is handled server-side via /api/sync/backup.
      try {
        const toPush = sessionsForDelta(state, opts.lastSyncAt, changedIds);
        const settingsJson = remoteStateJson(state);
        delete settingsJson.sessions;
        const { status, data } = await postJson(
          settings,
          '/api/sync/push',
          {
            settings: settingsJson,
            sessions: toPush.map((s) => ({ id: s.id, session: s.toJson() })),
            dbConfig: databasePayload(settings.database),
          },
          { Authorization: `Bearer ${token}` },
        );
        if (status < 200 || status >= 300) throw new Error(String(data.error ?? 'Unable to push remote state.'));
      } catch (e) {
        errors.push(`API Primary Error: ${(e as Error).message}`);
      }
      if (settings.autoSyncBackups) {
        for (const db of settings.backupDatabases) {
          if (db.databaseUrl.trim().length === 0 || db.database.trim().length === 0) continue;
          try {
            const settingsJson = remoteStateJson(state);
            const { status, data } = await postJson(
              { ...settings, database: db } as SyncSettings,
              '/api/sync/backup',
              {
                primaryDbConfig: databasePayload(settings.database),
                backupDbConfig: databasePayload(db),
                state: settingsJson,
              },
              { Authorization: `Bearer ${token}` },
            );
            if (status < 200 || status >= 300) throw new Error(String(data.error ?? 'Unable to save backup state.'));
          } catch (e) {
            errors.push(`Backup Error (${db.databaseUrl}): ${(e as Error).message}`);
          }
        }
      }
    }

    if (errors.length > 0) throw new Error(`Partial Sync Failure:\n${errors.join('\n')}`);
  }

  async subscribeRemoteChanges(onRemote: (state: PersistedAppState) => void): Promise<void> {
    await this.unsubscribeRemoteChanges();
    // Realtime subscription is Supabase-only (Express has no push channel).
    // The store passes current token+settings via a closure set by `bind`.
  }

  async unsubscribeRemoteChanges(): Promise<void> {
    if (this.realtimeChannel) {
      try {
        await this.realtimeClient?.removeChannel(this.realtimeChannel);
      } catch {
        // ignore
      }
    }
    this.realtimeChannel = null;
    this.realtimeKey = '';
  }

  /**
   * Subscribe to Supabase realtime for this user. Called by the store when sync
   * turns on with a Supabase session. On any change, pull and emit merged state.
   */
  async subscribeSupabase(
    token: string,
    settings: SyncSettings,
    onRemote: (state: PersistedAppState) => void,
  ): Promise<void> {
    if (!settings.enabled || !settings.useSupabase || token.length === 0) {
      await this.unsubscribeRemoteChanges();
      return;
    }
    const userId = supabaseUserIdFromToken(token);
    if (userId.length === 0) return;
    const key = `${settings.supabaseUrl}|${userId}`;
    if (this.realtimeChannel && this.realtimeKey === key) return;
    await this.unsubscribeRemoteChanges();

    const client = sessionClient(settings, token);
    this.realtimeClient = client;
    this.realtimeKey = key;
    this.realtimeChannel = client
      .channel(`adoetzgpt-sync-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_settings', filter: `user_id=eq.${userId}` },
        () => {
          supabasePullStateForUser(client, userId).then((s) => {
            if (s) onRemote(s);
          });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_sessions', filter: `user_id=eq.${userId}` },
        () => {
          supabasePullStateForUser(client, userId).then((s) => {
            if (s) onRemote(s);
          });
        },
      )
      .subscribe();
  }
}

export const syncService = new SyncService();
