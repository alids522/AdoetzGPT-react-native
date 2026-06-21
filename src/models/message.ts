// AttachmentData + Message — port of lib/models.dart.
import { boolValue, intValue, mapList, stringValue, type Json } from './coerce';
import {
  chatTargetTypeCode,
  chatTargetTypeFromJson,
  type ChatTargetType,
} from './enums';

export class AttachmentData {
  constructor(
    public readonly name: string,
    public readonly type: string,
    public readonly data: string,
    public readonly url: string | null = null,
  ) {}

  static fromJson(json: Json): AttachmentData {
    return new AttachmentData(
      stringValue(json.name),
      stringValue(json.type),
      stringValue(json.data),
      json.url == null ? null : stringValue(json.url),
    );
  }

  toJson(): Json {
    const out: Json = { name: this.name, type: this.type, data: this.data };
    if (this.url != null) out.url = this.url;
    return out;
  }
}

export interface MessageCopyWith {
  text?: string;
  sender?: string;
  timestamp?: string;
  model?: string | null;
  attachments?: AttachmentData[];
  tokenCount?: number | null;
  targetId?: string | null;
  targetType?: ChatTargetType | null;
  targetName?: string | null;
  connectorId?: string | null;
  modelOrAgentId?: string | null;
  toolEventIds?: string[];
  isEstimatedTokenCount?: boolean;
  generationTimeMs?: number | null;
  clearModel?: boolean;
  clearTokenCount?: boolean;
  clearTarget?: boolean;
}

export class Message {
  constructor(
    public readonly id: string,
    public readonly text: string,
    public readonly sender: string,
    public readonly timestamp: string,
    public readonly model: string | null = null,
    public readonly attachments: AttachmentData[] = [],
    public readonly tokenCount: number | null = null,
    public readonly targetId: string | null = null,
    public readonly targetType: ChatTargetType | null = null,
    public readonly targetName: string | null = null,
    public readonly connectorId: string | null = null,
    public readonly modelOrAgentId: string | null = null,
    public readonly toolEventIds: string[] = [],
    public readonly isEstimatedTokenCount: boolean = true,
    public readonly generationTimeMs: number | null = null,
  ) {}

  get isUser(): boolean {
    return this.sender === 'user';
  }
  get isSystem(): boolean {
    return this.sender === 'system';
  }

  copyWith(patch: MessageCopyWith = {}): Message {
    const clearTarget = patch.clearTarget ?? false;
    return new Message(
      this.id,
      patch.text ?? this.text,
      patch.sender ?? this.sender,
      patch.timestamp ?? this.timestamp,
      patch.clearModel ? null : patch.model ?? this.model,
      patch.attachments ?? this.attachments,
      patch.clearTokenCount ? null : patch.tokenCount ?? this.tokenCount,
      clearTarget ? null : patch.targetId ?? this.targetId,
      clearTarget ? null : patch.targetType ?? this.targetType,
      clearTarget ? null : patch.targetName ?? this.targetName,
      clearTarget ? null : patch.connectorId ?? this.connectorId,
      clearTarget ? null : patch.modelOrAgentId ?? this.modelOrAgentId,
      clearTarget ? [] : patch.toolEventIds ?? this.toolEventIds,
      patch.isEstimatedTokenCount ?? this.isEstimatedTokenCount,
      patch.generationTimeMs ?? this.generationTimeMs,
    );
  }

  static fromJson(json: Json): Message {
    return new Message(
      stringValue(json.id),
      stringValue(json.text),
      stringValue(json.sender, 'bot'),
      stringValue(json.timestamp),
      json.model == null ? null : stringValue(json.model),
      mapList(json.attachments).map(AttachmentData.fromJson),
      json.tokenCount == null ? null : intValue(json.tokenCount),
      json.target_id == null && json.targetId == null
        ? null
        : stringValue(json.target_id, stringValue(json.targetId)),
      json.target_type == null && json.targetType == null
        ? null
        : chatTargetTypeFromJson(json.target_type ?? json.targetType),
      json.target_name == null && json.targetName == null
        ? null
        : stringValue(json.target_name, stringValue(json.targetName)),
      json.connector_id == null && json.connectorId == null
        ? null
        : stringValue(json.connector_id, stringValue(json.connectorId)),
      json.model_or_agent_id == null && json.modelOrAgentId == null
        ? null
        : stringValue(json.model_or_agent_id, stringValue(json.modelOrAgentId)),
      Array.isArray(json.tool_event_ids)
        ? (json.tool_event_ids as unknown[]).map((i) => String(i))
        : Array.isArray(json.toolEventIds)
          ? (json.toolEventIds as unknown[]).map((i) => String(i))
          : [],
      json.isEstimatedTokenCount !== undefined ? boolValue(json.isEstimatedTokenCount) : true,
      json.generationTimeMs != null ? intValue(json.generationTimeMs) : null,
    );
  }

  toJson(): Json {
    const out: Json = {
      id: this.id,
      text: this.text,
      sender: this.sender,
      timestamp: this.timestamp,
    };
    if (this.model != null) out.model = this.model;
    if (this.attachments.length > 0) out.attachments = this.attachments.map((a) => a.toJson());
    if (this.tokenCount != null) out.tokenCount = this.tokenCount;
    if (this.targetId != null) out.target_id = this.targetId;
    if (this.targetType != null) out.target_type = chatTargetTypeCode(this.targetType);
    if (this.targetName != null) out.target_name = this.targetName;
    if (this.connectorId != null) out.connector_id = this.connectorId;
    if (this.modelOrAgentId != null) out.model_or_agent_id = this.modelOrAgentId;
    if (this.toolEventIds.length > 0) out.tool_event_ids = this.toolEventIds;
    out.isEstimatedTokenCount = this.isEstimatedTokenCount;
    if (this.generationTimeMs != null) out.generationTimeMs = this.generationTimeMs;
    return out;
  }
}
