import { ulid, monotonicFactory } from 'ulid';

const monotonic = monotonicFactory();

export function newId(): string {
  return ulid();
}

export function newMonotonicId(): string {
  return monotonic();
}

export const idPrefixes = {
  organization: 'org',
  user: 'usr',
  membership: 'mem',
  session: 'ses',
  project: 'prj',
  mission: 'mis',
  task: 'tsk',
  taskGraph: 'tgr',
  checkpoint: 'chk',
  agentDefinition: 'agd',
  agentInstance: 'ain',
  agentRun: 'run',
  finding: 'fnd',
  decision: 'dec',
  memory: 'mem',
  contextPacket: 'ctx',
  conversation: 'cnv',
  message: 'msg',
  modelCall: 'mcl',
  toolCall: 'tcl',
  sandbox: 'sbx',
  source: 'src',
  evidence: 'evd',
  citation: 'cit',
  artifact: 'art',
  verification: 'ver',
  levelResult: 'lvr',
  checkResult: 'chr',
  criticReport: 'crr',
  repairOrder: 'rep',
  capabilityToken: 'cap',
  approval: 'apr',
  audit: 'aud',
  event: 'evt',
  proposal: 'prp',
  shadow: 'shd',
  charter: 'cht',
} as const;

export type IdPrefix = keyof typeof idPrefixes;

export function prefixedId(kind: IdPrefix): string {
  return `${idPrefixes[kind]}_${ulid()}`;
}

const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/;
const PREFIXED_ULID_REGEX = /^[a-z]+_[0-9A-HJKMNP-TV-Z]{26}$/;

export function isUlid(value: string): boolean {
  return ULID_REGEX.test(value);
}

export function isPrefixedId(value: string): boolean {
  return PREFIXED_ULID_REGEX.test(value);
}
