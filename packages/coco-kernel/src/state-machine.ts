import type { MissionPhase } from '@coco/protocol';
import { CocoError } from '@coco/common';
import { VALID_TRANSITIONS, PHASE_PROGRESS, PHASE_SUMMARIES } from './types';

/**
 * Mission State Machine (Deep Spec 2 §2.2 / Dimension 7).
 * Pure functions — no I/O. The MissionEngine orchestrates persistence + events.
 */

export function canTransition(from: MissionPhase, to: MissionPhase): boolean {
  const allowed = VALID_TRANSITIONS[from] ?? [];
  return allowed.includes(to);
}

export function assertTransition(from: MissionPhase, to: MissionPhase): void {
  if (!canTransition(from, to)) {
    throw new CocoError({
      category: 'logic',
      code: 'mission.invalid_transition',
      message: `Cannot transition mission from '${from}' to '${to}'`,
      data: { from, to, allowed: VALID_TRANSITIONS[from] ?? [] },
    });
  }
}

export function progressFor(phase: MissionPhase): number {
  return PHASE_PROGRESS[phase] ?? 0;
}

export function summaryFor(phase: MissionPhase): string {
  return PHASE_SUMMARIES[phase] ?? phase;
}

/** Terminal phases — no further automatic transitions. */
export function isTerminal(phase: MissionPhase): boolean {
  return phase === 'completed' || phase === 'cancelled' || phase === 'failed';
}

/**
 * The default happy-path progression for a simple mission.
 * Used by the bootstrap runner in Phase 4 before full agent orchestration.
 */
export const BOOTSTRAP_PATH: MissionPhase[] = [
  'understanding',
  'challenging',
  'planning',
  'organizing',
  'executing',
  'verifying',
  'delivering',
  'remembering',
  'completed',
];
