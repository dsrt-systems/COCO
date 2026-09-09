import type { VerificationRequest } from '@coco/protocol';

export interface VerificationPlan {
  levels_to_run: number[];
  critic_required: boolean;
  human_approval_required: boolean;
  timeout_ms: number;
}

export class VerificationPlanner {
  /**
   * Resolves which levels (L0-L10) to run based on requested target_level, domain, and risk.
   */
  plan(request: VerificationRequest): VerificationPlan {
    const targetLevel = Math.min(10, Math.max(0, request.target_level ?? 6));
    
    // Explicit override or serial sequence 0..targetLevel
    let levels = request.levels_to_run ?? Array.from({ length: targetLevel + 1 }, (_, i) => i);

    // Rule 1: L9 (Critic) mandatory if critic_agent_id provided or target_level >= 9
    const criticRequired = Boolean(request.critic_agent_id) || targetLevel >= 9;
    if (criticRequired && !levels.includes(9)) {
      levels.push(9);
    }

    // Rule 2: L10 (Human Acceptance) mandatory if explicitly requested or target_level == 10
    const humanApprovalRequired = request.requires_human_approval || targetLevel === 10;
    if (humanApprovalRequired && !levels.includes(10)) {
      levels.push(10);
    }

    levels = Array.from(new Set(levels)).sort((a, b) => a - b);

    return {
      levels_to_run: levels,
      critic_required: criticRequired,
      human_approval_required: humanApprovalRequired,
      timeout_ms: 300000, // 5 minutes default
    };
  }
}
