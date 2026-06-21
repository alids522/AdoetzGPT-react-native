// ConnectorCapabilities + ConnectorTarget + AgentConnector — port of lib/models.dart.
import { boolValue, intValue, mapList, stringValue, type Json } from './coerce';
import {
  connectorStatusCode,
  connectorStatusFromJson,
  connectorTypeCode,
  connectorTypeFromJson,
  connectorTypeLabel,
  toolPermissionModeCode,
  toolPermissionModeFromJson,
  type ConnectorStatus,
  type ConnectorType,
  type ToolPermissionMode,
} from './enums';

export interface ConnectorCapabilitiesCopyWith {
  supportsStreaming?: boolean;
  supportsChatCompletions?: boolean;
  supportsResponsesApi?: boolean;
  supportsModelsEndpoint?: boolean;
  supportsTools?: boolean;
  rawCapabilitiesJson?: Json;
}

export class ConnectorCapabilities {
  constructor(
    public readonly supportsStreaming: boolean = true,
    public readonly supportsChatCompletions: boolean = true,
    public readonly supportsResponsesApi: boolean = false,
    public readonly supportsModelsEndpoint: boolean = true,
    public readonly supportsTools: boolean = false,
    public readonly rawCapabilitiesJson: Json = {},
  ) {}

  copyWith(patch: ConnectorCapabilitiesCopyWith = {}): ConnectorCapabilities {
    return new ConnectorCapabilities(
      patch.supportsStreaming ?? this.supportsStreaming,
      patch.supportsChatCompletions ?? this.supportsChatCompletions,
      patch.supportsResponsesApi ?? this.supportsResponsesApi,
      patch.supportsModelsEndpoint ?? this.supportsModelsEndpoint,
      patch.supportsTools ?? this.supportsTools,
      patch.rawCapabilitiesJson ?? this.rawCapabilitiesJson,
    );
  }

  static fromJson(json?: Json | null): ConnectorCapabilities {
    if (!json) return new ConnectorCapabilities();
    return new ConnectorCapabilities(
      boolValue(json.supports_streaming, true),
      boolValue(json.supports_chat_completions, true),
      boolValue(json.supports_responses_api),
      boolValue(json.supports_models_endpoint, true),
      boolValue(json.supports_tools),
      typeof json.raw_capabilities_json === 'object' && json.raw_capabilities_json !== null
        ? { ...(json.raw_capabilities_json as Json) }
        : {},
    );
  }

  toJson(): Json {
    return {
      supports_streaming: this.supportsStreaming,
      supports_chat_completions: this.supportsChatCompletions,
      supports_responses_api: this.supportsResponsesApi,
      supports_models_endpoint: this.supportsModelsEndpoint,
      supports_tools: this.supportsTools,
      raw_capabilities_json: this.rawCapabilitiesJson,
    };
  }
}

export interface ConnectorTargetCopyWith {
  id?: string;
  connectorId?: string;
  modelId?: string;
  displayName?: string;
  contextLength?: number | null;
  enabled?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export class ConnectorTarget {
  constructor(
    public readonly id: string,
    public readonly connectorId: string,
    public readonly modelId: string,
    public readonly displayName: string,
    public readonly contextLength: number | null,
    public readonly enabled: boolean = true,
    public readonly createdAt: number,
    public readonly updatedAt: number,
  ) {}

  copyWith(patch: ConnectorTargetCopyWith = {}): ConnectorTarget {
    return new ConnectorTarget(
      patch.id ?? this.id,
      patch.connectorId ?? this.connectorId,
      patch.modelId ?? this.modelId,
      patch.displayName ?? this.displayName,
      patch.contextLength ?? this.contextLength,
      patch.enabled ?? this.enabled,
      patch.createdAt ?? this.createdAt,
      patch.updatedAt ?? this.updatedAt,
    );
  }

  static fromJson(json: Json): ConnectorTarget {
    const modelId = stringValue(json.model_id, stringValue(json.modelId));
    const now = Date.now();
    const parsedContextLength = intValue(json.context_length ?? json.contextLength);
    return new ConnectorTarget(
      stringValue(json.id, `${stringValue(json.connector_id, stringValue(json.connectorId))}:${modelId}`),
      stringValue(json.connector_id, stringValue(json.connectorId)),
      modelId,
      stringValue(json.display_name, stringValue(json.displayName, modelId)),
      parsedContextLength > 0 ? parsedContextLength : null,
      boolValue(json.enabled, true),
      intValue(json.created_at, intValue(json.createdAt, now)),
      intValue(json.updated_at, intValue(json.updatedAt, now)),
    );
  }

  toJson(): Json {
    const out: Json = {
      id: this.id,
      connector_id: this.connectorId,
      model_id: this.modelId,
      display_name: this.displayName,
      enabled: this.enabled,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    };
    if (this.contextLength != null) out.context_length = this.contextLength;
    return out;
  }
}

export interface AgentConnectorCopyWith {
  id?: string;
  userId?: string;
  name?: string;
  type?: ConnectorType;
  baseUrl?: string;
  encryptedApiKey?: string;
  enabled?: boolean;
  status?: ConnectorStatus;
  latencyMs?: number | null;
  lastCheckedAt?: number | null;
  isDefault?: boolean;
  createdAt?: number;
  updatedAt?: number;
  permissionMode?: ToolPermissionMode;
  capabilities?: ConnectorCapabilities;
  targets?: ConnectorTarget[];
  lastError?: string;
  logs?: string[];
  clearLatency?: boolean;
  clearLastCheckedAt?: boolean;
}

export class AgentConnector {
  constructor(
    public readonly id: string,
    public readonly userId: string = '',
    public readonly name: string,
    public readonly type: ConnectorType = 'genericOpenAiCompatible',
    public readonly baseUrl: string = '',
    public readonly encryptedApiKey: string = '',
    public readonly enabled: boolean = true,
    public readonly status: ConnectorStatus = 'unknown',
    public readonly latencyMs: number | null = null,
    public readonly lastCheckedAt: number | null = null,
    public readonly isDefault: boolean = false,
    public readonly createdAt: number = Date.now(),
    public readonly updatedAt: number = Date.now(),
    public readonly permissionMode: ToolPermissionMode = 'askBeforeWrite',
    public readonly capabilities: ConnectorCapabilities = new ConnectorCapabilities(),
    public readonly targets: ConnectorTarget[] = [],
    public readonly lastError: string = '',
    public readonly logs: string[] = [],
  ) {}

  get providerLabel(): string {
    return connectorTypeLabel(this.type);
  }

  copyWith(patch: AgentConnectorCopyWith = {}): AgentConnector {
    return new AgentConnector(
      patch.id ?? this.id,
      patch.userId ?? this.userId,
      patch.name ?? this.name,
      patch.type ?? this.type,
      patch.baseUrl ?? this.baseUrl,
      patch.encryptedApiKey ?? this.encryptedApiKey,
      patch.enabled ?? this.enabled,
      patch.status ?? this.status,
      patch.clearLatency ? null : patch.latencyMs ?? this.latencyMs,
      patch.clearLastCheckedAt ? null : patch.lastCheckedAt ?? this.lastCheckedAt,
      patch.isDefault ?? this.isDefault,
      patch.createdAt ?? this.createdAt,
      patch.updatedAt ?? this.updatedAt,
      patch.permissionMode ?? this.permissionMode,
      patch.capabilities ?? this.capabilities,
      patch.targets ?? this.targets,
      patch.lastError ?? this.lastError,
      patch.logs ?? this.logs,
    );
  }

  static empty(id?: string): AgentConnector {
    const now = Date.now();
    return new AgentConnector(id ?? String(now), '', 'New Agent Server');
  }

  static fromJson(json: Json): AgentConnector {
    const now = Date.now();
    const id = stringValue(json.id);
    const latencyMs =
      json.latency_ms == null && json.latencyMs == null
        ? null
        : intValue(json.latency_ms, intValue(json.latencyMs));
    const lastCheckedAt =
      json.last_checked_at == null && json.lastCheckedAt == null
        ? null
        : intValue(json.last_checked_at, intValue(json.lastCheckedAt));
    const targets = mapList(json.targets)
      .map(ConnectorTarget.fromJson)
      .map((t) => (t.connectorId.length === 0 ? t.copyWith({ connectorId: id }) : t));
    return new AgentConnector(
      id,
      stringValue(json.user_id, stringValue(json.userId)),
      stringValue(json.name, 'Agent Server'),
      connectorTypeFromJson(json.type),
      stringValue(json.base_url, stringValue(json.baseUrl)),
      stringValue(json.encrypted_api_key, stringValue(json.encryptedApiKey, stringValue(json.apiKey))),
      boolValue(json.enabled, true),
      connectorStatusFromJson(json.status),
      latencyMs,
      lastCheckedAt,
      boolValue(json.is_default, boolValue(json.isDefault)),
      intValue(json.created_at, intValue(json.createdAt, now)),
      intValue(json.updated_at, intValue(json.updatedAt, now)),
      toolPermissionModeFromJson(json.permission_mode),
      ConnectorCapabilities.fromJson(
        typeof json.capabilities === 'object' && json.capabilities !== null ? { ...(json.capabilities as Json) } : null,
      ),
      targets,
      stringValue(json.last_error, stringValue(json.lastError)),
      Array.isArray(json.logs) ? (json.logs as unknown[]).map((i) => String(i)) : [],
    );
  }

  toJson(includeSecrets = true): Json {
    const out: Json = {
      id: this.id,
      user_id: this.userId,
      name: this.name,
      type: connectorTypeCode(this.type),
      base_url: this.baseUrl,
      encrypted_api_key: includeSecrets ? this.encryptedApiKey : '',
      enabled: this.enabled,
      status: connectorStatusCode(this.status),
      is_default: this.isDefault,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
      permission_mode: toolPermissionModeCode(this.permissionMode),
      capabilities: this.capabilities.toJson(),
      targets: this.targets.map((t) => t.toJson()),
    };
    if (this.latencyMs != null) out.latency_ms = this.latencyMs;
    if (this.lastCheckedAt != null) out.last_checked_at = this.lastCheckedAt;
    if (this.lastError.length > 0) out.last_error = this.lastError;
    if (this.logs.length > 0) out.logs = this.logs;
    return out;
  }
}
