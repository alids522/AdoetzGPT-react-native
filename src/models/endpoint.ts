// EndpointConfig + EndpointModel — port of lib/models.dart.
import { boolValue, stringValue, type Json } from './coerce';

export class EndpointModel {
  constructor(
    public readonly name: string,
    public readonly endpointId: string,
  ) {}
}

export interface EndpointConfigCopyWith {
  id?: string;
  url?: string;
  key?: string;
  name?: string;
  skipModelFetch?: boolean;
  models?: string[];
  enabled?: boolean;
}

export class EndpointConfig {
  constructor(
    public readonly id: string,
    public readonly url: string,
    public readonly key: string,
    public readonly name: string,
    public readonly skipModelFetch: boolean = false,
    public readonly models: string[] = [],
    public readonly enabled: boolean = true,
  ) {}

  copyWith(patch: EndpointConfigCopyWith = {}): EndpointConfig {
    return new EndpointConfig(
      patch.id ?? this.id,
      patch.url ?? this.url,
      patch.key ?? this.key,
      patch.name ?? this.name,
      patch.skipModelFetch ?? this.skipModelFetch,
      patch.models ?? this.models,
      patch.enabled ?? this.enabled,
    );
  }

  static fromJson(json: Json): EndpointConfig {
    return new EndpointConfig(
      stringValue(json.id),
      stringValue(json.url),
      stringValue(json.key),
      stringValue(json.name, 'Endpoint'),
      boolValue(json.skipModelFetch),
      Array.isArray(json.models) ? (json.models as unknown[]).map((i) => String(i)) : [],
      json.enabled == null ? true : boolValue(json.enabled),
    );
  }

  toJson(): Json {
    return {
      id: this.id,
      url: this.url,
      key: this.key,
      name: this.name,
      skipModelFetch: this.skipModelFetch,
      models: this.models,
      enabled: this.enabled,
    };
  }
}
