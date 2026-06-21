// TokenUsageRecord + CustomCounter — port of lib/models.dart.
import { boolValue, intValue, stringValue, type Json } from './coerce';

export class TokenUsageRecord {
  constructor(
    public readonly timestamp: number,
    public readonly model: string,
    public readonly endpoint: string,
    public readonly inputTokens: number,
    public readonly outputTokens: number,
    public readonly totalTokens: number,
    public readonly cachedInputTokens: number = 0,
    public readonly cacheCreationInputTokens: number = 0,
    public readonly sessionId: string | null = null,
    public readonly isEstimated: boolean = true,
  ) {}

  static fromJson(json: Json): TokenUsageRecord {
    return new TokenUsageRecord(
      intValue(json.timestamp),
      stringValue(json.model),
      stringValue(json.endpoint),
      intValue(json.inputTokens),
      intValue(json.outputTokens),
      intValue(json.totalTokens),
      intValue(json.cachedInputTokens ?? json.cached_input_tokens),
      intValue(json.cacheCreationInputTokens ?? json.cache_creation_input_tokens),
      stringValue(json.sessionId),
      json.isEstimated !== undefined ? boolValue(json.isEstimated) : true,
    );
  }

  toJson(): Json {
    const out: Json = {
      timestamp: this.timestamp,
      model: this.model,
      endpoint: this.endpoint,
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      totalTokens: this.totalTokens,
      isEstimated: this.isEstimated,
    };
    if (this.cachedInputTokens > 0) out.cachedInputTokens = this.cachedInputTokens;
    if (this.cacheCreationInputTokens > 0)
      out.cacheCreationInputTokens = this.cacheCreationInputTokens;
    if (this.sessionId != null) out.sessionId = this.sessionId;
    return out;
  }
}

export interface CustomCounterCopyWith {
  name?: string;
  createdAt?: number;
  color?: string;
}

export class CustomCounter {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly createdAt: number,
    public readonly color: string,
  ) {}

  copyWith(patch: CustomCounterCopyWith = {}): CustomCounter {
    return new CustomCounter(
      this.id,
      patch.name ?? this.name,
      patch.createdAt ?? this.createdAt,
      patch.color ?? this.color,
    );
  }

  static fromJson(json: Json): CustomCounter {
    return new CustomCounter(
      stringValue(json.id),
      stringValue(json.name),
      intValue(json.createdAt),
      stringValue(json.color, '#ffffff'),
    );
  }

  toJson(): Json {
    return { id: this.id, name: this.name, createdAt: this.createdAt, color: this.color };
  }
}
