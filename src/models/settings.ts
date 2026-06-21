// GenerationSettings, CustomPersonality, VoiceSettings, DatabaseSettings,
// SyncSettings, Memory — port of lib/models.dart.
import {
  boolValue,
  doubleValue,
  intValue,
  mapList,
  stringValue,
  type Json,
} from './coerce';

// ---------------------------------------------------------------------------
// CustomPersonality
// ---------------------------------------------------------------------------
export class CustomPersonality {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly prompt: string,
  ) {}

  static fromJson(json: Json): CustomPersonality {
    return new CustomPersonality(stringValue(json.id), stringValue(json.name), stringValue(json.prompt));
  }
  toJson(): Json {
    return { id: this.id, name: this.name, prompt: this.prompt };
  }
}

// ---------------------------------------------------------------------------
// GenerationSettings
// ---------------------------------------------------------------------------
export interface GenerationSettingsCopyWith {
  memoryEnabled?: boolean;
  webSearchMode?: string;
  webSearchEngine?: string;
  webSearchProvider?: string;
  webSearchModel?: string;
  webSearchEndpointId?: string;
  googleSearchApiKey?: string;
  googleSearchCx?: string;
  tavilyApiKey?: string;
  mistralApiKey?: string;
  mistralAgentId?: string;
  hapticStreamingEnabled?: boolean;
  titleModelEnabled?: boolean;
  titleModel?: string;
  voiceModel?: string;
  liveModeEnabled?: boolean;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  contextLimit?: number;
}

export class GenerationSettings {
  constructor(
    public readonly memoryEnabled: boolean = true,
    public readonly webSearchMode: string = 'auto',
    public readonly webSearchEngine: string = 'gemini',
    public readonly webSearchProvider: string = 'gemini',
    public readonly webSearchModel: string = 'gemini-flash-lite-latest',
    public readonly webSearchEndpointId: string = '',
    public readonly googleSearchApiKey: string = '',
    public readonly googleSearchCx: string = '',
    public readonly tavilyApiKey: string = '',
    public readonly mistralApiKey: string = '',
    public readonly mistralAgentId: string = '',
    public readonly hapticStreamingEnabled: boolean = false,
    public readonly titleModelEnabled: boolean = true,
    public readonly titleModel: string = '',
    public readonly voiceModel: string = 'gemini-2.0-flash-exp',
    public readonly liveModeEnabled: boolean = true,
    public readonly temperature: number = 0.7,
    public readonly topP: number = 0.9,
    public readonly topK: number = 40,
    public readonly maxOutputTokens: number = 8192,
    public readonly contextLimit: number = 128000,
  ) {}

  copyWith(patch: GenerationSettingsCopyWith = {}): GenerationSettings {
    const nextEngine = patch.webSearchEngine ?? this.webSearchEngine;
    return new GenerationSettings(
      patch.memoryEnabled ?? this.memoryEnabled,
      patch.webSearchMode ?? this.webSearchMode,
      nextEngine,
      patch.webSearchProvider ?? (nextEngine === 'endpoint' ? 'endpoint' : 'gemini'),
      patch.webSearchModel ?? this.webSearchModel,
      patch.webSearchEndpointId ?? this.webSearchEndpointId,
      patch.googleSearchApiKey ?? this.googleSearchApiKey,
      patch.googleSearchCx ?? this.googleSearchCx,
      patch.tavilyApiKey ?? this.tavilyApiKey,
      patch.mistralApiKey ?? this.mistralApiKey,
      patch.mistralAgentId ?? this.mistralAgentId,
      patch.hapticStreamingEnabled ?? this.hapticStreamingEnabled,
      patch.titleModelEnabled ?? this.titleModelEnabled,
      patch.titleModel ?? this.titleModel,
      patch.voiceModel ?? this.voiceModel,
      patch.liveModeEnabled ?? this.liveModeEnabled,
      patch.temperature ?? this.temperature,
      patch.topP ?? this.topP,
      patch.topK ?? this.topK,
      patch.maxOutputTokens ?? this.maxOutputTokens,
      patch.contextLimit ?? this.contextLimit,
    );
  }

  static fromJson(json?: Json | null): GenerationSettings {
    if (!json) return new GenerationSettings();
    const engine = stringValue(
      json.webSearchEngine,
      json.webSearchProvider === 'endpoint' ? 'endpoint' : 'gemini',
    );
    return new GenerationSettings(
      json.memoryEnabled !== undefined ? boolValue(json.memoryEnabled) : true,
      stringValue(json.webSearchMode, 'auto'),
      engine,
      engine === 'endpoint' ? 'endpoint' : 'gemini',
      stringValue(json.webSearchModel, 'gemini-flash-lite-latest'),
      stringValue(json.webSearchEndpointId),
      stringValue(json.googleSearchApiKey),
      stringValue(json.googleSearchCx),
      stringValue(json.tavilyApiKey),
      stringValue(json.mistralApiKey),
      stringValue(json.mistralAgentId),
      boolValue(json.hapticStreamingEnabled),
      json.titleModelEnabled ?? true,
      stringValue(json.titleModel),
      stringValue(json.voiceModel, 'gemini-2.0-flash-exp'),
      json.liveModeEnabled ?? true,
      doubleValue(json.temperature, 0.7),
      doubleValue(json.topP, 0.9),
      intValue(json.topK, 40),
      intValue(json.maxOutputTokens, 8192),
      intValue(json.contextLimit, 128000),
    );
  }

  toJson(): Json {
    return {
      memoryEnabled: this.memoryEnabled,
      webSearchMode: this.webSearchMode,
      webSearchEngine: this.webSearchEngine,
      webSearchProvider: this.webSearchProvider,
      webSearchModel: this.webSearchModel,
      webSearchEndpointId: this.webSearchEndpointId,
      googleSearchApiKey: this.googleSearchApiKey,
      googleSearchCx: this.googleSearchCx,
      tavilyApiKey: this.tavilyApiKey,
      mistralApiKey: this.mistralApiKey,
      mistralAgentId: this.mistralAgentId,
      hapticStreamingEnabled: this.hapticStreamingEnabled,
      titleModelEnabled: this.titleModelEnabled,
      titleModel: this.titleModel,
      voiceModel: this.voiceModel,
      liveModeEnabled: this.liveModeEnabled,
      temperature: this.temperature,
      topP: this.topP,
      topK: this.topK,
      maxOutputTokens: this.maxOutputTokens,
      contextLimit: this.contextLimit,
    };
  }
}

// ---------------------------------------------------------------------------
// VoiceSettings
// ---------------------------------------------------------------------------
export interface VoiceSettingsCopyWith {
  voice?: string;
  personality?: string;
  customPersonality?: string;
  textPersonality?: string;
  customTextPersonality?: string;
  customVoicePersonalities?: CustomPersonality[];
  customTextPersonalities?: CustomPersonality[];
  liveModel?: string;
}

export class VoiceSettings {
  constructor(
    public readonly voice: string = 'Zephyr',
    public readonly personality: string = 'Assistant',
    public readonly customPersonality: string = '',
    public readonly textPersonality: string = 'Assistant',
    public readonly customTextPersonality: string = '',
    public readonly customVoicePersonalities: CustomPersonality[] = [],
    public readonly customTextPersonalities: CustomPersonality[] = [],
    public readonly liveModel: string = '',
  ) {}

  copyWith(patch: VoiceSettingsCopyWith = {}): VoiceSettings {
    return new VoiceSettings(
      patch.voice ?? this.voice,
      patch.personality ?? this.personality,
      patch.customPersonality ?? this.customPersonality,
      patch.textPersonality ?? this.textPersonality,
      patch.customTextPersonality ?? this.customTextPersonality,
      patch.customVoicePersonalities ?? this.customVoicePersonalities,
      patch.customTextPersonalities ?? this.customTextPersonalities,
      patch.liveModel ?? this.liveModel,
    );
  }

  static fromJson(json?: Json | null): VoiceSettings {
    if (!json) return new VoiceSettings();
    return new VoiceSettings(
      stringValue(json.voice, 'Zephyr'),
      stringValue(json.personality, 'Assistant'),
      stringValue(json.customPersonality),
      stringValue(json.textPersonality, 'Assistant'),
      stringValue(json.customTextPersonality),
      mapList(json.customVoicePersonalities).map(CustomPersonality.fromJson),
      mapList(json.customTextPersonalities).map(CustomPersonality.fromJson),
      stringValue(json.liveModel),
    );
  }

  toJson(): Json {
    return {
      voice: this.voice,
      personality: this.personality,
      customPersonality: this.customPersonality,
      textPersonality: this.textPersonality,
      customTextPersonality: this.customTextPersonality,
      customVoicePersonalities: this.customVoicePersonalities.map((p) => p.toJson()),
      customTextPersonalities: this.customTextPersonalities.map((p) => p.toJson()),
      liveModel: this.liveModel,
    };
  }
}

// ---------------------------------------------------------------------------
// DatabaseSettings
// ---------------------------------------------------------------------------
export interface DatabaseSettingsCopyWith {
  databaseUrl?: string;
  database?: string;
  schemaName?: string;
  user?: string;
  password?: string;
  port?: string;
}

export class DatabaseSettings {
  constructor(
    public readonly databaseUrl: string = '',
    public readonly database: string = '',
    public readonly schemaName: string = 'adoetzgpt',
    public readonly user: string = '',
    public readonly password: string = '',
    public readonly port: string = '',
  ) {}

  copyWith(patch: DatabaseSettingsCopyWith = {}): DatabaseSettings {
    return new DatabaseSettings(
      patch.databaseUrl ?? this.databaseUrl,
      patch.database ?? this.database,
      patch.schemaName ?? this.schemaName,
      patch.user ?? this.user,
      patch.password ?? this.password,
      patch.port ?? this.port,
    );
  }

  static fromJson(json?: Json | null): DatabaseSettings {
    if (!json) return new DatabaseSettings();
    return new DatabaseSettings(
      stringValue(json.databaseUrl),
      stringValue(json.database),
      stringValue(json.schemaName, 'adoetzgpt'),
      stringValue(json.user),
      stringValue(json.password),
      stringValue(json.port),
    );
  }

  toJson(includePassword = true): Json {
    return {
      databaseUrl: this.databaseUrl,
      database: this.database,
      schemaName: this.schemaName.length === 0 ? 'adoetzgpt' : this.schemaName,
      user: this.user,
      password: includePassword ? this.password : '',
      port: this.port,
    };
  }
}

// ---------------------------------------------------------------------------
// Memory
// ---------------------------------------------------------------------------
export interface MemoryCopyWith {
  content?: string;
  timestamp?: number;
  updatedAt?: number | null;
  deletedAt?: number | null;
  key?: string;
  type?: string;
  scope?: string;
  sensitivity?: string;
}

export class Memory {
  constructor(
    public readonly id: string,
    public readonly content: string,
    public readonly timestamp: number,
    public readonly updatedAt: number | null = null,
    public readonly deletedAt: number | null = null,
    public readonly key: string = '',
    public readonly type: string = 'preference',
    public readonly scope: string = 'global',
    public readonly sensitivity: string = 'low',
  ) {}

  copyWith(patch: MemoryCopyWith = {}): Memory {
    return new Memory(
      this.id,
      patch.content ?? this.content,
      patch.timestamp ?? this.timestamp,
      patch.updatedAt ?? this.updatedAt,
      patch.deletedAt ?? this.deletedAt,
      patch.key ?? this.key,
      patch.type ?? this.type,
      patch.scope ?? this.scope,
      patch.sensitivity ?? this.sensitivity,
    );
  }

  static fromJson(json: Json): Memory {
    const content = stringValue(json.content);
    const timestamp = intValue(json.timestamp);
    return new Memory(
      stringValue(json.id),
      content,
      timestamp,
      json.updatedAt != null ? intValue(json.updatedAt) : timestamp,
      json.deletedAt != null ? intValue(json.deletedAt) : null,
      stringValue(json.key, Memory.inferKey(content)),
      stringValue(json.type, 'preference'),
      stringValue(json.scope, 'global'),
      stringValue(json.sensitivity, 'low'),
    );
  }

  toJson(): Json {
    const out: Json = {
      id: this.id,
      content: this.content,
      timestamp: this.timestamp,
    };
    if (this.updatedAt != null) out.updatedAt = this.updatedAt;
    if (this.deletedAt != null) out.deletedAt = this.deletedAt;
    if (this.key.length > 0) out.key = this.key;
    if (this.type.length > 0) out.type = this.type;
    if (this.scope.length > 0) out.scope = this.scope;
    if (this.sensitivity.length > 0) out.sensitivity = this.sensitivity;
    return out;
  }

  static inferKey(content: string): string {
    const value = content
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (value.includes('name is') || value.includes('named')) return 'user_name';
    if (value.includes('nickname') || value.includes('call user')) return 'nickname';
    if (/\b(dog|dogs|cat|cats|pet|pets)\b/.test(value)) return 'pets';
    if (value.includes('language') || value.includes('indonesian')) return 'preferred_language';
    if (value.includes('tone') || value.includes('verbose') || value.includes('concise'))
      return 'preferred_tone';
    if (
      value.includes('framework') ||
      (value.includes('prefer') && (value.includes('flutter') || value.includes('react')))
    )
      return 'preferred_framework';
    if (value.includes('project') || value.includes('app')) return 'project_requirement';
    return '';
  }
}
