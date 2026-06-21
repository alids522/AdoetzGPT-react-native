// PersistedAppState (root persisted object) — port of lib/models.dart.
// This is the shape of the JSON the app persists and syncs.
import {
  boolValue,
  intMap,
  doubleMap,
  intValue,
  languageCode,
  mapList,
  normalizeLanguage,
  stringValue,
  type AppLanguage,
  type Json,
} from './coerce';
import { EndpointConfig } from './endpoint';
import { AgentConnector } from './connector';
import {
  DatabaseSettings,
  GenerationSettings,
  Memory,
  VoiceSettings,
} from './settings';
import { Session } from './session';
import { UserAccount } from './account';
import { TokenUsageRecord, CustomCounter } from './tokenUsage';
import { McpServerConfig } from './mcp';
import { SyncSettings } from './sync';

export function ifEmpty<T>(list: T[], fallback: T[]): T[] {
  return list.length === 0 ? fallback : list;
}

export function normalizeVisualTheme(value: unknown): string {
  const key = stringValue(value, 'default').trim().toLowerCase();
  switch (key) {
    case 'liquid-glass':
    case 'liquidglass':
    case 'glass':
      return 'liquid-glass';
    case 'aurora-neon':
    case 'auroraneon':
    case 'aurora':
    case 'neon':
      return 'aurora-neon';
    case 'modern-minimal':
    case 'modernminimal':
    case 'minimal':
      return 'modern-minimal';
    case 'ios26':
    case 'vision':
      return 'ios26';
    case 'midnight-bloom':
    case 'midnightbloom':
    case 'midnight':
    case 'bloom':
      return 'midnight-bloom';
    default:
      return 'default';
  }
}

export class PersistedAppState {
  constructor(
    public readonly currentUser: UserAccount | null,
    public readonly authToken: string,
    public readonly syncSettings: SyncSettings,
    public readonly language: AppLanguage,
    public readonly theme: string,
    public readonly visualTheme: string,
    public readonly selectedModel: string,
    public readonly selectedTargetId: string,
    public readonly isThinkingMode: boolean,
    public readonly isArtifactMode: boolean,
    public readonly userName: string,
    public readonly geminiApiKey: string,
    public readonly endpoints: EndpointConfig[],
    public readonly agentConnectors: AgentConnector[],
    public readonly modelContextOverrides: Record<string, number>,
    public readonly modelInputCosts: Record<string, number>,
    public readonly modelOutputCosts: Record<string, number>,
    public readonly modelCacheHitCosts: Record<string, number>,
    public readonly genSettings: GenerationSettings,
    public readonly voiceSettings: VoiceSettings,
    public readonly sessions: Session[],
    public readonly currentSessionId: string,
    public readonly memories: Memory[],
    public readonly tokenUsageData: TokenUsageRecord[],
    public readonly customCounters: CustomCounter[],
    public readonly mcpServers: McpServerConfig[],
    public readonly soundEffectsEnabled: boolean,
    public readonly isLiveVideoEnabled: boolean,
    public readonly isLiveFrontCamera: boolean,
    public readonly cachedPasswordHash: string | null = null,
    public readonly lastSyncAt: number | null = null,
    public readonly savedAt: number | null = null,
  ) {}

  static defaults(): PersistedAppState {
    const session = Session.empty();
    return new PersistedAppState(
      null,
      '',
      new SyncSettings(),
      'id',
      'dark',
      'default',
      'gemini-2.5-flash',
      'model:gemini-2.5-flash',
      false,
      false,
      'User',
      '',
      [new EndpointConfig('1', 'https://api.openai.com/v1', '', 'OpenAI')],
      [],
      {},
      {},
      {},
      {},
      new GenerationSettings(),
      new VoiceSettings(),
      [session],
      session.id,
      [],
      [],
      [],
      [],
      true,
      false,
      false,
      null,
      null,
    );
  }

  static fromJson(json: Json, allowEmptySessions = false): PersistedAppState {
    const sessions = mapList(json.sessions).map(Session.fromJson);
    const defaults = PersistedAppState.defaults();
    return new PersistedAppState(
      json.currentUser == null ? null : UserAccount.fromJson({ ...(json.currentUser as Json) }),
      stringValue(json.authToken),
      SyncSettings.fromJson(
        typeof json.syncSettings === 'object' && json.syncSettings !== null
          ? { ...(json.syncSettings as Json) }
          : null,
      ),
      normalizeLanguage(json.language),
      stringValue(json.theme, 'dark') === 'light' ? 'light' : 'dark',
      normalizeVisualTheme(json.visualTheme),
      stringValue(json.selectedModel, defaults.selectedModel),
      stringValue(json.selectedTargetId, stringValue(json.selected_target_id, '')),
      boolValue(json.isThinkingMode),
      boolValue(json.isArtifactMode),
      stringValue(json.userName, defaults.userName),
      stringValue(json.geminiApiKey),
      ifEmpty(mapList(json.endpoints).map(EndpointConfig.fromJson), defaults.endpoints),
      mapList(json.agentConnectors ?? json.agent_connectors).map(AgentConnector.fromJson),
      intMap(json.modelContextOverrides ?? json.model_context_overrides),
      doubleMap(json.modelInputCosts),
      doubleMap(json.modelOutputCosts),
      doubleMap(json.modelCacheHitCosts),
      GenerationSettings.fromJson(
        typeof json.genSettings === 'object' && json.genSettings !== null
          ? { ...(json.genSettings as Json) }
          : null,
      ),
      VoiceSettings.fromJson(
        typeof json.voiceSettings === 'object' && json.voiceSettings !== null
          ? { ...(json.voiceSettings as Json) }
          : null,
      ),
      sessions.length === 0 && !allowEmptySessions ? defaults.sessions : sessions,
      stringValue(
        json.currentSessionId,
        sessions.length === 0
          ? allowEmptySessions
            ? ''
            : defaults.currentSessionId
          : sessions[0].id,
      ),
      mapList(json.memories).map(Memory.fromJson),
      mapList(json.tokenUsageData).map(TokenUsageRecord.fromJson),
      mapList(json.customCounters).map(CustomCounter.fromJson),
      mapList(json.mcpServers).map(McpServerConfig.fromJson),
      boolValue(json.soundEffectsEnabled, true),
      boolValue(json.isLiveVideoEnabled),
      boolValue(json.isLiveFrontCamera),
      typeof json.cachedPasswordHash === 'string' ? json.cachedPasswordHash : null,
      json.lastSyncAt == null ? null : intValue(json.lastSyncAt),
      json.savedAt == null ? null : intValue(json.savedAt),
    );
  }

  toJson(includeSecrets = true): Json {
    const out: Json = {
      currentUser: this.currentUser?.toJson() ?? null,
      authToken: includeSecrets ? this.authToken : '',
      syncSettings: this.syncSettings.toJson(includeSecrets),
      language: languageCode(this.language),
      theme: this.theme,
      visualTheme: this.visualTheme,
      selectedModel: this.selectedModel,
      selectedTargetId: this.selectedTargetId,
      isThinkingMode: this.isThinkingMode,
      isArtifactMode: this.isArtifactMode,
      userName: this.userName,
      geminiApiKey: includeSecrets ? this.geminiApiKey : '',
      endpoints: this.endpoints.map((e) =>
        includeSecrets ? e.toJson() : e.copyWith({ key: '' }).toJson(),
      ),
      agentConnectors: this.agentConnectors.map((c) => c.toJson(includeSecrets)),
      modelContextOverrides: this.modelContextOverrides,
      modelInputCosts: this.modelInputCosts,
      modelOutputCosts: this.modelOutputCosts,
      modelCacheHitCosts: this.modelCacheHitCosts,
      genSettings: this.genSettings.toJson(),
      voiceSettings: this.voiceSettings.toJson(),
      sessions: this.sessions.map((s) => s.toJson()),
      currentSessionId: this.currentSessionId,
      memories: this.memories.map((m) => m.toJson()),
      tokenUsageData: this.tokenUsageData.map((t) => t.toJson()),
      customCounters: this.customCounters.map((c) => c.toJson()),
      mcpServers: this.mcpServers.map((s) => s.toJson()),
      soundEffectsEnabled: this.soundEffectsEnabled,
      isLiveVideoEnabled: this.isLiveVideoEnabled,
      isLiveFrontCamera: this.isLiveFrontCamera,
      savedAt: this.savedAt ?? Date.now(),
    };
    if (
      includeSecrets &&
      this.cachedPasswordHash != null &&
      this.cachedPasswordHash.length > 0
    ) {
      out.cachedPasswordHash = this.cachedPasswordHash;
    }
    if (this.lastSyncAt != null) out.lastSyncAt = this.lastSyncAt;
    return out;
  }

  encode(includeSecrets = true): string {
    return JSON.stringify(this.toJson(includeSecrets));
  }
}

export { DatabaseSettings };
