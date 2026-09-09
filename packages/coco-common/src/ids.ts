import { ulid } from 'ulid';

export type IdKind =
  | 'user'
  | 'org'
  | 'membership'
  | 'session'
  | 'project'
  | 'mission'
  | 'task'
  | 'graph'
  | 'edge'
  | 'checkpoint'
  | 'agentDef'
  | 'agentInst'
  | 'run'
  | 'finding'
  | 'decision'
  | 'model'
  | 'call'
  | 'tool'
  | 'toolCall'
  | 'sandbox'
  | 'memory'
  | 'packet'
  | 'conv'
  | 'msg'
  | 'node'
  | 'source'
  | 'evidence'
  | 'citation'
  | 'artifact'
  | 'verification'
  | 'levelResult'
  | 'checkResult'
  | 'criticReport'
  | 'repair'
  | 'token'
  | 'capabilityToken'
  | 'approval'
  | 'audit'
  | 'event'
  | 'usage'
  | 'evaluation'
  | 'policy'
  | 'subscription'
  | 'proposal'
  | 'shadow';

const prefixes: Record<IdKind, string> = {
  user: 'usr',
  org: 'org',
  membership: 'mbr',
  session: 'ses',
  project: 'prj',
  mission: 'mis',
  task: 'tsk',
  graph: 'grp',
  edge: 'edg',
  checkpoint: 'chk',
  agentDef: 'agd',
  agentInst: 'ain',
  run: 'run',
  finding: 'fnd',
  decision: 'dec',
  model: 'mdl',
  call: 'cal',
  tool: 'tol',
  toolCall: 'tlc',
  sandbox: 'sbx',
  memory: 'mem',
  packet: 'ctx',
  conv: 'cnv',
  msg: 'msg',
  node: 'nod',
  source: 'src',
  evidence: 'evd',
  citation: 'cit',
  artifact: 'art',
  verification: 'ver',
  levelResult: 'lvl',
  checkResult: 'chr',
  criticReport: 'crr',
  repair: 'rep',
  token: 'tkn',
  capabilityToken: 'tkn',
  approval: 'apr',
  audit: 'aud',
  event: 'evt',
  usage: 'usg',
  evaluation: 'evl',
  policy: 'pol',
  subscription: 'sub',
  proposal: 'prp',
  shadow: 'shd',
};

export function newUlid(): string {
  return ulid();
}

export function prefixedId(kind: IdKind): string {
  return `${prefixes[kind]}_${ulid()}`;
}

export function isPrefixedId(value: string): boolean {
  return /^[a-z]{3}_[0-9A-HJKMNP-TV-Z]{26}$/.test(value);
}

export function idPrefix(kind: IdKind): string {
  return prefixes[kind];
}

export function newId(kind?: IdKind): string {
  return prefixedId(kind ?? 'event');
}
