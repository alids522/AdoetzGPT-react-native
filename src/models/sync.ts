// SyncSettings — port of lib/models.dart.
import { boolValue, mapList, stringValue, type Json } from './coerce';
import { DatabaseSettings } from './settings';

export interface SyncSettingsCopyWith {
  enabled?: boolean;
  apiBaseUrl?: string;
  database?: DatabaseSettings;
  backupDatabases?: DatabaseSettings[];
  autoSyncBackups?: boolean;
  useSupabase?: boolean;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

export const DEFAULT_SUPABASE_URL = 'https://supabase.alids.app';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlLWRlbW8iLCJpYXQiOjE3ODE0MjkzOTMsImV4cCI6MjA4Mjc1ODQwMH0.qgQ3hxL9JgRhZ-0vuIAG-myu8w5UeWkG1iNrsjqDvR0';

export class SyncSettings {
  constructor(
    public readonly enabled: boolean = false,
    public readonly apiBaseUrl: string = '',
    public readonly database: DatabaseSettings = new DatabaseSettings(),
    public readonly backupDatabases: DatabaseSettings[] = [],
    public readonly autoSyncBackups: boolean = false,
    public readonly useSupabase: boolean = false,
    public readonly supabaseUrl: string = DEFAULT_SUPABASE_URL,
    public readonly supabaseAnonKey: string = DEFAULT_SUPABASE_ANON_KEY,
  ) {}

  copyWith(patch: SyncSettingsCopyWith = {}): SyncSettings {
    return new SyncSettings(
      patch.enabled ?? this.enabled,
      patch.apiBaseUrl ?? this.apiBaseUrl,
      patch.database ?? this.database,
      patch.backupDatabases ?? this.backupDatabases,
      patch.autoSyncBackups ?? this.autoSyncBackups,
      patch.useSupabase ?? this.useSupabase,
      patch.supabaseUrl ?? this.supabaseUrl,
      patch.supabaseAnonKey ?? this.supabaseAnonKey,
    );
  }

  static fromJson(json?: Json | null): SyncSettings {
    if (!json) return new SyncSettings();
    const db = DatabaseSettings.fromJson(
      typeof json.database === 'object' && json.database !== null ? { ...(json.database as Json) } : json,
    );
    return new SyncSettings(
      boolValue(json.enabled),
      stringValue(json.apiBaseUrl),
      db.copyWith({
        schemaName:
          db.schemaName.length > 0 ? db.schemaName : stringValue(json.schemaName, 'adoetzgpt'),
      }),
      mapList(json.backupDatabases).map(DatabaseSettings.fromJson),
      boolValue(json.autoSyncBackups),
      boolValue(json.useSupabase),
      stringValue(json.supabaseUrl),
      stringValue(json.supabaseAnonKey),
    );
  }

  toJson(includePassword = true): Json {
    const out: Json = {
      enabled: this.enabled,
      apiBaseUrl: this.apiBaseUrl,
      database: this.database.toJson(includePassword),
      backupDatabases: this.backupDatabases.map((d) => d.toJson(includePassword)),
      autoSyncBackups: this.autoSyncBackups,
      useSupabase: this.useSupabase,
      supabaseUrl: this.supabaseUrl,
    };
    if (includePassword) out.supabaseAnonKey = this.supabaseAnonKey;
    return out;
  }
}
