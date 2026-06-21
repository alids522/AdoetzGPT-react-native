// Enums + JSON mappers — port of the enums in lib/models.dart.
// Each enum has fromJson (lenient, dual-key) / code (canonical snake_case for
// persistence) / label (display) mirroring the Dart helpers.

import { stringValue } from './coerce';

export type AppView = 'chat' | 'settings' | 'tokenUsage';
export const APP_VIEWS: AppView[] = ['chat', 'settings', 'tokenUsage'];

export type ChatTargetType = 'model' | 'agentServer';

export function chatTargetTypeFromJson(value: unknown): ChatTargetType {
  const text = stringValue(value, 'model').trim().toLowerCase();
  return text === 'agent_server' || text === 'agentserver' ? 'agentServer' : 'model';
}
export function chatTargetTypeCode(value: ChatTargetType): string {
  return value === 'agentServer' ? 'agent_server' : 'model';
}

export type ConnectorStatus =
  | 'online'
  | 'offline'
  | 'authFailed'
  | 'timeout'
  | 'unknown'
  | 'streamingFailed'
  | 'syncFailed';

export function connectorStatusFromJson(value: unknown): ConnectorStatus {
  const text = stringValue(value, 'unknown').trim().toLowerCase();
  switch (text) {
    case 'online':
      return 'online';
    case 'offline':
      return 'offline';
    case 'auth_failed':
    case 'authfailed':
      return 'authFailed';
    case 'timeout':
      return 'timeout';
    case 'streaming_failed':
    case 'streamingfailed':
      return 'streamingFailed';
    case 'sync_failed':
    case 'syncfailed':
      return 'syncFailed';
    default:
      return 'unknown';
  }
}
export function connectorStatusCode(value: ConnectorStatus): string {
  switch (value) {
    case 'online':
      return 'online';
    case 'offline':
      return 'offline';
    case 'authFailed':
      return 'auth_failed';
    case 'timeout':
      return 'timeout';
    case 'streamingFailed':
      return 'streaming_failed';
    case 'syncFailed':
      return 'sync_failed';
    default:
      return 'unknown';
  }
}
export function connectorStatusLabel(value: ConnectorStatus): string {
  switch (value) {
    case 'online':
      return 'Online';
    case 'offline':
      return 'Offline';
    case 'authFailed':
      return 'Auth failed';
    case 'timeout':
      return 'Timeout';
    case 'streamingFailed':
      return 'Streaming failed';
    case 'syncFailed':
      return 'Sync failed';
    default:
      return 'Unknown';
  }
}

export type ConnectorType =
  | 'openclawGateway'
  | 'hermesAgent'
  | 'genericOpenAiCompatible';

export function connectorTypeFromJson(value: unknown): ConnectorType {
  const text = stringValue(value, 'generic_openai_compatible').trim().toLowerCase();
  switch (text) {
    case 'openclaw_gateway':
    case 'openclaw':
      return 'openclawGateway';
    case 'hermes_agent':
    case 'hermes':
      return 'hermesAgent';
    default:
      return 'genericOpenAiCompatible';
  }
}
export function connectorTypeCode(value: ConnectorType): string {
  switch (value) {
    case 'openclawGateway':
      return 'openclaw_gateway';
    case 'hermesAgent':
      return 'hermes_agent';
    default:
      return 'generic_openai_compatible';
  }
}
export function connectorTypeLabel(value: ConnectorType): string {
  switch (value) {
    case 'openclawGateway':
      return 'OpenClaw';
    case 'hermesAgent':
      return 'Hermes';
    default:
      return 'OpenAI Compatible';
  }
}

export type ToolPermissionMode =
  | 'toolsDisabled'
  | 'safeAuto'
  | 'askBeforeWrite'
  | 'askBeforeEveryTool';

export function toolPermissionModeFromJson(value: unknown): ToolPermissionMode {
  const text = stringValue(value, 'ask_before_write').trim().toLowerCase();
  switch (text) {
    case 'tools_disabled':
    case 'disabled':
      return 'toolsDisabled';
    case 'safe_auto':
    case 'safe':
      return 'safeAuto';
    case 'ask_before_every_tool':
    case 'ask_every':
      return 'askBeforeEveryTool';
    default:
      return 'askBeforeWrite';
  }
}
export function toolPermissionModeCode(value: ToolPermissionMode): string {
  switch (value) {
    case 'toolsDisabled':
      return 'tools_disabled';
    case 'safeAuto':
      return 'safe_auto';
    case 'askBeforeEveryTool':
      return 'ask_before_every_tool';
    default:
      return 'ask_before_write';
  }
}
export function toolPermissionModeLabel(value: ToolPermissionMode): string {
  switch (value) {
    case 'toolsDisabled':
      return 'Tools disabled';
    case 'safeAuto':
      return 'Safe auto';
    case 'askBeforeEveryTool':
      return 'Ask before every tool';
    default:
      return 'Ask before write';
  }
}
