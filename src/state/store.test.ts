import { describe, it, expect, beforeEach, vi } from 'vitest';

// In-memory AsyncStorage mock (shared across stores in this file).
const mem = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => (mem.has(k) ? mem.get(k)! : null),
    setItem: async (k: string, v: string) => {
      mem.set(k, v);
    },
    removeItem: async (k: string) => {
      mem.delete(k);
    },
  },
}));

vi.mock('expo-haptics', () => ({
  impactAsync: async () => {},
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
}));

import { createAppStore, type AppStoreState } from './store';
import { AgentConnector, ChatTarget, Message } from '../models';
import { activeSessions } from './selectors';

const flush = () => new Promise<void>((r) => setTimeout(r, 30));

function S(store: ReturnType<typeof createAppStore>): AppStoreState {
  return store.getState();
}

function firstSessionId(store: ReturnType<typeof createAppStore>): string {
  return S(store).sessions[0].id;
}

describe('session CRUD', () => {
  beforeEach(() => mem.clear());

  it('renameSession + pinSession update the session', () => {
    const store = createAppStore();
    const id = firstSessionId(store);
    store.getState().renameSession(id, 'My Chat');
    expect(S(store).sessions.find((x) => x.id === id)!.title).toBe('My Chat');
    store.getState().pinSession(id);
    expect(S(store).sessions.find((x) => x.id === id)!.pinned).toBe(true);
  });

  it('deleteSession on the only session creates a fresh one', () => {
    const store = createAppStore();
    const before = firstSessionId(store);
    store.getState().deleteSession(before);
    expect(S(store).sessions.find((x) => x.id === before)!.deleted).toBe(true);
    expect(activeSessions(S(store)).length).toBeGreaterThanOrEqual(1);
  });

  it('createSession forks a new session when the current one has messages', () => {
    const store = createAppStore();
    const id = firstSessionId(store);
    // seed a user message so createSession creates a new session
    store.setState({
      sessions: S(store).sessions.map((x) =>
        x.id === id ? x.copyWith({ messages: [new Message('m', 'hi', 'user', 'ts')] }) : x,
      ),
    });
    const before = activeSessions(S(store)).length;
    store.getState().createSession();
    expect(activeSessions(S(store)).length).toBe(before + 1);
  });
});

describe('persistence round-trip', () => {
  beforeEach(() => mem.clear());

  it('persists and reloads state across store instances', async () => {
    const store1 = createAppStore();
    const id = firstSessionId(store1);
    store1.getState().renameSession(id, 'Persisted Title');
    store1.getState().addMemory('My name is John');
    await flush(); // let fire-and-forget persist complete

    const store2 = createAppStore();
    await store2.getState().initialize();
    const s2 = S(store2);
    const loaded = s2.sessions.find((x) => x.id === id);
    expect(loaded?.title).toBe('Persisted Title');
    expect(s2.memories.length).toBe(1);
    expect(s2.memories[0].content).toBe('My name is John');
  });
});

describe('memory + targets + auth (local)', () => {
  beforeEach(() => mem.clear());

  it('addMemory dedupes and stores', () => {
    const store = createAppStore();
    store.getState().addMemory('I have a dog');
    store.getState().addMemory('I have a dog');
    expect(S(store).memories.length).toBe(1);
  });

  it('setSelectedModel switches the active target', () => {
    const store = createAppStore();
    store.getState().setSelectedModel('gpt-4o');
    const s = S(store);
    expect(s.selectedModel).toBe('gpt-4o');
    expect(s.selectedTargetId).toBe('model:gpt-4o');
  });

  it('applyChatTarget to an agent target inserts a divider + switch event', () => {
    const store = createAppStore();
    const connector = new AgentConnector('c1', '', 'My Agent');
    store.getState().upsertAgentConnector(connector);
    // seed a message so a divider is inserted
    const id = firstSessionId(store);
    store.setState({
      sessions: S(store).sessions.map((x) =>
        x.id === id ? x.copyWith({ messages: [new Message('m', 'hi', 'user', 'ts')] }) : x,
      ),
    });
    store.getState().applyChatTarget(ChatTarget.agent(connector));
    const s = S(store);
    expect(s.selectedTargetId).toBe('agent:c1');
    const session = s.sessions.find((x) => x.id === id)!;
    expect(session.messages.some((m) => m.sender === 'system')).toBe(true);
    expect(session.targetSwitchEvents.length).toBe(1);
  });

  it('continueAsGuest then signOut resets to defaults', async () => {
    const store = createAppStore();
    store.getState().continueAsGuest();
    expect(S(store).currentUser?.isGuest).toBe(true);
    store.getState().addMemory('temp');
    expect(S(store).memories.length).toBe(1);
    await store.getState().signOut();
    const s = S(store);
    expect(s.currentUser).toBeNull();
    expect(s.memories.length).toBe(0);
    expect(s.selectedModel).toBe('gemini-2.5-flash');
  });
});
