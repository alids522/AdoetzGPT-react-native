// Convenience hooks binding the selectors to the store. `useShallow` keeps
// array-returning selectors from causing re-render loops.
import { useShallow } from 'zustand/react/shallow';
import { useAppStore, type AppStoreState } from './store';
import {
  activeChatTarget,
  activeSessions,
  chatTargets,
  currentSession,
  type AppStateView,
} from './selectors';

function viewOf(s: AppStoreState): AppStateView {
  return {
    selectedModel: s.selectedModel,
    selectedTargetId: s.selectedTargetId,
    sessions: s.sessions,
    currentSessionId: s.currentSessionId,
    agentConnectors: s.agentConnectors,
    endpoints: s.endpoints,
    endpointModels: s.endpointModels,
    models: s.models,
    modelContextOverrides: s.modelContextOverrides,
  };
}

export const useActiveSessions = () => useAppStore(useShallow((s) => activeSessions(viewOf(s))));
export const useCurrentSession = () => useAppStore((s) => currentSession(viewOf(s)));
export const useChatTargets = () => useAppStore(useShallow((s) => chatTargets(viewOf(s))));
export const useActiveChatTarget = () => useAppStore((s) => activeChatTarget(viewOf(s)));
