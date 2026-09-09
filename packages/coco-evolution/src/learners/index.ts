export * from './base';
export * from './router-learner';
export * from './prompt-learner';
export * from './agent-learner';
export * from './model-registry-learner';
export * from './corpus-learner';
export * from './verification-learner';

import type { Learner } from './base';
import { RouterLearner } from './router-learner';
import { PromptLearner } from './prompt-learner';
import { AgentLearner } from './agent-learner';
import { ModelRegistryLearner } from './model-registry-learner';
import { CorpusLearner } from './corpus-learner';
import { VerificationLearner } from './verification-learner';

/** All production learners in analysis order */
export function createAllLearners(): Learner[] {
  return [
    new RouterLearner(),
    new PromptLearner(),
    new AgentLearner(),
    new ModelRegistryLearner(),
    new CorpusLearner(),
    new VerificationLearner(),
  ];
}
