import { describe, it, expect } from 'vitest';
import {
  PersistedAppState,
  Message,
  Session,
  AgentConnector,
  GenerationSettings,
  Memory,
} from './index';
import { parseText, stripThinkingBlocks } from '../utils/thinking';
import { countTokens, formatTokenCount, contextWindow } from '../utils/tokens';
import { cleanTitle } from '../utils/titles';

// `savedAt` is stamped with Date.now() on encode, so strip it before equality checks.
function stripSavedAt(obj: Record<string, unknown>): Record<string, unknown> {
  const { savedAt: _savedAt, ...rest } = obj;
  return rest;
}

describe('PersistedAppState round-trip (defaults)', () => {
  it('toJson -> fromJson -> toJson is stable', () => {
    const d = PersistedAppState.defaults();
    const j1 = d.toJson();
    const d2 = PersistedAppState.fromJson(j1);
    const j2 = d2.toJson();
    expect(stripSavedAt(j2)).toEqual(stripSavedAt(j1));
  });

  it('defaults() has the expected seed values', () => {
    const d = PersistedAppState.defaults();
    expect(d.theme).toBe('dark');
    expect(d.visualTheme).toBe('default');
    expect(d.selectedModel).toBe('gemini-2.5-flash');
    expect(d.selectedTargetId).toBe('model:gemini-2.5-flash');
    expect(d.endpoints).toHaveLength(1);
    expect(d.endpoints[0].name).toBe('OpenAI');
    expect(d.sessions).toHaveLength(1);
    expect(d.currentUser).toBeNull();
    expect(d.language).toBe('id');
  });
});

describe('dual camelCase/snake_case key tolerance', () => {
  it('parses a Message from snake_case and re-emits snake_case', () => {
    const m = Message.fromJson({
      id: 'm1',
      text: 'hi',
      sender: 'user',
      timestamp: '2024-01-01T00:00:00.000Z',
      target_id: 'model:gpt-4o',
      target_type: 'model',
      target_name: 'GPT-4o',
      connector_id: 'c1',
      model_or_agent_id: 'gpt-4o',
      tool_event_ids: ['e1', 'e2'],
      generationTimeMs: 1234,
    });
    expect(m.targetId).toBe('model:gpt-4o');
    expect(m.targetName).toBe('GPT-4o');
    expect(m.connectorId).toBe('c1');
    expect(m.toolEventIds).toEqual(['e1', 'e2']);
    expect(m.generationTimeMs).toBe(1234);
    const json = m.toJson();
    expect(json.target_id).toBe('model:gpt-4o');
    expect(json.target_type).toBe('model');
    expect(json.tool_event_ids).toEqual(['e1', 'e2']);
  });

  it('parses a Session with snake_case target fields', () => {
    const s = Session.fromJson({
      id: 's1',
      title: 'Chat',
      created_at: 100,
      updatedAt: 200,
      current_target_id: 'agent:c1',
      started_with_target_id: 'agent:c1',
      last_target_id: 'agent:c1',
      target_history: ['agent:c1'],
      handoff_summary: 'summary',
    });
    expect(s.currentTargetId).toBe('agent:c1');
    expect(s.targetHistory).toEqual(['agent:c1']);
    expect(s.handoffSummary).toBe('summary');
    const json = s.toJson();
    expect(json.current_target_id).toBe('agent:c1');
    expect(json.target_history).toEqual(['agent:c1']);
  });
});

describe('copyWith clear flags', () => {
  it('Message clearTarget wipes target fields + toolEventIds', () => {
    const m = new Message(
      'm1', 'hi', 'bot', 'ts', 'gpt-4o', [], 10,
      'model:gpt-4o', 'model', 'GPT-4o', 'c1', 'gpt-4o', ['e1'],
    );
    const cleared = m.copyWith({ text: 'updated', clearTarget: true });
    expect(cleared.text).toBe('updated');
    expect(cleared.targetId).toBeNull();
    expect(cleared.targetType).toBeNull();
    expect(cleared.connectorId).toBeNull();
    expect(cleared.toolEventIds).toEqual([]);
    expect(cleared.model).toBe('gpt-4o'); // clearModel not set
  });
});

describe('AgentConnector', () => {
  it('toJson(includeSecrets=false) strips the key', () => {
    const c = AgentConnector.fromJson({
      id: 'c1',
      name: 'My Agent',
      encrypted_api_key: 'secret',
      type: 'openclaw_gateway',
    });
    expect(c.type).toBe('openclawGateway');
    expect(c.providerLabel).toBe('OpenClaw');
    const secretJson = c.toJson(true);
    expect(secretJson.encrypted_api_key).toBe('secret');
    const redacted = c.toJson(false);
    expect(redacted.encrypted_api_key).toBe('');
  });
});

describe('GenerationSettings engine/provider interplay', () => {
  it('defaults engine=gemini provider=gemini', () => {
    const g = new GenerationSettings();
    expect(g.webSearchEngine).toBe('gemini');
    expect(g.webSearchProvider).toBe('gemini');
  });
  it('copyWith engine=endpoint flips provider to endpoint', () => {
    const g = new GenerationSettings().copyWith({ webSearchEngine: 'endpoint' });
    expect(g.webSearchEngine).toBe('endpoint');
    expect(g.webSearchProvider).toBe('endpoint');
  });
});

describe('Memory.inferKey', () => {
  it('detects names and pets', () => {
    expect(Memory.inferKey('My name is John')).toBe('user_name');
    expect(Memory.inferKey('I have a dog')).toBe('pets');
  });
});

describe('thinking utils', () => {
  it('parseText splits a closed think block', () => {
    const p = parseText('<think>reasoning here</think>Final answer');
    expect(p.thinkContent).toBe('reasoning here');
    expect(p.mainContent).toBe('Final answer');
    expect(p.isThinkingStill).toBe(false);
  });
  it('parseText flags an unclosed think block', () => {
    const p = parseText('<think>still going');
    expect(p.isThinkingStill).toBe(true);
    expect(p.thinkContent).toBe('still going');
    expect(p.mainContent).toBe('');
  });
  it('stripThinkingBlocks removes think content', () => {
    expect(stripThinkingBlocks('<think>x</think>hello')).toBe('hello');
  });
});

describe('token utils', () => {
  it('countTokens ~4 chars/token, min 1', () => {
    expect(countTokens('')).toBe(1);
    expect(countTokens('abcd')).toBe(1);
    expect(countTokens('abcde')).toBe(2);
  });
  it('formatTokenCount', () => {
    expect(formatTokenCount(999)).toBe('999');
    expect(formatTokenCount(1500)).toBe('2K');
    expect(formatTokenCount(2_500_000)).toBe('2.5M');
  });
  it('contextWindow', () => {
    expect(contextWindow('gemini-1.5-pro')).toBe(2_000_000);
    expect(contextWindow('claude-3-opus')).toBe(200_000);
    expect(contextWindow('mistral-large')).toBe(128_000);
  });
});

describe('cleanTitle', () => {
  it('strips quotes, "Title:" prefix, trailing punctuation, caps to 6 words', () => {
    // Internal punctuation is preserved; only trailing punctuation is stripped.
    expect(cleanTitle('Title: Hello, world! How are you today friend?')).toBe(
      'Hello, world! How are you today',
    );
    expect(cleanTitle('"Quoted"')).toBe('Quoted');
  });
});
