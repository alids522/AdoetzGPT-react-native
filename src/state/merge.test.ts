import { describe, it, expect } from 'vitest';
import {
  mergeStringList,
  mergeSession,
  mergeRemote,
  resolveCurrentSessionId,
  localSessionIdsToPush,
} from './merge';
import {
  PersistedAppState,
  Session,
  Message,
  Memory,
  TokenUsageRecord,
} from '../models';

function session(id: string, opts: Partial<Session> & { messages?: Message[] } = {}): Session {
  const now = 1000;
  return new Session(
    id,
    opts.title ?? 'T',
    opts.messages ?? [],
    opts.createdAt ?? now,
    opts.updatedAt ?? now,
    opts.pinned ?? false,
    opts.deleted ?? false,
    opts.currentTargetId ?? '',
    opts.startedWithTargetId ?? '',
    opts.lastTargetId ?? '',
    opts.targetHistory ?? [],
    opts.handoffSummary ?? '',
    opts.targetSwitchEvents ?? [],
  );
}

function msg(id: string, text: string, sender: 'user' | 'bot' = 'bot'): Message {
  return new Message(id, text, sender, 'ts');
}

describe('mergeStringList', () => {
  it('dedupes preserving order', () => {
    expect(mergeStringList(['a', 'b'], ['b', 'c'])).toEqual(['a', 'b', 'c']);
    expect(mergeStringList(['a', ''], ['a'])).toEqual(['a']);
  });
});

describe('mergeSession', () => {
  it('merges messages by id and takes max updatedAt / pinned union', () => {
    const local = session('s1', {
      updatedAt: 100,
      pinned: false,
      messages: [msg('m1', 'hello', 'user'), msg('m2', 'world')],
    });
    const remote = session('s1', {
      updatedAt: 200,
      pinned: true,
      messages: [msg('m1', 'hello', 'user'), msg('m3', 'extra')],
    });
    const merged = mergeSession(local, remote);
    const ids = merged.messages.map((m) => m.id).sort();
    expect(ids).toEqual(['m1', 'm2', 'm3']);
    expect(merged.updatedAt).toBe(200);
    expect(merged.pinned).toBe(true);
  });
});

describe('mergeRemote', () => {
  it('forks when both sides added messages to the same session', () => {
    const local = PersistedAppState.defaults().toJson() as any;
    const localState = PersistedAppState.fromJson({
      ...local,
      sessions: [
        session('s1', { updatedAt: 100, messages: [msg('m1', 'hi', 'user'), msg('m2', 'local only')] }).toJson(),
      ],
      currentSessionId: 's1',
    });
    const remoteState = PersistedAppState.fromJson({
      ...local,
      sessions: [
        session('s1', { updatedAt: 200, messages: [msg('m1', 'hi', 'user'), msg('m3', 'remote only')] }).toJson(),
      ],
      currentSessionId: 's1',
    });
    const merged = mergeRemote(localState, remoteState);
    // Fork: original s1 (remote-wins) + a "(Device Copy)" fork of local
    expect(merged.sessions.length).toBe(2);
    expect(merged.sessions.some((s) => s.title.includes('Device Copy'))).toBe(true);
    // currentSessionId remapped to the fork since local was viewing s1
    expect(merged.currentSessionId).not.toBe('s1');
  });

  it('dedupes token usage by timestamp-model-endpoint', () => {
    const base = PersistedAppState.defaults().toJson() as any;
    const rec = (t: number) =>
      new TokenUsageRecord(t, 'gemini', 'Gemini', 10, 20, 30);
    const localState = PersistedAppState.fromJson({
      ...base,
      tokenUsageData: [rec(1).toJson(), rec(2).toJson()],
      sessions: [],
    } as any);
    const remoteState = PersistedAppState.fromJson({
      ...base,
      tokenUsageData: [rec(2).toJson(), rec(3).toJson()],
      sessions: [],
    } as any);
    const merged = mergeRemote(localState, remoteState);
    expect(merged.tokenUsageData.length).toBe(3);
    // sorted desc by timestamp
    expect(merged.tokenUsageData.map((r) => r.timestamp)).toEqual([3, 2, 1]);
  });

  it('picks remote scalar settings when remote is newer', () => {
    const base = PersistedAppState.defaults().toJson() as any;
    const localState = PersistedAppState.fromJson({ ...base, savedAt: 100, theme: 'light' });
    const remoteState = PersistedAppState.fromJson({ ...base, savedAt: 200, theme: 'dark' });
    const merged = mergeRemote(localState, remoteState);
    expect(merged.theme).toBe('dark');
  });

  it('dedupes memories by semantic key, preferring newer updatedAt', () => {
    const base = PersistedAppState.defaults().toJson() as any;
    const localState = PersistedAppState.fromJson({
      ...base,
      memories: [new Memory('a', 'My name is John', 100, 100, null, 'user_name').toJson()],
    } as any);
    const remoteState = PersistedAppState.fromJson({
      ...base,
      memories: [new Memory('b', 'My name is Jane', 100, 200, null, 'user_name').toJson()],
    } as any);
    const merged = mergeRemote(localState, remoteState);
    expect(merged.memories.length).toBe(1);
    expect(merged.memories[0].content).toBe('My name is Jane');
  });
});

describe('resolveCurrentSessionId', () => {
  it('prefers local id if still active', () => {
    const s = [session('a'), session('b')];
    expect(resolveCurrentSessionId('a', 'b', s)).toBe('a');
  });
  it('falls back to remote then first', () => {
    const s = [session('a'), session('b')];
    expect(resolveCurrentSessionId('zzz', 'b', s)).toBe('b');
    expect(resolveCurrentSessionId('zzz', 'yyy', s)).toBe('a');
  });
});

describe('localSessionIdsToPush', () => {
  it('returns all when remote is null', () => {
    const base = PersistedAppState.defaults();
    const ids = localSessionIdsToPush(base, null);
    expect(ids.size).toBe(base.sessions.length);
  });
  it('returns sessions newer or with new messages vs remote', () => {
    const base = PersistedAppState.defaults().toJson() as any;
    const local = PersistedAppState.fromJson({
      ...base,
      sessions: [
        session('s1', { updatedAt: 500, messages: [msg('m1', 'x')] }).toJson(),
        session('s2', { updatedAt: 100, messages: [msg('m2', 'y')] }).toJson(),
      ],
    } as any);
    const remote = PersistedAppState.fromJson({
      ...base,
      sessions: [
        session('s1', { updatedAt: 1000, messages: [msg('m1', 'x')] }).toJson(),
        session('s2', { updatedAt: 100, messages: [msg('m2', 'y')] }).toJson(),
      ],
    } as any);
    const ids = localSessionIdsToPush(local, remote);
    // s1: local 500 < remote 1000, same messages -> NOT pushed
    // s2: equal updatedAt, same messages -> NOT pushed
    expect(ids.has('s1')).toBe(false);
    expect(ids.has('s2')).toBe(false);
  });
});
