// Session + TargetSwitchEvent — port of lib/models.dart.
import { boolValue, intValue, mapList, stringValue, type Json } from './coerce';
import { Message } from './message';
import { v4 as uuidv4 } from 'uuid';

export class TargetSwitchEvent {
  constructor(
    public readonly id: string,
    public readonly chatId: string,
    public readonly fromTargetId: string,
    public readonly toTargetId: string,
    public readonly handoffSummary: string,
    public readonly createdAt: number,
  ) {}

  static fromJson(json: Json): TargetSwitchEvent {
    return new TargetSwitchEvent(
      stringValue(json.id),
      stringValue(json.chat_id, stringValue(json.chatId)),
      stringValue(json.from_target_id, stringValue(json.fromTargetId)),
      stringValue(json.to_target_id, stringValue(json.toTargetId)),
      stringValue(json.handoff_summary, stringValue(json.handoffSummary)),
      intValue(json.created_at, intValue(json.createdAt)),
    );
  }

  toJson(): Json {
    return {
      id: this.id,
      chat_id: this.chatId,
      from_target_id: this.fromTargetId,
      to_target_id: this.toTargetId,
      handoff_summary: this.handoffSummary,
      created_at: this.createdAt,
    };
  }
}

export interface SessionCopyWith {
  id?: string;
  title?: string;
  messages?: Message[];
  createdAt?: number;
  updatedAt?: number;
  pinned?: boolean;
  deleted?: boolean;
  currentTargetId?: string;
  startedWithTargetId?: string;
  lastTargetId?: string;
  targetHistory?: string[];
  handoffSummary?: string;
  targetSwitchEvents?: TargetSwitchEvent[];
}

export class Session {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly messages: Message[],
    public readonly createdAt: number,
    public readonly updatedAt: number,
    public readonly pinned: boolean = false,
    public readonly deleted: boolean = false,
    public readonly currentTargetId: string = '',
    public readonly startedWithTargetId: string = '',
    public readonly lastTargetId: string = '',
    public readonly targetHistory: string[] = [],
    public readonly handoffSummary: string = '',
    public readonly targetSwitchEvents: TargetSwitchEvent[] = [],
  ) {}

  copyWith(patch: SessionCopyWith = {}): Session {
    return new Session(
      patch.id ?? this.id,
      patch.title ?? this.title,
      patch.messages ?? this.messages,
      patch.createdAt ?? this.createdAt,
      patch.updatedAt ?? this.updatedAt,
      patch.pinned ?? this.pinned,
      patch.deleted ?? this.deleted,
      patch.currentTargetId ?? this.currentTargetId,
      patch.startedWithTargetId ?? this.startedWithTargetId,
      patch.lastTargetId ?? this.lastTargetId,
      patch.targetHistory ?? this.targetHistory,
      patch.handoffSummary ?? this.handoffSummary,
      patch.targetSwitchEvents ?? this.targetSwitchEvents,
    );
  }

  static empty(id?: string, targetId?: string): Session {
    const now = Date.now();
    const effectiveTargetId = targetId ?? '';
    return new Session(
      id ?? `session-${uuidv4()}`,
      effectiveTargetId.startsWith('agent:') ? 'New Agent Chat' : 'New Chat',
      [],
      now,
      now,
      false,
      false,
      effectiveTargetId,
      effectiveTargetId,
      effectiveTargetId,
      effectiveTargetId.length === 0 ? [] : [effectiveTargetId],
    );
  }

  static fromJson(json: Json): Session {
    const now = Date.now();
    const updatedAt = intValue(json.updatedAt, now);
    const currentTargetId = stringValue(
      json.current_target_id,
      stringValue(json.currentTargetId),
    );
    const startedWithTargetId = stringValue(
      json.started_with_target_id,
      stringValue(json.startedWithTargetId, currentTargetId),
    );
    const lastTargetId = stringValue(json.last_target_id, stringValue(json.lastTargetId, currentTargetId));
    const parseHistory = (key: string): string[] => {
      const v = json[key];
      if (!Array.isArray(v)) return [];
      return (v as unknown[])
        .map((i) => String(i))
        .filter((i) => i.length > 0);
    };
    const targetHistory =
      parseHistory('target_history').length > 0
        ? parseHistory('target_history')
        : parseHistory('targetHistory');
    return new Session(
      stringValue(json.id),
      stringValue(json.title, 'New Chat'),
      mapList(json.messages).map(Message.fromJson),
      intValue(json.createdAt, intValue(json.created_at, updatedAt)),
      updatedAt,
      boolValue(json.pinned),
      boolValue(json.deleted),
      currentTargetId,
      startedWithTargetId,
      lastTargetId,
      targetHistory,
      stringValue(json.handoff_summary, stringValue(json.handoffSummary)),
      mapList(json.target_switch_events ?? json.targetSwitchEvents).map(TargetSwitchEvent.fromJson),
    );
  }

  toJson(): Json {
    const out: Json = {
      id: this.id,
      title: this.title,
      messages: this.messages.map((m) => m.toJson()),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
    if (this.pinned) out.pinned = this.pinned;
    if (this.deleted) out.deleted = this.deleted;
    if (this.currentTargetId.length > 0) out.current_target_id = this.currentTargetId;
    if (this.startedWithTargetId.length > 0) out.started_with_target_id = this.startedWithTargetId;
    if (this.lastTargetId.length > 0) out.last_target_id = this.lastTargetId;
    if (this.targetHistory.length > 0) out.target_history = this.targetHistory;
    if (this.handoffSummary.length > 0) out.handoff_summary = this.handoffSummary;
    if (this.targetSwitchEvents.length > 0)
      out.target_switch_events = this.targetSwitchEvents.map((e) => e.toJson());
    return out;
  }
}
