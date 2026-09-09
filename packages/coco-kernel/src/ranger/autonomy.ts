import type { AutonomyLevel } from '@coco/protocol';

export type ActionCategory = 
  | 'read_public' 
  | 'read_private' 
  | 'write_sandbox'
  | 'write_vcs'
  | 'deploy_staging'
  | 'deploy_prod'
  | 'destructive_db'
  | 'financial_transfer'
  | 'external_comm';

export interface GateDecision {
  allowed: boolean;
  reason: string;
  requires_human_approval: boolean;
}

const AUTONOMY_TIERS: Record<AutonomyLevel, number> = {
  l0_answer: 0,
  l1_recommend: 1,
  l2_reversible: 2,
  l3_multistep: 3,
  l4_checkpointed: 4,
  l5_continuous: 5,
};

const MIN_AUTONOMY_FOR_ACTION: Record<ActionCategory, number> = {
  read_public: 0,
  read_private: 2,
  write_sandbox: 2,
  write_vcs: 3,
  deploy_staging: 4,
  deploy_prod: 5,
  destructive_db: 99, // Never auto
  financial_transfer: 99, // Never auto
  external_comm: 99, // Never auto
};

export class AutonomyGate {
  static evaluate(action: ActionCategory, grantedLevel: AutonomyLevel): GateDecision {
    const grantedVal = AUTONOMY_TIERS[grantedLevel];
    const requiredVal = MIN_AUTONOMY_FOR_ACTION[action];

    if (requiredVal === 99) {
      return {
        allowed: false,
        reason: `Action '${action}' belongs to the 'Never Auto' constitutional class and always requires human approval.`,
        requires_human_approval: true,
      };
    }

    if (grantedVal >= requiredVal) {
      return {
        allowed: true,
        reason: `Action '${action}' requires L${requiredVal}; charter grants L${grantedVal}.`,
        requires_human_approval: false,
      };
    }

    return {
      allowed: false,
      reason: `Action '${action}' requires L${requiredVal}; but charter only grants L${grantedVal}.`,
      requires_human_approval: true,
    };
  }
}
