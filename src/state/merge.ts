// Sync merge logic — VERBATIM port of the private merge methods in
// lib/state/app_state.dart (_mergeRemote, _mergeSession, _mergeSessionMessages,
// _isSameLogicalMessage, _preferredLogicalMessage, _mergeStringList,
// _mergeTargetSwitchEvents, _mergeEndpointConfigs, _mergeAgentConnectors,
// _mergeConnectorTargets, merge-key helpers, _resolveCurrentSessionId,
// _localSessionIdsToPush). These are pure functions so they can be unit-tested.
//
// One faithful adaptation: Dart's _mergeRemote mutates `this.currentSessionId`
// when it forks a session. Here we track an effective local id and return the
// resolved id as part of the merged PersistedAppState, keeping the function pure.

import { v4 as uuidv4 } from 'uuid';
import {
  AgentConnector,
  ConnectorTarget,
  EndpointConfig,
  Memory,
  Message,
  PersistedAppState,
  Session,
  TargetSwitchEvent,
} from '../models';

export function newId(prefix: string): string {
  return `${prefix}-${uuidv4()}`;
}

/** Order-preserving dedupe (Dart LinkedHashSetString). */
export function linkedUnique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (value.trim().length > 0 && !seen.has(value)) {
      seen.add(value);
      out.push(value);
    }
  }
  return out;
}

export function mergeStringList(primary: string[], secondary: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of [...primary, ...secondary]) {
    if (value.trim().length > 0 && !seen.has(value)) {
      seen.add(value);
      out.push(value);
    }
  }
  return out;
}

export function mergeTargetSwitchEvents(
  primary: TargetSwitchEvent[],
  secondary: TargetSwitchEvent[],
): TargetSwitchEvent[] {
  const byId = new Map<string, TargetSwitchEvent>();
  for (const event of secondary) byId.set(event.id, event);
  for (const event of primary) byId.set(event.id, event);
  const seen = new Set<string>();
  const out: TargetSwitchEvent[] = [];
  for (const event of [...primary, ...secondary]) {
    if (!seen.has(event.id)) {
      seen.add(event.id);
      out.push(byId.get(event.id)!);
    }
  }
  return out;
}

function isSameLogicalMessage(a: Message, b: Message): boolean {
  if (a.id !== b.id || a.sender !== b.sender) return false;
  if (a.isUser || a.isSystem) return a.text === b.text;
  if (a.text.length === 0 || b.text.length === 0) return true;
  return a.text.includes(b.text) || b.text.includes(a.text);
}

function preferredLogicalMessage(
  current: Message,
  incoming: Message,
  preferIncoming: boolean,
): Message {
  if (incoming.text.length > current.text.length) return incoming;
  if (current.text.length === 0 && incoming.text.length > 0) return incoming;
  if (incoming.tokenCount != null && current.tokenCount == null) return incoming;
  return preferIncoming ? incoming : current;
}

function copyMessageWithId(message: Message, id: string): Message {
  return new Message(
    id,
    message.text,
    message.sender,
    message.timestamp,
    message.model,
    message.attachments,
    message.tokenCount,
    message.targetId,
    message.targetType,
    message.targetName,
    message.connectorId,
    message.modelOrAgentId,
    message.toolEventIds,
    message.isEstimatedTokenCount,
    message.generationTimeMs,
  );
}

export function mergeSessionMessages(primary: Session, secondary: Session): Message[] {
  const merged: Message[] = [];
  const indexById = new Map<string, number>();

  const addMessage = (message: Message, preferIncoming: boolean) => {
    const existingIndex = indexById.get(message.id);
    if (existingIndex === undefined) {
      indexById.set(message.id, merged.length);
      merged.push(message);
      return;
    }
    const existing = merged[existingIndex];
    if (isSameLogicalMessage(existing, message)) {
      merged[existingIndex] = preferredLogicalMessage(existing, message, preferIncoming);
      return;
    }
    const withNewId = copyMessageWithId(message, newId('msg'));
    indexById.set(withNewId.id, merged.length);
    merged.push(withNewId);
  };

  for (const message of primary.messages) addMessage(message, true);
  for (const message of secondary.messages) addMessage(message, false);
  return merged;
}

export function mergeSession(local: Session, remote: Session): Session {
  const remoteWins = remote.updatedAt >= local.updatedAt;
  const primary = remoteWins ? remote : local;
  const secondary = remoteWins ? local : remote;
  const messages = mergeSessionMessages(primary, secondary);
  return primary.copyWith({
    title: primary.title.trim().length > 0 ? primary.title : secondary.title,
    messages,
    createdAt: Math.min(local.createdAt, remote.createdAt),
    updatedAt: Math.max(local.updatedAt, remote.updatedAt),
    pinned: primary.pinned || secondary.pinned,
    targetHistory: mergeStringList(primary.targetHistory, secondary.targetHistory),
    targetSwitchEvents: mergeTargetSwitchEvents(
      primary.targetSwitchEvents,
      secondary.targetSwitchEvents,
    ),
  });
}

function endpointMergeKey(endpoint: EndpointConfig): string {
  if (endpoint.id.trim().length > 0) return `id:${endpoint.id.trim()}`;
  const name = endpoint.name.trim().toLowerCase();
  const url = endpoint.url.trim().toLowerCase();
  return `endpoint:${name}|${url}`;
}

function mergeEndpointConfig(
  local: EndpointConfig,
  remote: EndpointConfig,
  preferRemote: boolean,
): EndpointConfig {
  const primary = preferRemote ? remote : local;
  const fallback = preferRemote ? local : remote;
  const models = linkedUnique(
    preferRemote ? [...remote.models, ...local.models] : [...local.models, ...remote.models],
  );
  return new EndpointConfig(
    primary.id.length > 0 ? primary.id : fallback.id,
    primary.url.length > 0 ? primary.url : fallback.url,
    primary.key.length > 0 ? primary.key : fallback.key,
    primary.name.length > 0 ? primary.name : fallback.name,
    primary.skipModelFetch,
    models,
  );
}

export function mergeEndpointConfigs(
  local: EndpointConfig[],
  remote: EndpointConfig[],
  preferRemote: boolean,
): EndpointConfig[] {
  const merged = new Map<string, EndpointConfig>();
  for (const endpoint of local) merged.set(endpointMergeKey(endpoint), endpoint);
  for (const endpoint of remote) {
    const key = endpointMergeKey(endpoint);
    const existing = merged.get(key);
    if (existing === undefined) {
      merged.set(key, endpoint);
    } else {
      merged.set(key, mergeEndpointConfig(existing, endpoint, preferRemote));
    }
  }
  return Array.from(merged.values());
}

function agentConnectorMergeKey(connector: AgentConnector): string {
  if (connector.id.trim().length > 0) return `id:${connector.id.trim()}`;
  const name = connector.name.trim().toLowerCase();
  const url = connector.baseUrl.trim().toLowerCase();
  return `agent:${name}|${url}`;
}

function connectorTargetMergeKey(target: ConnectorTarget): string {
  if (target.id.trim().length > 0) return `id:${target.id.trim()}`;
  return `target:${target.connectorId}|${target.modelId}`;
}

export function mergeConnectorTargets(
  local: ConnectorTarget[],
  remote: ConnectorTarget[],
  preferRemote: boolean,
): ConnectorTarget[] {
  const merged = new Map<string, ConnectorTarget>();
  for (const target of local) merged.set(connectorTargetMergeKey(target), target);
  for (const target of remote) {
    const key = connectorTargetMergeKey(target);
    const existing = merged.get(key);
    if (existing === undefined) {
      merged.set(key, target);
    } else {
      const remoteWins =
        target.updatedAt > existing.updatedAt ||
        (target.updatedAt === existing.updatedAt && preferRemote);
      merged.set(key, remoteWins ? target : existing);
    }
  }
  return Array.from(merged.values());
}

export function mergeAgentConnectors(
  local: AgentConnector[],
  remote: AgentConnector[],
  preferRemote: boolean,
): AgentConnector[] {
  const merged = new Map<string, AgentConnector>();
  for (const connector of local) merged.set(agentConnectorMergeKey(connector), connector);
  for (const connector of remote) {
    const key = agentConnectorMergeKey(connector);
    const existing = merged.get(key);
    if (existing === undefined) {
      merged.set(key, connector);
    } else {
      const remoteWins =
        connector.updatedAt > existing.updatedAt ||
        (connector.updatedAt === existing.updatedAt && preferRemote);
      merged.set(
        key,
        remoteWins
          ? connector.copyWith({
              targets: mergeConnectorTargets(existing.targets, connector.targets, true),
            })
          : existing.copyWith({
              targets: mergeConnectorTargets(existing.targets, connector.targets, false),
            }),
      );
    }
  }
  return Array.from(merged.values());
}

export function resolveCurrentSessionId(
  localId: string,
  remoteId: string,
  mergedSessions: Session[],
): string {
  const activeIds = new Set(
    mergedSessions.filter((s) => !s.deleted).map((s) => s.id),
  );
  if (activeIds.has(localId)) return localId;
  if (activeIds.has(remoteId)) return remoteId;
  return mergedSessions.length > 0 ? mergedSessions[0].id : localId;
}

export function localSessionIdsToPush(
  local: PersistedAppState,
  remote: PersistedAppState | null,
): Set<string> {
  if (remote === null) {
    return new Set(local.sessions.map((s) => s.id));
  }
  const remoteSessions = new Map(remote.sessions.map((s) => [s.id, s]));
  return new Set(
    local.sessions
      .filter((session) => {
        const remoteSession = remoteSessions.get(session.id);
        if (remoteSession === undefined) return true;
        if (session.updatedAt > remoteSession.updatedAt) return true;
        const remoteMessageIds = new Set(remoteSession.messages.map((m) => m.id));
        return session.messages.some((message) => !remoteMessageIds.has(message.id));
      })
      .map((s) => s.id),
  );
}

function memoryKey(memory: Memory): string {
  return memory.key.length > 0 ? `semantic_${memory.key}` : `id_${memory.id}`;
}

/**
 * Merge local + remote persisted states. Returns a new PersistedAppState with
 * the resolved `currentSessionId` (including fork remapping). Pure.
 */
export function mergeRemote(local: PersistedAppState, remote: PersistedAppState): PersistedAppState {
  const sessionMap = new Map<string, Session>(
    local.sessions.map((s) => [s.id, s]),
  );
  let effectiveLocalCurrentId = local.currentSessionId;

  for (const session of remote.sessions) {
    const existing = sessionMap.get(session.id);
    if (existing === undefined) {
      sessionMap.set(session.id, session);
    } else {
      const existingMessageIds = new Set(existing.messages.map((m) => m.id));
      const remoteMessageIds = new Set(session.messages.map((m) => m.id));
      const localAddedMessages = existing.messages.some((m) => !remoteMessageIds.has(m.id));
      const remoteAddedMessages = session.messages.some((m) => !existingMessageIds.has(m.id));

      if (localAddedMessages && remoteAddedMessages) {
        const forkedId = newId('session');
        const forkedLocal = existing.copyWith({
          id: forkedId,
          title: `${existing.title} (Device Copy)`,
        });
        sessionMap.set(session.id, session);
        sessionMap.set(forkedId, forkedLocal);
        if (local.currentSessionId === session.id) {
          effectiveLocalCurrentId = forkedId;
        }
      } else {
        sessionMap.set(session.id, mergeSession(existing, session));
      }
    }
  }

  const mergedSessions = Array.from(sessionMap.values()).sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );

  const memoryMap = new Map<string, Memory>();
  for (const memory of local.memories) memoryMap.set(memoryKey(memory), memory);
  for (const memory of remote.memories) {
    const mKey = memoryKey(memory);
    const existing = memoryMap.get(mKey);
    if (existing === undefined) {
      memoryMap.set(mKey, memory);
    } else {
      const existingUpdated = existing.updatedAt ?? existing.timestamp;
      const remoteUpdated = memory.updatedAt ?? memory.timestamp;
      if (remoteUpdated >= existingUpdated) memoryMap.set(mKey, memory);
    }
  }
  const mergedMemories = Array.from(memoryMap.values()).sort(
    (a, b) => (b.updatedAt ?? b.timestamp) - (a.updatedAt ?? a.timestamp),
  );

  const usageSeen = new Set<string>();
  const mergedUsage = local.tokenUsageData
    .concat(remote.tokenUsageData)
    .filter((record) => {
      const key = `${record.timestamp}-${record.model}-${record.endpoint}`;
      if (usageSeen.has(key)) return false;
      usageSeen.add(key);
      return true;
    })
    .sort((a, b) => b.timestamp - a.timestamp);

  const remoteIsNewer = (remote.savedAt ?? 0) >= (local.savedAt ?? 0);

  const counterMap = new Map(local.customCounters.map((c) => [c.id, c]));
  for (const counter of remote.customCounters) {
    if (remoteIsNewer) {
      counterMap.set(counter.id, counter);
    } else if (!counterMap.has(counter.id)) {
      counterMap.set(counter.id, counter);
    }
  }

  const pickStr = (r: string, l: string) => (remoteIsNewer && r.length > 0 ? r : l);

  return new PersistedAppState(
    local.currentUser,
    local.authToken,
    local.syncSettings.copyWith({
      backupDatabases: remoteIsNewer
        ? remote.syncSettings.backupDatabases
        : local.syncSettings.backupDatabases,
      autoSyncBackups: remoteIsNewer
        ? remote.syncSettings.autoSyncBackups
        : local.syncSettings.autoSyncBackups,
    }),
    remoteIsNewer ? remote.language : local.language,
    remoteIsNewer ? remote.theme : local.theme,
    remoteIsNewer ? remote.visualTheme : local.visualTheme,
    pickStr(remote.selectedModel, local.selectedModel),
    pickStr(remote.selectedTargetId, local.selectedTargetId),
    remoteIsNewer ? remote.isThinkingMode : local.isThinkingMode,
    remoteIsNewer ? remote.isArtifactMode : local.isArtifactMode,
    local.userName,
    local.geminiApiKey,
    mergeEndpointConfigs(local.endpoints, remote.endpoints, remoteIsNewer),
    mergeAgentConnectors(local.agentConnectors, remote.agentConnectors, remoteIsNewer),
    remoteIsNewer
      ? { ...local.modelContextOverrides, ...remote.modelContextOverrides }
      : { ...remote.modelContextOverrides, ...local.modelContextOverrides },
    remoteIsNewer
      ? { ...local.modelInputCosts, ...remote.modelInputCosts }
      : { ...remote.modelInputCosts, ...local.modelInputCosts },
    remoteIsNewer
      ? { ...local.modelOutputCosts, ...remote.modelOutputCosts }
      : { ...remote.modelOutputCosts, ...local.modelOutputCosts },
    remoteIsNewer
      ? { ...local.modelCacheHitCosts, ...remote.modelCacheHitCosts }
      : { ...remote.modelCacheHitCosts, ...local.modelCacheHitCosts },
    remoteIsNewer ? remote.genSettings : local.genSettings,
    remoteIsNewer ? remote.voiceSettings : local.voiceSettings,
    mergedSessions,
    resolveCurrentSessionId(effectiveLocalCurrentId, remote.currentSessionId, mergedSessions),
    mergedMemories,
    mergedUsage,
    Array.from(counterMap.values()),
    remoteIsNewer ? remote.mcpServers : local.mcpServers,
    remoteIsNewer ? remote.soundEffectsEnabled : local.soundEffectsEnabled,
    remoteIsNewer ? remote.isLiveVideoEnabled : local.isLiveVideoEnabled,
    remoteIsNewer ? remote.isLiveFrontCamera : local.isLiveFrontCamera,
    local.cachedPasswordHash,
    local.lastSyncAt,
    Math.max(local.savedAt ?? 0, remote.savedAt ?? 0),
  );
}
