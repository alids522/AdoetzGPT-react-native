// App store — port of lib/state/app_state.dart (AdoetzAppState) to Zustand.
// Uses a FACTORY (createAppStore) so tests get fresh non-reactive context per
// instance. Network/AI/live pieces delegate to injectable services with safe
// stubs; real implementations land in Phase 4 (sync/auth), Phase 5 (AI), Phase 7 (live).
import { create } from 'zustand';
import * as Haptics from 'expo-haptics';
import {
  AgentConnector,
  AttachmentData,
  ChatTarget,
  CustomCounter,
  EndpointConfig,
  type EndpointModel,
  GenerationSettings,
  Memory,
  McpServerConfig,
  Message,
  PersistedAppState,
  Session,
  SyncSettings,
  TokenUsageRecord,
  TargetSwitchEvent,
  UserAccount,
  VoiceSettings,
  type AppLanguage,
  type AppView,
} from '../models';
import { countTokens } from '../utils/tokens';
import { cleanTitle } from '../utils/titles';
import { StreamFlushController } from './streamFlush';
import { loadPersistedState, savePersistedState, clearAuthStorage } from './persistence';
import { mergeRemote, newId } from './merge';
import { syncService } from '../services/syncService';
import { aiService } from '../services/aiService';
import type { GeminiLiveService } from '../services/geminiLiveService';
import {
  activeChatTarget as selectActiveChatTarget,
  activeSessions as selectActiveSessions,
  currentSession as selectCurrentSession,
  contextWindowForTarget,
  contextWindowKeyForTarget,
  formatTargetName,
  modelProviderLabel,
} from './selectors';
import type { AppStateView } from './selectors';

// ---------------------------------------------------------------------------
// Injectable service shapes (Phase 4/5/7 fill these in)
// ---------------------------------------------------------------------------
export interface AiSendResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  cacheCreationInputTokens: number;
  endpointName: string;
  isEstimated: boolean;
  generationTimeMs: number | null;
}
export interface AiSendMessageOptions {
  prompt: string;
  attachments: AttachmentData[];
  history: Message[];
  selectedModel: string;
  endpoints: EndpointConfig[];
  endpointModels: EndpointModel[];
  contextLimit: number;
  genSettings: GenerationSettings;
  voiceSettings: VoiceSettings;
  geminiApiKey: string;
  memories: Memory[];
  thinkingMode: boolean;
  artifactMode: boolean;
  syncSettings: SyncSettings;
  generationId: string;
  onStatus: (status: string) => void;
  onText: (text: string) => void;
  mcpService?: McpServiceLike | null;
}
export interface AiServiceLike {
  sendMessage(opts: AiSendMessageOptions): Promise<AiSendResult>;
  cancelGeneration(generationId: string): void;
  generateTitle?(args: {
    messages: Message[];
    selectedModel: string;
    endpoints: EndpointConfig[];
    endpointModels: EndpointModel[];
    geminiApiKey: string;
    syncSettings: SyncSettings;
  }): Promise<string>;
  fetchModels?(args: {
    geminiApiKey: string;
    endpoints: EndpointConfig[];
    syncSettings: SyncSettings;
  }): Promise<{
    geminiModels: string[];
    endpointModels: EndpointModel[];
    warnings: string[];
  }>;
}
export interface AuthResult {
  user: UserAccount;
  token: string;
  remoteState: PersistedAppState | null;
}
export interface SyncServiceLike {
  signUp(username: string, password: string, settings: SyncSettings): Promise<AuthResult>;
  login(username: string, password: string, settings: SyncSettings): Promise<AuthResult>;
  pullRemoteState(token: string, settings: SyncSettings): Promise<PersistedAppState | null>;
  pushRemoteState(
    state: PersistedAppState,
    settings: SyncSettings,
    opts?: { lastSyncAt?: number | null; changedSessionIds?: Iterable<string>; settingsChanged?: boolean },
  ): Promise<void>;
  subscribeSupabase?(
    token: string,
    settings: SyncSettings,
    onRemote: (state: PersistedAppState) => void,
  ): Promise<void>;
  subscribeRemoteChanges?(onRemote: (state: PersistedAppState) => void): Promise<void>;
  unsubscribeRemoteChanges?(): Promise<void>;
}
export interface McpTool {
  name: string;
  description?: string;
  inputSchema: unknown;
}
export interface McpServiceLike {
  connectToServer(config: McpServerConfig): Promise<void>;
  getAllAvailableTools(): Promise<McpTool[]>;
  callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
}
export interface AppStoreServices {
  ai?: AiServiceLike;
  sync?: SyncServiceLike;
  mcp?: McpServiceLike | null;
}

const notConfig = (phase: string) =>
  Promise.reject(new Error(`${phase} not configured yet`));

const stubAi: AiServiceLike = {
  sendMessage: () => notConfig('AiService (Phase 5)'),
  cancelGeneration: () => {},
};
const stubSync: SyncServiceLike = {
  signUp: () => notConfig('SyncService (Phase 4)'),
  login: () => notConfig('SyncService (Phase 4)'),
  pullRemoteState: () => Promise.resolve(null),
  pushRemoteState: () => Promise.resolve(),
};

interface TargetRequestConfig {
  model: string;
  endpoints: EndpointConfig[];
  endpointModels: EndpointModel[];
  contextWindow: number;
  configurationError?: string;
}

// ---------------------------------------------------------------------------
// Store state shape
// ---------------------------------------------------------------------------
export interface AppStoreState {
  initialized: boolean;
  currentUser: UserAccount | null;
  authToken: string;
  syncSettings: SyncSettings;
  language: AppLanguage;
  theme: string;
  visualTheme: string;
  selectedModel: string;
  selectedTargetId: string;
  isThinkingMode: boolean;
  isArtifactMode: boolean;
  soundEffectsEnabled: boolean;
  userName: string;
  geminiApiKey: string;
  endpoints: EndpointConfig[];
  agentConnectors: AgentConnector[];
  genSettings: GenerationSettings;
  voiceSettings: VoiceSettings;
  sessions: Session[];
  currentSessionId: string;
  memories: Memory[];
  tokenUsageData: TokenUsageRecord[];
  customCounters: CustomCounter[];
  modelContextOverrides: Record<string, number>;
  modelInputCosts: Record<string, number>;
  modelOutputCosts: Record<string, number>;
  modelCacheHitCosts: Record<string, number>;
  geminiModels: string[];
  endpointModels: EndpointModel[];
  models: string[];
  mcpServers: McpServerConfig[];
  currentView: AppView;
  generatingSessionIds: string[];
  syncStatus: string;
  liveStatus: string;
  modelFetchStatus: string;
  isFetchingModels: boolean;
  isLiveActive: boolean;
  isLiveConnecting: boolean;
  isLiveRecording: boolean;
  isLiveVideoEnabled: boolean;
  isLiveFrontCamera: boolean;
  liveInputLevel: number;
  liveOutputLevel: number;
  lastSyncAt: number | null;
  cachedPasswordHash: string | null;

  // actions
  initialize: () => Promise<void>;
  buildState: () => PersistedAppState;
  setView: (view: AppView) => void;
  handleSystemBack: () => boolean;
  toggleTheme: () => void;
  setVisualTheme: (value: string) => void;
  toggleThinkingMode: () => void;
  toggleArtifactMode: () => void;
  setArtifactMode: (enabled: boolean) => void;
  setSoundEffectsEnabled: (enabled: boolean) => void;
  updateProfile: (patch: { name?: string; nextLanguage?: AppLanguage }) => void;
  updateGeminiKey: (value: string) => void;
  updateEndpoints: (value: EndpointConfig[]) => void;
  updateGenerationSettings: (value: GenerationSettings) => void;
  updateMemoryEnabled: (value: boolean) => void;
  updateVoiceSettings: (value: VoiceSettings) => void;
  updateSyncSettings: (value: SyncSettings) => void;
  updateCustomCounters: (value: CustomCounter[]) => void;
  resetTokenUsage: () => void;
  fetchModels: () => Promise<void>;

  createSession: (keepTarget?: boolean) => void;
  selectSession: (id: string) => void;
  deleteSession: (id: string) => void;
  pinSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
  clearAllSessions: () => void;
  clearAgentSessions: (connectorId: string) => void;

  updateMemory: (id: string, content: string) => void;
  deleteMemory: (id: string) => void;
  addMemory: (content: string) => void;

  setSelectedModel: (model: string) => void;
  applyChatTarget: (target: ChatTarget, opts?: { fork?: boolean; insertDivider?: boolean }) => void;
  createSessionForTarget: (target: ChatTarget) => void;
  updateContextWindowOverride: (target: ChatTarget, tokens: number | null) => void;
  updateModelCost: (
    model: string,
    inputCost: number | null,
    outputCost: number | null,
    cacheHitCost: number | null,
  ) => void;

  upsertAgentConnector: (connector: AgentConnector) => void;
  deleteAgentConnector: (id: string) => void;
  setConnectorEnabled: (id: string, enabled: boolean) => void;
  setDefaultConnector: (id: string) => void;

  sendMessage: (prompt: string, attachments: AttachmentData[]) => Promise<void>;
  stopGeneration: (sessionId?: string) => void;
  isSessionGenerating: (sessionId: string) => boolean;

  startLiveConversation: () => Promise<void>;
  stopLiveConversation: () => Promise<void>;
  toggleLiveRecording: () => Promise<void>;
  toggleLiveVideo: () => void;
  toggleLiveCameraFacing: () => void;
  sendLiveVideoFrame: (bytes: Uint8Array, mimeType?: string) => void;

  addMcpServer: (config: McpServerConfig) => void;
  toggleMcpServer: (id: string, enabled: boolean) => void;
  removeMcpServer: (id: string) => void;

  authenticate: (username: string, password: string, opts: { signUp: boolean }) => Promise<void>;
  saveGuestSession: (username: string, password: string) => Promise<void>;
  migrateToSupabase: (email: string, password: string, opts: { isSignUp: boolean }) => Promise<void>;
  continueAsGuest: () => void;
  signOut: () => Promise<void>;
}

function nowMs(): number {
  return Date.now();
}
function hhmm(date: Date): string {
  // Dart DateFormat('hh:mm a') — 12-hour clock with AM/PM.
  let h = date.getHours() % 12;
  if (h === 0) h = 12;
  const ampm = date.getHours() < 12 ? 'AM' : 'PM';
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
export function createAppStore(services: AppStoreServices = {}) {
  const ai = services.ai ?? stubAi;
  const sync = services.sync ?? stubSync;
  const mcp = services.mcp ?? null;

  // Live mode (Gemini Live) instance state.
  let liveService: GeminiLiveService | null = null;
  let liveUserMsgId: string | null = null;
  let liveBotMsgId: string | null = null;

  // Non-reactive instance context (mirrors Dart private fields).
  const ctx = {
    savedAt: 0,
    dirtySessions: new Set<string>(),
    dirtySettings: false,
    applyingRemote: false,
    sessionGen: new Map<string, string>(),
    botIds: new Map<string, string>(),
    stop: new Set<string>(),
    remoteTimer: null as ReturnType<typeof setTimeout> | null,
  };

  const haptic = (fn: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    fn();
  };

  const buildStateFrom = (s: AppStoreState): PersistedAppState => {
    const savedAt = ctx.savedAt > 0 ? ctx.savedAt : nowMs();
    const persistedCurrentId = s.sessions.some((session) => session.id === s.currentSessionId)
      ? s.currentSessionId
      : s.sessions.length > 0
        ? s.sessions[0].id
        : s.currentSessionId;
    return new PersistedAppState(
      s.currentUser,
      s.authToken,
      s.syncSettings,
      s.language,
      s.theme,
      s.visualTheme,
      s.selectedModel,
      s.selectedTargetId,
      s.isThinkingMode,
      s.isArtifactMode,
      s.userName,
      s.geminiApiKey,
      s.endpoints,
      s.agentConnectors,
      s.modelContextOverrides,
      s.modelInputCosts,
      s.modelOutputCosts,
      s.modelCacheHitCosts,
      s.genSettings,
      s.voiceSettings,
      s.sessions,
      persistedCurrentId,
      s.memories,
      s.tokenUsageData,
      s.customCounters,
      s.mcpServers,
      s.soundEffectsEnabled,
      s.isLiveVideoEnabled,
      s.isLiveFrontCamera,
      s.cachedPasswordHash,
      s.lastSyncAt,
      savedAt,
    );
  };

  const view = (s: AppStoreState): AppStateView => ({
    selectedModel: s.selectedModel,
    selectedTargetId: s.selectedTargetId,
    sessions: s.sessions,
    currentSessionId: s.currentSessionId,
    agentConnectors: s.agentConnectors,
    endpoints: s.endpoints,
    endpointModels: s.endpointModels,
    models: s.models,
    modelContextOverrides: s.modelContextOverrides,
  });

  // --- helpers that mutate via set/get ---
  const replaceSession = (get: () => AppStoreState, set: any, id: string, next: Session) => {
    if (!ctx.applyingRemote) ctx.dirtySessions.add(id);
    set((s: AppStoreState) => ({ sessions: s.sessions.map((x) => (x.id === id ? next : x)) }));
  };

  const upsertLiveMessage = (
    get: () => AppStoreState,
    set: any,
    sessionId: string,
    msgId: string,
    text: string,
    sender: 'user' | 'bot',
  ) => {
    const s = get();
    const session = s.sessions.find((x) => x.id === sessionId);
    if (!session) return;
    let found = false;
    const messages = session.messages.map((m) => {
      if (m.id !== msgId) return m;
      found = true;
      return m.copyWith({ text });
    });
    if (!found) {
      const target = selectActiveChatTarget(view(s));
      messages.push(
        new Message(
          msgId,
          text,
          sender,
          hhmm(new Date()),
          sender === 'bot' ? target.modelId ?? null : null,
          [],
          null,
          target.id,
          target.type,
          target.displayName,
          target.connectorId,
          target.modelId,
        ),
      );
    }
    replaceSession(get, set, sessionId, session.copyWith({ messages, updatedAt: nowMs() }));
  };

  const updateBotMessage = (
    get: () => AppStoreState,
    set: any,
    sessionId: string,
    botId: string,
    text: string,
    opts: { tokenCount?: number | null; isEstimatedTokenCount?: boolean; generationTimeMs?: number | null } = {},
  ) => {
    const s = get();
    const session = s.sessions.find((x) => x.id === sessionId);
    if (!session) return;
    let found = false;
    const messages = session.messages.map((m) => {
      if (m.id !== botId) return m;
      found = true;
      return m.copyWith({
        text,
        tokenCount: opts.tokenCount,
        isEstimatedTokenCount: opts.isEstimatedTokenCount,
        generationTimeMs: opts.generationTimeMs,
      });
    });
    if (!found && text.trim().length > 0) {
      const target = selectActiveChatTarget(view(s));
      messages.push(
        new Message(
          botId,
          text,
          'bot',
          hhmm(new Date()),
          target.modelId ?? s.selectedModel,
          [],
          opts.tokenCount ?? null,
          target.id,
          target.type,
          target.displayName,
          target.connectorId,
          target.modelId,
          [],
          opts.isEstimatedTokenCount ?? true,
          opts.generationTimeMs ?? null,
        ),
      );
    }
    replaceSession(get, set, sessionId, session.copyWith({ messages }));
  };

  // stream flush — wired via a holder so it can be created before the store
  // exists (it is only invoked at runtime, after the store is built).
  let flushUpdate: (sessionId: string, botId: string, text: string) => void = () => {};
  const flush = new StreamFlushController({
    isActive: (sid, gid) => ctx.sessionGen.get(sid) === gid && !ctx.stop.has(gid),
    updateBotMessage: (sid, bid, text) => flushUpdate(sid, bid, text),
  });

  const persist = async (get: () => AppStoreState, touchSavedAt = true) => {
    if (touchSavedAt) ctx.savedAt = nowMs();
    else if (ctx.savedAt === 0) ctx.savedAt = nowMs();
    await savePersistedState(buildStateFrom(get()));
  };

  const persistAndScheduleRemote = async (
    get: () => AppStoreState,
    set: any,
    sessionIds: Iterable<string> = [],
    settingsChanged = true,
  ) => {
    await persist(get);
    scheduleRemoteSync(get, set, sessionIds, settingsChanged);
  };

  const clearDirty = () => {
    ctx.dirtySessions.clear();
    ctx.dirtySettings = false;
  };

  const scheduleRemoteSync = (
    get: () => AppStoreState,
    set: any,
    sessionIds: Iterable<string> = [],
    settingsChanged = true,
  ) => {
    if (ctx.applyingRemote) return;
    const s = get();
    if (
      !s.currentUser ||
      s.currentUser.isGuest ||
      s.authToken.length === 0 ||
      !s.syncSettings.enabled
    ) {
      return;
    }
    if (settingsChanged) ctx.dirtySettings = true;
    for (const id of sessionIds) if (id.trim().length > 0) ctx.dirtySessions.add(id);
    if (!ctx.dirtySettings && ctx.dirtySessions.size === 0) return;

    if (ctx.remoteTimer) clearTimeout(ctx.remoteTimer);
    ctx.remoteTimer = setTimeout(async () => {
      const changed = new Set(ctx.dirtySessions);
      let pushSettings = ctx.dirtySettings;
      ctx.dirtySessions.clear();
      ctx.dirtySettings = false;
      try {
        set({ syncStatus: 'Syncing to remote...' });
        let stateForPush = buildStateFrom(get());
        if (changed.size > 0) {
          const remote = await sync.pullRemoteState(s.authToken, s.syncSettings).catch(() => null);
          if (remote) {
            // Phase 4 will wire full merge+push; for now just push local state.
            pushSettings = pushSettings || (buildStateFrom(get()).savedAt ?? 0) > (remote.savedAt ?? 0);
            stateForPush = buildStateFrom(get());
          }
        }
        await sync.pushRemoteState(stateForPush, s.syncSettings, {
          lastSyncAt: get().lastSyncAt,
          changedSessionIds: changed,
          settingsChanged: pushSettings,
        });
        set({ lastSyncAt: nowMs(), syncStatus: 'Successfully synced to database.' });
        await persist(get, false);
      } catch {
        set({ syncStatus: 'Sync failed; will retry.' });
      }
    }, 2000);
  };

  const appendTargetHistory = (history: string[], targetId: string): string[] => {
    if (targetId.length === 0) return history;
    const next = history.filter((x) => x.length > 0);
    if (next.length === 0 || next[next.length - 1] !== targetId) next.push(targetId);
    return next.length > 24 ? next.slice(next.length - 24) : next;
  };

  const buildHandoffSummary = (session: Session, previous: ChatTarget, target: ChatTarget): string => {
    if (session.messages.length === 0) return '';
    const recent = session.messages
      .filter((m) => !m.isSystem && m.text.trim().length > 0)
      .slice(-6);
    const summary = recent
      .map((m) => {
        const role = m.isUser ? 'User' : 'Assistant';
        const text = m.text.replace(/\s+/g, ' ').trim();
        return `${role}: ${text.length > 220 ? `${text.substring(0, 220)}...` : text}`;
      })
      .join('\n');
    return [
      `Previous target: ${previous.displayName}`,
      `Next target: ${target.displayName}`,
      summary.length > 0 ? `Recent conversation:\n${summary}` : '',
    ]
      .filter((x) => x.length > 0)
      .join('\n');
  };

  const requestConfigForTarget = (s: AppStoreState, target: ChatTarget): TargetRequestConfig => {
    const base: TargetRequestConfig = {
      model: s.selectedModel,
      endpoints: s.endpoints,
      endpointModels: s.endpointModels,
      contextWindow: contextWindowForTarget(view(s), target),
    };
    if (target.isModel) {
      const model =
        target.modelId && target.modelId.trim().length > 0 ? target.modelId.trim() : s.selectedModel;
      return { ...base, model };
    }
    const connector = s.agentConnectors.find((c) => c.id === target.connectorId);
    if (!connector) {
      return { ...base, model: target.modelId ?? target.displayName, configurationError: 'Agent server is no longer configured.' };
    }
    if (!connector.enabled) {
      return { ...base, model: target.modelId ?? connector.name, configurationError: `${connector.name} is disabled.` };
    }
    if (connector.baseUrl.trim().length === 0) {
      return { ...base, model: target.modelId ?? connector.name, configurationError: `${connector.name} has no Base URL configured.` };
    }
    const endpoint = new EndpointConfig(
      `connector-${connector.id}`,
      connector.baseUrl,
      connector.encryptedApiKey,
      connector.name,
      !connector.capabilities.supportsModelsEndpoint,
      connector.targets.map((t) => t.modelId),
    );
    const model =
      target.modelId && target.modelId.trim().length > 0
        ? target.modelId.trim()
        : connector.targets.length > 0
          ? connector.targets[0].modelId
          : connector.name.toLowerCase().replace(/\s+/g, '-');
    return {
      ...base,
      model,
      endpoints: [...s.endpoints, endpoint],
      endpointModels: [...s.endpointModels, { name: model, endpointId: endpoint.id }],
    };
  };

  const hasRemoteData = (s: PersistedAppState): boolean =>
    s.sessions.length > 0 ||
    s.memories.length > 0 ||
    s.geminiApiKey.length > 0 ||
    s.endpoints.length > 0 ||
    s.tokenUsageData.length > 0;

  let applyRemoteState: (state: PersistedAppState) => void = () => {};
  let startRealtime: () => void = () => {};

  const store = create<AppStoreState>((set, get) => ({
    initialized: false,
    currentUser: null,
    authToken: '',
    syncSettings: new SyncSettings(),
    language: 'id',
    theme: 'dark',
    visualTheme: 'default',
    selectedModel: 'gemini-2.5-flash',
    selectedTargetId: 'model:gemini-2.5-flash',
    isThinkingMode: false,
    isArtifactMode: false,
    soundEffectsEnabled: true,
    userName: 'User',
    geminiApiKey: '',
    endpoints: [new EndpointConfig('1', 'https://api.openai.com/v1', '', 'OpenAI')],
    agentConnectors: [],
    genSettings: new GenerationSettings(),
    voiceSettings: new VoiceSettings(),
    sessions: [Session.empty(undefined, 'model:gemini-2.5-flash')],
    currentSessionId: '',
    memories: [],
    tokenUsageData: [],
    customCounters: [],
    modelContextOverrides: {},
    modelInputCosts: {},
    modelOutputCosts: {},
    modelCacheHitCosts: {},
    geminiModels: [],
    endpointModels: [],
    models: ['gemini-2.5-flash'],
    mcpServers: [],
    currentView: 'chat',
    generatingSessionIds: [],
    syncStatus: '',
    liveStatus: '',
    modelFetchStatus: '',
    isFetchingModels: false,
    isLiveActive: false,
    isLiveConnecting: false,
    isLiveRecording: false,
    isLiveVideoEnabled: false,
    isLiveFrontCamera: false,
    liveInputLevel: 0,
    liveOutputLevel: 0,
    lastSyncAt: null,
    cachedPasswordHash: null,

    initialize: async () => {
      const saved = await loadPersistedState();
      const initial = saved ?? PersistedAppState.defaults();
      // applyState (inline)
      ctx.savedAt = initial.savedAt ?? nowMs();
      set({
        currentUser: initial.currentUser,
        authToken: initial.authToken,
        syncSettings: initial.syncSettings,
        language: initial.language,
        theme: initial.theme,
        visualTheme: initial.visualTheme,
        selectedModel: initial.selectedModel,
        selectedTargetId:
          initial.selectedTargetId.length === 0
            ? `model:${initial.selectedModel}`
            : initial.selectedTargetId,
        isThinkingMode: initial.isThinkingMode,
        isArtifactMode: initial.isArtifactMode,
        soundEffectsEnabled: initial.soundEffectsEnabled,
        isLiveFrontCamera: initial.isLiveFrontCamera,
        cachedPasswordHash: initial.cachedPasswordHash ?? null,
        lastSyncAt: initial.lastSyncAt ?? null,
        userName: initial.userName,
        geminiApiKey: initial.geminiApiKey,
        endpoints: initial.endpoints.length === 0 ? get().endpoints : initial.endpoints,
        agentConnectors: initial.agentConnectors,
        genSettings: initial.genSettings,
        voiceSettings: initial.voiceSettings,
        sessions:
          initial.sessions.length === 0
            ? [Session.empty(undefined, initial.selectedTargetId)]
            : initial.sessions,
        currentSessionId: initial.currentSessionId,
        memories: initial.memories,
        tokenUsageData: initial.tokenUsageData,
        customCounters: initial.customCounters,
        modelContextOverrides: initial.modelContextOverrides,
        modelInputCosts: initial.modelInputCosts,
        modelOutputCosts: initial.modelOutputCosts,
        modelCacheHitCosts: initial.modelCacheHitCosts,
        mcpServers: initial.mcpServers,
      });

      // ensure a valid current session
      const active = selectActiveSessions(view(get()));
      if (active.length === 0) {
        const s = Session.empty(undefined, get().selectedTargetId);
        set({ sessions: [...get().sessions, s], currentSessionId: s.id });
      } else if (!active.some((s) => s.id === get().currentSessionId)) {
        set({ currentSessionId: active[0].id });
      }

      set({ initialized: true });

      void get().fetchModels();
      void persist(get, false);
      // Phase 4: pull remote state if authenticated + sync enabled.
      const initUser = get();
      if (
        initUser.currentUser &&
        !initUser.currentUser.isGuest &&
        initUser.authToken.length > 0 &&
        initUser.syncSettings.enabled
      ) {
        void sync
          .pullRemoteState(initUser.authToken, initUser.syncSettings)
          .then((remote) => {
            if (remote) {
              applyRemoteState(mergeRemote(get().buildState(), remote));
              set({ syncStatus: 'Database sync loaded.' });
            }
          })
          .catch(() => {});
      }
      void startRealtime();
      void (async () => {
        try {
          const { liveForegroundService } = await import('../services/liveForegroundService');
          await liveForegroundService.initialize();
          liveForegroundService.onAction((action) => {
            if (action === 'end_live') void get().stopLiveConversation();
            else if (action === 'toggle_mic') void get().toggleLiveRecording();
          });
        } catch {
          // live foreground service unavailable in this environment
        }
      })();
      if (mcp) {
        for (const server of get().mcpServers) {
          mcp.connectToServer(server).catch(() => {});
        }
      }
    },

    buildState: () => buildStateFrom(get()),

    setView: (currentView) => set({ currentView }),
    handleSystemBack: () => {
      if (get().currentView !== 'chat') {
        set({ currentView: 'chat' });
        return true;
      }
      return false;
    },
    toggleTheme: () =>
      haptic(() => {
        set({ theme: get().theme === 'dark' ? 'light' : 'dark' });
        void persistAndScheduleRemote(get, set);
      }),
    setVisualTheme: (value) => {
      const normalized = (() => {
        const k = value.trim().toLowerCase();
        if (['liquid-glass', 'liquidglass', 'glass'].includes(k)) return 'liquid-glass';
        if (['aurora-neon', 'auroraneon', 'aurora', 'neon'].includes(k)) return 'aurora-neon';
        if (['modern-minimal', 'modernminimal', 'minimal'].includes(k)) return 'modern-minimal';
        if (['ios26', 'vision'].includes(k)) return 'ios26';
        if (['midnight-bloom', 'midnightbloom', 'midnight', 'bloom'].includes(k)) return 'midnight-bloom';
        return 'default';
      })();
      if (get().visualTheme === normalized) return;
      haptic(() => {
        set({ visualTheme: normalized });
        void persistAndScheduleRemote(get, set);
      });
    },
    toggleThinkingMode: () => {
      set({ isThinkingMode: !get().isThinkingMode });
      void persistAndScheduleRemote(get, set);
    },
    toggleArtifactMode: () => {
      set({ isArtifactMode: !get().isArtifactMode });
      void persistAndScheduleRemote(get, set);
    },
    setArtifactMode: (enabled) => {
      if (get().isArtifactMode === enabled) return;
      set({ isArtifactMode: enabled });
      void persistAndScheduleRemote(get, set);
    },
    setSoundEffectsEnabled: (enabled) => {
      if (get().soundEffectsEnabled === enabled) return;
      set({ soundEffectsEnabled: enabled });
      void persistAndScheduleRemote(get, set);
    },
    updateProfile: (patch) => {
      set({ userName: patch.name ?? get().userName, language: patch.nextLanguage ?? get().language });
      void persistAndScheduleRemote(get, set);
    },
    updateGeminiKey: (geminiApiKey) => {
      set({ geminiApiKey });
      void persistAndScheduleRemote(get, set);
    },
    updateEndpoints: (endpoints) => {
      set({ endpoints });
      void persistAndScheduleRemote(get, set);
    },
    updateGenerationSettings: (genSettings) => {
      set({ genSettings });
      void persistAndScheduleRemote(get, set);
    },
    updateMemoryEnabled: (value) => {
      set({ genSettings: get().genSettings.copyWith({ memoryEnabled: value }) });
      void persistAndScheduleRemote(get, set);
    },
    updateVoiceSettings: (voiceSettings) => {
      set({ voiceSettings });
      void persistAndScheduleRemote(get, set);
    },
    updateSyncSettings: (value) => {
      set({ lastSyncAt: null, syncSettings: value });
      void persistAndScheduleRemote(get, set);
    },
    updateCustomCounters: (customCounters) => {
      set({ customCounters });
      void persistAndScheduleRemote(get, set);
    },
    resetTokenUsage: () => {
      set({ tokenUsageData: [] });
      void persistAndScheduleRemote(get, set);
    },

    fetchModels: async () => {
      if (!ai.fetchModels) return;
      set({ isFetchingModels: true, modelFetchStatus: 'Fetching models...' });
      try {
        const s = get();
        const catalog = await ai.fetchModels({
          geminiApiKey: s.geminiApiKey,
          endpoints: s.endpoints,
          syncSettings: s.syncSettings,
        });
        const combined = ['gemini-2.5-flash', ...catalog.geminiModels, ...catalog.endpointModels.map((m) => m.name)];
        set({
          geminiModels: catalog.geminiModels,
          endpointModels: catalog.endpointModels,
          models: Array.from(new Set(combined)),
          isFetchingModels: false,
          modelFetchStatus: '',
        });
      } catch (e) {
        set({ isFetchingModels: false, modelFetchStatus: (e as Error).message });
      }
    },

    createSession: (keepTarget = false) => {
      const s = get();
      const active = selectActiveChatTarget(view(s));
      let targetId = active.id;
      if (targetId.startsWith('agent:') && !keepTarget) {
        targetId = `model:${s.selectedModel}`;
        set({ selectedTargetId: targetId });
      }
      const cur = selectCurrentSession(view(s));
      if (cur.messages.length === 0) {
        if (cur.currentTargetId !== targetId) {
          set({
            sessions: s.sessions.map((x) =>
              x.id === s.currentSessionId
                ? x.copyWith({ currentTargetId: targetId, startedWithTargetId: targetId, lastTargetId: targetId })
                : x,
            ),
          });
          void persistAndScheduleRemote(get, set, [s.currentSessionId], false);
        }
        set({ currentView: 'chat' });
        return;
      }
      const session = Session.empty(undefined, targetId);
      set({ sessions: [session, ...s.sessions], currentSessionId: session.id, currentView: 'chat' });
      void persistAndScheduleRemote(get, set, [session.id], false);
    },

    selectSession: (id) => {
      const s = get();
      const session = s.sessions.find((x) => x.id === id);
      const targetId =
        session && session.lastTargetId.length > 0 ? session.lastTargetId : session?.currentTargetId;
      const patch: Partial<AppStoreState> = { currentSessionId: id, currentView: 'chat' };
      if (targetId && targetId.length > 0) {
        patch.selectedTargetId = targetId;
        if (targetId.startsWith('model:')) patch.selectedModel = targetId.substring(6);
      }
      set(patch);
      void persist(get, false);
    },

    deleteSession: (id) => {
      const s = get();
      const now = nowMs();
      const changed = new Set<string>([id]);
      let sessions = s.sessions.map((x) => (x.id === id ? x.copyWith({ deleted: true, updatedAt: now }) : x));
      let currentSessionId = s.currentSessionId;
      const active = selectActiveSessions({ ...view(s), sessions });
      if (active.length === 0) {
        const fresh = Session.empty(undefined, selectActiveChatTarget(view(s)).id);
        sessions = [...sessions, fresh];
        currentSessionId = fresh.id;
        changed.add(fresh.id);
      } else if (id === currentSessionId) {
        currentSessionId = active[0].id;
      }
      set({ sessions, currentSessionId });
      void persistAndScheduleRemote(get, set, changed, false);
    },

    pinSession: (id) => {
      const s = get();
      set({
        sessions: s.sessions.map((x) =>
          x.id === id ? x.copyWith({ pinned: !x.pinned, updatedAt: nowMs() }) : x,
        ),
      });
      void persistAndScheduleRemote(get, set, [id], false);
    },

    renameSession: (id, title) => {
      const s = get();
      const cleaned = title.trim().length === 0 ? 'New Session' : title.trim();
      set({
        sessions: s.sessions.map((x) => (x.id === id ? x.copyWith({ title: cleaned, updatedAt: nowMs() }) : x)),
      });
      void persistAndScheduleRemote(get, set, [id], false);
    },

    clearAllSessions: () => {
      const s = get();
      const now = nowMs();
      const changed = new Set<string>();
      let sessions = s.sessions.map((x) => {
        if (!x.currentTargetId.startsWith('agent:')) {
          changed.add(x.id);
          return x.copyWith({ deleted: true, updatedAt: now });
        }
        return x;
      });
      let currentSessionId = s.currentSessionId;
      const active = selectActiveSessions({ ...view(s), sessions });
      if (active.length === 0) {
        const fresh = Session.empty(undefined, `model:${s.selectedModel}`);
        sessions = [...sessions, fresh];
        currentSessionId = fresh.id;
        changed.add(fresh.id);
      } else if (sessions.find((x) => x.id === currentSessionId)?.deleted) {
        currentSessionId = active[0].id;
      }
      set({ sessions, currentSessionId, currentView: 'chat' });
      void persistAndScheduleRemote(get, set, changed, false);
    },

    clearAgentSessions: (connectorId) => {
      const s = get();
      const now = nowMs();
      const changed = new Set<string>();
      let sessions = s.sessions.map((x) => {
        if (x.currentTargetId === `agent:${connectorId}`) {
          changed.add(x.id);
          return x.copyWith({ deleted: true, updatedAt: now });
        }
        return x;
      });
      let currentSessionId = s.currentSessionId;
      const active = selectActiveSessions({ ...view(s), sessions });
      if (active.length === 0) {
        const fresh = Session.empty(undefined, `model:${s.selectedModel}`);
        sessions = [...sessions, fresh];
        currentSessionId = fresh.id;
        changed.add(fresh.id);
      } else if (sessions.find((x) => x.id === currentSessionId)?.deleted) {
        currentSessionId = active[0].id;
      }
      set({ sessions, currentSessionId });
      void persistAndScheduleRemote(get, set, changed, false);
    },

    updateMemory: (id, content) => {
      const now = nowMs();
      set({
        memories: get().memories.map((m) =>
          m.id === id ? m.copyWith({ content, updatedAt: now }) : m,
        ),
      });
      void persistAndScheduleRemote(get, set);
    },
    deleteMemory: (id) => {
      const now = nowMs();
      set({
        memories: get().memories.map((m) =>
          m.id === id ? m.copyWith({ deletedAt: now, updatedAt: now }) : m,
        ),
      });
      void persistAndScheduleRemote(get, set);
    },
    addMemory: (content) => {
      const clean = content.trim();
      if (clean.length === 0) return;
      const s = get();
      if (s.memories.some((m) => m.content.trim() === clean)) return;
      const now = nowMs();
      const memory = new Memory(
        `${now}-${s.memories.length}`,
        clean,
        now,
        now,
        null,
        `manual_memory_${now}`,
        'user_defined',
        'global',
      );
      set({ memories: [memory, ...s.memories] });
      void persistAndScheduleRemote(get, set);
    },

    setSelectedModel: (model) => {
      const trimmed = model.trim().length === 0 ? 'gemini-2.5-flash' : model.trim();
      get().applyChatTarget(
        ChatTarget.model(trimmed, modelProviderLabel(trimmed, get().endpoints, get().endpointModels)),
        { insertDivider: false },
      );
    },

    applyChatTarget: (target, opts = {}) => {
      const fork = opts.fork ?? false;
      const insertDivider = opts.insertDivider ?? true;
      const s = get();
      const previous = selectActiveChatTarget(view(s));
      if (previous.id === target.id) return;

      const selectedModel = target.isModel ? (target.modelId ?? target.displayName) : s.selectedModel;
      const now = new Date();
      const session = selectCurrentSession(view(s));
      const shouldInsertDivider =
        insertDivider &&
        session.messages.length > 0 &&
        (previous.type !== 'model' || target.type !== 'model');
      const handoff = buildHandoffSummary(session, previous, target);
      const targetHistory = appendTargetHistory(session.targetHistory, target.id);
      const startedTarget = session.startedWithTargetId.length === 0 ? previous.id : session.startedWithTargetId;

      const basePatch: Partial<AppStoreState> = {
        selectedModel,
        selectedTargetId: target.id,
        currentView: 'chat',
      };

      if (fork) {
        const forked = Session.empty(undefined, target.id).copyWith({
          title: `${session.title} (Branch)`,
          messages: session.messages,
          createdAt: nowMs(),
          updatedAt: nowMs(),
          currentTargetId: target.id,
          startedWithTargetId: target.id,
          lastTargetId: target.id,
          targetHistory,
          handoffSummary: handoff,
        });
        set({ ...basePatch, sessions: [forked, ...s.sessions], currentSessionId: forked.id });
        void persistAndScheduleRemote(get, set, [forked.id], false);
        return;
      }

      const switchEvent = new TargetSwitchEvent(
        newId('switch'),
        session.id,
        previous.id,
        target.id,
        handoff,
        nowMs(),
      );
      const messages: Message[] = [
        ...session.messages,
        ...(shouldInsertDivider
          ? [
              new Message(
                newId('msg'),
                `Switched from ${formatTargetName(previous.displayName)} to ${formatTargetName(target.displayName)}`,
                'system',
                hhmm(now),
                null,
                [],
                null,
                target.id,
                target.type,
                target.displayName,
                target.connectorId,
                target.modelId,
              ),
            ]
          : []),
      ];
      set(basePatch);
      replaceSession(get, set, session.id, session.copyWith({
        messages,
        currentTargetId: target.id,
        startedWithTargetId: startedTarget,
        lastTargetId: target.id,
        targetHistory,
        handoffSummary: handoff,
        targetSwitchEvents: [...session.targetSwitchEvents, switchEvent],
        updatedAt: nowMs(),
      }));
      void persistAndScheduleRemote(get, set);
    },

    createSessionForTarget: (target) => {
      const s = get();
      const selectedModel = target.isModel ? (target.modelId ?? target.displayName) : s.selectedModel;
      set({ selectedModel, selectedTargetId: target.id });
      const cur = selectCurrentSession(view(get()));
      if (cur.messages.length === 0) {
        if (cur.currentTargetId !== target.id) {
          set({
            sessions: get().sessions.map((x) =>
              x.id === s.currentSessionId
                ? x.copyWith({ currentTargetId: target.id, startedWithTargetId: target.id, lastTargetId: target.id })
                : x,
            ),
          });
          void persistAndScheduleRemote(get, set, [s.currentSessionId], false);
        }
        set({ currentView: 'chat' });
        return;
      }
      const session = Session.empty(undefined, target.id);
      set({ sessions: [session, ...get().sessions], currentSessionId: session.id, currentView: 'chat' });
      void persistAndScheduleRemote(get, set, [session.id], false);
    },

    updateContextWindowOverride: (target, tokens) => {
      const key = contextWindowKeyForTarget(target);
      const next = { ...get().modelContextOverrides };
      if (tokens == null || tokens <= 0) {
        delete next[key];
      } else {
        next[key] = Math.max(1024, Math.min(8000000, Math.round(tokens)));
      }
      set({ modelContextOverrides: next });
      void persistAndScheduleRemote(get, set);
    },

    updateModelCost: (model, inputCost, outputCost, cacheHitCost) => {
      const setCost = (map: Record<string, number>, model: string, cost: number | null) => {
        const next = { ...map };
        if (cost == null || cost < 0) delete next[model];
        else next[model] = cost;
        return next;
      };
      set({
        modelInputCosts: setCost(get().modelInputCosts, model, inputCost),
        modelOutputCosts: setCost(get().modelOutputCosts, model, outputCost),
        modelCacheHitCosts: setCost(get().modelCacheHitCosts, model, cacheHitCost),
      });
      void persistAndScheduleRemote(get, set);
    },

    upsertAgentConnector: (connector) => {
      const now = nowMs();
      const next = connector.copyWith({ updatedAt: now });
      const s = get();
      const exists = s.agentConnectors.some((c) => c.id === connector.id);
      let agentConnectors = exists
        ? s.agentConnectors.map((c) => (c.id === connector.id ? next : c))
        : [next, ...s.agentConnectors];
      if (next.isDefault) {
        agentConnectors = agentConnectors.map((c) => (c.id === next.id ? c : c.copyWith({ isDefault: false })));
      }
      set({ agentConnectors });
      void persistAndScheduleRemote(get, set);
    },
    deleteAgentConnector: (id) => {
      const s = get();
      const selectedTargetId = s.selectedTargetId === `agent:${id}` ? `model:${s.selectedModel}` : s.selectedTargetId;
      set({ agentConnectors: s.agentConnectors.filter((c) => c.id !== id), selectedTargetId });
      void persistAndScheduleRemote(get, set);
    },
    setConnectorEnabled: (id, enabled) => {
      set({
        agentConnectors: get().agentConnectors.map((c) =>
          c.id === id ? c.copyWith({ enabled, updatedAt: nowMs() }) : c,
        ),
      });
      void persistAndScheduleRemote(get, set);
    },
    setDefaultConnector: (id) => {
      set({
        agentConnectors: get().agentConnectors.map((c) => c.copyWith({ isDefault: c.id === id })),
      });
      void persistAndScheduleRemote(get, set);
    },

    sendMessage: async (prompt, attachments) => {
      const s = get();
      const session = selectCurrentSession(view(s));
      if (
        get().generatingSessionIds.includes(session.id) ||
        (prompt.trim().length === 0 && attachments.length === 0)
      ) {
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      const target = selectActiveChatTarget(view(s));
      const request = requestConfigForTarget(s, target);
      const handoff = session.handoffSummary.trim();
      const requestPrompt =
        handoff.length === 0 || target.isAgentServer
          ? prompt.trim()
          : `[Target handoff summary]\n${handoff}\n[End handoff summary]\n\n${prompt.trim()}`;
      const now = new Date();
      const history = session.messages.filter((m) => !m.isSystem);
      const userMessageId = newId('msg');
      const botId = newId('msg');
      const modelForRequest = request.model;
      const generationId = newId('gen');

      flush.cancel(generationId, true);
      ctx.stop.delete(generationId);

      const userMessage = new Message(
        userMessageId,
        prompt.trim(),
        'user',
        hhmm(now),
        null,
        attachments,
        countTokens(prompt),
      );
      const botMessage = new Message(
        botId,
        '',
        'bot',
        hhmm(now),
        modelForRequest,
        [],
        null,
        target.id,
        target.type,
        target.displayName,
        target.connectorId,
        target.modelId,
      );
      const isFirstMessage = history.length === 0;
      const fallbackTitle = cleanTitle(prompt.split(/\s+/).slice(0, 4).join(' '));
      const nextSession = session.copyWith({
        title: isFirstMessage && fallbackTitle.length > 0 ? fallbackTitle : session.title,
        messages: [...session.messages, userMessage, botMessage],
        currentTargetId: target.id,
        startedWithTargetId: session.startedWithTargetId.length === 0 ? target.id : session.startedWithTargetId,
        lastTargetId: target.id,
        targetHistory: appendTargetHistory(session.targetHistory, target.id),
        updatedAt: nowMs(),
      });
      replaceSession(get, set, session.id, nextSession);
      set({
        generatingSessionIds: [...get().generatingSessionIds, session.id],
        syncStatus: '',
      });
      ctx.sessionGen.set(session.id, generationId);
      ctx.botIds.set(generationId, botId);

      try {
        if (request.configurationError) throw new Error(request.configurationError);
        const response = await ai.sendMessage({
          prompt: requestPrompt,
          attachments,
          history,
          selectedModel: modelForRequest,
          endpoints: request.endpoints,
          endpointModels: request.endpointModels,
          contextLimit: request.contextWindow,
          genSettings: get().genSettings,
          voiceSettings: get().voiceSettings,
          geminiApiKey: get().geminiApiKey,
          memories: get().genSettings.memoryEnabled ? get().memories : [],
          thinkingMode: get().isThinkingMode,
          artifactMode: get().isArtifactMode,
          syncSettings: get().syncSettings,
          generationId,
          mcpService: mcp,
          onStatus: (status) => flush.queue(generationId, session.id, botId, status),
          onText: (text) => flush.queue(generationId, session.id, botId, text),
        });

        if (ctx.sessionGen.get(session.id) !== generationId || ctx.stop.has(generationId)) return;
        flush.queue(generationId, session.id, botId, response.text);
        flush.flush(generationId, session.id, botId, true);
        updateBotMessage(get, set, session.id, botId, response.text, {
          tokenCount: response.outputTokens,
          isEstimatedTokenCount: response.isEstimated,
          generationTimeMs: response.generationTimeMs,
        });
        set({
          tokenUsageData: [
            ...get().tokenUsageData,
            new TokenUsageRecord(
              nowMs(),
              modelForRequest,
              response.endpointName,
              response.inputTokens,
              response.outputTokens,
              response.inputTokens + response.outputTokens,
              response.cachedInputTokens,
              response.cacheCreationInputTokens,
              session.id,
              response.isEstimated,
            ),
          ],
        });

        if (isFirstMessage && !ctx.stop.has(generationId) && ai.generateTitle) {
          const titleModel =
            get().genSettings.titleModelEnabled && get().genSettings.titleModel.trim().length > 0
              ? get().genSettings.titleModel.trim()
              : target.isModel
                ? modelForRequest
                : get().selectedModel;
          const msgs = get().sessions.find((x) => x.id === session.id)?.messages ?? [];
          void ai
            .generateTitle({
              messages: msgs,
              selectedModel: titleModel,
              endpoints: get().endpoints,
              endpointModels: get().endpointModels,
              geminiApiKey: get().geminiApiKey,
              syncSettings: get().syncSettings,
            })
            .then((title) => {
              if (title && title.length > 0 && !ctx.stop.has(generationId)) {
                get().renameSession(session.id, title);
              }
            })
            .catch(() => {});
        }
      } catch (error) {
        if (ctx.sessionGen.get(session.id) !== generationId || ctx.stop.has(generationId)) return;
        const msg = (error as Error).message.replace(/^Exception:\s*/, '');
        updateBotMessage(get, set, session.id, botId, `Error: ${msg}`);
      } finally {
        if (ctx.sessionGen.get(session.id) === generationId) {
          flush.cancel(generationId, true);
          ctx.sessionGen.delete(session.id);
          ctx.botIds.delete(generationId);
          set({
            generatingSessionIds: get().generatingSessionIds.filter((id) => id !== session.id),
          });
          void persistAndScheduleRemote(get, set);
        }
      }
    },

    stopGeneration: (sessionId) => {
      const sid = sessionId ?? selectCurrentSession(view(get())).id;
      const generationId = ctx.sessionGen.get(sid);
      if (generationId) {
        const botId = ctx.botIds.get(generationId);
        if (botId) flush.flush(generationId, sid, botId, true);
        ctx.stop.add(generationId);
        flush.cancel(generationId, true);
        ctx.sessionGen.delete(sid);
        ctx.botIds.delete(generationId);
        ai.cancelGeneration(generationId);
        set({ generatingSessionIds: get().generatingSessionIds.filter((id) => id !== sid) });
      }
      void persistAndScheduleRemote(get, set);
    },

    isSessionGenerating: (sessionId) => get().generatingSessionIds.includes(sessionId),

    startLiveConversation: async () => {
      const s = get();
      if (liveService || s.isLiveActive || s.isLiveConnecting) return;
      set({ isLiveConnecting: true });
      const [{ GeminiLiveService: GLS }, { liveAudioPlayer }, { liveAudioRecorder }, { liveForegroundService }] =
        await Promise.all([
          import('../services/geminiLiveService'),
          import('../services/liveAudioPlayer'),
          import('../services/liveAudioRecorder'),
          import('../services/liveForegroundService'),
        ]);
      await liveForegroundService.start().catch(() => {});
      const session = selectCurrentSession(view(s));
      const userMsgId = newId('msg');
      const botMsgId = newId('msg');
      liveUserMsgId = userMsgId;
      liveBotMsgId = botMsgId;
      liveService = new GLS({
        apiKey: s.geminiApiKey,
        model: s.voiceSettings.liveModel || s.selectedModel,
        voiceSettings: s.voiceSettings,
        history: session.messages.filter((m) => !m.isSystem),
        memories: s.memories.filter((m) => m.deletedAt == null),
        thinkingMode: s.isThinkingMode,
        userName: s.userName,
        player: liveAudioPlayer,
        recorder: liveAudioRecorder,
        callbacks: {
          onStatus: (status) => set({ liveStatus: status }),
          onInputTranscript: (text) => upsertLiveMessage(get, set, session.id, userMsgId, text, 'user'),
          onOutputTranscript: (text) => upsertLiveMessage(get, set, session.id, botMsgId, text, 'bot'),
          onLevel: (level) => set({ liveInputLevel: level }),
          onOutputLevel: (level) => set({ liveOutputLevel: level }),
          onRecordingChanged: (recording) => set({ isLiveRecording: recording }),
          onTurnComplete: () => {},
          onError: (e) => {
            set({ liveStatus: (e as Error).message });
            void get().stopLiveConversation();
          },
          onClosed: () => set({ isLiveActive: false, isLiveConnecting: false }),
        },
      });
      try {
        await liveService.start();
        set({ isLiveActive: true, isLiveConnecting: false, currentView: 'chat' });
      } catch (e) {
        set({ isLiveConnecting: false, isLiveActive: false, liveStatus: (e as Error).message });
        liveService = null;
        await liveForegroundService.stop().catch(() => {});
      }
    },

    stopLiveConversation: async () => {
      await liveService?.stop().catch(() => {});
      liveService = null;
      liveUserMsgId = null;
      liveBotMsgId = null;
      set({ isLiveActive: false, isLiveConnecting: false, isLiveRecording: false, liveStatus: '' });
      const { liveForegroundService } = await import('../services/liveForegroundService');
      await liveForegroundService.stop().catch(() => {});
    },

    toggleLiveRecording: async () => {
      await liveService?.toggleRecording().catch(() => {});
    },

    toggleLiveVideo: () => set({ isLiveVideoEnabled: !get().isLiveVideoEnabled }),

    toggleLiveCameraFacing: () => set({ isLiveFrontCamera: !get().isLiveFrontCamera }),

    sendLiveVideoFrame: (bytes, mimeType) => liveService?.sendVideoFrame(bytes, mimeType),

    addMcpServer: (config) => {
      set({ mcpServers: [...get().mcpServers, config] });
      void persistAndScheduleRemote(get, set);
      if (mcp) mcp.connectToServer(config).catch(() => {});
    },
    toggleMcpServer: (id, enabled) => {
      set({ mcpServers: get().mcpServers.map((s2) => (s2.id === id ? s2.copyWith({ enabled }) : s2)) });
      void persistAndScheduleRemote(get, set);
    },
    removeMcpServer: (id) => {
      set({ mcpServers: get().mcpServers.filter((s2) => s2.id !== id) });
      void persistAndScheduleRemote(get, set);
    },

    authenticate: async (username, password, opts) => {
      const signUp = opts.signUp;
      set({ syncStatus: signUp ? 'Creating account...' : 'Signing in...' });
      const baseSettings = get().syncSettings.copyWith({ enabled: true });
      const result = signUp
        ? await sync.signUp(username, password, baseSettings)
        : await sync.login(username, password, baseSettings);
      const nextSync = (result.remoteState?.syncSettings ?? baseSettings).copyWith({
        enabled: true,
        useSupabase: baseSettings.useSupabase,
        database: baseSettings.database,
        apiBaseUrl: baseSettings.apiBaseUrl,
        supabaseUrl: baseSettings.supabaseUrl,
        supabaseAnonKey: baseSettings.supabaseAnonKey,
      });
      if (!signUp && result.remoteState && hasRemoteData(result.remoteState)) {
        const mergedJson = result.remoteState.toJson(true);
        mergedJson.currentUser = result.user.toJson();
        mergedJson.authToken = result.token;
        mergedJson.syncSettings = nextSync.toJson();
        applyRemoteState(PersistedAppState.fromJson(mergedJson));
        clearDirty();
        set({ lastSyncAt: nowMs() });
      } else {
        set({
          currentUser: result.user,
          authToken: result.token,
          userName: result.user.label,
          syncSettings: nextSync,
        });
        await sync
          .pushRemoteState(get().buildState(), nextSync, { lastSyncAt: get().lastSyncAt })
          .catch(() => {});
        clearDirty();
        set({ lastSyncAt: nowMs() });
      }
      void startRealtime();
      set({
        syncStatus: signUp
          ? 'Account created. Local data synced to workspace.'
          : 'Signed in. Local data synced to workspace.',
      });
      await persist(get);
    },

    saveGuestSession: async (username, password) => {
      if (get().currentUser?.isGuest !== true) return;
      set({ syncStatus: 'Creating account and saving guest session...' });
      const baseSettings = get().syncSettings.copyWith({ enabled: true });
      const result = await sync.signUp(username, password, baseSettings);
      set({
        currentUser: result.user,
        authToken: result.token,
        userName: result.user.label,
        syncSettings: baseSettings.copyWith({ enabled: true }),
      });
      await sync
        .pushRemoteState(get().buildState(), get().syncSettings, { lastSyncAt: get().lastSyncAt })
        .catch(() => {});
      clearDirty();
      set({ lastSyncAt: nowMs() });
      void startRealtime();
      set({ syncStatus: 'Guest session saved and synced to database.' });
      await persist(get);
    },

    migrateToSupabase: async (email, password, opts) => {
      set({
        syncStatus: opts.isSignUp ? 'Creating Supabase account...' : 'Signing in to Supabase...',
      });
      const baseSettings = get().syncSettings.copyWith({ enabled: true, useSupabase: true });
      try {
        const result = opts.isSignUp
          ? await sync.signUp(email, password, baseSettings)
          : await sync.login(email, password, baseSettings);
        set({
          currentUser: result.user,
          authToken: result.token,
          userName: result.user.label,
          syncSettings: baseSettings,
        });
        await sync
          .pushRemoteState(get().buildState(), get().syncSettings, { lastSyncAt: get().lastSyncAt })
          .catch(() => {});
        clearDirty();
        set({ lastSyncAt: nowMs() });
        void startRealtime();
        set({ syncStatus: 'Successfully migrated to Supabase.' });
      } catch (e) {
        set({ syncStatus: (e as Error).message.replace(/^Exception:\s*/, '') });
      }
      await persist(get);
    },

    continueAsGuest: () => {
      const guest = new UserAccount(`guest-${nowMs()}`, 'guest', null, 'Guest', true);
      set({
        currentUser: guest,
        authToken: '',
        userName: 'Guest',
        syncSettings: get().syncSettings.copyWith({ enabled: false }),
        syncStatus: 'Guest mode. Local sessions are saved on this device.',
      });
      clearDirty();
      void persist(get);
    },

    signOut: async () => {
      if (ctx.remoteTimer) {
        clearTimeout(ctx.remoteTimer);
        ctx.remoteTimer = null;
      }
      clearDirty();
      await sync.unsubscribeRemoteChanges?.().catch(() => {});
      const defaults = PersistedAppState.defaults();
      set({
        currentUser: null,
        authToken: '',
        userName: 'User',
        currentView: 'chat',
        syncStatus: '',
        sessions: defaults.sessions,
        currentSessionId: defaults.currentSessionId,
        memories: defaults.memories,
        geminiApiKey: defaults.geminiApiKey,
        endpoints: defaults.endpoints,
        tokenUsageData: defaults.tokenUsageData,
        customCounters: defaults.customCounters,
        agentConnectors: defaults.agentConnectors,
        modelContextOverrides: defaults.modelContextOverrides,
        syncSettings: defaults.syncSettings,
        genSettings: defaults.genSettings,
        voiceSettings: defaults.voiceSettings,
        language: defaults.language,
        theme: defaults.theme,
        visualTheme: defaults.visualTheme,
        selectedModel: defaults.selectedModel,
        selectedTargetId: defaults.selectedTargetId,
        isThinkingMode: defaults.isThinkingMode,
        isArtifactMode: defaults.isArtifactMode,
        soundEffectsEnabled: defaults.soundEffectsEnabled,
        isLiveVideoEnabled: defaults.isLiveVideoEnabled,
        isLiveFrontCamera: defaults.isLiveFrontCamera,
        modelInputCosts: defaults.modelInputCosts,
        modelOutputCosts: defaults.modelOutputCosts,
        modelCacheHitCosts: defaults.modelCacheHitCosts,
        cachedPasswordHash: null,
        lastSyncAt: null,
      });
      await clearAuthStorage();
      void persist(get);
    },
  }));

  // Wire the flush controller's writer to the now-created store.
  flushUpdate = (sessionId, botId, text) =>
    updateBotMessage(store.getState, store.setState as any, sessionId, botId, text);

  applyRemoteState = (state) => {
    ctx.applyingRemote = true;
    ctx.savedAt = state.savedAt ?? nowMs();
    const cur = store.getState();
    store.setState({
      currentUser: state.currentUser,
      authToken: state.authToken,
      syncSettings: state.syncSettings,
      language: state.language,
      theme: state.theme,
      visualTheme: state.visualTheme,
      selectedModel: state.selectedModel,
      selectedTargetId:
        state.selectedTargetId.length === 0 ? `model:${state.selectedModel}` : state.selectedTargetId,
      isThinkingMode: state.isThinkingMode,
      isArtifactMode: state.isArtifactMode,
      soundEffectsEnabled: state.soundEffectsEnabled,
      isLiveFrontCamera: state.isLiveFrontCamera,
      userName: state.userName,
      geminiApiKey: state.geminiApiKey,
      endpoints: state.endpoints.length === 0 ? cur.endpoints : state.endpoints,
      agentConnectors: state.agentConnectors,
      genSettings: state.genSettings,
      voiceSettings: state.voiceSettings,
      sessions:
        state.sessions.length === 0
          ? [Session.empty(undefined, state.selectedTargetId)]
          : state.sessions,
      currentSessionId: state.currentSessionId,
      memories: state.memories,
      tokenUsageData: state.tokenUsageData,
      customCounters: state.customCounters,
      modelContextOverrides: state.modelContextOverrides,
      mcpServers: state.mcpServers,
      lastSyncAt: state.lastSyncAt ?? cur.lastSyncAt,
    });
    ctx.applyingRemote = false;
  };

  startRealtime = () => {
    const s = store.getState();
    if (
      sync.subscribeSupabase &&
      s.currentUser &&
      !s.currentUser.isGuest &&
      s.authToken.length > 0 &&
      s.syncSettings.enabled &&
      s.syncSettings.useSupabase
    ) {
      void sync.subscribeSupabase(s.authToken, s.syncSettings, (remote) => {
        applyRemoteState(mergeRemote(store.getState().buildState(), remote));
      });
    } else {
      void sync.unsubscribeRemoteChanges?.();
    }
  };

  return store;
}

// Default singleton used by the app (real sync + ai services injected).
export const useAppStore = createAppStore({ sync: syncService, ai: aiService });
export type AppStore = ReturnType<typeof createAppStore>;
