import type { OutcomeRecord } from '@coco/protocol';

export class OutcomeGrader {
  /**
   * Scores an outcome record on an empirical 0.0 - 1.0 scale.
   */
  grade(record: OutcomeRecord): number {
    if (record.outcome_label === 'FAILED') return 0.0;
    return record.automated_quality_score ?? 0.85;
  }
}
