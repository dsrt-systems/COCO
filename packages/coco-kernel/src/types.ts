import type {
  MissionPhase,
  MissionTier,
  AutonomyLevel,
  DeliveryMode,
  ResourceBudget,
  ResourceUsage,
} from '@coco/protocol';

export interface MissionRecord {
  mission_id: string;
  organization_id: string;
  project_id?: string | null;
  parent_mission_id?: string | null;
  created_by: string;
  objective: string;
  normalized_intent?: string | null;
  success_criteria: string[];
  constraints: unknown[];
  tier: MissionTier;
  cognitive_depth: number;
  autonomy_level: AutonomyLevel;
  delivery_mode: DeliveryMode;
  deliverable_types: string[];
  budget: ResourceBudget;
  usage: ResourceUsage;
  phase: MissionPhase;
  current_step?: string | null;
  progress_percent: number;
  status_summary?: string | null;
  started_at?: string | null;
  last_activity_at: string;
  estimated_completion_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMissionInput {
  organization_id: string;
  created_by: string;
  objective: string;
  project_id?: string;
  tier?: MissionTier;
  cognitive_depth?: number;
  autonomy_level?: AutonomyLevel;
  delivery_mode?: DeliveryMode;
  success_criteria?: string[];
  constraints?: unknown[];
  deliverable_types?: string[];
  budget?: ResourceBudget;
}

export interface MissionStore {
  insert(mission: MissionRecord): Promise<void>;
  findById(missionId: string): Promise<MissionRecord | null>;
  listByOrg(organizationId: string, limit?: number): Promise<MissionRecord[]>;
  updatePhase(
    missionId: string,
    phase: MissionPhase,
    extras?: {
      progress_percent?: number;
      status_summary?: string;
      current_step?: string;
      started_at?: string;
      completed_at?: string;
    },
  ): Promise<MissionRecord>;
}

/** Valid phase transitions for the mission state machine. */
export const PHASE_TRANSITIONS: Record<MissionPhase, MissionPhase[]> = {
  created: ['understanding', 'cancelled'],
  understanding: ['challenging', 'planning', 'cancelled', 'failed'],
  challenging: ['researching', 'planning', 'cancelled', 'failed'],
  researching: ['planning', 'cancelled', 'failed'],
  planning: ['organizing', 'cancelled', 'failed'],
  organizing: ['executing', 'cancelled', 'failed'],
  executing: ['verifying', 'repairing', 'cancelled', 'failed'],
  verifying: ['repairing', 'refining', 'delivering', 'failed'],
  repairing: ['verifying', 'executing', 'failed'],
  refining: ['verifying', 'delivering', 'failed'],
  delivering: ['remembering', 'completed', 'failed'],
  remembering: ['completed', 'operating'],
  completed: [],
  operating: ['maintaining' as MissionPhase, 'completed', 'cancelled'],
  cancelled: [],
  failed: [],
};

// Fix: 'maintaining' is not in MissionPhase — map operating → completed/cancelled only
export const VALID_TRANSITIONS: Record<string, MissionPhase[]> = {
  created: ['understanding', 'cancelled'],
  understanding: ['challenging', 'planning', 'cancelled', 'failed'],
  challenging: ['researching', 'planning', 'cancelled', 'failed'],
  researching: ['planning', 'cancelled', 'failed'],
  planning: ['organizing', 'cancelled', 'failed'],
  organizing: ['executing', 'cancelled', 'failed'],
  executing: ['verifying', 'repairing', 'cancelled', 'failed'],
  verifying: ['repairing', 'refining', 'delivering', 'failed'],
  repairing: ['verifying', 'executing', 'failed'],
  refining: ['verifying', 'delivering', 'failed'],
  delivering: ['remembering', 'completed', 'failed'],
  remembering: ['completed', 'operating'],
  completed: [],
  operating: ['completed', 'cancelled'],
  cancelled: [],
  failed: [],
};

/** Progress percent associated with each phase. */
export const PHASE_PROGRESS: Record<string, number> = {
  created: 0,
  understanding: 5,
  challenging: 10,
  researching: 20,
  planning: 30,
  organizing: 35,
  executing: 55,
  verifying: 75,
  repairing: 70,
  refining: 85,
  delivering: 95,
  remembering: 98,
  completed: 100,
  operating: 100,
  cancelled: 0,
  failed: 0,
};

/** Human-readable status summaries. */
export const PHASE_SUMMARIES: Record<string, string> = {
  created: 'Mission created',
  understanding: 'Understanding the objective',
  challenging: 'Challenging assumptions',
  researching: 'Gathering context and evidence',
  planning: 'Building the task graph',
  organizing: 'Assembling the specialist team',
  executing: 'Executing work',
  verifying: 'Verifying deliverables',
  repairing: 'Repairing verification failures',
  refining: 'Refining output',
  delivering: 'Packaging deliverables',
  remembering: 'Writing to Project Brain',
  completed: 'Mission completed',
  operating: 'Operating in continuous mode',
  cancelled: 'Mission cancelled',
  failed: 'Mission failed',
};
