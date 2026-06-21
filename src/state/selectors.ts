// Selectors — port of the getters in lib/state/app_state.dart (activeSessions,
// currentSession, modelTargets, agentServerTargets, chatTargets, activeChatTarget,
// targetLabelForSession, requiresTargetSwitchConfirmation, contextWindow* helpers,
// formatTargetName, _modelProviderLabel). Pure functions over a state slice so they
// are testable and reusable outside React.
import {
  AgentConnector,
  ChatTarget,
  EndpointConfig,
  type EndpointModel,
  Session,
  type ChatTargetType,
} from '../models';
import { contextWindow as contextWindowForModel } from '../utils/tokens';

/** Minimal slice the target/session selectors read from the store. */
export interface AppStateView {
  selectedModel: string;
  selectedTargetId: string;
  sessions: Session[];
  currentSessionId: string;
  agentConnectors: AgentConnector[];
  endpoints: EndpointConfig[];
  endpointModels: EndpointModel[];
  models: string[];
  modelContextOverrides: Record<string, number>;
}

export function formatTargetName(name: string): string {
  const clean = name.trim();
  if (clean.length === 0) return 'Chat Target';
  if (clean.toLowerCase() === 'gemini-2.5-flash') return 'Gemini 2.5 Flash';
  return clean
    .split(/[-_]/)
    .filter((part) => part.length > 0)
    .map((part) => {
      const lower = part.toLowerCase();
      if (lower === 'gpt') return 'GPT';
      if (lower === 'ai') return 'AI';
      if (lower === 'api') return 'API';
      if (lower.length <= 2 && /^\d+$/.test(lower)) return part;
      return part.substring(0, 1).toUpperCase() + part.substring(1);
    })
    .join(' ');
}

export function modelProviderLabel(
  model: string,
  endpoints: EndpointConfig[],
  endpointModels: EndpointModel[],
): string {
  const endpointModel = endpointModels.find((item) => item.name === model);
  if (endpointModel) {
    const endpoint = endpoints.find((item) => item.id === endpointModel.endpointId);
    return endpoint && endpoint.name.trim().length > 0 ? endpoint.name : 'Endpoint';
  }
  return model.toLowerCase().startsWith('gemini') ? 'Gemini' : 'Model';
}

export function modelTargets(s: AppStateView): ChatTarget[] {
  const targetModels = s.models.length === 0 ? [s.selectedModel] : s.models;
  return targetModels
    .filter((model) => model.trim().length > 0)
    .map((model) => ChatTarget.model(model, modelProviderLabel(model, s.endpoints, s.endpointModels)));
}

export function agentServerTargets(s: AppStateView): ChatTarget[] {
  return s.agentConnectors
    .filter((connector) => connector.enabled)
    .map((connector) => ChatTarget.agent(connector));
}

export function chatTargets(s: AppStateView): ChatTarget[] {
  return [...modelTargets(s), ...agentServerTargets(s)];
}

export function activeChatTarget(s: AppStateView): ChatTarget {
  const currentTarget = s.sessions.find((x) => x.id === s.currentSessionId)?.currentTargetId.trim() ?? '';
  const candidates = chatTargets(s);
  for (const id of [s.selectedTargetId, currentTarget]) {
    if (id.length === 0) continue;
    const match = candidates.find((t) => t.id === id);
    if (match) return match;
  }
  return ChatTarget.model(
    s.selectedModel,
    modelProviderLabel(s.selectedModel, s.endpoints, s.endpointModels),
  );
}

export function activeSessions(s: AppStateView): Session[] {
  const list = s.sessions.filter((session) => !session.deleted);
  list.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.updatedAt - a.updatedAt;
  });
  return list;
}

export function currentSession(s: AppStateView): Session {
  const active = activeSessions(s);
  const match = active.find((session) => session.id === s.currentSessionId);
  if (match) return match;
  if (active.length > 0) return active[0];
  return Session.empty(undefined, s.selectedTargetId);
}

export function targetLabelForSession(s: AppStateView, session: Session): string {
  const id =
    session.lastTargetId.length > 0 ? session.lastTargetId : session.currentTargetId;
  const target = chatTargets(s).find((item) => item.id === id);
  if (target) return formatTargetName(target.displayName);
  if (id.startsWith('model:')) return formatTargetName(id.substring(6));
  if (id.startsWith('agent:')) {
    const connectorId = id.substring(6);
    const connector = s.agentConnectors.find((item) => item.id === connectorId);
    return connector?.name ?? 'Agent Server';
  }
  return formatTargetName(s.selectedModel);
}

export function requiresTargetSwitchConfirmation(
  s: AppStateView,
  target: ChatTarget,
): boolean {
  const current = activeChatTarget(s);
  if (current.id === target.id) return false;
  return current.type !== 'model' || target.type !== 'model';
}

// --- context window helpers ---

export function contextWindowKeyForTarget(target: ChatTarget): string {
  if (target.isAgentServer && target.connectorId != null) {
    return `agent:${target.connectorId}:${target.modelId ?? target.displayName}`;
  }
  return `model:${target.modelId ?? target.displayName}`;
}

export function contextWindowOverrideForTarget(
  s: AppStateView,
  target: ChatTarget,
): number | null {
  return (
    s.modelContextOverrides[contextWindowKeyForTarget(target)] ??
    s.modelContextOverrides[target.id] ??
    (target.modelId == null ? null : s.modelContextOverrides[`model:${target.modelId}`] ?? null)
  );
}

export function contextWindowForTarget(s: AppStateView, target: ChatTarget): number {
  return (
    contextWindowOverrideForTarget(s, target) ??
    target.contextLength ??
    contextWindowForModel(target.modelId ?? s.selectedModel)
  );
}

export function contextWindowSourceForTarget(
  s: AppStateView,
  target: ChatTarget,
): string {
  if (contextWindowOverrideForTarget(s, target) != null) return 'Custom';
  if (target.contextLength != null) return 'Verified from API';
  return 'Estimated context length';
}

export type { ChatTargetType };
