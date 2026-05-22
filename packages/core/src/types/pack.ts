import { AgentDef } from './agent';
import { ToolDef } from './tool';

export interface Pack {
  name: string;
  version: string;
  description: string;
  agents: AgentDef[];
  tools: ToolDef[];
}

export function definePack(pack: Pack): Pack {
  return pack;
}
