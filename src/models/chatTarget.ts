// ChatTarget — port of lib/models.dart (with the .model() / .agent() factories).
import { stringValue } from './coerce';
import {
  chatTargetTypeCode,
  type ChatTargetType,
  type ConnectorStatus,
} from './enums';
import { connectorTypeLabel } from './enums';
import {
  AgentConnector,
  ConnectorCapabilities,
  ConnectorTarget,
} from './connector';

export class ChatTarget {
  constructor(
    public readonly id: string,
    public readonly type: ChatTargetType,
    public readonly displayName: string,
    public readonly provider: string,
    public readonly connectorId: string | null = null,
    public readonly modelId: string | null = null,
    public readonly contextLength: number | null = null,
    public readonly status: ConnectorStatus = 'online',
    public readonly capabilities: ConnectorCapabilities = new ConnectorCapabilities(),
    public readonly isDefault: boolean = false,
  ) {}

  get isModel(): boolean {
    return this.type === 'model';
  }
  get isAgentServer(): boolean {
    return this.type === 'agentServer';
  }

  static model(model: string, provider = 'Model'): ChatTarget {
    return new ChatTarget(`model:${model}`, 'model', model, provider, null, model);
  }

  static agent(connector: AgentConnector, target?: ConnectorTarget | null): ChatTarget {
    const enabledTargets = connector.targets.filter((t) => t.enabled);
    const selectedTarget = target ?? (enabledTargets.length > 0 ? enabledTargets[0] : null);
    const modelId =
      selectedTarget?.modelId ?? connector.name.toLowerCase().replace(/\s+/g, '-');
    return new ChatTarget(
      `agent:${connector.id}`,
      'agentServer',
      connector.name,
      connector.providerLabel,
      connector.id,
      modelId,
      selectedTarget?.contextLength ?? null,
      connector.status,
      connector.capabilities,
      connector.isDefault,
    );
  }
}

export { chatTargetTypeCode, connectorTypeLabel, stringValue };
