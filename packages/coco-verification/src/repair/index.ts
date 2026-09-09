import { prefixedId } from '@coco/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CheckResult, FailureDiagnosis, RepairOrder } from '@coco/protocol';

export class RepairLoopEngine {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Analyzes failed check results and issues a structured RepairOrder.
   */
  async createRepairOrder(params: {
    organizationId: string;
    verificationId: string;
    missionId: string;
    taskId: string;
    failedChecks: CheckResult[];
    attemptNumber: number;
    assignedAgentId?: string;
  }): Promise<RepairOrder> {
    const repairId = prefixedId('repair');

    const diagnoses: FailureDiagnosis[] = params.failedChecks.map((check, idx) => ({
      failure_id: `fail_${idx + 1}_${check.check_id}`,
      category: this.classifyCategory(check),
      root_cause: check.message ?? 'Verification check failed',
      affected_artifact_ref: check.evidence_artifact_ref,
      suggested_strategy: this.selectStrategy(check),
      confidence: 0.85,
    }));

    const strategies = Array.from(new Set(diagnoses.map((d) => d.suggested_strategy)));

    const order: RepairOrder = {
      repair_id: repairId,
      verification_id: params.verificationId,
      mission_id: params.missionId,
      task_id: params.taskId,
      attempt_number: params.attemptNumber,
      max_attempts: 3,
      diagnoses,
      proposed_strategies: strategies,
      assigned_agent_id: params.assignedAgentId,
    };

    const { error } = await this.supabase
      .schema('verification')
      .from('repair_orders')
      .insert({
        repair_id: order.repair_id,
        organization_id: params.organizationId,
        verification_id: order.verification_id,
        mission_id: order.mission_id,
        task_id: order.task_id,
        attempt_number: order.attempt_number,
        max_attempts: order.max_attempts,
        diagnoses: order.diagnoses,
        proposed_strategies: order.proposed_strategies,
        assigned_agent_id: order.assigned_agent_id ?? null,
        status: 'issued',
      });

    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[coco/verification] Failed to persist repair order:', error.message);
    }

    return order;
  }

  private classifyCategory(check: CheckResult): string {
    if (check.check_id.includes('type') || check.check_id.includes('compile')) return 'type_error';
    if (check.check_id.includes('lint') || check.check_id.includes('style')) return 'style_violation';
    if (check.check_id.includes('test') || check.check_id.includes('unit')) return 'test_failure';
    if (check.check_id.includes('security') || check.check_id.includes('sast')) return 'security_vulnerability';
    return 'general_verification_failure';
  }

  private selectStrategy(check: CheckResult): string {
    if (check.check_id.includes('type')) return 'fix_type_annotations';
    if (check.check_id.includes('lint')) return 'auto_format_and_refactor';
    if (check.check_id.includes('test')) return 'patch_code_to_pass_test';
    if (check.check_id.includes('security')) return 'apply_security_remediation';
    return 'address_critic_findings';
  }
}
