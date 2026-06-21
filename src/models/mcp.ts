// McpServerConfig — port of lib/models.dart.
import { boolValue, stringValue, type Json } from './coerce';

export interface McpServerConfigCopyWith {
  id?: string;
  name?: string;
  url?: string;
  enabled?: boolean;
  headers?: Record<string, string>;
}

export class McpServerConfig {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly url: string,
    public readonly enabled: boolean = true,
    public readonly headers: Record<string, string> = {},
  ) {}

  copyWith(patch: McpServerConfigCopyWith = {}): McpServerConfig {
    return new McpServerConfig(
      patch.id ?? this.id,
      patch.name ?? this.name,
      patch.url ?? this.url,
      patch.enabled ?? this.enabled,
      patch.headers ?? this.headers,
    );
  }

  static fromJson(json: Json): McpServerConfig {
    return new McpServerConfig(
      stringValue(json.id, String(Date.now())),
      stringValue(json.name, 'Unknown Server'),
      stringValue(json.url),
      boolValue(json.enabled, true),
      typeof json.headers === 'object' && json.headers !== null
        ? { ...(json.headers as Record<string, string>) }
        : {},
    );
  }

  toJson(): Json {
    return { id: this.id, name: this.name, url: this.url, enabled: this.enabled, headers: this.headers };
  }
}
